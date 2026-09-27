import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LibraryItem, MediaItem, UserPreferences, WatchProfile } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  getPreferences: vi.fn(),
  putMediaItem: vi.fn(),
  findMediaByTitle: vi.fn(),
}));
vi.mock('@/background/tmdb', () => ({ searchTitle: vi.fn() }));
vi.mock('@/background/context', () => ({ buildWatchProfile: vi.fn(), buildTasteProfileForMedium: vi.fn() }));
vi.mock('@/background/notifications', () => ({ showRateLimitNotification: vi.fn(), showAuthErrorNotification: vi.fn() }));
vi.mock('@/background/catalogValidate', () => ({ resolveRecommendationCandidates: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import {
  callLLMProvider,
  generateLLMRecommendations,
  buildCuratorPromptPreview,
  getPersonalizedRecommendations,
  LLMAuthError,
  LLMRateLimitError,
} from '@/background/llm';
import * as storage from '@/background/storage';
import { searchTitle } from '@/background/tmdb';
import { buildWatchProfile, buildTasteProfileForMedium } from '@/background/context';
import { showRateLimitNotification, showAuthErrorNotification } from '@/background/notifications';
import { resolveRecommendationCandidates } from '@/background/catalogValidate';
import { logger } from '@/shared/logger';

const prefs = (over: Partial<UserPreferences> = {}) =>
  ({ llmEnabled: true, llmApiKey: 'k', llmProvider: 'openai', ...over }) as UserPreferences;
const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const fail = (status: number, text = '') => ({ ok: false, status, text: async () => text, json: async () => ({}) });
const openaiReply = (content: string) => okJson({ choices: [{ message: { content } }] });
const media = (id: string, over: Partial<MediaItem> = {}): MediaItem =>
  ({ id, canonicalTitle: id, type: 'movie', year: 2000, genres: [], ratings: [], providers: [], ...over }) as MediaItem;
const profile = (over: Partial<WatchProfile> = {}): WatchProfile =>
  ({ topRated: [], liked: [], disliked: [], unrated: [], followedCreators: [], favoriteGenres: [], totalWatched: 0, wishlist: [], ...over }) as WatchProfile;
const entry = (title: string) => ({ title, year: 2000, genres: [], userRating: 9 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('callLLMProvider', () => {
  it('requires a key (primary and secondary wording)', async () => {
    await expect(callLLMProvider('p', prefs({ llmApiKey: undefined }))).rejects.toThrow('LLM API key is missing');
    await expect(callLLMProvider('p', prefs(), true)).rejects.toThrow('LLM Secondary API key is missing');
  });

  it('defaults to OpenAI and parses each provider response', async () => {
    fetchMock.mockResolvedValueOnce(openaiReply('oa'));
    await expect(callLLMProvider('p', prefs({ llmProvider: undefined }))).resolves.toBe('oa');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions');

    fetchMock.mockResolvedValueOnce(okJson({ content: [{ text: 'an' }] }));
    await expect(callLLMProvider('p', prefs({ llmProvider: 'anthropic' }))).resolves.toBe('an');
    expect(fetchMock.mock.calls[1][1].headers['anthropic-dangerous-direct-browser-access']).toBe('true');

    fetchMock.mockResolvedValueOnce(okJson({ candidates: [{ content: { parts: [{ text: 'ge' }] } }] }));
    await expect(callLLMProvider('p', prefs({ llmProvider: 'gemini' }))).resolves.toBe('ge');
  });

  it('rejects local and unknown providers', async () => {
    await expect(callLLMProvider('p', prefs({ llmProvider: 'local' }))).rejects.toThrow('not currently supported');
    await expect(callLLMProvider('p', prefs({ llmProvider: 'cohere' as never }))).rejects.toThrow('Unsupported LLM provider: cohere');
  });

  it('surfaces auth errors with a notification', async () => {
    fetchMock.mockResolvedValue(fail(401));
    await expect(callLLMProvider('p', prefs())).rejects.toBeInstanceOf(LLMAuthError);
    expect(showAuthErrorNotification).toHaveBeenCalledWith('openai');
  });

  it('retries with the secondary key on rate limit, otherwise reports it', async () => {
    fetchMock.mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(openaiReply('second'));
    await expect(callLLMProvider('p', prefs({ llmSecondaryApiKey: 'k2' }))).resolves.toBe('second');
    expect(showRateLimitNotification).toHaveBeenCalledWith('openai', true);

    fetchMock.mockResolvedValueOnce(fail(429));
    await expect(callLLMProvider('p', prefs())).rejects.toThrow('openai API rate limit exceeded.');
    expect(showRateLimitNotification).toHaveBeenCalledWith('openai', false);

    fetchMock.mockResolvedValueOnce(fail(429));
    await expect(callLLMProvider('p', prefs({ llmSecondaryApiKey: 'k2' }), true)).rejects.toBeInstanceOf(LLMRateLimitError);
  });

  it('reports API errors using JSON error messages when present, truncating long ones', async () => {
    fetchMock.mockResolvedValueOnce(fail(500, JSON.stringify({ error: 'plain error' })));
    await expect(callLLMProvider('p', prefs())).rejects.toThrow('OpenAI API error (Status 500)');
    expect(logger.error).toHaveBeenLastCalledWith('OpenAI API error (Status 500): plain error');

    fetchMock.mockResolvedValueOnce(fail(400, JSON.stringify({ error: { message: 'nested' } })));
    await expect(callLLMProvider('p', prefs())).rejects.toThrow();
    expect(logger.error).toHaveBeenLastCalledWith('OpenAI API error (Status 400): nested');

    fetchMock.mockResolvedValueOnce(fail(400, JSON.stringify({ error: {} })));
    await expect(callLLMProvider('p', prefs())).rejects.toThrow();
    expect(logger.error).toHaveBeenLastCalledWith('OpenAI API error (Status 400): {"error":{}}');

    fetchMock.mockResolvedValueOnce(fail(502, 'x'.repeat(300)));
    await expect(callLLMProvider('p', prefs())).rejects.toThrow();
    expect(logger.error).toHaveBeenLastCalledWith(`OpenAI API error (Status 502): ${'x'.repeat(200)}…`);
  });
});

describe('generateLLMRecommendations', () => {
  const lib = (mediaId: string, status: LibraryItem['status'], userRating?: number) => ({ mediaId, status, userRating }) as LibraryItem;

  it('requires LLM enabled with a key; returns [] for an empty library', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: false }));
    await expect(generateLLMRecommendations()).rejects.toThrow('disabled or API key is missing');
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmApiKey: '' }));
    await expect(generateLLMRecommendations()).rejects.toThrow('disabled or API key is missing');

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([lib('ghost', 'watched')]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({});
    await expect(generateLLMRecommendations()).resolves.toEqual([]);
  });

  it('flat mode: resolves from cache or TMDb, skips misses, and uses a default explanation', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([lib('w', 'watched', 6), lib('w0', 'watched'), lib('t', 'to-watch')]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ w: media('w'), w0: media('w0'), t: media('t') });
    fetchMock.mockResolvedValue(
      openaiReply('```json\n' + JSON.stringify([
        { title: 'Cached', explanation: 'c' },
        { title: 'Cached' },
        { title: 'Fresh', year: 2020, type: 'movie' },
        { title: 'Missing' },
        { title: 'Boom' },
        { title: '' },
      ]) + '\n```'),
    );
    vi.mocked(storage.findMediaByTitle).mockImplementation(async (t) => (t === 'Cached' ? media('cached') : undefined));
    vi.mocked(searchTitle).mockImplementation(async (t) => {
      if (t === 'Fresh') return media('fresh');
      if (t === 'Boom') throw new Error('tmdb');
      return null as never;
    });
    await expect(generateLLMRecommendations()).resolves.toEqual([
      { mediaId: 'cached', explanation: 'c' },
      { mediaId: 'cached', explanation: 'Recommended by AI' },
      { mediaId: 'fresh', explanation: 'Recommended by AI' },
    ]);
    expect(storage.putMediaItem).toHaveBeenCalledWith(media('fresh'));
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content as string;
    expect(prompt).toContain('recommend 5 NEW titles');
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Failed to resolve recommendation for "Boom":', expect.any(Error));
  });

  it('flat mode with only a watchlist, and bad JSON', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([lib('t', 'to-watch')]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ t: media('t') });
    fetchMock.mockResolvedValue(openaiReply('not json'));
    await expect(generateLLMRecommendations()).rejects.toThrow('LLM returned invalid JSON format');
    expect(logger.error).toHaveBeenCalledWith('LLM recommendation error:', expect.any(Error));
  });

  it('grouped mode: seeds from top ratings and regroups resolved titles', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([
      lib('a', 'watched', 8),
      lib('b', 'watched', 10),
      lib('c', 'watched', 9),
      lib('d', 'watched', 9),
    ]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ a: media('A'), b: media('B'), c: media('C'), d: media('D') });
    fetchMock.mockResolvedValue(
      openaiReply(JSON.stringify([
        { seedTitle: 'B', recommendations: [{ title: 'Cached', explanation: 'e' }, { title: 'Cached' }, { title: 'Fresh' }, { title: 'Nope' }, { title: 'Boom' }, {}] },
        { seedTitle: 'C', recommendations: 'bad' },
        { seedTitle: 'D' },
        { seedTitle: 'Empty', recommendations: [{ title: 'Nope' }] },
      ])),
    );
    vi.mocked(storage.findMediaByTitle).mockImplementation(async (t) => (t === 'Cached' ? media('cached') : undefined));
    vi.mocked(searchTitle).mockImplementation(async (t) => {
      if (t === 'Fresh') return media('fresh');
      if (t === 'Boom') throw new Error('tmdb');
      return null as never;
    });
    await expect(generateLLMRecommendations()).resolves.toEqual([
      {
        seedTitle: 'B',
        recommendations: [
          { mediaId: 'cached', explanation: 'e' },
          { mediaId: 'cached', explanation: 'Recommended by AI' },
          { mediaId: 'fresh', explanation: 'Recommended by AI' },
        ],
      },
    ]);
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[0].content as string;
    expect(prompt).toContain('["B","C","D"]');
  });

  it('grouped mode reports invalid JSON', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([lib('a', 'watched', 8), lib('b', 'watched', 8), lib('c', 'watched', 8)]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ a: media('a'), b: media('b'), c: media('c') });
    fetchMock.mockResolvedValue(openaiReply('{oops'));
    await expect(generateLLMRecommendations()).rejects.toThrow('LLM returned invalid JSON format');
  });
});

describe('personalized recommendations', () => {
  const setProfiles = (all: WatchProfile, screen: WatchProfile, book: WatchProfile) => {
    vi.mocked(buildWatchProfile).mockResolvedValue(all);
    vi.mocked(buildTasteProfileForMedium).mockImplementation(async (m) => (m === 'book' ? book : screen));
  };

  it('buildCuratorPromptPreview uses the split prompt only when books exist', async () => {
    setProfiles(profile({ totalWatched: 5 }), profile({ totalWatched: 3 }), profile({ totalWatched: 2 }));
    const split = await buildCuratorPromptPreview(prefs());
    expect(split.userPrompt).toContain('READING TASTE');
    expect(split.systemPrompt.length).toBeGreaterThan(0);

    setProfiles(profile({ totalWatched: 5 }), profile({ totalWatched: 5 }), profile());
    const single = await buildCuratorPromptPreview(prefs());
    expect(single.userPrompt).toContain('TASTE PROFILE (JSON)');
    expect(single.tasteProfileJson).toContain('{');
  });

  it('needs at least 3 completed titles somewhere', async () => {
    setProfiles(profile({ totalWatched: 2 }), profile({ totalWatched: 2 }), profile({ totalWatched: 2 }));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty on provider failure or malformed JSON', async () => {
    setProfiles(profile({ totalWatched: 3 }), profile(), profile());
    fetchMock.mockResolvedValueOnce(fail(500));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
    fetchMock.mockResolvedValueOnce(openaiReply('{"not":"array"}'));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
    fetchMock.mockResolvedValueOnce(openaiReply('nope'));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
    setProfiles(profile(), profile(), profile({ totalWatched: 3 }));
    fetchMock.mockResolvedValueOnce(openaiReply('nope'));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
    setProfiles(profile(), profile({ totalWatched: 3 }), profile());
    fetchMock.mockResolvedValueOnce(openaiReply('nope'));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toEqual({ flat: [], grouped: null });
  });

  it('normalizes candidates, resolves them, maps confidence and types, and groups by seed', async () => {
    setProfiles(
      profile({ totalWatched: 10, topRated: [entry('Heat'), entry('Alien'), entry('Arrival')] }),
      profile({ totalWatched: 10 }),
      profile(),
    );
    const llmItems = [
      { title: ' Thief ', year: 1981, type: 'movie', reason: 'r-thief', seedTitle: 'Heat', confidenceSignal: 'high' },
      { title: 'Severance', type: 'tv', reason: 'r-sev', confidenceSignal: 'low' },
      { title: 'Dune', type: 'book', reason: 'r-dune' },
      { title: 'Odd', type: 'podcast' },
      { title: '' },
      { year: 2000 },
    ];
    fetchMock
      .mockResolvedValueOnce(openaiReply('```json' + JSON.stringify(llmItems) + '```'))
      .mockResolvedValueOnce(
        openaiReply(JSON.stringify([
          { seedTitle: 'Heat', recommendationTitles: ['thief', 'SEVERANCE'] },
          { seedTitle: 'Nobody', recommendationTitles: ['Unknown'] },
        ])),
      );
    vi.mocked(resolveRecommendationCandidates).mockResolvedValue([
      { workId: 'tmdb_movie_1', media: media('Thief', { posterUrl: 'https://p' }), reason: 'r-thief', seedTitle: 'Heat' },
      { workId: 'tmdb_tv_2', media: media('Severance', { type: 'tv' }), reason: 'r-sev' },
      { workId: 'ol_3', media: media('Dune', { type: 'book' }), reason: 'r-dune' },
      { workId: 'x_4', media: media('Other', { type: 'other' as never }), reason: 'unmatched' },
    ] as never);

    const out = await getPersonalizedRecommendations(prefs());
    expect(vi.mocked(resolveRecommendationCandidates).mock.calls[0][0]).toEqual([
      { title: 'Thief', year: 1981, type: 'movie', reason: 'r-thief', seedTitle: 'Heat' },
      { title: 'Severance', year: undefined, type: 'tv', reason: 'r-sev', seedTitle: undefined },
      { title: 'Dune', year: undefined, type: 'book', reason: 'r-dune', seedTitle: undefined },
      { title: 'Odd', year: undefined, type: 'movie', reason: 'Recommended based on your taste', seedTitle: undefined },
    ]);
    expect(out.flat.map((r) => [r.tmdbId, r.type, r.confidenceSignal, r.posterUrl])).toEqual([
      ['tmdb_movie_1', 'movie', 'high', 'https://p'],
      ['tmdb_tv_2', 'tv', 'low', undefined],
      ['ol_3', 'book', 'medium', undefined],
      ['x_4', 'movie', 'medium', undefined],
    ]);
    expect(out.grouped).toEqual([{ seedTitle: 'Heat', recommendations: [out.flat[0], out.flat[1]] }]);
  });

  it('falls back to title-based confidence, and leaves grouping null when it fails or matches nothing', async () => {
    setProfiles(
      profile({ totalWatched: 10, topRated: [entry('a'), entry('b'), entry('c')] }),
      profile({ totalWatched: 10 }),
      profile(),
    );
    const items = [
      ...['A1', 'A2', 'A3', 'A4'].map((t) => ({ title: t, reason: `r-${t}`, confidenceSignal: 'low' })),
      { title: 'Seeded', reason: 'shared', seedTitle: 'Q', confidenceSignal: 'high' },
      { title: 'Unseeded', reason: 'shared', confidenceSignal: 'low' },
    ];
    const resolved = [
      ...['A1', 'A2', 'A3', 'A4'].map((t) => ({ workId: t, media: media(t), reason: 'changed-reason' })),
      // Resolver dropped the seed: neither candidate matches on seed, fall back to title
      { workId: 'S1', media: media('Seeded'), reason: 'shared', seedTitle: 'Z' },
    ];
    vi.mocked(resolveRecommendationCandidates).mockResolvedValue(resolved as never);

    fetchMock.mockResolvedValueOnce(openaiReply(JSON.stringify(items))).mockResolvedValueOnce(openaiReply('bad grouping'));
    const failed = await getPersonalizedRecommendations(prefs());
    expect(failed.flat.slice(0, 4).every((r) => r.confidenceSignal === 'low')).toBe(true);
    expect(failed.flat[4].confidenceSignal).toBe('high');
    expect(failed.grouped).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Grouping LLM call failed (non-fatal):', expect.any(Error));

    fetchMock
      .mockResolvedValueOnce(openaiReply(JSON.stringify(items)))
      .mockResolvedValueOnce(openaiReply(JSON.stringify([{ seedTitle: 'x', recommendationTitles: ['zzz'] }])));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toMatchObject({ grouped: null });

    fetchMock.mockResolvedValueOnce(openaiReply(JSON.stringify(items))).mockResolvedValueOnce(openaiReply('{"seedTitle":"x"}'));
    await expect(getPersonalizedRecommendations(prefs())).resolves.toMatchObject({ grouped: null });
  });

  it('skips grouping with fewer than 3 top-rated titles or 4 resolved recs', async () => {
    setProfiles(profile({ totalWatched: 10, topRated: [entry('a')] }), profile({ totalWatched: 10 }), profile());
    fetchMock.mockResolvedValue(openaiReply(JSON.stringify([{ title: 'A' }])));
    vi.mocked(resolveRecommendationCandidates).mockResolvedValue(
      ['1', '2', '3', '4'].map((t) => ({ workId: t, media: media(t), reason: 'r' })) as never,
    );
    await getPersonalizedRecommendations(prefs());
    setProfiles(profile({ totalWatched: 10, topRated: [entry('a'), entry('b'), entry('c')] }), profile({ totalWatched: 10 }), profile());
    vi.mocked(resolveRecommendationCandidates).mockResolvedValue([{ workId: '1', media: media('1'), reason: 'r' }] as never);
    await getPersonalizedRecommendations(prefs());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
