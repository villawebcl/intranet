type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

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
