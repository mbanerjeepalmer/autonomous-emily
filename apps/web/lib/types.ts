// Shared types for the whole pipeline.
// In the prototype every value is hard-coded; in the real app each of these
// is produced by an adapter (Tavily discovery, OCR, CLIP embeddings, comps).

export type Currency = "GBP" | "USD" | "JPY" | "EUR";
export type Money = { amount: number; currency: Currency };

export type PhotoKind = "side" | "sole" | "tag" | "detail";
export type Condition = "new" | "like-new" | "used" | "worn";

export type SourceId =
  | "mercari_jp"
  | "yahoo_auctions_jp"
  | "ebay"
  | "facebook_marketplace"
  | "estate_sale";

export type CompSource = "grailed" | "ebay_sold" | "stockx" | "auction";

/** Parameters for the placeholder SVG "photos" used in the prototype. */
export type Sketch = {
  shape: "moc" | "boot" | "hightop" | "runner" | "derby" | "patchwork" | "plain";
  color: string;
  accent: string;
  sole: "vibram" | "waffle" | "flat" | "lug" | "cup";
  bg?: string;
  tagLines?: string[];
};

// ---------- 1. Target universe ----------

export type Brand = {
  id: string;
  name: string;
  /** Diffusion line / collab parent, e.g. Y-3 → Yohji Yamamoto. A tag naming the parent supports, not contradicts. */
  parent?: string;
  /** Romanised, kanji/katakana variants and common misspellings. */
  variants: string[];
};

export type ReferenceImage = {
  id: string;
  refId: string;
  kind: PhotoKind;
  caption: string;
  sketch: Sketch;
  embedding: number[];
};

export type ReferenceItem = {
  id: string;
  brandId: string;
  model: string;
  era: string;
  materials: string[];
  details: string[];
  /** Model-level keywords (silhouette names, lines) incl. Japanese. */
  keywords: string[];
  images: ReferenceImage[];
};

// ---------- 2. Scraped listings ----------

export type ListingPhoto = {
  id: string;
  kind: PhotoKind;
  sketch: Sketch;
  embedding: number[];
  /** Raw OCR output for this photo, if any text was found. */
  ocrText?: string;
};

export type Listing = {
  id: string;
  source: SourceId;
  url: string;
  title: string;
  /** English gloss for non-English titles (prototype only; real app would translate). */
  titleGloss?: string;
  description: string;
  price: Money;
  condition: Condition;
  size?: string;
  location: string;
  postedAt: string;
  photos: ListingPhoto[];
};

// ---------- 4. Comps ----------

export type Comp = {
  id: string;
  refId: string;
  source: CompSource;
  title: string;
  price: Money;
  soldAt: string;
  condition: Condition;
};

// ---------- 3/5. Pipeline outputs ----------

export type VisualEvidence = {
  photoId: string;
  refImageId: string;
  kind: PhotoKind;
  similarity: number;
};

export type OcrEvidence = {
  photoId: string;
  brandId: string;
  variant: string;
  matchedText: string;
  score: number;
};

export type TextEvidence = { field: "title" | "description"; term: string; level: "brand" | "model" };

export type MatchResult = {
  refId: string;
  brandId: string;
  confidence: number;
  visualScore: number;
  bestSimilarity: number;
  supportingKinds: PhotoKind[];
  visual: VisualEvidence[];
  ocr: OcrEvidence[];
  text: TextEvidence[];
  conflicts: string[];
  notes: string[];
};

export type CompUsed = Comp & { gbp: number; normalisedGbp: number; weight: number; ageDays: number };

export type Valuation = {
  estimate: number;
  low: number;
  high: number;
  comps: CompUsed[];
};

export type CostLine = { label: string; gbp: number };

export type Opportunity = {
  listing: Listing;
  askingGbp: number;
  landed: { total: number; lines: CostLine[] };
  match: MatchResult | null;
  candidates: MatchResult[];
  valuation: Valuation | null;
  margin: number | null;
  expectedProfit: number | null;
  score: number;
  status: "flagged" | "review" | "pass" | "no-match";
  reasons: string[];
};
