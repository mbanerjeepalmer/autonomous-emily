import assert from "node:assert/strict";
import { test } from "node:test";
import { getRun, markRunPending } from "./store.ts";

test("pending run is readable before findings arrive", async () => {
  const run = await markRunPending("run-pending-wave");
  assert.equal(run.status, "pending");
  assert.deepEqual(run.findingIds, []);
  assert.deepEqual(await getRun("run-pending-wave"), run);
});
