import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { refreshFindings } from "@/lib/sources/store";

// Strips embeddings so the payload stays readable; keep sketches for the bag UI.
export async function GET() {
  await refreshFindings();
  const data = runPipeline().map((o) => ({
    ...o,
    listing: { ...o.listing, photos: o.listing.photos.map(({ embedding: _e, ...p }) => p) },
  }));
  return NextResponse.json(data);
}
