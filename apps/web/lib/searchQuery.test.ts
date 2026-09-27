import assert from "node:assert/strict";
import { test } from "node:test";
import { filenameToQuery } from "./searchQuery.ts";

test("filename becomes a searchable query", () => {
  assert.equal(filenameToQuery("visvim-fbt.jpg"), "visvim fbt");
  assert.equal(filenameToQuery("brown_suede_boots.PNG"), "brown suede boots");
  assert.equal(filenameToQuery(""), "");
});
