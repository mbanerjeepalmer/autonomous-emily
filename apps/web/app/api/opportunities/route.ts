import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { ensureStoreHydrated } from "@/lib/sources/store";

// Strips embeddings so the payload stays readable.
export async function GET() {
  await ensureStoreHydrated();
  const data = runPipeline().map((o) => ({
    ...o,
    listing: { ...o.listing, photos: o.listing.photos.map(({ embedding: _e, sketch: _s, ...p }) => p) },
  }));
  return NextResponse.json(data);
}
