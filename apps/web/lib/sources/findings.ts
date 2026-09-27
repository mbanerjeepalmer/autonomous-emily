/**
 * Converts the deliberately small Bot-facing RawFinding contract into the
 * richer Listing shape used by the existing matching pipeline.
 *
 * Real CLIP embeddings and image thumbnails are a later concern.  For now we
 * retain the image URL as the stable embedding seed and render a neutral,
 * deterministic placeholder sketch, so an untrusted submission can safely be
 * scored and displayed immediately.
 */
import { genericEmbedding } from "../mockEmbeddings.ts";
import type {
  Condition,
  Listing,
  ListingPhoto,
  PhotoKind,
  Sketch,
  SourceId,
} from "../types.ts";
import type { RawFinding, RawFindingPhoto } from "./types";

const SOURCES: readonly SourceId[] = [
  "mercari_jp",
  "yahoo_auctions_jp",
  "ebay",
  "facebook_marketplace",
  "estate_sale",
];

const CONDITIONS: readonly Condition[] = ["new", "like-new", "used", "worn"];
const PHOTO_KINDS: readonly PhotoKind[] = ["side", "sole", "tag", "detail"];

function required(value: string, name: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${name} is required`);
  return trimmed;
}

/** Listing ids become `/listing/[id]` segments — strip path-breaking characters. */
export function listingId(externalId: string): string {
  return `bot:${required(externalId, "externalId").replace(/[/\\?#]+/g, "-")}`;
}

function httpUrl(value: string, name: string): string {
  const url = required(value, name);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return parsed.toString();
  } catch {
    throw new Error(`${name} must be an http(s) URL`);
  }
}

function supported<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${name} is invalid`);
  }
  return value as T;
}

function sketchFor(kind: PhotoKind): Sketch {
  // These are intentionally neutral: they must never imply visual evidence
  // that the bot has not actually generated with an image model.
  return {
    shape: "plain",
    color: "#4b4a46",
    accent: "#b8b2a8",
    sole: kind === "sole" ? "flat" : "cup",
    bg: "#e8e5de",
  };
}

function defaultKind(photo: RawFindingPhoto, index: number): PhotoKind {
  if (photo.kind) return supported(photo.kind, PHOTO_KINDS, "photo kind");
  if (photo.ocrText?.trim()) return "tag";
  return index === 0 ? "side" : "detail";
}

function toPhoto(listingId: string, photo: RawFindingPhoto, index: number): ListingPhoto {
  const url = httpUrl(photo.url, `photos[${index}].url`);
  const kind = defaultKind(photo, index);
  const ocrText = photo.ocrText?.trim() || undefined;
  return {
    id: `${listingId}:p${index + 1}`,
    kind,
    sketch: sketchFor(kind),
    embedding: genericEmbedding(url, kind),
    url,
    ...(ocrText ? { ocrText } : {}),
  };
}

export type LooseFinding = {
  title: string;
  url: string;
  source?: string;
  price?: string;
  snippet?: string;
};

function sourceFromHint(url: string, hint?: string): SourceId {
  const hay = `${hint ?? ""} ${url}`.toLowerCase();
  if (hay.includes("mercari")) return "mercari_jp";
  if (hay.includes("yahoo") || hay.includes("auctions") || hay.includes("buyee")) return "yahoo_auctions_jp";
  if (hay.includes("ebay")) return "ebay";
  if (hay.includes("facebook") || hay.includes("fb.com")) return "facebook_marketplace";
  return "estate_sale";
}

function parsePrice(raw?: string): { amount: number; currency: "GBP" | "USD" | "JPY" | "EUR" } {
  if (!raw) return { amount: 0, currency: "GBP" };
  const text = raw.replace(/,/g, "").trim();
  const amount = Number.parseFloat(text.replace(/[^0-9.]+/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return { amount: 0, currency: "GBP" };
  if (/¥|円|\bjpy\b/i.test(text)) return { amount, currency: "JPY" };
  if (/€|\beur\b/i.test(text)) return { amount, currency: "EUR" };
  if (/\$|\busd\b/i.test(text)) return { amount, currency: "USD" };
  return { amount, currency: "GBP" };
}

function externalIdFromUrl(url: string): string {
  const parsed = new URL(url);
  const raw = `${parsed.hostname}${parsed.pathname}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return raw.slice(0, 80) || "listing";
}

/**
 * Map a live search hit into a Listing when the bot-facing RawFinding
 * contract cannot be filled (no photo URLs, messy price strings).
 */
export function listingFromLooseFinding(raw: LooseFinding): Listing {
  const url = httpUrl(raw.url, "url");
  const title = required(raw.title, "title");
  const id = listingId(externalIdFromUrl(url));
  const description = raw.snippet?.trim() || title;
  return {
    id,
    source: sourceFromHint(url, raw.source),
    url,
    title,
    description,
    price: parsePrice(raw.price),
    condition: "used",
    location: "Unknown",
    postedAt: new Date().toISOString(),
    photos: [{
      id: `${id}:p1`,
      kind: "side",
      sketch: sketchFor("side"),
      embedding: genericEmbedding(url, "side"),
    }],
  };
}

/** Validate and map a single Bot submission into the product pipeline shape. */
export function toListing(raw: RawFinding): Listing {
  const externalId = required(raw.externalId, "externalId");
  const source = supported(raw.source, SOURCES, "source");
  const amount = raw.price?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new Error("price.amount must be a non-negative finite number");
  }
  const currency = supported(raw.price?.currency, ["GBP", "USD", "JPY", "EUR"] as const, "price.currency");
  const postedAt = required(raw.postedAt, "postedAt");
  if (Number.isNaN(Date.parse(postedAt))) throw new Error("postedAt must be a valid date");
  if (!Array.isArray(raw.photos) || raw.photos.length === 0) {
    throw new Error("at least one photo is required");
  }

  const id = listingId(externalId);
  const seenUrls = new Set<string>();
  const photos = raw.photos
    .map((photo, index) => ({ photo, index }))
    .filter(({ photo }) => {
      const url = photo.url.trim();
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    })
    .map(({ photo, index }) => toPhoto(id, photo, index));

  if (photos.length === 0) throw new Error("at least one unique photo is required");

  const condition = raw.condition == null
    ? "used"
    : supported(raw.condition, CONDITIONS, "condition");
  const titleGloss = raw.titleGloss?.trim() || undefined;
  const size = raw.size?.trim() || undefined;

  return {
    id,
    source,
    url: httpUrl(raw.url, "url"),
    title: required(raw.title, "title"),
    ...(titleGloss ? { titleGloss } : {}),
    description: required(raw.description, "description"),
    price: { amount, currency },
    condition,
    ...(size ? { size } : {}),
    location: required(raw.location, "location"),
    postedAt,
    photos,
  };
}

/** Accept a full RawFinding or a Tavily-shaped hit that cannot fill photos. */
export function mapSubmittedFinding(raw: RawFinding | LooseFinding): Listing {
  if ("externalId" in raw && "photos" in raw) {
    return toListing(raw);
  }
  return listingFromLooseFinding(raw);
}
