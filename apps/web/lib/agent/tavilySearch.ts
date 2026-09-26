// Real "Scrape broadly" adapter for the discovery agent (see apps/web/README.md).
// Wraps Tavily's REST search API as a tool the agent can call.

import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

export async function tavilySearch(query: string, maxResults = 8): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results ?? [];
}

const tavilySearchParameters = Type.Object({
  query: Type.String({ description: "The search query, e.g. site or brand + model + \"for sale\"" }),
});

export const tavilySearchTool: AgentTool<typeof tavilySearchParameters> = {
  name: "tavily_search",
  label: "Search the web (Tavily)",
  description:
    "Search the live web for secondhand/resale marketplace listings, forum posts, or reference pages. " +
    "Returns titles, URLs and short content snippets for the top matches.",
  parameters: tavilySearchParameters,
  execute: async (_toolCallId, params) => {
    const results = await tavilySearch(params.query);
    return {
      content: [
        {
          type: "text",
          text: results.length
            ? results
                .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.content.slice(0, 400)}`)
                .join("\n\n")
            : "No results.",
        },
      ],
      details: { results },
    };
  },
};
