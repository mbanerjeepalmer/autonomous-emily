import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

// Strips embeddings so the payload stays readable.
export function GET() {
  const data = runPipeline().map((o) => ({
    ...o,
    listing: { ...o.listing, photos: o.listing.photos.map(({ embedding: _e, sketch: _s, ...p }) => p) },
  }));
  return NextResponse.json(data);
}
