# Grail Finder: prototype

Finds under-catalogued Japanese designer footwear on messy marketplaces by matching photos and tag text against a reference set. It then prices each find against sold comps and flags only high-confidence, high-margin buys for a human to review.

This is a **hard-coded prototype**. The listings, reference images, embeddings, OCR output and comps are all fixed data. The matching, valuation and scoring logic is real and runs over that data.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pipeline checks
```

Requires Node 20.9+.

## Pages

- `/`: ranked opportunities with filters (Flagged, Needs review, Passed, No match)
- `/listing/[id]`: side-by-side visual evidence, OCR reads, comps, landed cost, and buy/ask/dismiss buttons (decisions are saved in your browser)
- `/references`: the target universe (brands, variants, models, distinguishing details)
- `/api/opportunities`: the pipeline output as JSON

## How the pipeline maps to the spec

| Step | File | Prototype | Real version |
|---|---|---|---|
| 1. Target universe | `lib/data/references.ts` | 6 models, brand variants incl. kana/kanji and misspellings | Hundreds of models, real reference photos |
| 2. Scrape broadly | `lib/data/listings.ts` | 11 messy listings from 5 sources | Tavily search → fetch → extract adapters in `lib/sources/` |
| 3a. Image embeddings | `lib/mockEmbeddings.ts` | Synthetic vectors that behave like CLIP | Hosted CLIP via Replicate |
| 3b. Vector search | `lib/vectorIndex.ts` | In-memory cosine, same shape as a Pinecone query | Pinecone index |
| 3c. OCR + fuzzy brand | `lib/fuzzy.ts`, `lib/match.ts` | OCR text hard-coded; fuzzy matching is real | OCR model on tag/insole photos |
| 4. Comps | `lib/data/comps.ts`, `lib/valuation.ts` | 24 illustrative sales; recency- and condition-weighted median | Grailed / eBay sold / StockX / auction feeds |
| 5. Score | `lib/pipeline.ts` | Landed cost to London, margin, confidence-weighted expected profit | Same |
| 6. Alert & verify | `app/`, `components/Decision.tsx` | Dashboard, decisions in localStorage | Push alerts, decisions stored server-side and used to tune thresholds |

All thresholds, FX rates, proxy and shipping costs and UK import assumptions are in `lib/config.ts`.

## How confidence works

Each signal gives an independent probability, and they are combined as `1 − Π(1 − p)`:

- **Visual**: the best same-kind cosine similarity (side vs side, tag vs tag), rescaled so that 0.72 maps to 0 and 0.95 maps to 1. There's a small bonus when several photo types agree.
- **OCR**: a fuzzy match of the tag text against brand variants, after fixing common OCR confusions (0→O, 1→I, 8→B).
- **Text**: brand or model words in the seller's title or description. This is a weak signal.

Penalties apply when the evidence contradicts itself. A tag reading a non-target brand (e.g. Minnetonka) multiplies confidence by 0.2. A tag naming a different target brand multiplies it by 0.3. If the brand is confirmed but the silhouette doesn't match, confidence is capped at 60%. Parent/line relationships (Y-3 → Yohji Yamamoto) support a match instead of contradicting it.

## Caveats

- The reference details and comp prices are illustrative. Verify them before relying on them.
- Mercari JP, Yahoo Auctions JP and Facebook Marketplace restrict automated scraping in their terms. Check each source's terms before wiring up live adapters.
