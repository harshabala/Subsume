import { describe, it, expect, vi, beforeEach } from 'vitest';
import { discoverySearch } from '@/background/discoverySearch';
import { MediaItem } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getPreferences: vi.fn(),
  searchMediaByQuery: vi.fn(),
}));

vi.mock('@/background/tvmaze', () => ({
  searchTvMazeMulti: vi.fn(),
}));

vi.mock('@/background/trakt', () => ({
  searchTrakt: vi.fn(),
}));

vi.mock('@/background/tmdb', () => ({
  searchTitles: vi.fn(),
  setTmdbApiKey: vi.fn(),
}));

import { getPreferences, searchMediaByQuery } from '@/background/storage';
import { searchTvMazeMulti } from '@/background/tvmaze';
import { searchTrakt } from '@/background/trakt';
import { searchTitles, setTmdbApiKey } from '@/background/tmdb';

const LOCAL_ITEM: MediaItem = {
  id: 'seed_parasite',
  canonicalTitle: 'Parasite',
  type: 'movie',
  year: 2019,
  genres: ['Drama', 'Thriller'],
  ratings: [{ provider: 'tmdb', score: 8.5 }],
  providers: [],
  posterUrl: 'https://example.com/parasite.jpg',
  overview: 'A poor family schemes to become employed by a wealthy household.',
};

const TVMAZE_ITEM: MediaItem = {
  id: 'tvmaze_tv_169',
  canonicalTitle: 'Breaking Bad',
  type: 'tv',
  year: 2008,
  genres: ['Drama'],
  ratings: [{ provider: 'tvmaze', score: 9.3 }],
  providers: [{ provider: 'tvmaze', externalId: '169' }],
  posterUrl: 'https://example.com/bb.jpg',
  overview: 'A chemistry teacher turned drug lord.',
};

const TRAKT_ITEM: MediaItem = {
  id: 'trakt_movie_the-matrix',
  canonicalTitle: 'The Matrix',
  type: 'movie',
  year: 1999,
  genres: [],
  ratings: [],
  providers: [{ provider: 'trakt', externalId: 'the-matrix' }],
  posterUrl: '',
  overview: '',
};

const TMDB_ITEM: MediaItem = {
  id: 'tmdb_movie_603',
  canonicalTitle: 'The Matrix',
  type: 'movie',
  year: 1999,
  genres: ['Action', 'Sci-Fi'],
  ratings: [{ provider: 'tmdb', score: 8.7 }],
  providers: [{ provider: 'tmdb', externalId: '603' }],
  posterUrl: 'https://example.com/matrix.jpg',
  overview: 'A computer hacker learns about the true nature of reality.',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPreferences).mockResolvedValue({ tmdbApiKey: undefined } as any);
  vi.mocked(searchMediaByQuery).mockResolvedValue([LOCAL_ITEM]);
  vi.mocked(searchTvMazeMulti).mockResolvedValue([TVMAZE_ITEM]);
  vi.mocked(searchTrakt).mockResolvedValue([TRAKT_ITEM]);
  vi.mocked(searchTitles).mockResolvedValue([TMDB_ITEM]);
});

describe('discoverySearch', () => {
  it('returns empty array for blank query', async () => {
    const results = await discoverySearch('   ');
    expect(results).toEqual([]);
    expect(searchMediaByQuery).not.toHaveBeenCalled();
  });

  it('searches free sources in parallel without TMDb key', async () => {
    const results = await discoverySearch('para');

    expect(searchMediaByQuery).toHaveBeenCalledWith('para', undefined, 10);
    expect(searchTvMazeMulti).toHaveBeenCalledWith('para');
    expect(searchTrakt).toHaveBeenCalledWith('para', undefined);
    expect(searchTitles).not.toHaveBeenCalled();
    expect(setTmdbApiKey).not.toHaveBeenCalled();

    expect(results.some((item) => item.id === LOCAL_ITEM.id)).toBe(true);
    expect(results.some((item) => item.id === TVMAZE_ITEM.id)).toBe(true);
    expect(results.some((item) => item.id === TRAKT_ITEM.id)).toBe(true);
  });

  it('includes TMDb search when API key is configured', async () => {
    vi.mocked(getPreferences).mockResolvedValue({ tmdbApiKey: 'test-key' } as any);

    const results = await discoverySearch('matrix');

    expect(setTmdbApiKey).toHaveBeenCalledWith('test-key');
    expect(searchTitles).toHaveBeenCalledWith('matrix', undefined);
    expect(results.some((item) => item.id === TMDB_ITEM.id)).toBe(true);
  });

  it('merges duplicate titles preferring richer TMDb metadata', async () => {
    vi.mocked(getPreferences).mockResolvedValue({ tmdbApiKey: 'test-key' } as any);

    const results = await discoverySearch('matrix');
    const matrixResults = results.filter((item) => item.canonicalTitle === 'The Matrix');

    expect(matrixResults).toHaveLength(1);
    expect(matrixResults[0].id).toBe(TMDB_ITEM.id);
    expect(matrixResults[0].posterUrl).toBe(TMDB_ITEM.posterUrl);
    expect(matrixResults[0].overview).toBe(TMDB_ITEM.overview);
  });

  it('passes type filter to all sources', async () => {
    await discoverySearch('drama', 'tv');

    expect(searchMediaByQuery).toHaveBeenCalledWith('drama', 'tv', 10);
    expect(searchTrakt).toHaveBeenCalledWith('drama', 'tv');
    expect(searchTitles).not.toHaveBeenCalled();
  });

  it('continues when individual sources fail', async () => {
    vi.mocked(searchTvMazeMulti).mockRejectedValue(new Error('TVmaze down'));
    vi.mocked(searchTrakt).mockRejectedValue(new Error('Trakt down'));

    const results = await discoverySearch('parasite');

    expect(results.some((item) => item.id === LOCAL_ITEM.id)).toBe(true);
  });

  it('limits results to 20 items', async () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => ({
      ...LOCAL_ITEM,
      id: `seed_item_${i}`,
      canonicalTitle: `Title ${i}`,
      year: 2000 + i,
    }));
    vi.mocked(searchMediaByQuery).mockResolvedValue(manyItems);
    vi.mocked(searchTvMazeMulti).mockResolvedValue(manyItems.map((item) => ({ ...item, id: `tvmaze_${item.id}` })));

    const results = await discoverySearch('title');
    expect(results.length).toBeLessThanOrEqual(20);
  });
});