import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mapWatchProvidersResponse,
  fetchWatchProviders,
  setTmdbApiKey,
  TmdbWatchProvidersResponse,
} from '@/background/tmdb';

const US_PROVIDERS: TmdbWatchProvidersResponse = {
  id: 550,
  results: {
    US: {
      link: 'https://www.themoviedb.org/movie/550/watch?locale=US',
      flatrate: [
        { provider_id: 8, provider_name: 'Netflix' },
        { provider_id: 337, provider_name: 'Disney+' },
      ],
      rent: [{ provider_id: 2, provider_name: 'Apple TV' }],
      buy: [{ provider_id: 3, provider_name: 'Google Play Movies' }],
    },
  },
};

describe('mapWatchProvidersResponse', () => {
  it('maps flatrate, rent, and buy providers for a region', () => {
    const result = mapWatchProvidersResponse(US_PROVIDERS, 'US', 'movie');

    expect(result).toEqual([
      { region: 'US', platform: 'Netflix', url: US_PROVIDERS.results.US.link },
      { region: 'US', platform: 'Disney+', url: US_PROVIDERS.results.US.link },
      { region: 'US', platform: 'Apple TV', url: US_PROVIDERS.results.US.link },
      { region: 'US', platform: 'Google Play Movies', url: US_PROVIDERS.results.US.link },
    ]);
  });

  it('returns empty array when region has no provider data', () => {
    const result = mapWatchProvidersResponse(US_PROVIDERS, 'GB', 'movie');
    expect(result).toEqual([]);
  });

  it('adds In Theaters for recent theatrical releases without flatrate', () => {
    const noStreaming: TmdbWatchProvidersResponse = {
      id: 123,
      results: {
        US: {
          link: 'https://www.themoviedb.org/movie/123/watch?locale=US',
          rent: [{ provider_id: 2, provider_name: 'Apple TV' }],
        },
      },
    };

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 14);
    const releaseDate = recentDate.toISOString().split('T')[0];

    const result = mapWatchProvidersResponse(noStreaming, 'US', 'movie', {
      releaseDate,
    });

    expect(result[0]).toEqual({ region: 'US', platform: 'In Theaters' });
    expect(result.some((r) => r.platform === 'Apple TV')).toBe(true);
  });

  it('does not add In Theaters when flatrate streaming is available', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const releaseDate = recentDate.toISOString().split('T')[0];

    const result = mapWatchProvidersResponse(US_PROVIDERS, 'US', 'movie', {
      releaseDate,
    });

    expect(result.some((r) => r.platform === 'In Theaters')).toBe(false);
  });

  it('does not add In Theaters for TV shows', () => {
    const tvProviders: TmdbWatchProvidersResponse = {
      id: 1399,
      results: {
        US: {
          flatrate: [{ provider_id: 8, provider_name: 'Netflix' }],
        },
      },
    };

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const result = mapWatchProvidersResponse(tvProviders, 'US', 'tv', {
      releaseDate: recentDate.toISOString().split('T')[0],
    });

    expect(result).toEqual([
      { region: 'US', platform: 'Netflix', url: undefined },
    ]);
  });
});

describe('fetchWatchProviders', () => {
  beforeEach(() => {
    setTmdbApiKey('test-tmdb-key');
    vi.restoreAllMocks();
  });

  it('fetches and maps watch providers from TMDb', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => US_PROVIDERS,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWatchProviders('550', 'movie', 'US');

    expect(result.map((r) => r.platform)).toEqual([
      'Netflix',
      'Disney+',
      'Apple TV',
      'Google Play Movies',
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/550/watch/providers',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-tmdb-key' },
      })
    );
  });

  it('caches watch provider results for 24 hours', async () => {
    const cacheOnlyProviders: TmdbWatchProvidersResponse = {
      id: 551,
      results: {
        US: {
          flatrate: [{ provider_id: 15, provider_name: 'Hulu' }],
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => cacheOnlyProviders,
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchWatchProviders('551', 'tv', 'US');
    await fetchWatchProviders('551', 'tv', 'US');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches theatrical release dates for movies and adds In Theaters when appropriate', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);
    const releaseDateStr = recentDate.toISOString();

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/watch/providers')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 999,
            results: { US: { link: 'https://example.com/watch' } },
          }),
        });
      }
      if (url.includes('/release_dates')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [{ type: 3, release_date: releaseDateStr }],
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWatchProviders('999', 'movie', 'US');

    expect(result[0]).toEqual({ region: 'US', platform: 'In Theaters' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/999/release_dates',
      expect.any(Object)
    );
  });
});