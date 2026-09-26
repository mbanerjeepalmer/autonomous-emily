// Turns "look more into this direction" into extra search terms, reusing the
// same coverage-style relevance scoring (relevance.ts) that typed criteria
// already go through — no separate recommendation model needed.

import { brandById, refById } from "./data/references";
import type { Opportunity } from "./types";

/** Descriptive terms (brand, materials, construction details) shared by the
 *  buyer's selected listings — the "direction" to lean into next. */
export function directionTermsFor(ids: string[], opportunities: Opportunity[]): string[] {
  const byId = new Map(opportunities.map((o) => [o.listing.id, o]));
  const terms = new Set<string>();
  for (const id of ids) {
    const o = byId.get(id);
    if (!o?.match) continue;
    const brand = brandById(o.match.brandId);
    const ref = refById(o.match.refId);
    terms.add(brand.name);
    for (const m of ref.materials) terms.add(m);
    for (const d of ref.details) terms.add(d);
  }
  return [...terms];
}

// Words too generic to act as a search term on their own — filtered out of
// free-text instructions so "I like your selection, go more into this
// direction" doesn't add noise like "this" or "direction" as criteria.
const STOPWORDS = new Set([
  "i", "you", "your", "yours", "me", "my", "we", "our", "it", "its", "this", "that", "these", "those",
  "like", "liked", "liking", "love", "loved", "want", "wanted", "wants", "need", "needed", "needs",
  "looking", "look", "looks", "more", "most", "less", "least", "some", "any", "all", "just", "really",
  "very", "please", "thanks", "thank", "go", "goes", "going", "direction", "selection", "selected",
  "select", "of", "in", "on", "at", "to", "for", "and", "or", "but", "with", "without", "the", "a", "an",
  "is", "are", "was", "were", "be", "been", "do", "does", "did", "can", "could", "would", "should",
  "will", "shall", "show", "find", "give", "get", "keep", "yes", "no", "again", "also", "too", "so",
  "than", "then", "up", "down", "now", "from", "into", "further", "closer", "one", "ones", "them",
]);

/** Best-effort keyword extraction from a free-text instruction. */
export function parseInstruction(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const terms = new Set<string>();
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    terms.add(w);
  }
  return [...terms];
}

/** Merge new terms into an existing comma-separated `details` value, deduped case-insensitively. */
export function mergeTerms(existing: string | undefined | null, additions: string[]): string {
  const current = existing
    ? existing.split(/[,\n/]/).map((s) => s.trim()).filter(Boolean)
    : [];
  const seen = new Set(current.map((t) => t.toLowerCase()));
  const merged = [...current];
  for (const t of additions) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(t);
    }
  }
  return merged.join(", ");
}
