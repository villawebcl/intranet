/**
 * In-memory rate limiter.
 *
 * IMPORTANT — production limitation: this store lives in the Node.js process.
 * In multi-instance deployments (Vercel, Railway with horizontal scaling, etc.)
 * each instance has its own independent store, so a distributed attacker can
 * bypass limits by spreading requests across instances.
 *
 * For production with multiple instances, replace this with a shared store:
 *   - Upstash Redis (serverless-friendly): https://upstash.com
 *   - Supabase DB-based counter (via RPC with window functions)
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Purge expired entries every 5 minutes to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(purgeExpired, CLEANUP_INTERVAL_MS).unref?.();
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { ok: true };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
