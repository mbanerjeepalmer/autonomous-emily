// Ranks opportunities against what the buyer typed in steps 1–2 (free-text
// search + insider hints). This is separate from match confidence: confidence
// is "is this genuine", relevance is "is this what you asked for".

import { normaliseText, fuzzyFind } from "./fuzzy.ts";
import { brandById, refById } from "./data/references.ts";
import type { Opportunity } from "./types.ts";

export type SearchCriteria = {
  q?: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  size?: string;
};

const HIT_THRESHOLD = 0.6;

function splitTerms(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function criteriaTerms(c: SearchCriteria): string[] {
  return [
    ...splitTerms(c.q),
    ...splitTerms(c.brand),
    ...splitTerms(c.material),
    ...splitTerms(c.color),
    ...splitTerms(c.details),
    ...splitTerms(c.size),
  ];
}

export function hasCriteria(c: SearchCriteria): boolean {
  return criteriaTerms(c).length > 0;
}

function haystackFor(o: Opportunity): string {
  const l = o.listing;
  const parts = [l.title, l.titleGloss ?? "", l.description, l.size ?? "", ...l.photos.map((p) => p.ocrText ?? "")];
  if (o.match) {
    const brand = brandById(o.match.brandId);
    const ref = refById(o.match.refId);
    parts.push(brand.name, ...brand.variants, ref.model, ...ref.materials, ...ref.details, ...ref.keywords);
  }
  return normaliseText(parts.join(" "));
}

export type Relevance = { score: number; matched: string[] };

/** Coverage-style score: fraction of the searcher's terms this opportunity backs up. */
export function relevance(o: Opportunity, criteria: SearchCriteria): Relevance {
  const terms = criteriaTerms(criteria);
  if (!terms.length) return { score: 0, matched: [] };

  const haystack = haystackFor(o);
  const matched: string[] = [];
  let sum = 0;
  for (const term of terms) {
    const needle = normaliseText(term);
    if (!needle) continue;
    const direct = haystack.includes(needle);
    const hit = direct ? { score: 1 } : fuzzyFind(needle, haystack);
    if (hit && hit.score >= HIT_THRESHOLD) {
      matched.push(term);
      sum += hit.score;
    }
  }
  return { score: terms.length ? sum / terms.length : 0, matched };
}
