# Web app (sourcing prototype)

Finds under-catalogued Japanese designer footwear on messy marketplaces by matching photos and tag text against a reference set. It then prices each find against sold comps and flags only high-confidence, high-margin buys for a human to review.

Marketplace listings on `/results` come from a live agent. The reference images, embeddings, OCR rules and comps used to *score* those finds are still a hard-coded prototype set. Completing a product brief starts Grok Bot (see [Live discovery agent](#live-discovery-agent) below).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pipeline checks
npm run test:e2e   # Playwright brief flow (starts next dev)
```

Requires Node 22+ (`npm test` uses `--experimental-strip-types`). For live discovery, configure the Grok Bot webhook, `TAVILY_API_KEY`, `APP_GATE_PASSWORD`, `SESSION_SECRET`, and Upstash Redis (see `.env.example`).

## Pages

A four-step flow for briefing the agent, then its results:

- `/`: step 1 — what are you looking for? Free text. An attached photo is optional; only the filename is used as a hint (pixels are not analyzed).
- `/insider`: step 2 — insider information (brand misspellings, materials, colourway, distinguishing details). Known brands are pre-filled from the reference set; chips stay editable.
- `/requirements`: step 3 — purchase requirements (budget, shipping destination, sizes you'll take). Destination changes landed-cost math. Grok Bot is the sourcing agent.
- `/results`: step 4 — starts Grok Bot, then ranked live opportunities for **this run** (once `requestId` is pinned), with filters (Flagged, Needs review, Passed, No match), a confidence score and an ease-of-shipping read per listing based on your destination. All findings (every run) is a separate link.
- `/listing/[id]`: side-by-side visual evidence, OCR reads, comps, landed cost, and buy/ask/dismiss buttons (decisions are saved in your browser)
- `/references`: the target universe (brands, variants, models, distinguishing details)
- `/api/opportunities`: the pipeline output as JSON

## How the pipeline maps to the spec

| Step | File | Prototype | Real version |
|---|---|---|---|
| 1. Target universe | `lib/data/references.ts` | 6 models, brand variants incl. kana/kanji and misspellings | Hundreds of models, real reference photos |
| 2. Scrape broadly | `lib/data/listings.ts` | Test-only fixtures (not shown in the product) | **Live**: Grok Bot via `/api/emily/invoke` + MCP |
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

## Live discovery agent

Completing the brief on `/results` starts Grok Bot. Findings are stored and scored with the rest of the pipeline:

- **Grok Bot** — `POST /api/emily/invoke` wakes the webhook routine and includes `mcpUrl` (`https://www.autonoemily.world/api/mcp`). The bot searches via that MCP’s `tavily_search` and closes the loop with `submit_findings` (full `RawFinding`s or Tavily-shaped title/url hits). The results page keeps `requestId` in the URL, polls `/api/emily/runs/[requestId]`, hydrates that run’s listings from Redis, and scores **that run** in the list. On Vercel, invoke/submit fail if Upstash Redis is unset so a run cannot report submitted without persistable listings. Local `NEXT_PUBLIC_APP_URL=http://localhost:3000` still sends the bot to the public MCP — the bot cannot reach localhost.
- `components/AgentRun.tsx` — signs in if needed, starts Grok Bot, and reports status above the scored list.

Live hits still lack real CLIP/OCR, so identity confidence is weaker than the old fixture set. Grok Bot needs the webhook + MCP setup. `/invoke` remains an operator shortcut for the same API.

## Caveats

- The reference details and comp prices are illustrative. Verify them before relying on them.
- Mercari JP, Yahoo Auctions JP and Facebook Marketplace restrict automated scraping in their terms. Check each source's terms before wiring up live adapters.
