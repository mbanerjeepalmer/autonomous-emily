import assert from "node:assert/strict";
import { test } from "node:test";
import { BARGAIN_GOAL, bargainSpellings, briefToPrompt } from "./brief.ts";

test("brief tells the scout to hunt bargains via misspellings", () => {
  const prompt = briefToPrompt({ query: "visvim FBT" });
  assert.match(prompt, /bargain/i);
  assert.match(prompt, /misspell/i);
  assert.ok(prompt.startsWith(BARGAIN_GOAL));
});

test("expands a known brand into common typos and kana", () => {
  const spellings = bargainSpellings({ query: "visvim FBT" });
  assert.ok(spellings.includes("visvin"));
  assert.ok(spellings.includes("vizvim"));
  assert.ok(spellings.includes("ヴィズヴィム"));
});
