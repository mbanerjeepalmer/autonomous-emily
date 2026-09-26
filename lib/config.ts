import type { Currency, SourceId } from "./types.ts";

/** Fixed "today" so the prototype is deterministic. */
export const NOW = new Date("2026-09-26T12:00:00Z");

/** GBP per unit of currency. Hard-coded for the prototype — swap for a live FX feed. */
export const FX_TO_GBP: Record<Currency, number> = {
  GBP: 1,
  USD: 0.75,
  EUR: 0.85,
  JPY: 0.0051,
};

/** Rules that decide what gets flagged. Tune these first. */
export const RULES = {
  /** Min match confidence to flag automatically. */
  flagConfidence: 0.8,
  /** Min confidence to surface for manual review. */
  reviewConfidence: 0.55,
  /** (estimate − landed cost) / landed cost. */
  minMargin: 0.5,
  /** Confidence-weighted profit in GBP. */
  minExpectedProfit: 120,
  /** Need at least this many comps to trust a valuation. */
  minComps: 3,
  /** If it turns out not to be genuine, assume you recover this share of landed cost. */
  wrongMatchRecovery: 0.4,
  /** Cosine similarity calibration for CLIP-style embeddings. */
  simFloor: 0.72,
  simCeil: 0.95,
};

export const CONDITION_FACTOR = { new: 1, "like-new": 0.9, used: 0.75, worn: 0.55 } as const;

/** Rough costs to get an item to London. Illustrative — edit to match your proxy/courier. */
export const SOURCE_COSTS: Record<
  SourceId,
  { label: string; flag: string; proxyFeePct?: number; proxyFixedJpy?: number; domesticShipGbp?: number; intlShipGbp: number; imported: boolean }
> = {
  mercari_jp: { label: "Mercari Japan", flag: "JP", proxyFeePct: 0.05, proxyFixedJpy: 300, domesticShipGbp: 5, intlShipGbp: 32, imported: true },
  yahoo_auctions_jp: { label: "Yahoo! Auctions JP", flag: "JP", proxyFeePct: 0.05, proxyFixedJpy: 300, domesticShipGbp: 5, intlShipGbp: 32, imported: true },
  ebay: { label: "eBay", flag: "US", intlShipGbp: 25, imported: true },
  facebook_marketplace: { label: "Facebook Marketplace", flag: "UK", intlShipGbp: 0, imported: false },
  estate_sale: { label: "EstateSales (US)", flag: "US", intlShipGbp: 30, imported: true },
};

/** UK import: VAT on everything; customs duty only above £135 consignment value. */
export const IMPORT = { vat: 0.2, duty: 0.08, dutyThresholdGbp: 135 };

/** Brands that, if read on a tag, contradict a designer match. */
export const NON_TARGET_BRANDS = ["MINNETONKA", "CLARKS", "SKECHERS", "DR. MARTENS", "ZARA", "H&M", "SHEIN", "VANS", "TIMBERLAND", "ECCO"];
