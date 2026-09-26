// Turns whatever the buyer typed on the search page into starter chips for
// the insider-details page: likely brand(s), their known misspellings, and
// the materials/details/keywords from that brand's reference items.

import { BRANDS, REFERENCES } from "./data/references.ts";
import { normaliseText, fuzzyFind } from "./fuzzy.ts";

const GENERIC_COLORS = ["Black", "Brown", "Indigo", "Olive drab", "Cream", "Tan", "Grey"];

function brandMatchesQuery(brand: (typeof BRANDS)[number], q: string): boolean {
  if (!q) return false;
  const names = [brand.name, ...brand.variants].map((v) => normaliseText(v)).filter((n) => n.length > 2);
  return names.some((n) => q.includes(n) || (fuzzyFind(n, q)?.score ?? 0) >= 0.6);
}

export function guessBrands(query: string) {
  const q = normaliseText(query);
  if (!q) return [];
  return BRANDS.filter((b) => brandMatchesQuery(b, q));
}

export type InsiderSuggestions = {
  matchedBrandNames: string[];
  variantChips: string[];
  materialChips: string[];
  detailChips: string[];
  keywordChips: string[];
  colorChips: string[];
};

export function suggestHints(query: string): InsiderSuggestions {
  const matched = guessBrands(query);
  const refs = matched.length ? REFERENCES.filter((r) => matched.some((b) => b.id === r.brandId)) : [];

  const uniq = (xs: string[]) => [...new Set(xs)];

  return {
    matchedBrandNames: matched.map((b) => b.name),
    variantChips: uniq(matched.length ? matched.flatMap((b) => b.variants) : BRANDS.slice(0, 3).flatMap((b) => b.variants.slice(0, 2))),
    materialChips: uniq(refs.length ? refs.flatMap((r) => r.materials) : REFERENCES.flatMap((r) => r.materials)).slice(0, 10),
    detailChips: uniq(refs.length ? refs.flatMap((r) => r.details) : REFERENCES.flatMap((r) => r.details)).slice(0, 10),
    keywordChips: uniq(refs.length ? refs.flatMap((r) => r.keywords) : []).slice(0, 10),
    colorChips: GENERIC_COLORS,
  };
}
