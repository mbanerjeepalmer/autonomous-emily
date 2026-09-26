// Deterministic fake CLIP-style embeddings.
//
// Real app: POST each image to a hosted CLIP model and store the vector.
// Prototype: we synthesise vectors whose cosine similarities behave like CLIP
// does on shoe photos — every shoe shares a common "shoe-ness" direction
// (so unrelated shoes still score ~0.5), and listing photos are built to sit at
// a chosen cosine from a specific reference image.

export const DIM = 64;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalise(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export const cosine = (a: number[], b: number[]) => dot(normalise(a), normalise(b));

function randomUnit(seed: string): number[] {
  const r = rng(seed);
  // Box–Muller for roughly isotropic directions
  const v = Array.from({ length: DIM }, () => {
    const u = Math.max(r(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  });
  return normalise(v);
}

const add = (...parts: [number, number[]][]) =>
  Array.from({ length: DIM }, (_, i) => parts.reduce((s, [w, v]) => s + w * v[i], 0));

const SHOE = randomUnit("__shoe__");

/** Embedding for a reference image: shoe-ness + item identity + photo-kind. */
export function referenceEmbedding(refId: string, kind: string): number[] {
  return normalise(add([0.75, SHOE], [0.55, randomUnit(`item:${refId}`)], [0.3, randomUnit(`kind:${kind}`)], [0.25, randomUnit(`img:${refId}:${kind}`)]));
}

/** A generic shoe photo with no particular identity. */
export function genericEmbedding(seed: string, kind: string): number[] {
  return normalise(add([0.75, SHOE], [0.3, randomUnit(`kind:${kind}`)], [0.6, randomUnit(`generic:${seed}`)]));
}

/** A vector at exactly cosine `c` from `target`, with the remainder in a generic-shoe direction. */
export function nearTo(target: number[], c: number, seed: string, kind: string): number[] {
  const t = normalise(target);
  const n = genericEmbedding(seed, kind);
  const proj = dot(n, t);
  const orth = normalise(n.map((x, i) => x - proj * t[i]));
  return normalise(t.map((x, i) => c * x + Math.sqrt(1 - c * c) * orth[i]));
}
