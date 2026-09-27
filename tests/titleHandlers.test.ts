import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type MediaItem, type UserPreferences } from '@/shared/types';

vi.mock('@/background/originRateLimit', () => ({
  originHostFromSender: vi.fn(() => 'example.com'),
  tryConsumeOriginRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
}));
vi.mock('@/background/discoverySearch', () => ({ discoverySearch: vi.fn(async () => ['discovery']) }));
vi.mock('@/background/openCaptureTab', () => ({ openCaptureCanvasTab: vi.fn(async () => ({ success: true, reused: true })) }));
vi.mock('@/background/tmdb', () => ({
  searchTitle: vi.fn(),
  searchTitles: vi.fn(),
  getLatestReleases: vi.fn(async () => ['latest']),
  enrichMediaWithOmdbRatings: vi.fn(async (m: MediaItem) => ({ ...m, ratings: [...m.ratings, { provider: 'imdb', score: 8 }] })),
  enrichMediaWithStreaming: vi.fn(async (m: MediaItem) => ({ ...m, streamingAvailability: [{ region: 'US', platform: 'x' }] })),
  makeBearerHeaders: vi.fn(() => ({})),
  fetchWithRetry: vi.fn(),
  POSTER_BASE_URL: 'https://img/',
}));
vi.mock('@/background/storage', () => ({
  findMediaByTitle: vi.fn(),
  putMediaItem: vi.fn(),
  getMediaItem: vi.fn(),
  getLibraryItem: vi.fn(),
  getAllMediaMap: vi.fn(),
  getPreferences: vi.fn(),
}));
vi.mock('@/background/tvmaze', () => ({ searchTvMaze: vi.fn() }));
vi.mock('@/background/trakt', () => ({ fetchTraktRating: vi.fn() }));
vi.mock('@/background/wikidata', () => ({ fetchWikipediaSummary: vi.fn(), fetchWikidataDirectorInfo: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { titleHandlers } from '@/background/handlers/titles';
import * as rate from '@/background/originRateLimit';
import * as tmdb from '@/background/tmdb';
import * as storage from '@/background/storage';
import { searchTvMaze } from '@/background/tvmaze';
import { fetchTraktRating } from '@/background/trakt';
import { fetchWikipediaSummary, fetchWikidataDirectorInfo } from '@/background/wikidata';
import { discoverySearch } from '@/background/discoverySearch';
import { openCaptureCanvasTab } from '@/background/openCaptureTab';
import { logger } from '@/shared/logger';

const sender = { tab: { url: 'https://example.com/x' } } as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown = {}) => titleHandlers[type]!(payload, sender);
const prefs = (over: Partial<UserPreferences> = {}) => ({ ...over }) as UserPreferences;
const media = (over: Partial<MediaItem> = {}): MediaItem => ({
  id: 'tmdb_movie_1',
  canonicalTitle: 'Dune',
  type: 'movie',
  year: 2021,
  genres: [],
  ratings: [],
  providers: [],
  overview: 'has overview',
  ...over,
});
let q = 0;
const uniq = (s: string) => `${s} ${++q}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rate.tryConsumeOriginRateLimit).mockReturnValue({ allowed: true, retryAfterMs: 0 } as never);
  vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
  vi.mocked(fetchWikipediaSummary).mockResolvedValue(null as never);
  vi.mocked(fetchWikidataDirectorInfo).mockResolvedValue(null as never);
  vi.mocked(fetchTraktRating).mockResolvedValue(null as never);
  vi.mocked(storage.getLibraryItem).mockResolvedValue(undefined);
  vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
  vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
});

describe('GET_TITLE_DETAILS', () => {
  it('returns null when the origin is rate limited', async () => {
    vi.mocked(rate.tryConsumeOriginRateLimit).mockReturnValue({ allowed: false, retryAfterMs: 1500 } as never);
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' })).resolves.toBeNull();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('rate-limited'), 'example.com', '(retry in 2s)');
  });

  it('enriches a cached title with OMDb ratings and streaming when missing', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media());
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ omdbApiKey: 'o', region: 'GB' }));
    const out = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Dune', yearGuess: 2021 })) as MediaItem;
    expect(tmdb.enrichMediaWithOmdbRatings).toHaveBeenCalled();
    expect(tmdb.enrichMediaWithStreaming).toHaveBeenCalledWith(expect.anything(), 'GB');
    expect(storage.putMediaItem).toHaveBeenCalledTimes(2);
    expect(out.streamingAvailability).toHaveLength(1);
  });

  it('returns a complete cached title untouched; defaults region to US', async () => {
    const full = media({
      ratings: [{ provider: 'imdb', score: 8 }, { provider: 'rt', score: 90 }],
      streamingAvailability: [{ region: 'US', platform: 'x' }],
    });
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(full);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ omdbApiKey: 'o' }));
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' })).resolves.toEqual(full);
    expect(storage.putMediaItem).not.toHaveBeenCalled();

    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media({ ratings: [{ provider: 'imdb', score: 8 }], streamingAvailability: [] }));
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    await call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' });
    expect(tmdb.enrichMediaWithOmdbRatings).not.toHaveBeenCalled();
    expect(tmdb.enrichMediaWithStreaming).toHaveBeenCalledWith(expect.anything(), 'US');
  });

  it('fetches from TMDb and enriches with Wikipedia, Wikidata and Trakt', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(tmdb.searchTitle).mockResolvedValue(
      media({ overview: '', providers: [{ provider: 'imdb', externalId: 'tt1' }] }),
    );
    vi.mocked(fetchWikipediaSummary).mockResolvedValue('A desert planet.' as never);
    vi.mocked(fetchWikidataDirectorInfo).mockResolvedValue({ directorName: 'V', directorBio: 'Bio' } as never);
    vi.mocked(fetchTraktRating).mockResolvedValue({ provider: 'trakt', score: 8.1 } as never);

    const out = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' })) as MediaItem;
    expect(out).toMatchObject({ overview: 'A desert planet.', wikidataSummary: 'A desert planet.', wikidataDirectorBio: 'Bio' });
    expect(out.ratings).toContainEqual({ provider: 'trakt', score: 8.1 });
    expect(fetchTraktRating).toHaveBeenCalledWith('dune', 'movie');
    expect(storage.putMediaItem).toHaveBeenCalledWith(out);
  });

  it('enrichment tolerates failures, empty director bios, existing Trakt ratings and non-screen types', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(fetchWikipediaSummary).mockRejectedValue(new Error('wiki down'));
    vi.mocked(fetchWikidataDirectorInfo).mockResolvedValue({ directorName: 'V', directorBio: '' } as never);
    vi.mocked(fetchTraktRating).mockResolvedValue({ provider: 'trakt', score: 1 } as never);
    vi.mocked(tmdb.searchTitle).mockResolvedValue(
      media({ overview: '', providers: [{ provider: 'imdb', externalId: 'tt1' }], ratings: [{ provider: 'trakt', score: 9 }] }),
    );
    const out = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' })) as MediaItem;
    expect(out.ratings).toEqual([{ provider: 'trakt', score: 9 }]);
    expect(out.wikidataDirectorBio).toBeUndefined();

    vi.mocked(fetchWikidataDirectorInfo).mockRejectedValue(new Error('wd down'));
    vi.mocked(fetchTraktRating).mockClear();
    vi.mocked(fetchTraktRating).mockRejectedValue(new Error('trakt down'));
    vi.mocked(tmdb.searchTitle).mockResolvedValue(
      media({ type: 'book' as never, canonicalTitle: '!!!', providers: [{ provider: 'imdb', externalId: 'tt1' }] }),
    );
    await call(MessageType.GET_TITLE_DETAILS, { title: 'x' });
    vi.mocked(tmdb.searchTitle).mockResolvedValue(media({ type: 'book' as never }));
    await call(MessageType.GET_TITLE_DETAILS, { title: 'x' });
    expect(fetchTraktRating).toHaveBeenCalledTimes(0);

    vi.mocked(tmdb.searchTitle).mockResolvedValue(media({ type: 'tv' }));
    const tv = (await call(MessageType.GET_TITLE_DETAILS, { title: 'x' })) as MediaItem;
    expect(fetchTraktRating).toHaveBeenCalledWith('dune', 'tv');
    expect(tv.ratings).toEqual([]);
  });

  it('keeps the unenriched item if enrichment itself blows up', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    const broken = media({ providers: undefined as never });
    vi.mocked(tmdb.searchTitle).mockResolvedValue(broken);
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Dune' })).resolves.toBe(broken);
  });

  it('falls back to local lookup and TVmaze when TMDb search throws', async () => {
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('no key'));
    vi.mocked(storage.findMediaByTitle)
      .mockResolvedValueOnce(undefined) // step 1 cache miss
      .mockResolvedValueOnce(media({ id: 'local' })); // free resolver hit
    const out = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Dune', yearGuess: 2021 })) as MediaItem;
    expect(out.id).toBe('local');
    expect(storage.findMediaByTitle).toHaveBeenLastCalledWith('Dune', 2021);

    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    const show = media({ id: 'tvmaze_tv_1', type: 'tv', canonicalTitle: 'Severance' });
    vi.mocked(searchTvMaze).mockResolvedValue(show);
    const tv = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Severance' })) as MediaItem;
    expect(tv.id).toBe('tvmaze_tv_1');
    expect(searchTvMaze).toHaveBeenCalledWith('Severance', undefined);
  });

  it('keeps an unenriched TVmaze result when enrichment throws', async () => {
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('no key'));
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    const show = media({ id: 'tvmaze_tv_2', providers: undefined as never });
    vi.mocked(searchTvMaze).mockResolvedValue(show);
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Show' })).resolves.toBe(show);
  });

  it('throws when nothing can resolve the title, including blank and TVmaze failures', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('no key'));
    vi.mocked(searchTvMaze).mockRejectedValue(new Error('tvmaze down'));
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Nope' })).rejects.toThrow(/Title not found/);
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Title lookup failed and no fallback available:', expect.any(Error));
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: '   ' })).rejects.toThrow(/Title not found/);

    vi.mocked(tmdb.searchTitle).mockResolvedValue(null as never);
    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Nope' })).rejects.toThrow(/Title not found/);
  });
});

describe('simple title handlers', () => {
  it('GET_MEDIA_ITEMS returns map values', async () => {
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ a: media({ id: 'a' }) });
    await expect(call(MessageType.GET_MEDIA_ITEMS, { mediaIds: ['a'] })).resolves.toEqual([media({ id: 'a' })]);
  });

  it('SEARCH_TITLES uses TMDb with a key and falls back to discovery search', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: ' k ' }));
    vi.mocked(tmdb.searchTitles).mockResolvedValue(['tmdb'] as never);
    await expect(call(MessageType.SEARCH_TITLES, { query: 'dune', type: 'movie', year: 2021 })).resolves.toEqual(['tmdb']);
    expect(tmdb.searchTitles).toHaveBeenCalledWith('dune', 'movie', 2021);

    vi.mocked(tmdb.searchTitles).mockRejectedValue(new Error('401'));
    await expect(call(MessageType.SEARCH_TITLES, { query: 'dune' })).resolves.toEqual(['discovery']);

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: '  ' }));
    await expect(call(MessageType.SEARCH_TITLES, { query: 'dune' })).resolves.toEqual(['discovery']);
  });

  it('DISCOVERY_SEARCH and GET_LATEST_RELEASES delegate', async () => {
    await expect(call(MessageType.DISCOVERY_SEARCH, { query: 'q', type: 'book' })).resolves.toEqual(['discovery']);
    expect(discoverySearch).toHaveBeenCalledWith('q', 'book');
    await expect(call(MessageType.GET_LATEST_RELEASES, { type: 'tv' })).resolves.toEqual(['latest']);
    expect(tmdb.getLatestReleases).toHaveBeenCalledWith('tv', expect.anything());
    await call(MessageType.GET_LATEST_RELEASES, null);
    expect(tmdb.getLatestReleases).toHaveBeenLastCalledWith('movie', expect.anything());
  });

  it('OPEN_DETAIL and OPEN_CAPTURE_CANVAS validate ids', async () => {
    await expect(call(MessageType.OPEN_DETAIL, { mediaId: 'bad id?x=1' })).resolves.toEqual({ success: false, error: 'Invalid mediaId format' });
    await expect(call(MessageType.OPEN_DETAIL, { mediaId: 'tmdb_movie_1' })).resolves.toEqual({ success: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://test-extension-id/ui/index.html?mediaId=tmdb_movie_1' });

    await expect(call(MessageType.OPEN_CAPTURE_CANVAS, { mediaId: '../x' })).resolves.toEqual({ success: false, error: 'Invalid mediaId format' });
    await expect(call(MessageType.OPEN_CAPTURE_CANVAS, { mediaId: 'tmdb_movie_1' })).resolves.toEqual({ success: true, reused: true });
    expect(openCaptureCanvasTab).toHaveBeenCalledWith('tmdb_movie_1');
  });
});

describe('RESOLVE_POSTER', () => {
  const tmdbDetails = (data: Record<string, unknown>, ok = true) =>
    vi.mocked(tmdb.fetchWithRetry).mockResolvedValue({ ok, status: ok ? 200 : 404, json: async () => data } as never);

  it('reports rate limiting', async () => {
    vi.mocked(rate.tryConsumeOriginRateLimit).mockReturnValue({ allowed: false, retryAfterMs: 500 } as never);
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'x' })).resolves.toEqual({ match: null, reason: 'rate_limited' });
  });

  it('returns no match for unusable requests', async () => {
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '1' })).resolves.toEqual({ match: null });
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text' })).resolves.toEqual({ match: null });
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'other', query: 'x' })).resolves.toEqual({ match: null });
  });

  it('tmdb-cdn: uses the cached media and reports library state', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media({ id: 'tmdb_movie_7', posterUrl: 'p' }));
    vi.mocked(storage.getLibraryItem).mockResolvedValue({ status: 'watched', userRating: 9 } as never);
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '7', mediaType: 'movie' })) as { match: Record<string, unknown> };
    expect(out.match).toMatchObject({ tmdbId: '7', title: 'Dune', posterPath: 'p', inLibrary: true, libraryStatus: 'watched', userRating: 9 });
  });

  it('tmdb-cdn: fetches movie details with a key and maps TMDb fields', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k', region: 'DE' }));
    tmdbDetails({
      title: 'Arrival',
      release_date: '2016-11-11',
      genres: [{ name: 'Sci-Fi' }, {}],
      vote_average: 7.9,
      vote_count: 100,
      poster_path: '/p.jpg',
      backdrop_path: '/b.jpg',
      overview: 'Linguist',
      runtime: 116,
    });
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '9', mediaType: 'movie' })) as { match: Record<string, unknown> };
    expect(out.match).toMatchObject({ tmdbId: '9', title: 'Arrival', year: 2016, posterPath: 'https://img//p.jpg', inLibrary: false });
    const stored = vi.mocked(storage.putMediaItem).mock.calls[0][0];
    expect(stored).toMatchObject({ id: 'tmdb_movie_9', genres: ['Sci-Fi'], backdropUrl: 'https://img//b.jpg', runtimeMinutes: 116 });
    expect(tmdb.enrichMediaWithStreaming).toHaveBeenCalledWith(expect.anything(), 'DE', '2016-11-11');
  });

  it('tmdb-cdn: maps sparse TV details with defaults', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k' }));
    tmdbDetails({ name: 'Show', first_air_date: 'abcd', episode_run_time: [42] });
    await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '3', mediaType: 'tv' });
    const stored = vi.mocked(storage.putMediaItem).mock.calls[0][0];
    expect(stored).toMatchObject({
      canonicalTitle: 'Show',
      year: 0,
      genres: [],
      posterUrl: '',
      backdropUrl: undefined,
      overview: '',
      runtimeMinutes: 42,
    });
    expect(stored.ratings[0]).toEqual({ provider: 'tmdb', score: 0, votes: 0 });
    expect(tmdb.enrichMediaWithStreaming).toHaveBeenCalledWith(expect.anything(), 'US', 'abcd');

    vi.mocked(storage.putMediaItem).mockClear();
    tmdbDetails({});
    await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '4', mediaType: 'movie' });
    expect(vi.mocked(storage.putMediaItem).mock.calls[0][0]).toMatchObject({ canonicalTitle: 'Unknown Title', year: 0, runtimeMinutes: undefined });
    expect(tmdb.enrichMediaWithStreaming).toHaveBeenLastCalledWith(expect.anything(), 'US', undefined);
  });

  it('tmdb-cdn: no key or a TMDb error gives no match', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '5', mediaType: 'movie' })).resolves.toEqual({ match: null });
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k' }));
    tmdbDetails({}, false);
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '5', mediaType: 'movie' })).resolves.toEqual({ match: null });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Failed to fetch tmdb-cdn details:', expect.any(Error));
  });

  it('alt-text: searches TMDb with a key, stores new media, and caches the query', async () => {
    const query = uniq('Dune');
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k', omdbApiKey: 'o' }));
    vi.mocked(tmdb.searchTitle).mockResolvedValue(media({ id: 'tmdb_movie_11' }));
    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query })) as { match: Record<string, unknown> };
    expect(out.match.tmdbId).toBe('11');
    expect(tmdb.enrichMediaWithOmdbRatings).toHaveBeenCalled();
    expect(storage.putMediaItem).toHaveBeenCalledTimes(2);

    vi.mocked(tmdb.searchTitle).mockClear();
    await call(MessageType.RESOLVE_POSTER, { strategy: 'ancestor-text', query: `  ${query.toUpperCase()} ` });
    expect(tmdb.searchTitle).not.toHaveBeenCalled();
  });

  it('alt-text: prefers the stored copy of a found title and uses the free resolver without a key', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k' }));
    vi.mocked(tmdb.searchTitle).mockResolvedValue(media({ id: 'tmdb_movie_12' }));
    vi.mocked(storage.getMediaItem).mockResolvedValue(media({ id: 'tmdb_movie_12', canonicalTitle: 'Stored' }));
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: uniq('x') })) as { match: Record<string, unknown> };
    expect(out.match.title).toBe('Stored');

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media({ id: 'seed_x' }));
    const free = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'Heat (1995)' })) as { match: Record<string, unknown> };
    expect(storage.findMediaByTitle).toHaveBeenCalledWith('Heat', 1995);
    expect(free.match.tmdbId).toBe('seed_x');
  });

  it('alt-text: caches misses, recovers from search errors via the free resolver, or logs', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(searchTvMaze).mockResolvedValue(null as never);
    const miss = uniq('nothing');
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: miss })).resolves.toEqual({ match: null });
    vi.mocked(storage.findMediaByTitle).mockClear();
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: miss })).resolves.toEqual({ match: null });
    expect(storage.findMediaByTitle).not.toHaveBeenCalled();

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k' }));
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('tmdb down'));
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media({ id: 'fallback_1' }));
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: uniq('fb') })) as { match: Record<string, unknown> };
    expect(out.match.tmdbId).toBe('fallback_1');

    vi.mocked(storage.findMediaByTitle).mockRejectedValue(new Error('db down'));
    await expect(call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: uniq('fail') })).resolves.toEqual({ match: null });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Failed to search/resolve title:', expect.any(Error));
  });

  it('keeps unenriched media when enrichment throws, and skips OMDb when ratings are complete', async () => {
    const broken = media({ id: 'tmdb_movie_20', providers: undefined as never, ratings: [{ provider: 'imdb', score: 1 }, { provider: 'rt', score: 2 }] });
    vi.mocked(storage.getMediaItem).mockResolvedValue(broken);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ omdbApiKey: 'o' }));
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '20', mediaType: 'movie' })) as { match: Record<string, unknown> };
    expect(out.match.tmdbId).toBe('20');
    expect(tmdb.enrichMediaWithOmdbRatings).not.toHaveBeenCalled();
  });

  it('uses the whole id when it has no tmdb_type_ prefix, and a null poster when missing', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media({ id: 'seedid', posterUrl: undefined }));
    const out = (await call(MessageType.RESOLVE_POSTER, { strategy: 'tmdb-cdn', tmdbId: '1', mediaType: 'movie' })) as { match: Record<string, unknown> };
    expect(out.match).toMatchObject({ tmdbId: 'seedid', posterPath: null });
  });

  it('query cache: expires after 24h and evicts the oldest entry past 500', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ tmdbApiKey: 'k' }));
      vi.mocked(tmdb.searchTitle).mockResolvedValue(null as never);
      const first = uniq('ttl');
      await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: first });
      vi.advanceTimersByTime(1000 * 60 * 60 * 24 + 1);
      await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: first });
      expect(tmdb.searchTitle).toHaveBeenCalledTimes(2);

      for (let i = 0; i < 501; i++) {
        await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: `fill-${i}` });
      }
      vi.mocked(tmdb.searchTitle).mockClear();
      await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'fill-0' });
      expect(tmdb.searchTitle).toHaveBeenCalledTimes(1);
      await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'fill-500' });
      expect(tmdb.searchTitle).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
