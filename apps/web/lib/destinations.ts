// Where the buyer is, for the "ease of shipping" read on each opportunity.
// Illustrative, like the rest of the prototype's logistics numbers — the real
// version would call a live rates API per source/destination pair.

import { SOURCE_COSTS } from "./config.ts";
import type { SourceId } from "./types.ts";

export type DestinationId = "uk" | "eu" | "us" | "jp" | "other";

export const DESTINATIONS: { id: DestinationId; label: string; flag: string }[] = [
  { id: "uk", label: "United Kingdom", flag: "🇬🇧" },
  { id: "eu", label: "European Union", flag: "🇪🇺" },
  { id: "us", label: "United States", flag: "🇺🇸" },
  { id: "jp", label: "Japan", flag: "🇯🇵" },
  { id: "other", label: "Somewhere else", flag: "🌍" },
];

export const DEFAULT_DESTINATION: DestinationId = "uk";

export const isDestinationId = (v: string | undefined): v is DestinationId =>
  !!v && DESTINATIONS.some((d) => d.id === v);

const ORIGIN_BY_FLAG: Record<string, DestinationId> = { JP: "jp", US: "us", UK: "uk" };

export type ShippingEase = {
  level: "domestic" | "easy" | "moderate" | "hard";
  label: string;
  days: string;
  note: string;
};

export const EASE_TONE: Record<ShippingEase["level"], "good" | "warn" | "bad"> = {
  domestic: "good",
  easy: "good",
  moderate: "warn",
  hard: "bad",
};

/** Best-effort read on how easy it'd be to get this source's item to `destination`. */
export function shippingEase(source: SourceId, destination: DestinationId): ShippingEase {
  const origin = ORIGIN_BY_FLAG[SOURCE_COSTS[source].flag] ?? "other";

  if (origin === destination) {
    return { level: "domestic", label: "Domestic", days: "2–5 days", note: "Same country as the seller — no customs, no forwarder." };
  }
  if (origin === "jp") {
    if (destination === "uk" || destination === "eu") {
      return { level: "moderate", label: "Moderate", days: "10–18 days", note: "Needs a Japan proxy/forwarder; import VAT likely applies." };
    }
    return { level: "hard", label: "Harder", days: "3–4 weeks", note: "Needs a Japan proxy/forwarder and longer customs handling." };
  }
  if (destination === "uk" || destination === "eu") {
    return { level: "moderate", label: "Moderate", days: "7–14 days", note: "Standard international parcel; import VAT/duty may apply." };
  }
  if (destination === "us") {
    return { level: "easy", label: "Easy", days: "4–8 days", note: "Straightforward cross-border parcel." };
  }
  return { level: "hard", label: "Harder", days: "3–5+ weeks", note: "Limited direct courier options from this source to you." };
}
