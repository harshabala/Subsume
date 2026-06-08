import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchOmdbRatings, setOmdbApiKey } from '@/background/omdb';
import { enrichMediaWithOmdbRatings } from '@/background/tmdb';
import { MediaItem } from '@/shared/types';

describe('fetchOmdbRatings', () => {
  beforeEach(() => {
    setOmdbApiKey('');
    vi.restoreAllMocks();
  });

  it('returns empty array when no API key is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const ratings = await fetchOmdbRatings('Inception', 2010, 'movie');

    expect(ratings).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses IMDb and Rotten Tomatoes ratings from OMDb response', async () => {
    setOmdbApiKey('test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'True',
          imdbRating: '8.8',
          Ratings: [
            { Source: 'Internet Movie Database', Value: '8.8/10' },
            { Source: 'Rotten Tomatoes', Value: '87%' },
          ],
        }),
      })
    );

    const ratings = await fetchOmdbRatings('Inception', 2010, 'movie');

    expect(ratings).toEqual([
      { provider: 'imdb', score: 8.8 },
      { provider: 'rt', score: 87 },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.omdbapi.com/?apikey=test-key&t=Inception&y=2010&type=movie'
    );
  });

  it('returns empty array when OMDb reports not found', async () => {
    setOmdbApiKey('test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Response: 'False', Error: 'Movie not found!' }),
      })
    );

    const ratings = await fetchOmdbRatings('Nonexistent Title', 1999, 'movie');

    expect(ratings).toEqual([]);
  });

  it('does not cache invalid API key errors', async () => {
    setOmdbApiKey('bad-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Response: 'False', Error: 'Invalid API key!' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmdbRatings('Retry Title', 2020, 'movie');
    await fetchOmdbRatings('Retry Title', 2020, 'movie');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache rate limit errors', async () => {
    setOmdbApiKey('test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Response: 'False',
        Error: 'Request limit reached! Please try again later.',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmdbRatings('Limit Title', 2020, 'movie');
    await fetchOmdbRatings('Limit Title', 2020, 'movie');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses series type for TV shows', async () => {
    setOmdbApiKey('test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Response: 'True',
        imdbRating: '9.3',
        Ratings: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmdbRatings('Breaking Bad', 2008, 'tv');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.omdbapi.com/?apikey=test-key&t=Breaking%20Bad&y=2008&type=series'
    );
  });

  it('caches results for 24 hours', async () => {
    setOmdbApiKey('test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Response: 'True',
        imdbRating: '7.5',
        Ratings: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmdbRatings('Cache Test Title', 2020, 'movie');
    await fetchOmdbRatings('Cache Test Title', 2020, 'movie');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('enrichMediaWithOmdbRatings', () => {
  beforeEach(() => {
    setOmdbApiKey('');
    vi.restoreAllMocks();
  });

  it('merges OMDb ratings without duplicating existing providers', async () => {
    setOmdbApiKey('test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Response: 'True',
          imdbRating: '8.1',
          Ratings: [{ Source: 'Rotten Tomatoes', Value: '92%' }],
        }),
      })
    );

    const item: MediaItem = {
      id: 'tmdb_movie_1',
      canonicalTitle: 'Enrich Test Movie',
      type: 'movie',
      year: 2020,
      genres: [],
      ratings: [
        { provider: 'tmdb', score: 7.5 },
        { provider: 'imdb', score: 8.0 },
      ],
      providers: [],
      posterUrl: '',
    };

    const enriched = await enrichMediaWithOmdbRatings(item);

    expect(enriched.ratings).toEqual([
      { provider: 'tmdb', score: 7.5 },
      { provider: 'imdb', score: 8.0 },
      { provider: 'rt', score: 92 },
    ]);
  });
});