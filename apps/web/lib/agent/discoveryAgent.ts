// Live version of step 2 ("Scrape broadly") from apps/web/README.md: a Pi
// agent (@earendil-works/pi-agent-core) with a Tavily search tool, used to
// find real marketplace listings for the buyer's brief. /api/discover maps
// its hits through listingFromLooseFinding and upserts them into the store
// so they appear on /results alongside fixture listings.

import { Agent } from "@earendil-works/pi-agent-core";
import { contentText, createModels } from "@earendil-works/pi-ai";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";
import { tavilySearchTool } from "./tavilySearch";

export type DiscoveryFinding = {
  title: string;
  url: string;
  source?: string;
  price?: string;
  snippet?: string;
};

export type DiscoveryBrief = {
  query: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  notes?: string;
  budget?: number;
  destination?: string;
  size?: string;
};

const DEFAULT_MODEL_ID = process.env.DISCOVERY_AGENT_MODEL || "openai/gpt-4o-mini";
const AGENT_TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT = `You are a sourcing scout for under-catalogued Japanese designer footwear
(brands like Yohji Yamamoto, visvim, Y-3, Comme des Garçons Homme Plus) on messy secondhand
marketplaces (eBay, Grailed, Yahoo Auctions Japan, Mercari, Vinted, estate sales, etc).

Given a buyer's brief, call tavily_search (1-3 times, with different phrasings/sites) to find
listings that are actually for sale right now. Then reply with ONLY a JSON object, no markdown
fences, no commentary, matching this shape:

{"findings": [{"title": string, "url": string, "source": string, "price": string | null, "snippet": string}]}

Rules:
- Only include listings tavily_search actually returned. Never invent a title, url or price.
- "source" is the site/marketplace name (e.g. "eBay", "Grailed", "Yahoo Auctions JP"), guessed from the URL.
- "price" is the asking price as shown on the page if you can tell from the snippet, else null.
- Prefer individual product/listing pages over articles, forums or brand homepages.
- Return at most 8 findings, best matches first. Return {"findings": []} if nothing relevant turned up.`;

function briefToPrompt(brief: DiscoveryBrief): string {
  const lines = [`Looking for: ${brief.query}`];
  if (brief.brand) lines.push(`Brand spellings/variants: ${brief.brand}`);
  if (brief.material) lines.push(`Material: ${brief.material}`);
  if (brief.color) lines.push(`Colour: ${brief.color}`);
  if (brief.details) lines.push(`Distinguishing details: ${brief.details}`);
  if (brief.notes) lines.push(`Insider tip from the buyer: ${brief.notes}`);
  if (brief.size) lines.push(`Size: ${brief.size}`);
  if (brief.budget) lines.push(`Budget (landed, GBP): ${brief.budget}`);
  if (brief.destination) lines.push(`Ships to: ${brief.destination}`);
  return lines.join("\n");
}

function parseFindings(text: string): DiscoveryFinding[] {
  const jsonText = text.trim().replace(/^```(?:json)?\n?/, "").replace(/```$/, "");
  const parsed = JSON.parse(jsonText) as { findings?: unknown };
  if (!Array.isArray(parsed.findings)) return [];
  return parsed.findings
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      title: String(f.title ?? "").slice(0, 300),
      url: String(f.url ?? ""),
      source: typeof f.source === "string" ? f.source : undefined,
      price: typeof f.price === "string" ? f.price : undefined,
      snippet: typeof f.snippet === "string" ? f.snippet.slice(0, 400) : undefined,
    }))
    .filter((f) => f.title && f.url);
}

export async function runDiscoveryAgent(brief: DiscoveryBrief): Promise<DiscoveryFinding[]> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY is not set");

  const models = createModels();
  models.setProvider(openrouterProvider());
  const model = models.getModel("openrouter", DEFAULT_MODEL_ID);
  if (!model) throw new Error(`Unknown discovery model: ${DEFAULT_MODEL_ID}`);

  const agent = new Agent({
    initialState: { systemPrompt: SYSTEM_PROMPT, model, tools: [tavilySearchTool] },
    streamFn: models.streamSimple.bind(models),
  });

  const timeout = setTimeout(() => agent.abort(), AGENT_TIMEOUT_MS);
  try {
    await agent.prompt(briefToPrompt(brief));
  } finally {
    clearTimeout(timeout);
  }

  const last = [...agent.state.messages].reverse().find((m) => m.role === "assistant");
  if (!last || last.role !== "assistant") throw new Error("Discovery agent produced no response");
  if (last.stopReason === "aborted") throw new Error("Discovery agent timed out");
  if (last.stopReason === "error") throw new Error(last.errorMessage || "Discovery agent request failed");

  const text = contentText(last.content);
  if (!text.trim()) throw new Error("Discovery agent returned an empty response");

  try {
    return parseFindings(text);
  } catch {
    throw new Error(`Discovery agent returned non-JSON output: ${text.slice(0, 200)}`);
  }
}
