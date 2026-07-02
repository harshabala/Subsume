import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/background/trakt', () => ({
  getTraktTrending: vi.fn(),
}));

vi.mock('@/background/tvmaze', () => ({
  fetchTvMazePremieres: vi.fn(),
}));

vi.mock('@/background/wikidata', () => ({
  fetchWikipediaSummary: vi.fn(),
}));

import { getTraktTrending } from '@/background/trakt';
import { fetchTvMazePremieres } from '@/background/tvmaze';
import { fetchWikipediaSummary } from '@/background/wikidata';
import {
  generateDiscoveryFeed,
  getDiscoveryFeed,
  isDiscoveryFeedStale,
  __clearDiscoveryFeedCache,
} from '@/background/discoveryFeed';

const mockGetTraktTrending = vi.mocked(getTraktTrending);
const mockFetchTvMazePremieres = vi.mocked(fetchTvMazePremieres);
const mockFetchWikipediaSummary = vi.mocked(fetchWikipediaSummary);

beforeEach(() => {
  vi.clearAllMocks();
  __clearDiscoveryFeedCache();
  mockFetchWikipediaSummary.mockResolvedValue(null);
});

describe('generateDiscoveryFeed', () => {
  it('aggregates Trakt trending and TVmaze premieres into feed items', async () => {
    mockGetTraktTrending.mockImplementation(async (type) => {
      if (type === 'movie') {
        return [{ title: 'Oppenheimer', year: 2023, traktSlug: 'oppenheimer-2023', watchers: 1200 }];
      }
      return [{ title: 'The Bear', year: 2022, traktSlug: 'the-bear', watchers: 900 }];
    });

    mockFetchTvMazePremieres.mockResolvedValue([
      {
        showId: 501,
        title: 'New Drama',
        year: 2026,
        airdate: '2026-07-05',
        season: 1,
        episodeNumber: 1,
        isSeriesPremiere: true,
        isSeasonPremiere: true,
        posterUrl: 'https://tvmaze.com/poster.jpg',
        rating: 8.1,
        url: 'https://www.tvmaze.com/shows/501',
        summary: 'A gripping new series.',
      },
    ]);

    const feed = await generateDiscoveryFeed({ enrichSummaries: false });

    expect(feed.items.length).toBeGreaterThanOrEqual(3);
    expect(feed.trendingCount).toBe(2);
    expect(feed.premiereCount).toBe(1);

    const premiere = feed.items.find((item) => item.source === 'tvmaze');
    expect(premiere).toMatchObject({
      title: 'New Drama',
      type: 'tv',
      posterUrl: 'https://tvmaze.com/poster.jpg',
      rating: 8.1,
    });
    expect(premiere?.reason).toContain('Series premiere');

    const movie = feed.items.find((item) => item.title === 'Oppenheimer');
    expect(movie).toMatchObject({
      type: 'movie',
      source: 'trakt',
    });
    expect(movie?.reason).toContain('1,200 watchers');
  });

  it('deduplicates titles that appear in both premieres and trending', async () => {
    mockGetTraktTrending.mockImplementation(async (type) => {
      if (type === 'movie') return [];
      return [{ title: 'Shared Show', year: 2024, traktSlug: 'shared-show', watchers: 400 }];
    });

    mockFetchTvMazePremieres.mockResolvedValue([
      {
        showId: 77,
        title: 'Shared Show',
        year: 2024,
        airdate: '2026-07-03',
        season: 2,
        episodeNumber: 1,
        isSeriesPremiere: false,
        isSeasonPremiere: true,
        url: 'https://www.tvmaze.com/shows/77',
      },
    ]);

    const feed = await generateDiscoveryFeed({ enrichSummaries: false });
    const shared = feed.items.filter((item) => item.title === 'Shared Show');

    expect(shared).toHaveLength(1);
    expect(shared[0].source).toBe('tvmaze');
  });

  it('enriches top items with Wikipedia summaries when enabled', async () => {
    mockGetTraktTrending.mockResolvedValue([]);
    mockFetchTvMazePremieres.mockResolvedValue([
      {
        showId: 10,
        title: 'Spotlight Series',
        year: 2025,
        airdate: '2026-07-02',
        season: 1,
        episodeNumber: 1,
        isSeriesPremiere: true,
        isSeasonPremiere: true,
        url: 'https://www.tvmaze.com/shows/10',
      },
    ]);
    mockFetchWikipediaSummary.mockResolvedValue(
      'Spotlight Series is an acclaimed limited series about memory and loss.'
    );

    const feed = await generateDiscoveryFeed({ enrichSummaries: true });

    expect(feed.items[0].source).toBe('wikidata');
    expect(feed.items[0].reason).toContain('Spotlight Series');
    expect(mockFetchWikipediaSummary).toHaveBeenCalledWith('Spotlight Series', 2025);
  });
});

describe('getDiscoveryFeed', () => {
  it('returns cached feed within TTL unless forced', async () => {
    mockGetTraktTrending.mockResolvedValue([
      { title: 'Cached Movie', year: 2024, traktSlug: 'cached-movie', watchers: 100 },
    ]);
    mockFetchTvMazePremieres.mockResolvedValue([]);

    const first = await getDiscoveryFeed();
    const second = await getDiscoveryFeed();

    expect(first.items[0].title).toBe('Cached Movie');
    expect(second).toEqual(first);
    expect(mockGetTraktTrending).toHaveBeenCalledTimes(2);

    mockGetTraktTrending.mockResolvedValue([
      { title: 'Fresh Movie', year: 2025, traktSlug: 'fresh-movie', watchers: 200 },
    ]);

    const forced = await getDiscoveryFeed(true);
    expect(forced.items.some((item) => item.title === 'Fresh Movie')).toBe(true);
    expect(mockGetTraktTrending).toHaveBeenCalledTimes(4);
  });
});

describe('isDiscoveryFeedStale', () => {
  it('returns true when feed is missing or older than one hour', () => {
    expect(isDiscoveryFeedStale(undefined)).toBe(true);
    expect(
      isDiscoveryFeedStale({
        generatedAt: Date.now() - 2 * 60 * 60 * 1000,
        items: [],
        trendingCount: 0,
        premiereCount: 0,
      })
    ).toBe(true);
    expect(
      isDiscoveryFeedStale({
        generatedAt: Date.now() - 10 * 60 * 1000,
        items: [],
        trendingCount: 0,
        premiereCount: 0,
      })
    ).toBe(false);
  });
});