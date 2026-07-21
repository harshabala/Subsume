/**
 * Sliding-window per-origin rate limiter for content-script resolve traffic.
 * Limits background catalog/API work triggered from page origins (e.g. RESOLVE_PAGE_CANDIDATE).
 */

export const ORIGIN_RESOLVE_MAX_PER_WINDOW = 20;
export const ORIGIN_RESOLVE_WINDOW_MS = 60_000;

/** Friendly skip reason returned to content when quota is exceeded. */
export const ORIGIN_RATE_LIMIT_REASON = 'rate_limited' as const;

const hitsByKey = new Map<string, number[]>();

/**
 * Hostname for rate limiting, or null when the caller is the extension UI
 * (or URL is missing/unparseable) — those are never throttled.
 */
export function extractOriginHost(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === 'chrome-extension:' || u.protocol === 'moz-extension:') {
      return null;
    }
    const host = u.hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** Prefer tab URL (content script), fall back to sender.url. */
export function originHostFromSender(sender: chrome.runtime.MessageSender): string | null {
  return extractOriginHost(sender.tab?.url ?? sender.url);
}

export type OriginRateLimitResult =
  | { allowed: true; remaining: number }
  | {
      allowed: false;
      reason: typeof ORIGIN_RATE_LIMIT_REASON;
      remaining: 0;
      retryAfterMs: number;
    };

/**
 * Try to consume one unit of quota for an origin within a sliding window.
 * When `originHost` is null (extension / unknown), always allow.
 */
export function tryConsumeOriginRateLimit(
  originHost: string | null,
  bucketKey = 'resolve',
  max: number = ORIGIN_RESOLVE_MAX_PER_WINDOW,
  windowMs: number = ORIGIN_RESOLVE_WINDOW_MS,
  now: number = Date.now()
): OriginRateLimitResult {
  if (!originHost) {
    return { allowed: true, remaining: max };
  }

  const key = `${bucketKey}::${originHost}`;
  const cutoff = now - windowMs;
  let hits = hitsByKey.get(key) ?? [];
  hits = hits.filter((t) => t > cutoff);

  if (hits.length >= max) {
    hitsByKey.set(key, hits);
    const oldest = hits[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      reason: ORIGIN_RATE_LIMIT_REASON,
      remaining: 0,
      retryAfterMs,
    };
  }

  hits.push(now);
  hitsByKey.set(key, hits);
  return { allowed: true, remaining: Math.max(0, max - hits.length) };
}

/** Test helper — clear all buckets. */
export function resetOriginRateLimitsForTests(): void {
  hitsByKey.clear();
}
