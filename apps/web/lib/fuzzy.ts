// OCR text is noisy: "VISV1M", "KAPlTAL", "GARC0NS". Normalise common OCR
// confusions, then fuzzy-match brand variants with a sliding Levenshtein window.

const OCR_CONFUSIONS: Record<string, string> = { "0": "O", "1": "I", "|": "I", "5": "S", "8": "B", "$": "S" };
const CJK = /[぀-ヿ㐀-鿿]/;

export function normaliseText(s: string, ocr = false): string {
  let t = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (ocr) t = t.replace(/[01|58$]/g, (c) => OCR_CONFUSIONS[c] ?? c);
  return t
    .toUpperCase()
    .replace(/[-_.·']/g, "")
    .replace(/[^A-Z0-9぀-ヿ㐀-鿿]+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export type FuzzyHit = { score: number; matchedText: string };

/**
 * Best fuzzy occurrence of `needle` in `haystack` (both already normalised).
 * Short needles (≤3 chars, e.g. "CDG", "Y3") must match a whole token exactly;
 * CJK needles must appear verbatim.
 */
export function fuzzyFind(needle: string, haystack: string): FuzzyHit | null {
  if (!needle || !haystack) return null;
  if (CJK.test(needle)) return haystack.includes(needle) ? { score: 1, matchedText: needle } : null;
  if (needle.replace(/ /g, "").length <= 3) {
    return haystack.split(" ").includes(needle) ? { score: 1, matchedText: needle } : null;
  }
  let best: FuzzyHit | null = null;
  const L = needle.length;
  for (let len = Math.max(1, L - 2); len <= L + 2; len++) {
    for (let i = 0; i + len <= haystack.length; i++) {
      // only start windows on a token boundary to avoid matching mid-word
      if (i > 0 && haystack[i - 1] !== " ") continue;
      const window = haystack.slice(i, i + len);
      const score = 1 - levenshtein(needle, window) / Math.max(L, len);
      if (!best || score > best.score) best = { score, matchedText: window.trim() };
    }
  }
  return best;
}
