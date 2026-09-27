import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzyFind, normaliseText } from "./fuzzy.ts";
import { evaluate, runPipeline, getOpportunity, landedCost } from "./pipeline.ts";
import { weightedQuantile } from "./valuation.ts";
import { LISTINGS, listingById } from "./data/listings.ts";
import { upsertFindings } from "./sources/store.ts";

test("OCR normalisation fixes common confusions", () => {
  assert.equal(normaliseText("VISV1M", true), "VISVIM");
  assert.equal(normaliseText("COMME des GARÇONS"), "COMME DES GARCONS");
  assert.ok(fuzzyFind("KAPITAL", normaliseText("KAPlTAL", true))!.score >= 0.8);
  assert.equal(fuzzyFind("CDG", "ABCDGE"), null, "short variants need whole-token match");
});

test("weighted median", () => {
  assert.equal(weightedQuantile([{ v: 1, w: 1 }, { v: 2, w: 1 }, { v: 10, w: 5 }], 0.5), 10);
});

test("badly described Mercari FBT is flagged", () => {
  const o = evaluate(listingById("mjp-4821")!);
  assert.equal(o.status, "flagged");
  assert.equal(o.match?.refId, "visvim-fbt");
});

test("Minnetonka lookalike is rejected despite visual similarity", () => {
  const o = evaluate(listingById("fbm-1188")!);
  assert.ok(o.match!.bestSimilarity > 0.85);
  assert.equal(o.status, "pass");
  assert.ok(o.match!.conflicts.length > 0);
});

test("visual-only match goes to review, not flagged", () => {
  assert.equal(evaluate(listingById("est-5521")!).status, "review");
});

test("correctly priced listings pass", () => {
  assert.equal(evaluate(listingById("eby-5507781")!).status, "pass");
  assert.equal(evaluate(listingById("eby-4410032")!).status, "pass");
});

test("unknown trainers have no match", () => {
  assert.equal(evaluate(listingById("fbm-2044")!).status, "no-match");
});

test("Y-3 tag naming Yohji supports rather than contradicts", () => {
  const o = evaluate(listingById("eby-3920155")!);
  assert.equal(o.match?.refId, "y3-qasa");
  assert.equal(o.match?.conflicts.length, 0);
});

test("landed cost adds VAT for imports, nothing for local pickup", () => {
  assert.ok(landedCost(listingById("mjp-4821")!).lines.some((l) => l.label.startsWith("Import VAT")));
  assert.equal(landedCost(listingById("fbm-1188")!).total, 60);
});

test("landed cost skips UK import when shipping stays in Japan", () => {
  const jp = landedCost(listingById("mjp-4821")!, "jp");
  assert.equal(jp.lines.some((l) => l.label.startsWith("Import VAT")), false);
  assert.equal(jp.lines.some((l) => l.label === "International shipping"), false);
  assert.ok(jp.total < landedCost(listingById("mjp-4821")!, "uk").total);
});

test("every fixture listing is evaluable", () => {
  assert.equal(LISTINGS.length, 11);
  for (const listing of LISTINGS) {
    assert.ok(evaluate(listing).listing.id);
  }
});

test("submitted findings are the only pipeline listings and invalidate the cache", async () => {
  const fixture = listingById("fbm-2044")!;
  const finding = {
    ...fixture,
    id: "bot:cache-invalidation",
    title: "Bot-submitted unknown trainers",
  };

  await upsertFindings("run-cache-invalidation", [finding]);

  const opportunity = getOpportunity(finding.id);
  assert.ok(runPipeline().every((o) => o.listing.id.startsWith("bot:")));
  assert.equal(opportunity?.listing.title, finding.title);
  assert.equal(opportunity?.status, "no-match");
});
