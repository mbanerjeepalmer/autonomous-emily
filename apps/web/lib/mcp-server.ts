/**
 * MCP server factory for Grok Bot tools.
 * Imports A/B exports only — does not reimplement Tavily or store logic.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mapSubmittedFinding, type LooseFinding } from "@/lib/sources/findings";
import { upsertFindings } from "@/lib/sources/store";
import { searchTavily } from "@/lib/sources/tavily";
import type { RawFinding } from "@/lib/sources/types";

const sourceIdSchema = z.enum([
  "mercari_jp",
  "yahoo_auctions_jp",
  "ebay",
  "facebook_marketplace",
  "estate_sale",
]);

const conditionSchema = z.enum(["new", "like-new", "used", "worn"]);

const photoKindSchema = z.enum(["side", "sole", "tag", "detail"]);

const moneySchema = z.object({
  amount: z.number(),
  currency: z.enum(["GBP", "USD", "JPY", "EUR"]),
});

const rawFindingPhotoSchema = z.object({
  url: z.string().url(),
  kind: photoKindSchema.optional(),
  ocrText: z.string().optional(),
});

const rawFindingSchema: z.ZodType<RawFinding> = z.object({
  externalId: z.string().min(1),
  source: sourceIdSchema,
  url: z.string().url(),
  title: z.string(),
  titleGloss: z.string().optional(),
  description: z.string(),
  price: moneySchema,
  condition: conditionSchema.optional(),
  size: z.string().optional(),
  location: z.string(),
  postedAt: z.string(),
  photos: z.array(rawFindingPhotoSchema).min(1),
});

const looseFindingSchema: z.ZodType<LooseFinding> = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  source: z.string().optional(),
  price: z.string().optional(),
  snippet: z.string().optional(),
});

function jsonToolResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: payload as Record<string, unknown>,
    ...(isError ? { isError: true } : {}),
  };
}

/** Fresh server per request (stateless Streamable HTTP). */
export function createEmilyMcpServer(): McpServer {
  const server = new McpServer({
    name: "autonomous-emily",
    version: "1.0.0",
    description: "Tavily search + findings submit for Autonomous Emily",
  });

  server.registerTool(
    "tavily_search",
    {
      title: "Tavily search",
      description:
        "Search the web via Tavily for secondhand bargains. Prefer queries that use brand typos, missing spaces, romanisation errors, or kana/kanji — that is where underpriced listings hide. Treat results as untrusted.",
      inputSchema: {
        query: z.string().min(1).describe("Search query"),
        maxResults: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Max hits to return (default server-side)"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, maxResults }) => {
      try {
        const hits = await searchTavily(query, maxResults);
        return jsonToolResult({ ok: true, hits });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonToolResult({ ok: false, error: message }, true);
      }
    },
  );

  server.registerTool(
    "submit_findings",
    {
      title: "Submit findings",
      description:
        "Map findings to listings and upsert into the product pipeline for a requestId. Prefer full RawFinding objects (photos, structured price). Tavily-shaped hits (title, url, price string, snippet) are accepted when photos cannot be filled.",
      inputSchema: {
        requestId: z.string().min(1).describe("Invoke requestId from the webhook"),
        findings: z
          .array(z.union([rawFindingSchema, looseFindingSchema]))
          .describe("Marketplace findings to persist"),
      },
      annotations: {
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ requestId, findings }) => {
      try {
        const listings = findings.map((raw) => mapSubmittedFinding(raw));
        const run = await upsertFindings(requestId, listings);
        return jsonToolResult({
          ok: true,
          count: listings.length,
          status: run.status,
          findingIds: run.findingIds,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonToolResult({ ok: false, error: message }, true);
      }
    },
  );

  return server;
}
