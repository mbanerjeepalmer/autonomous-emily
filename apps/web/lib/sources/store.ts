/**
 * Upstash-backed findings / run store with an in-process mirror.
 *
 * listFindings() stays sync for pipeline SSR: mirror is updated on upsert
 * and filled from Redis via refreshFindings() / hydrateRunFindings().
 *
 * Writes fail closed when Redis is required (Vercel / EMILY_REQUIRE_REDIS)
 * so a run cannot report "submitted" without listings other isolates can read.
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

export function missingRedisWriteError(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const required = Boolean(env.VERCEL || env.EMILY_REQUIRE_REDIS === "1");
  if (!required) return null;
  if (!env.UPSTASH_REDIS_REST_URL?.trim() || !env.UPSTASH_REDIS_REST_TOKEN?.trim()) {
    return "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured";
  }
  return null;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

function redisForWrite(): Redis | null {
  const missing = missingRedisWriteError();
  if (missing) throw new Error(missing);
  return getRedis();
}

function asListing(value: unknown): Listing | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const listing = value as Listing;
  return typeof listing.id === "string" && listing.id ? listing : null;
}

function putListings(ids: string[], values: unknown[]): void {
  for (let i = 0; i < ids.length; i++) {
    const listing = asListing(values[i]);
    if (listing) findingsMirror.set(ids[i]!, listing);
  }
}

async function loadListingsByIds(redis: Redis, ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  const values = await redis.mget<(Listing | null)[]>(...unique.map(findingKey));
  putListings(unique, Array.isArray(values) ? values : [values]);
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
    await loadListingsByIds(redis, ids);
  }
  // Always drop a stale empty pipeline cache — a prior SSR on this isolate
  // may have scored [] before this run's listings existed.
  invalidatePipelineCache?.();
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

/** Re-read findings from Redis so a later request sees MCP submissions. */
export async function refreshFindings(): Promise<void> {
  hydratePromise = loadFromRedis().catch((err) => {
    hydratePromise = null;
    throw err;
  });
  await hydratePromise;
}

/**
 * Load the listings named on a run record. The results page uses this so a
 * submitted run still renders even if `finding:ids` is incomplete.
 */
export async function hydrateRunFindings(requestId: string): Promise<RunRecord | null> {
  const id = requestId.trim();
  if (!id) return null;

  const run = await getRun(id);
  if (!run) return null;

  const redis = getRedis();
  if (redis && run.findingIds.length > 0) {
    await loadListingsByIds(redis, run.findingIds);
  }
  invalidatePipelineCache?.();
  return run;
}

/** Sync snapshot for pipeline merge. Call ensureStoreHydrated() first on cold start. */
export function listFindings(): Listing[] {
  return Array.from(findingsMirror.values());
}

export async function getRun(requestId: string): Promise<RunRecord | null> {
  const redis = getRedis();
  if (redis) {
    const record = await redis.get<RunRecord>(runKey(requestId));
    if (record) {
      runsMirror.set(requestId, record);
      return record;
    }
  }

  return runsMirror.get(requestId) ?? null;
}

/** Record that a run was started so the invoke UI can poll before findings arrive. */
export async function markRunPending(requestId: string): Promise<RunRecord> {
  const id = requestId.trim();
  if (!id) throw new Error("requestId is required");

  await ensureStoreHydrated();
  const existing = (await getRun(id)) ?? runsMirror.get(id);
  const record: RunRecord = {
    requestId: id,
    updatedAt: new Date().toISOString(),
    findingIds: existing?.findingIds ?? [],
    status: existing?.status === "submitted" || existing?.status === "empty" ? existing.status : "pending",
  };
  runsMirror.set(id, record);

  const redis = redisForWrite();
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

  const redis = redisForWrite();
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
