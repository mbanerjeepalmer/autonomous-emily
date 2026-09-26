/**
 * Upstash-backed findings / run store with an in-process mirror.
 *
 * listFindings() stays sync for pipeline SSR: mirror is updated on upsert
 * and filled once from Redis via ensureStoreHydrated().
 */
import { Redis } from "@upstash/redis";
import type { Listing } from "@/lib/types";
import type { RunRecord } from "@/lib/sources/types";

const FINDING_IDS_KEY = "finding:ids";

function findingKey(listingId: string): string {
  return `finding:${listingId}`;
}

function runKey(requestId: string): string {
  return `run:${requestId}`;
}

const findingsMirror = new Map<string, Listing>();
const runsMirror = new Map<string, RunRecord>();
let hydratePromise: Promise<void> | null = null;
let invalidatePipelineCache: (() => void) | null = null;

/** Register the pipeline cache invalidator without coupling the store to Next's module resolver. */
export function setPipelineCacheInvalidator(invalidator: () => void): void {
  invalidatePipelineCache = invalidator;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

async function bumpPipelineCache(): Promise<void> {
  invalidatePipelineCache?.();
}

async function loadFromRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const ids = (await redis.smembers(FINDING_IDS_KEY)) as string[];
  if (ids.length > 0) {
    const values = await redis.mget<Listing[]>(...ids.map(findingKey));
    for (let i = 0; i < ids.length; i++) {
      const listing = values[i];
      if (listing && typeof listing === "object") {
        findingsMirror.set(ids[i]!, listing);
      }
    }
    // A static-params pass may have populated the pipeline before hydration.
    // Clear it so the newly loaded mirror is included in the next render.
    invalidatePipelineCache?.();
  }
}

/** Hydrate the in-process mirror from Redis once (safe to call repeatedly). */
export async function ensureStoreHydrated(): Promise<void> {
  if (!hydratePromise) {
    hydratePromise = loadFromRedis().catch((err) => {
      hydratePromise = null;
      throw err;
    });
  }
  await hydratePromise;
}

/** Sync snapshot for pipeline merge. Call ensureStoreHydrated() first on cold start. */
export function listFindings(): Listing[] {
  return Array.from(findingsMirror.values());
}

export async function getRun(requestId: string): Promise<RunRecord | null> {
  const cached = runsMirror.get(requestId);
  if (cached) {
    return cached;
  }

  const redis = getRedis();
  if (!redis) {
    return null;
  }

  const record = await redis.get<RunRecord>(runKey(requestId));
  if (record) {
    runsMirror.set(requestId, record);
  }
  return record ?? null;
}

/** Record that a run was started so the invoke UI can poll before findings arrive. */
export async function markRunPending(requestId: string): Promise<RunRecord> {
  const id = requestId.trim();
  if (!id) throw new Error("requestId is required");

  await ensureStoreHydrated();
  const existing = runsMirror.get(id);
  const record: RunRecord = {
    requestId: id,
    updatedAt: new Date().toISOString(),
    findingIds: existing?.findingIds ?? [],
    status: "pending",
  };
  runsMirror.set(id, record);

  const redis = getRedis();
  if (redis) {
    await redis.set(runKey(id), record);
  }
  return record;
}

/**
 * Persist listings for a bot run, update RunRecord, refresh mirrors, invalidate pipeline cache.
 */
export async function upsertFindings(
  requestId: string,
  listings: Listing[],
): Promise<RunRecord> {
  await ensureStoreHydrated();

  const findingIds = listings.map((l) => l.id);
  const record: RunRecord = {
    requestId,
    updatedAt: new Date().toISOString(),
    findingIds,
    status: listings.length === 0 ? "empty" : "submitted",
  };

  for (const listing of listings) {
    findingsMirror.set(listing.id, listing);
  }
  runsMirror.set(requestId, record);

  const redis = getRedis();
  if (redis) {
    const pipeline = redis.pipeline();
    for (const listing of listings) {
      pipeline.set(findingKey(listing.id), listing);
      pipeline.sadd(FINDING_IDS_KEY, listing.id);
    }
    pipeline.set(runKey(requestId), record);
    await pipeline.exec();
  }

  await bumpPipelineCache();
  return record;
}
