import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { hydrateRunFindings, refreshFindings } from "@/lib/sources/store";

// Strips embeddings so the payload stays readable; keep sketches for the bag UI.
export async function GET(request: Request) {
  await refreshFindings();
  const requestId = new URL(request.url).searchParams.get("requestId")?.trim();
  if (requestId) await hydrateRunFindings(requestId);
  const data = runPipeline().map((o) => ({
    ...o,
    listing: { ...o.listing, photos: o.listing.photos.map(({ embedding: _e, ...p }) => p) },
  }));
  return NextResponse.json(data);
}
