import { guessBrands } from "../suggest.ts";

export type DiscoveryFinding = {
  title: string;
  url: string;
  source?: string;
  price?: string;
  snippet?: string;
};

export type DiscoveryBrief = {
  query: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  notes?: string;
  budget?: number;
  destination?: string;
  size?: string;
};

/** Trusted goal on every Grok Bot webhook — not taken from the buyer task. */
export const BARGAIN_GOAL =
  "Find underpriced secondhand bargains of the target footwear. The money is in listings sellers catalogued badly: typos, missing spaces, romanisation errors, kana/kanji, or split brand names. Search those misspellings explicitly. Skip retail, lookbooks, and full-price catalog pages.";

function buyerSpellings(brand: string | undefined): string[] {
  if (!brand) return [];
  return brand
    .split(/[,;/|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Buyer chips plus known-brand typos/kana from the reference set. */
export function bargainSpellings(brief: DiscoveryBrief): string[] {
  const matched = guessBrands([brief.query, brief.brand].filter(Boolean).join(" "));
  return [...new Set([...buyerSpellings(brief.brand), ...matched.flatMap((b) => b.variants)])];
}

/** Prompt for Grok Bot invoke. */
export function briefToPrompt(brief: DiscoveryBrief): string {
  const spellings = bargainSpellings(brief);
  const lines = [BARGAIN_GOAL, `Looking for: ${brief.query}`];
  if (spellings.length) {
    lines.push(
      `Search each of these brand spellings/misspellings as its own query: ${spellings.join(", ")}`,
    );
  }
  if (brief.material) lines.push(`Material: ${brief.material}`);
  if (brief.color) lines.push(`Colour: ${brief.color}`);
  if (brief.details) lines.push(`Distinguishing details: ${brief.details}`);
  if (brief.notes) lines.push(`Insider tip from the buyer: ${brief.notes}`);
  if (brief.size) lines.push(`Size: ${brief.size}`);
  if (brief.budget) lines.push(`Budget (landed, GBP): ${brief.budget}`);
  if (brief.destination) lines.push(`Ships to: ${brief.destination}`);
  return lines.join("\n");
}
