// 5. SCORE THE OPPORTUNITY
// asking price → landed cost in London → vs comp value, weighted by match confidence.

import { listFindings, setPipelineCacheInvalidator } from "./sources/store.ts";
import { FX_TO_GBP, IMPORT, RULES, SOURCE_COSTS } from "./config.ts";
import { matchListing } from "./match.ts";
import { toGbp, valueItem } from "./valuation.ts";
import type { CostLine, Listing, Opportunity } from "./types.ts";

export function landedCost(listing: Listing): { total: number; lines: CostLine[] } {
  const src = SOURCE_COSTS[listing.source];
  const item = toGbp(listing.price);
  const lines: CostLine[] = [{ label: "Asking price", gbp: item }];
  if (src.proxyFeePct != null) {
    lines.push({ label: `Proxy fee (${src.proxyFeePct * 100}% + ¥${src.proxyFixedJpy})`, gbp: item * src.proxyFeePct + (src.proxyFixedJpy ?? 0) * FX_TO_GBP.JPY });
  }
  if (src.domesticShipGbp) lines.push({ label: "Domestic shipping", gbp: src.domesticShipGbp });
  if (src.intlShipGbp) lines.push({ label: "International shipping", gbp: src.intlShipGbp });
  if (src.imported) {
    const goods = lines.reduce((s, l) => s + l.gbp, 0);
    const duty = item > IMPORT.dutyThresholdGbp ? item * IMPORT.duty : 0;
    if (duty) lines.push({ label: `Customs duty (${IMPORT.duty * 100}%)`, gbp: duty });
    lines.push({ label: `Import VAT (${IMPORT.vat * 100}%)`, gbp: (goods + duty) * IMPORT.vat });
  } else {
    lines.push({ label: "Local collection", gbp: 0 });
  }
  return { total: lines.reduce((s, l) => s + l.gbp, 0), lines };
}

const fmt = (n: number) => `${n < -0.5 ? "−" : ""}£${Math.abs(Math.round(n))}`;

export function evaluate(listing: Listing): Opportunity {
  const askingGbp = toGbp(listing.price);
  const landed = landedCost(listing);
  const candidates = matchListing(listing);
  const top = candidates[0];
  // Keep a rejected lookalike as the "match" so the reviewer sees why it was rejected.
  const match = top && (top.confidence >= 0.3 || top.conflicts.length > 0) ? top : null;

  if (!match) {
    return {
      listing, askingGbp, landed, match: null, candidates, valuation: null,
      margin: null, expectedProfit: null, score: 0, status: "no-match",
      reasons: ["No reference item reached a usable confidence"],
    };
  }

  const valuation = valueItem(match.refId, listing.condition);
  if (!valuation) {
    return {
      listing, askingGbp, landed, match, candidates, valuation: null,
      margin: null, expectedProfit: null, score: 0, status: "review",
      reasons: ["Identified, but no comps on file — price manually"],
    };
  }

  const c = match.confidence;
  const margin = (valuation.estimate - landed.total) / landed.total;
  const expectedProfit = c * valuation.estimate + (1 - c) * RULES.wrongMatchRecovery * landed.total - landed.total;
  const score = Math.round(100 * c * Math.min(1, Math.max(0, expectedProfit) / 400));

  const checks = [
    { ok: c >= RULES.flagConfidence, fail: `Confidence ${Math.floor(c * 100)}% < ${RULES.flagConfidence * 100}%` },
    { ok: margin >= RULES.minMargin, fail: margin < 0 ? `Priced above comp value (${Math.round(margin * 100)}%)` : `Margin ${Math.round(margin * 100)}% < ${RULES.minMargin * 100}%` },
    { ok: expectedProfit >= RULES.minExpectedProfit, fail: `Expected profit ${fmt(expectedProfit)} < ${fmt(RULES.minExpectedProfit)}` },
    { ok: valuation.comps.length >= RULES.minComps, fail: `Only ${valuation.comps.length} comps` },
  ];
  const failed = checks.filter((x) => !x.ok).map((x) => x.fail);

  let status: Opportunity["status"];
  let reasons: string[];
  if (!failed.length) {
    status = "flagged";
    reasons = [`${Math.round(c * 100)}% match, ${Math.round(margin * 100)}% margin, ~${fmt(expectedProfit)} expected profit`];
  } else if (
    c >= RULES.reviewConfidence &&
    c < RULES.flagConfidence &&
    margin >= RULES.minMargin &&
    valuation.estimate - landed.total >= RULES.minExpectedProfit
  ) {
    // Would be a strong buy if genuine — worth a human look / a question to the seller.
    status = "review";
    reasons = [`If genuine: ~${fmt(valuation.estimate - landed.total)} profit, ${Math.round(margin * 100)}% margin — identity needs a human check`, ...failed];
  } else {
    status = "pass";
    reasons = failed;
  }
  if (match.conflicts.length) reasons.unshift(...match.conflicts);

  return { listing, askingGbp, landed, match, candidates, valuation, margin, expectedProfit, score, status, reasons };
}

let cache: Opportunity[] | null = null;

/**
 * Clear the derived opportunity cache after the findings store changes.
 *
 * The findings mirror is deliberately synchronous so the scoring functions can
 * also be used from server components. New submissions call this through the
 * store immediately after they are written to the mirror.
 */
export function invalidatePipelineCache(): void {
  cache = null;
}

setPipelineCacheInvalidator(invalidatePipelineCache);

function allListings(): Listing[] {
  return listFindings();
}

export function runPipeline(): Opportunity[] {
  if (!cache) {
    const order = { flagged: 0, review: 1, pass: 2, "no-match": 3 } as const;
    cache = allListings().map(evaluate).sort((a, b) => order[a.status] - order[b.status] || b.score - a.score);
  }
  return cache;
}

export const getOpportunity = (id: string) => runPipeline().find((o) => o.listing.id === id);
