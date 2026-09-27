import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { hydrateRunFindings, refreshFindings } from "@/lib/sources/store";
import { DEFAULT_DESTINATION, isDestinationId } from "@/lib/destinations";

// Strips embeddings so the payload stays readable; keep sketches for the bag UI.
export async function GET(request: Request) {
  await refreshFindings();
  const sp = new URL(request.url).searchParams;
  const requestId = sp.get("requestId")?.trim();
  const destParam = sp.get("dest") ?? undefined;
  const dest = isDestinationId(destParam) ? destParam : DEFAULT_DESTINATION;
  const run = requestId ? await hydrateRunFindings(requestId) : null;
  const scopedIds = requestId ? new Set(run?.findingIds ?? []) : null;
  const data = runPipeline(dest)
    .filter((o) => !scopedIds || scopedIds.has(o.listing.id))
    .map((o) => ({
      ...o,
      listing: { ...o.listing, photos: o.listing.photos.map(({ embedding: _e, ...p }) => p) },
    }));
  return NextResponse.json(data);
}
