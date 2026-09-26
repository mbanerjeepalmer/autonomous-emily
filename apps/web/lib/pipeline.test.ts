import { test } from "node:test";
import assert from "node:assert/strict";
import { fuzzyFind, normaliseText } from "./fuzzy.ts";
import { runPipeline, getOpportunity, landedCost } from "./pipeline.ts";
import { weightedQuantile } from "./valuation.ts";
import { listingById } from "./data/listings.ts";
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
  const o = getOpportunity("mjp-4821")!;
  assert.equal(o.status, "flagged");
  assert.equal(o.match?.refId, "visvim-fbt");
});

test("Minnetonka lookalike is rejected despite visual similarity", () => {
  const o = getOpportunity("fbm-1188")!;
  assert.ok(o.match!.bestSimilarity > 0.85);
  assert.equal(o.status, "pass");
  assert.ok(o.match!.conflicts.length > 0);
});

test("visual-only match goes to review, not flagged", () => {
  assert.equal(getOpportunity("est-5521")!.status, "review");
});

test("correctly priced listings pass", () => {
  assert.equal(getOpportunity("eby-5507781")!.status, "pass");
  assert.equal(getOpportunity("eby-4410032")!.status, "pass");
});

test("unknown trainers have no match", () => {
  assert.equal(getOpportunity("fbm-2044")!.status, "no-match");
});

test("Y-3 tag naming Yohji supports rather than contradicts", () => {
  const o = getOpportunity("eby-3920155")!;
  assert.equal(o.match?.refId, "y3-qasa");
  assert.equal(o.match?.conflicts.length, 0);
});

test("landed cost adds VAT for imports, nothing for local pickup", () => {
  assert.ok(landedCost(listingById("mjp-4821")!).lines.some((l) => l.label.startsWith("Import VAT")));
  assert.equal(landedCost(listingById("fbm-1188")!).total, 60);
});

test("every listing is evaluated", () => {
  assert.equal(runPipeline().length, 11);
});

test("submitted findings are merged and invalidate the opportunity cache", async () => {
  const fixture = listingById("fbm-2044")!;
  const finding = {
    ...fixture,
    id: "bot:cache-invalidation",
    title: "Bot-submitted unknown trainers",
  };

  await upsertFindings("run-cache-invalidation", [finding]);

  const opportunity = getOpportunity(finding.id);
  assert.equal(runPipeline().length, 12);
  assert.equal(opportunity?.listing.title, finding.title);
  assert.equal(opportunity?.status, "no-match");
});
