// 4. COMPARABLE MARKET VALUE
// Recency-weighted median of sold comps, normalised for condition and then
// re-adjusted to the listing's condition. Range = weighted 25th–75th pct.

import { COMPS } from "./data/comps.ts";
import { CONDITION_FACTOR, FX_TO_GBP, NOW } from "./config.ts";
import type { Condition, CompUsed, Money, Valuation } from "./types.ts";

export const toGbp = (m: Money) => m.amount * FX_TO_GBP[m.currency];

const HALF_LIFE_DAYS = 120;

export function weightedQuantile(values: { v: number; w: number }[], q: number): number {
  const sorted = [...values].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  for (const x of sorted) {
    acc += x.w;
    if (acc / total >= q) return x.v;
  }
  return sorted[sorted.length - 1]?.v ?? 0;
}

export function valueItem(refId: string, condition: Condition): Valuation | null {
  const comps: CompUsed[] = COMPS.filter((c) => c.refId === refId).map((c) => {
    const ageDays = Math.max(0, (NOW.getTime() - new Date(c.soldAt).getTime()) / 86_400_000);
    const gbp = toGbp(c.price);
    return {
      ...c,
      gbp,
      ageDays: Math.round(ageDays),
      normalisedGbp: (gbp / CONDITION_FACTOR[c.condition]) * CONDITION_FACTOR[condition],
      weight: Math.pow(0.5, ageDays / HALF_LIFE_DAYS),
    };
  });
  if (!comps.length) return null;
  const pts = comps.map((c) => ({ v: c.normalisedGbp, w: c.weight }));
  return {
    estimate: weightedQuantile(pts, 0.5),
    low: weightedQuantile(pts, 0.25),
    high: weightedQuantile(pts, 0.75),
    comps: comps.sort((a, b) => a.ageDays - b.ageDays),
  };
}
