/**
 * Shared contracts for Grok Bot MCP → product pipeline.
 * Wave-1+ agents import these; do not redefine shapes elsewhere.
 */
import type {
  Condition,
  Money,
  PhotoKind,
  SourceId,
} from "@/lib/types";

export type RawFindingPhoto = {
  url: string;
  kind?: PhotoKind;
  ocrText?: string;
};

/** Bot / Tavily intake before mapping to Listing. */
export type RawFinding = {
  externalId: string;
  source: SourceId;
  url: string;
  title: string;
  titleGloss?: string;
  description: string;
  price: Money;
  condition?: Condition;
  size?: string;
  location: string;
  postedAt: string;
  photos: RawFindingPhoto[];
};

/** Tavily search hit returned to the Bot via MCP. */
export type TavilyHit = {
  title: string;
  url: string;
  content: string;
  score: number;
};

export type RunRecord = {
  requestId: string;
  updatedAt: string;
  /** Listing.id values, e.g. bot:${externalId} */
  findingIds: string[];
  status: "pending" | "submitted" | "empty";
};
