import assert from "node:assert/strict";
import { test } from "node:test";
import { listingFromLooseFinding, toListing } from "./findings.ts";

const finding = {
  externalId: "ebay-123",
  source: "ebay" as const,
  url: "https://www.ebay.com/itm/123",
  title: "Unlabelled trainers",
  description: "Found at a marketplace.",
  price: { amount: 50, currency: "USD" as const },
  location: "London, UK",
  postedAt: "2026-09-26",
  photos: [
    { url: "https://images.example.test/side.jpg" },
    { url: "https://images.example.test/tag.jpg", ocrText: "VISV1M" },
  ],
};

test("maps a raw finding to a safe pipeline listing", () => {
  const listing = toListing(finding);
  assert.equal(listing.id, "bot:ebay-123");
  assert.equal(listing.condition, "used");
  assert.deepEqual(listing.photos.map((photo) => photo.kind), ["side", "tag"]);
  assert.equal(listing.photos[1]?.ocrText, "VISV1M");
  assert.equal(listing.photos[0]?.embedding.length, 64);
  assert.equal(listing.photos[0]?.url, "https://images.example.test/side.jpg");
});

test("rejects an unusable finding before it reaches the results UI", () => {
  assert.throws(
    () => toListing({ ...finding, photos: [{ url: "javascript:alert(1)" }] }),
    /http\(s\) URL/,
  );
  assert.throws(() => toListing({ ...finding, photos: [] }), /at least one photo/);
});

test("maps a search hit without inventing a photo URL", () => {
  const listing = listingFromLooseFinding({
    title: "visvim FBT",
    url: "https://www.ebay.com/itm/999",
    source: "eBay",
    price: "$180",
    snippet: "Size 9, used.",
  });
  assert.equal(listing.id, "bot:www-ebay-com-itm-999");
  assert.equal(listing.source, "ebay");
  assert.deepEqual(listing.price, { amount: 180, currency: "USD" });
  assert.equal(listing.photos[0]?.url, undefined);
  assert.equal(listing.description, "Size 9, used.");
});
