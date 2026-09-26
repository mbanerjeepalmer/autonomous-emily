// In-memory stand-in for Pinecone. Same shape as a Pinecone query so the
// swap is mechanical: index.query({ vector, topK, filter }) → { matches }.

import { REFERENCES } from "./data/references.ts";
import { cosine } from "./mockEmbeddings.ts";
import type { PhotoKind } from "./types.ts";

export type VectorRecord = { id: string; values: number[]; metadata: { refId: string; kind: PhotoKind } };
export type QueryMatch = { id: string; score: number; metadata: VectorRecord["metadata"] };

const records: VectorRecord[] = REFERENCES.flatMap((r) =>
  r.images.map((img) => ({ id: img.id, values: img.embedding, metadata: { refId: r.id, kind: img.kind } })),
);

export const referenceIndex = {
  size: records.length,
  query({ vector, topK = 10, filter }: { vector: number[]; topK?: number; filter?: { kind?: PhotoKind } }): { matches: QueryMatch[] } {
    const matches = records
      .filter((r) => !filter?.kind || r.metadata.kind === filter.kind)
      .map((r) => ({ id: r.id, score: cosine(vector, r.values), metadata: r.metadata }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { matches };
  },
};
