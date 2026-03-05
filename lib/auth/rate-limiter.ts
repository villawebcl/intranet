import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Fallback in-memory limiter used only when DB RPC is unavailable.
 * Primary path uses a distributed Postgres-backed limiter via RPC.
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

function checkRateLimitInMemory(
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

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));

  try {
    const { data, error } = await supabase.rpc("check_auth_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      throw error;
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      retry_after_seconds?: number;
    };

    if (payload.ok) {
      return { ok: true };
    }

    const retryAfterSeconds = Math.max(1, Number(payload.retry_after_seconds ?? 1));
    return { ok: false, retryAfterSeconds };
  } catch {
    return checkRateLimitInMemory(key, limit, windowMs);
  }
}

export async function clearRateLimit(supabase: SupabaseClient, key: string) {
  try {
    await supabase.rpc("clear_auth_rate_limit", {
      p_key: key,
    });
  } catch {
    store.delete(key);
  }
}
