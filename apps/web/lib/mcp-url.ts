/** Public Streamable HTTP MCP endpoint Grok Bot can reach. */
export const PUBLIC_MCP_URL = "https://www.autonoemily.world/api/mcp";

/** Prefer the deployed app origin; never send localhost — the bot cannot reach it. */
export function publicMcpUrl(appUrl = process.env.NEXT_PUBLIC_APP_URL): string {
  const base = (appUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) return PUBLIC_MCP_URL;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:") return PUBLIC_MCP_URL;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return PUBLIC_MCP_URL;
    }
    return new URL("/api/mcp", url).href;
  } catch {
    return PUBLIC_MCP_URL;
  }
}
