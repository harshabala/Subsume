import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractOriginHost,
  originHostFromSender,
  tryConsumeOriginRateLimit,
  resetOriginRateLimitsForTests,
  ORIGIN_RESOLVE_MAX_PER_WINDOW,
  ORIGIN_RATE_LIMIT_REASON,
} from '@/background/originRateLimit';

describe('extractOriginHost', () => {
  it('returns hostname for http(s) page URLs', () => {
    expect(extractOriginHost('https://www.goodreads.com/book/show/1')).toBe('www.goodreads.com');
    expect(extractOriginHost('http://example.com:8080/path')).toBe('example.com');
  });

  it('returns null for extension origins (not throttled)', () => {
    expect(extractOriginHost('chrome-extension://abc/ui/index.html')).toBeNull();
    expect(extractOriginHost('moz-extension://xyz/popup.html')).toBeNull();
  });

  it('returns null for missing or invalid URLs', () => {
    expect(extractOriginHost(null)).toBeNull();
    expect(extractOriginHost(undefined)).toBeNull();
    expect(extractOriginHost('not-a-url')).toBeNull();
  });
});

describe('originHostFromSender', () => {
  it('prefers tab.url over sender.url', () => {
    const host = originHostFromSender({
      tab: { url: 'https://page.example/book' } as chrome.tabs.Tab,
      url: 'https://other.example/',
    });
    expect(host).toBe('page.example');
  });

  it('falls back to sender.url', () => {
    const host = originHostFromSender({
      url: 'https://fallback.example/x',
    });
    expect(host).toBe('fallback.example');
  });
});

describe('tryConsumeOriginRateLimit', () => {
  beforeEach(() => {
    resetOriginRateLimitsForTests();
  });

  it('always allows when originHost is null (extension / unknown)', () => {
    for (let i = 0; i < ORIGIN_RESOLVE_MAX_PER_WINDOW + 5; i++) {
      const r = tryConsumeOriginRateLimit(null, 'resolve', 20, 60_000, 1_000 + i);
      expect(r.allowed).toBe(true);
    }
  });

  it(`allows up to ${ORIGIN_RESOLVE_MAX_PER_WINDOW} hits per origin per window`, () => {
    const origin = 'www.goodreads.com';
    const t0 = 1_000_000;
    for (let i = 0; i < ORIGIN_RESOLVE_MAX_PER_WINDOW; i++) {
      const r = tryConsumeOriginRateLimit(origin, 'resolve', ORIGIN_RESOLVE_MAX_PER_WINDOW, 60_000, t0 + i);
      expect(r.allowed).toBe(true);
      if (r.allowed) {
        expect(r.remaining).toBe(ORIGIN_RESOLVE_MAX_PER_WINDOW - (i + 1));
      }
    }
    const blocked = tryConsumeOriginRateLimit(
      origin,
      'resolve',
      ORIGIN_RESOLVE_MAX_PER_WINDOW,
      60_000,
      t0 + ORIGIN_RESOLVE_MAX_PER_WINDOW
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.reason).toBe(ORIGIN_RATE_LIMIT_REASON);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it('tracks origins independently', () => {
    const t0 = 2_000_000;
    for (let i = 0; i < ORIGIN_RESOLVE_MAX_PER_WINDOW; i++) {
      expect(tryConsumeOriginRateLimit('a.example', 'resolve', 20, 60_000, t0 + i).allowed).toBe(
        true
      );
    }
    expect(tryConsumeOriginRateLimit('a.example', 'resolve', 20, 60_000, t0 + 50).allowed).toBe(
      false
    );
    expect(tryConsumeOriginRateLimit('b.example', 'resolve', 20, 60_000, t0 + 50).allowed).toBe(
      true
    );
  });

  it('slides the window so old hits expire', () => {
    const origin = 'slide.example';
    const windowMs = 60_000;
    const max = 3;
    const t0 = 10_000_000;
    expect(tryConsumeOriginRateLimit(origin, 'resolve', max, windowMs, t0).allowed).toBe(true);
    expect(tryConsumeOriginRateLimit(origin, 'resolve', max, windowMs, t0 + 1).allowed).toBe(true);
    expect(tryConsumeOriginRateLimit(origin, 'resolve', max, windowMs, t0 + 2).allowed).toBe(true);
    expect(tryConsumeOriginRateLimit(origin, 'resolve', max, windowMs, t0 + 3).allowed).toBe(false);

    // After window elapses from the oldest hit, quota frees up.
    const after = tryConsumeOriginRateLimit(origin, 'resolve', max, windowMs, t0 + windowMs + 1);
    expect(after.allowed).toBe(true);
  });
});
