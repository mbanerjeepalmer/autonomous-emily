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

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

async function bumpPipelineCache(): Promise<void> {
  // INTEGRATE: Agent C adds invalidatePipelineCache()
  try {
    const mod = await import("@/lib/pipeline");
    if (typeof mod.invalidatePipelineCache === "function") {
      mod.invalidatePipelineCache();
    }
  } catch {
    // pipeline cache invalidation not available yet
  }
}

async function loadFromRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  const ids = (await redis.smembers(FINDING_IDS_KEY)) as string[];
  if (ids.length > 0) {
    const values = await redis.mget<Listing>(...ids.map(findingKey));
    for (let i = 0; i < ids.length; i++) {
      const listing = values[i];
      if (listing && typeof listing === "object") {
        findingsMirror.set(ids[i]!, listing);
      }
    }
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
