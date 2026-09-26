// Real "Scrape broadly" adapter for the discovery agent (see apps/web/README.md).
// Wraps the shared Tavily adapter as a tool the Pi agent can call.

import { Type } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { searchTavily } from "@/lib/sources/tavily";
import type { TavilyHit } from "@/lib/sources/types";

export type TavilyResult = TavilyHit;

export async function tavilySearch(query: string, maxResults = 8): Promise<TavilyResult[]> {
  return searchTavily(query, maxResults);
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
