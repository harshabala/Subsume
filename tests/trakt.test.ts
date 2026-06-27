import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTraktRating, getTraktTrending, searchTrakt, TRAKT_CLIENT_ID, __clearCache } from '@/background/trakt';

// Mock fetchWithRetry to avoid retries in tests
vi.mock('@/background/tmdb', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry as mockFetchWithRetry } from '@/background/tmdb';

beforeEach(() => {
  vi.clearAllMocks();
  __clearCache();
});

describe('TRAKT_CLIENT_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof TRAKT_CLIENT_ID).toBe('string');
    expect(TRAKT_CLIENT_ID.length).toBeGreaterThan(10);
  });
});

describe('fetchTraktRating', () => {
  it('returns a MediaRating with provider trakt', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ rating: 8.72, votes: 42000 }),
    });
    const rating = await fetchTraktRating('breaking-bad', 'tv');
    expect(rating).not.toBeNull();
    expect(rating!.provider).toBe('trakt');
    expect(rating!.score).toBeCloseTo(8.72);
    expect(rating!.votes).toBe(42000);
  });

  it('returns null on API error', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, status: 404 });
    const rating = await fetchTraktRating('nonexistent-slug', 'movie');
    expect(rating).toBeNull();
  });

  it('returns null on network failure', async () => {
    mockFetchWithRetry.mockRejectedValue(new Error('Network error'));
    const rating = await fetchTraktRating('breaking-bad', 'tv');
    expect(rating).toBeNull();
  });
});

describe('getTraktTrending', () => {
  it('returns trending movies as title/year/slug/watchers objects', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => [
        { watchers: 500, movie: { title: 'Oppenheimer', year: 2023, ids: { slug: 'oppenheimer-2023' } } },
        { watchers: 300, movie: { title: 'Barbie', year: 2023, ids: { slug: 'barbie-2023' } } },
      ],
    });
    const trending = await getTraktTrending('movie', 2);
    expect(trending).toHaveLength(2);
    expect(trending[0].title).toBe('Oppenheimer');
    expect(trending[0].year).toBe(2023);
    expect(trending[0].traktSlug).toBe('oppenheimer-2023');
    expect(trending[0].watchers).toBe(500);
  });

  it('returns trending TV shows', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => [
        { watchers: 1200, show: { title: 'The Bear', year: 2022, ids: { slug: 'the-bear' } } },
      ],
    });
    const trending = await getTraktTrending('tv', 1);
    expect(trending[0].title).toBe('The Bear');
  });

  it('returns empty array on error', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, status: 500 });
    const trending = await getTraktTrending('movie');
    expect(trending).toEqual([]);
  });
});

describe('searchTrakt', () => {
  it('returns MediaItems from search results', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          type: 'movie',
          score: 1000,
          movie: { title: 'The Matrix', year: 1999, ids: { slug: 'the-matrix', tmdb: 603 } },
        },
      ],
    });
    const results = await searchTrakt('the matrix', 'movie');
    expect(results).toHaveLength(1);
    expect(results[0].canonicalTitle).toBe('The Matrix');
    expect(results[0].type).toBe('movie');
    expect(results[0].year).toBe(1999);
    expect(results[0].id).toBe('trakt_movie_the-matrix');
  });

  it('returns empty array on error', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, status: 503 });
    const results = await searchTrakt('anything');
    expect(results).toEqual([]);
  });
});
