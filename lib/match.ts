// 3. EXTRACT SIGNAL FROM NOISE
// Combines three independent signals into a match confidence per reference item:
//   visual  — nearest reference images by embedding (same photo kind only)
//   OCR     — fuzzy brand match on tag / insole text
//   text    — weak hints from the seller's title and description
// and applies penalties when the evidence contradicts itself.

import { BRANDS, REFERENCES, brandById } from "./data/references.ts";
import { NON_TARGET_BRANDS, RULES } from "./config.ts";
import { fuzzyFind, normaliseText } from "./fuzzy.ts";
import { referenceIndex } from "./vectorIndex.ts";
import type { Listing, MatchResult, OcrEvidence, PhotoKind, TextEvidence, VisualEvidence } from "./types.ts";

const OCR_THRESHOLD = 0.8;
const TEXT_THRESHOLD = 0.85;
const SUPPORT_SIM = 0.82;

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export const calibrate = (sim: number) => clamp((sim - RULES.simFloor) / (RULES.simCeil - RULES.simFloor));

function brandsRelated(a: string, b: string) {
  if (a === b) return true;
  const A = brandById(a);
  const B = brandById(b);
  return A.parent === b || B.parent === a;
}

export function ocrBrandHits(listing: Listing): OcrEvidence[] {
  const hits: OcrEvidence[] = [];
  for (const p of listing.photos) {
    if (!p.ocrText) continue;
    const text = normaliseText(p.ocrText, true);
    for (const brand of BRANDS) {
      let best: OcrEvidence | null = null;
      for (const v of brand.variants) {
        const h = fuzzyFind(normaliseText(v, true), text);
        if (h && h.score >= OCR_THRESHOLD && (!best || h.score > best.score)) {
          best = { photoId: p.id, brandId: brand.id, variant: v, matchedText: h.matchedText, score: h.score };
        }
      }
      if (best) hits.push(best);
    }
  }
  return hits;
}

export function nonTargetBrandsOnTags(listing: Listing): string[] {
  const found = new Set<string>();
  for (const p of listing.photos) {
    if (!p.ocrText) continue;
    const text = normaliseText(p.ocrText, true);
    for (const b of NON_TARGET_BRANDS) {
      const h = fuzzyFind(normaliseText(b, true), text);
      if (h && h.score >= 0.85) found.add(b);
    }
  }
  return [...found];
}

export function textHits(listing: Listing): { brands: Map<string, TextEvidence[]>; models: Map<string, TextEvidence[]> } {
  const brands = new Map<string, TextEvidence[]>();
  const models = new Map<string, TextEvidence[]>();
  const fields = [
    ["title", listing.title],
    ["description", listing.description],
  ] as const;
  for (const [field, raw] of fields) {
    const text = normaliseText(raw);
    for (const brand of BRANDS) {
      const hit = brand.variants.map((v) => fuzzyFind(normaliseText(v), text)).find((h) => h && h.score >= TEXT_THRESHOLD);
      if (hit) brands.set(brand.id, [...(brands.get(brand.id) ?? []), { field, term: hit.matchedText, level: "brand" }]);
    }
    for (const ref of REFERENCES) {
      for (const k of ref.keywords) {
        if (text.includes(normaliseText(k))) {
          models.set(ref.id, [...(models.get(ref.id) ?? []), { field, term: k, level: "model" }]);
        }
      }
    }
  }
  return { brands, models };
}

export function visualHits(listing: Listing): Map<string, VisualEvidence[]> {
  const byRef = new Map<string, VisualEvidence[]>();
  for (const p of listing.photos) {
    const { matches } = referenceIndex.query({ vector: p.embedding, topK: 10, filter: { kind: p.kind } });
    for (const m of matches) {
      const list = byRef.get(m.metadata.refId) ?? [];
      list.push({ photoId: p.id, refImageId: m.id, kind: p.kind, similarity: m.score });
      byRef.set(m.metadata.refId, list);
    }
  }
  return byRef;
}

export function matchListing(listing: Listing): MatchResult[] {
  const visual = visualHits(listing);
  const ocr = ocrBrandHits(listing);
  const nonTarget = nonTargetBrandsOnTags(listing);
  const text = textHits(listing);
  const results: MatchResult[] = [];

  for (const ref of REFERENCES) {
    const vis = (visual.get(ref.id) ?? []).sort((a, b) => b.similarity - a.similarity);
    const bestSimilarity = vis[0]?.similarity ?? 0;
    const supportingKinds = [...new Set(vis.filter((v) => v.similarity >= SUPPORT_SIM).map((v) => v.kind))] as PhotoKind[];
    const ocrForRef = ocr.filter((o) => brandsRelated(o.brandId, ref.brandId));
    const textForRef = [...(text.brands.get(ref.brandId) ?? []), ...(text.models.get(ref.id) ?? [])];

    const isCandidate = bestSimilarity >= RULES.simFloor || ocrForRef.length > 0 || (text.brands.get(ref.brandId)?.length ?? 0) > 0;
    if (!isCandidate) continue;

    const visualScore = clamp(calibrate(bestSimilarity) + 0.05 * Math.max(0, supportingKinds.length - 1));

    // Evidence → independent "probability this is the item" contributions
    const pv = 0.85 * visualScore;
    const ocrExact = ocrForRef.filter((o) => o.brandId === ref.brandId);
    const ocrBest = Math.max(0, ...ocrExact.map((o) => o.score * 0.9), ...ocrForRef.filter((o) => o.brandId !== ref.brandId).map((o) => o.score * 0.6));
    const pBrandText = text.brands.has(ref.brandId) ? 0.35 : 0;
    const pModelText = text.models.has(ref.id) ? 0.2 : 0;

    let confidence = 1 - (1 - pv) * (1 - ocrBest) * (1 - pBrandText) * (1 - pModelText);
    const conflicts: string[] = [];
    const notes: string[] = [];

    if (nonTarget.length && ocrForRef.length === 0) {
      conflicts.push(`Tag reads ${nonTarget.join(", ")} — likely a lookalike`);
      confidence *= 0.2;
    }
    const otherBrands = ocr.filter((o) => !brandsRelated(o.brandId, ref.brandId));
    if (otherBrands.length && ocrForRef.length === 0) {
      conflicts.push(`Tag matches a different target brand (${brandById(otherBrands[0].brandId).name})`);
      confidence *= 0.3;
    }
    if ((ocrBest > 0 || pBrandText > 0) && visualScore < 0.25) {
      confidence = Math.min(confidence, 0.6);
      notes.push("Brand confirmed but the silhouette doesn't match this model");
    }
    if (ocrForRef.length === 0 && textForRef.length === 0 && conflicts.length === 0) {
      notes.push("Visual-only match — ask the seller for a tag or insole photo");
    }
    if (supportingKinds.length >= 2) notes.push(`Corroborated across ${supportingKinds.length} photo types (${supportingKinds.join(", ")})`);

    results.push({
      refId: ref.id,
      brandId: ref.brandId,
      confidence: clamp(confidence),
      visualScore,
      bestSimilarity,
      supportingKinds,
      visual: vis,
      ocr: ocrForRef,
      text: textForRef,
      conflicts,
      notes,
    });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}
