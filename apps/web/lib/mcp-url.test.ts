import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLIC_MCP_URL, publicMcpUrl } from "./mcp-url.ts";

test("uses the public app origin when it is https", () => {
  assert.equal(
    publicMcpUrl("https://www.autonoemily.world"),
    "https://www.autonoemily.world/api/mcp",
  );
});

test("falls back when the app URL is local or missing", () => {
  assert.equal(publicMcpUrl("http://localhost:3000"), PUBLIC_MCP_URL);
  assert.equal(publicMcpUrl(""), PUBLIC_MCP_URL);
  assert.equal(publicMcpUrl(undefined), PUBLIC_MCP_URL);
});
