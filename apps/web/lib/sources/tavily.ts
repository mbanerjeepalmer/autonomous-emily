/** Small, server-only Tavily adapter used by the MCP search tool. */
import type { TavilyHit } from "./types";

type TavilyResponse = {
  results?: Array<{
    title?: unknown;
    url?: unknown;
    content?: unknown;
    score?: unknown;
  }>;
};

const DEFAULT_MAX_RESULTS = 8;
const MAX_QUERY_LENGTH = 1_000;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Search Tavily and return only the stable fields exposed to the Bot. */
export async function searchTavily(query: string, maxResults?: number): Promise<TavilyHit[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");

  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error("query is required");
  if (cleanQuery.length > MAX_QUERY_LENGTH) throw new Error(`query exceeds ${MAX_QUERY_LENGTH} characters`);

  const limit = Math.min(20, Math.max(1, Math.floor(maxResults ?? DEFAULT_MAX_RESULTS)));
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: cleanQuery,
      max_results: limit,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Tavily returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  const payload = (await response.json()) as TavilyResponse;
  return (payload.results ?? []).flatMap((result): TavilyHit[] => {
    const title = asText(result.title);
    const url = asText(result.url);
    if (!title || !url) return [];
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return [];
    } catch {
      return [];
    }
    return [{
      title,
      url,
      content: asText(result.content),
      score: typeof result.score === "number" && Number.isFinite(result.score) ? result.score : 0,
    }];
  });
}
