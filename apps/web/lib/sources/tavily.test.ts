import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { searchTavily } from "./tavily.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.TAVILY_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalKey;
});

test("rejects an empty or overlong query before calling Tavily", async () => {
  process.env.TAVILY_API_KEY = "test-key";
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch;

  await assert.rejects(() => searchTavily("  "), /query is required/);
  await assert.rejects(() => searchTavily("x".repeat(1001)), /exceeds/);
  assert.equal(called, false);
});

test("returns only http(s) hits with a title and url", async () => {
  process.env.TAVILY_API_KEY = "test-key";
  globalThis.fetch = (async () =>
    Response.json({
      results: [
        { title: "Visvim FBT", url: "https://www.ebay.com/itm/1", content: "used", score: 0.9 },
        { title: "skip", url: "javascript:alert(1)", content: "", score: 1 },
        { title: "", url: "https://example.com", content: "no title", score: 0.2 },
      ],
    })) as typeof fetch;

  const hits = await searchTavily("visvim fbt");
  assert.deepEqual(hits, [
    { title: "Visvim FBT", url: "https://www.ebay.com/itm/1", content: "used", score: 0.9 },
  ]);
});
