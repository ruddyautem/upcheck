type RateLimitBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateLimitBucket>();

export function getClientIdentifier(headers: Headers): string {
  // Enable only behind a proxy that replaces incoming forwarding headers.
  if (process.env.UPCHECK_TRUST_PROXY_HEADERS !== '1') return 'shared';
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown';
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size >= 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= 10_000) return { allowed: false, retryAfterSeconds: 60 };
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

let activeScans = 0;
export function acquireScanSlot() {
  if (activeScans >= 2) return null;
  activeScans++;
  let released = false;
  return () => { if (!released) { released = true; activeScans--; } };
}
