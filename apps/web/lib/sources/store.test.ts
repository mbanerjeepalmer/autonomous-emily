import assert from "node:assert/strict";
import { test } from "node:test";
import { listingById } from "../data/listings.ts";
import {
  getRun,
  hydrateRunFindings,
  listFindings,
  markRunPending,
  missingRedisWriteError,
  refreshFindings,
  upsertFindings,
} from "./store.ts";

test("pending run is readable before findings arrive", async () => {
  const run = await markRunPending("run-pending-wave");
  assert.equal(run.status, "pending");
  assert.deepEqual(run.findingIds, []);
  assert.deepEqual(await getRun("run-pending-wave"), run);
});

test("hydrateRunFindings exposes submitted listings to the pipeline mirror", async () => {
  const fixture = listingById("fbm-2044")!;
  const finding = { ...fixture, id: "bot:hydrate-run", title: "Hydrated bot listing" };

  const run = await upsertFindings("run-hydrate-wave", [finding]);
  assert.equal(run.status, "submitted");
  assert.deepEqual(run.findingIds, [finding.id]);

  const hydrated = await hydrateRunFindings("run-hydrate-wave");
  assert.equal(hydrated?.status, "submitted");
  assert.ok(listFindings().some((listing) => listing.id === finding.id));
});

test("refreshFindings does not drop in-memory listings when Redis is unset", async () => {
  const fixture = listingById("fbm-2044")!;
  const finding = { ...fixture, id: "bot:refresh-memory", title: "Memory listing" };
  await upsertFindings("run-refresh-memory", [finding]);
  await refreshFindings();
  assert.ok(listFindings().some((listing) => listing.id === finding.id));
});

test("markRunPending does not clobber an already submitted run", async () => {
  const fixture = listingById("fbm-2044")!;
  const finding = { ...fixture, id: "bot:no-clobber", title: "Keep submitted" };
  await upsertFindings("run-no-clobber", [finding]);

  const again = await markRunPending("run-no-clobber");
  assert.equal(again.status, "submitted");
  assert.deepEqual(again.findingIds, [finding.id]);
});

test("writes fail closed on Vercel when Redis is not configured", () => {
  assert.match(
    missingRedisWriteError({ VERCEL: "1" }) ?? "",
    /UPSTASH_REDIS_REST_URL/,
  );
  assert.equal(
    missingRedisWriteError({
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    }),
    null,
  );
  assert.equal(missingRedisWriteError({}), null);
});
