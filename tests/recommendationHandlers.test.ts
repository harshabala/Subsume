import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MessageType,
  type MediaItem,
  type PersonalizedRecommendation,
  type UserPreferences,
  type WeeklyDigest,
} from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getPreferences: vi.fn(),
  getWeeklyDigest: vi.fn(),
  saveWeeklyDigest: vi.fn(),
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
}));
vi.mock('@/background/recommendations', () => ({ generateRuleBasedRecommendations: vi.fn() }));
vi.mock('@/background/llm', () => ({
  generateLLMRecommendations: vi.fn(),
  getPersonalizedRecommendations: vi.fn(),
  buildCuratorPromptPreview: vi.fn(),
}));
vi.mock('@/background/context', () => ({ buildTasteProfileForMedium: vi.fn(async (m: string) => ({ medium: m })) }));
vi.mock('@/background/digest', () => ({ generateWeeklyDigest: vi.fn(), isDigestStale: vi.fn() }));
vi.mock('@/background/dispatch', () => ({ generateSubsumeDispatch: vi.fn() }));
vi.mock('@/background/discoveryFeed', () => ({
  getDiscoveryFeed: vi.fn(),
  discoveryFeedToWeeklyDigest: vi.fn((f: { items: unknown[] }) => ({ generatedAt: 1, items: f.items, fromFeed: true })),
}));
vi.mock('@/background/trakt', () => ({ getTraktTrending: vi.fn() }));
vi.mock('@/background/bookRecommendations', () => ({ generateCatalogBookRecommendations: vi.fn() }));
vi.mock('@/background/crossMediumRecommendations', () => ({ generateCrossMediumRecommendations: vi.fn() }));
vi.mock('@/background/catalogValidate', () => ({ resolveRecommendationCandidates: vi.fn() }));
vi.mock('@/shared/llmCapabilities', () => ({ getLlmProviderCapabilities: vi.fn((p: string) => ({ provider: p })) }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { recommendationHandlers, getDismissedRecWorkIds } from '@/background/handlers/recommendations';
import * as storage from '@/background/storage';
import { generateRuleBasedRecommendations } from '@/background/recommendations';
import * as llm from '@/background/llm';
import { generateWeeklyDigest, isDigestStale } from '@/background/digest';
import { generateSubsumeDispatch } from '@/background/dispatch';
import { getDiscoveryFeed } from '@/background/discoveryFeed';
import { getTraktTrending } from '@/background/trakt';
import { generateCatalogBookRecommendations } from '@/background/bookRecommendations';
import { generateCrossMediumRecommendations } from '@/background/crossMediumRecommendations';
import { resolveRecommendationCandidates } from '@/background/catalogValidate';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown = {}) => recommendationHandlers[type]!(payload, sender);
const prefs = (over: Partial<UserPreferences> = {}) => ({ ...over }) as UserPreferences;
const media = (id: string, type: MediaItem['type'] = 'movie'): MediaItem => ({
  id,
  canonicalTitle: id,
  type,
  year: 2020,
  genres: [],
  ratings: [],
  providers: [],
});
const rec = (mediaId: string, extra: Record<string, unknown> = {}) => ({ mediaId, explanation: `why ${mediaId}`, ...extra });
const digest = (n: number): WeeklyDigest =>
  ({ generatedAt: 1, items: Array.from({ length: n }, (_, i) => ({ mediaId: `d${i}` })), llmGenerated: false }) as WeeklyDigest;
const setFeedback = (entries: unknown) => chrome.storage.local.set({ subsume_rec_feedback: entries });
const trakt = (slug: string, title = slug) => ({ title, year: 2024, traktSlug: slug, watchers: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(storage.getAllLibraryItems).mockResolvedValue([]);
  vi.mocked(getTraktTrending).mockResolvedValue([]);
  vi.mocked(generateRuleBasedRecommendations).mockResolvedValue([]);
});

describe('recommendation feedback', () => {
  it('rejects bad payloads and actions, stores valid feedback capped at 500', async () => {
    await expect(call(MessageType.SUBMIT_RECOMMENDATION_FEEDBACK, null)).resolves.toEqual({ ok: false, error: 'invalid_payload' });
    await expect(call(MessageType.SUBMIT_RECOMMENDATION_FEEDBACK, { workId: 'a' })).resolves.toEqual({ ok: false, error: 'invalid_payload' });
    await expect(call(MessageType.SUBMIT_RECOMMENDATION_FEEDBACK, { workId: 'a', action: 'love' })).resolves.toEqual({ ok: false, error: 'invalid_action' });

    await setFeedback(Array.from({ length: 500 }, (_, i) => ({ workId: `old${i}`, action: 'save', at: 0 })));
    await expect(call(MessageType.SUBMIT_RECOMMENDATION_FEEDBACK, { workId: 'a', action: 'dismiss' })).resolves.toEqual({ ok: true });
    const stored = (await chrome.storage.local.get('subsume_rec_feedback')).subsume_rec_feedback as Array<{ workId: string }>;
    expect(stored).toHaveLength(500);
    expect(stored.at(-1)).toMatchObject({ workId: 'a', action: 'dismiss' });
  });

  it('getDismissedRecWorkIds keeps dismiss/not_interested, tolerates junk and read errors', async () => {
    await setFeedback([
      { workId: 'a', action: 'dismiss' },
      { workId: 'b', action: 'not_interested' },
      { workId: 'c', action: 'save' },
    ]);
    expect([...(await getDismissedRecWorkIds())]).toEqual(['a', 'b']);
    await setFeedback('junk');
    expect((await getDismissedRecWorkIds()).size).toBe(0);
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('boom') as never);
    expect((await getDismissedRecWorkIds()).size).toBe(0);
  });
});

describe('GET_RECOMMENDATIONS', () => {
  it('uses flat LLM recs, filters dismissed, and tops up with deduped Trakt trending', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    await setFeedback([{ workId: 'x', action: 'dismiss' }, { workId: 'trakt_trending_gone', action: 'dismiss' }]);
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValue([rec('x'), rec('y')] as never);
    vi.mocked(getTraktTrending).mockImplementation(async (type) =>
      type === 'movie' ? [trakt('dune'), trakt('gone')] : [trakt('dune-show', 'DUNE'), trakt('severance')],
    );

    const out = (await call(MessageType.GET_RECOMMENDATIONS, { basedOnMediaId: 'seed' })) as Array<{ id?: string; mediaId?: string; providers?: Array<{ url: string }> }>;
    expect(out[0]).toMatchObject({ mediaId: 'y' });
    expect(out.slice(1).map((m) => m.id)).toEqual(['trakt_trending_dune', 'trakt_trending_severance']);
    expect(out[1].providers![0].url).toBe('https://trakt.tv/movies/dune');
    expect(out[2].providers![0].url).toBe('https://trakt.tv/shows/severance');
    expect(generateRuleBasedRecommendations).not.toHaveBeenCalled();
  });

  it('treats a Trakt failure as no extra items', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(getTraktTrending).mockRejectedValue(new Error('offline'));
    await expect(call(MessageType.GET_RECOMMENDATIONS, undefined)).resolves.toEqual([]);
    expect(generateRuleBasedRecommendations).toHaveBeenCalledWith(undefined);
  });

  it('falls back to rule-based when the LLM throws or returns nothing, and skips Trakt at 5+', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    vi.mocked(llm.generateLLMRecommendations).mockRejectedValueOnce(new Error('llm down'));
    const five = ['a', 'b', 'c', 'd', 'e'].map((id) => rec(id));
    vi.mocked(generateRuleBasedRecommendations).mockResolvedValue(five as never);
    await expect(call(MessageType.GET_RECOMMENDATIONS, {})).resolves.toEqual(five);
    expect(logger.error).toHaveBeenCalled();
    expect(getTraktTrending).not.toHaveBeenCalled();

    vi.mocked(llm.generateLLMRecommendations).mockResolvedValueOnce([] as never);
    await expect(call(MessageType.GET_RECOMMENDATIONS, {})).resolves.toEqual(five);
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValueOnce(null as never);
    await expect(call(MessageType.GET_RECOMMENDATIONS, {})).resolves.toEqual(five);
  });

  it('appends catalog book recs and cross-medium bridges in flat mode', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ crossMediumRecommendationsEnabled: true }));
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([{ mediaId: 'lib-book' }] as never);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ 'lib-book': media('lib-book', 'book') });
    vi.mocked(generateRuleBasedRecommendations).mockResolvedValue([rec('r1'), rec('r2'), rec('r3')] as never);
    await setFeedback([{ workId: 'b-dismissed', action: 'dismiss' }, { workId: 'c-dismissed', action: 'dismiss' }]);
    vi.mocked(generateCatalogBookRecommendations).mockResolvedValue([media('b1', 'book'), media('b-dismissed', 'book')]);
    vi.mocked(generateCrossMediumRecommendations).mockResolvedValue([
      { mediaId: 'c1', media: media('c1'), explanation: 'bridge', seedTitle: 'Dune' },
      { mediaId: 'r1', media: media('r1'), explanation: 'dup', seedTitle: 'Dune' },
      { mediaId: 'c-dismissed', media: media('c-dismissed'), explanation: 'x' },
    ] as never);

    const out = (await call(MessageType.GET_RECOMMENDATIONS, {})) as Array<{ mediaId: string; discoveryMode?: string }>;
    expect(out.map((r) => r.mediaId)).toEqual(['r1', 'r2', 'r3', 'b1', 'c1']);
    expect(out[3]).toMatchObject({ discoveryMode: 'catalog', explanation: 'Related to books in your archive' });
    expect(out[4]).toMatchObject({ discoveryMode: 'cross_medium', seedTitle: 'Dune' });
  });

  it('skips catalog books when books are disabled, the library has none, or it is empty', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ enabledMedia: { book: false } as never }));
    await call(MessageType.GET_RECOMMENDATIONS, {});
    expect(storage.getAllLibraryItems).not.toHaveBeenCalled();

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([{ mediaId: 'm' }, { mediaId: 'missing' }] as never);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ m: media('m') });
    await call(MessageType.GET_RECOMMENDATIONS, {});
    expect(generateCatalogBookRecommendations).not.toHaveBeenCalled();
  });

  it('logs and continues when catalog books or cross-medium generation fail', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ crossMediumRecommendationsEnabled: true }));
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([{ mediaId: 'b' }] as never);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ b: media('b', 'book') });
    vi.mocked(generateCatalogBookRecommendations).mockRejectedValue(new Error('ol down'));
    vi.mocked(generateCrossMediumRecommendations).mockRejectedValue(new Error('x'));
    await expect(call(MessageType.GET_RECOMMENDATIONS, {})).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Catalog book recommendations failed:', expect.any(Error));
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Cross-medium recommendations failed:', expect.any(Error));
  });

  it('dedupes cross-medium bridges against MediaItem entries already in the list', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ crossMediumRecommendationsEnabled: true }));
    vi.mocked(generateRuleBasedRecommendations).mockResolvedValue([media('m1')] as never);
    vi.mocked(generateCrossMediumRecommendations).mockResolvedValue([
      { mediaId: 'm1', media: media('m1'), explanation: 'dup' },
    ] as never);
    const out = (await call(MessageType.GET_RECOMMENDATIONS, {})) as MediaItem[];
    expect(out).toEqual([media('m1')]);
  });

  it('grouped LLM mode keeps groups, adds a Related books group and merges bridges by seed', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(
      prefs({ llmEnabled: true, llmApiKey: 'k', crossMediumRecommendationsEnabled: true }),
    );
    await setFeedback([{ workId: 'g-dismissed', action: 'not_interested' }]);
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValue([
      { seedTitle: 'Dune', recommendations: [rec('g1'), rec('g-dismissed')] },
      { seedTitle: 'Empty', recommendations: [rec('g-dismissed')] },
    ] as never);
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([{ mediaId: 'b' }] as never);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ b: media('b', 'book') });
    vi.mocked(generateCatalogBookRecommendations).mockResolvedValue([media('g1', 'book'), media('bk2', 'book')]);
    vi.mocked(generateCrossMediumRecommendations).mockResolvedValue([
      { mediaId: 'x1', media: media('x1'), explanation: 'e', seedTitle: 'Dune' },
      { mediaId: 'x1b', media: media('x1b'), explanation: 'e', seedTitle: 'Dune' },
      { mediaId: 'x2', media: media('x2'), explanation: 'e', seedTitle: '  ' },
      { mediaId: 'x3', media: media('x3'), explanation: 'e' },
      { mediaId: 'x4', media: media('x4'), explanation: 'e', seedTitle: 'Arrival' },
    ] as never);

    const groups = (await call(MessageType.GET_RECOMMENDATIONS, {})) as Array<{ seedTitle: string; recommendations: Array<{ mediaId: string }> }>;
    expect(groups.map((g) => g.seedTitle)).toEqual(['Dune', 'Related books', 'Cross-medium bridges', 'Arrival']);
    expect(groups[0].recommendations.map((r) => r.mediaId)).toEqual(['g1', 'x1', 'x1b']);
    expect(groups[1].recommendations.map((r) => r.mediaId)).toEqual(['bk2']);
    expect(groups[2].recommendations.map((r) => r.mediaId)).toEqual(['x2', 'x3']);
    expect(getTraktTrending).not.toHaveBeenCalled();
  });

  it('grouped mode: skips the books group when every book is already present, and merges without duplicating', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(
      prefs({ llmEnabled: true, llmApiKey: 'k', crossMediumRecommendationsEnabled: true }),
    );
    const group = { seedTitle: 'Dune', recommendations: [rec('g1')] };
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValue([group] as never);
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([{ mediaId: 'b' }] as never);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ b: media('b', 'book') });
    vi.mocked(generateCatalogBookRecommendations).mockResolvedValue([media('g1', 'book')]);
    // The cross-medium generator can return the same bridge twice for one seed
    vi.mocked(generateCrossMediumRecommendations).mockResolvedValue([
      { mediaId: 'x1', media: media('x1'), explanation: 'e', seedTitle: 'Dune' },
      { mediaId: 'x1', media: media('x1'), explanation: 'e', seedTitle: 'Dune' },
    ] as never);
    const groups = (await call(MessageType.GET_RECOMMENDATIONS, {})) as Array<{ seedTitle: string; recommendations: Array<{ mediaId: string }> }>;
    expect(groups).toHaveLength(1);
    expect(groups[0].recommendations.map((r) => r.mediaId)).toEqual(['g1', 'x1']);
  });

  it('grouped mode with no extra books or bridges returns the LLM groups as-is', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValue([{ seedTitle: 'S', recommendations: [rec('a')] }] as never);
    await expect(call(MessageType.GET_RECOMMENDATIONS, {})).resolves.toEqual([{ seedTitle: 'S', recommendations: [rec('a')] }]);
  });

  it('grouped mode where every rec is dismissed falls through to rule-based', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    await setFeedback([{ workId: 'a', action: 'dismiss' }]);
    vi.mocked(llm.generateLLMRecommendations).mockResolvedValue([{ seedTitle: 'S', recommendations: [rec('a')] }] as never);
    await call(MessageType.GET_RECOMMENDATIONS, {});
    expect(generateRuleBasedRecommendations).toHaveBeenCalled();
  });
});

describe('taste profiles, capabilities and previews', () => {
  it('BUILD_WATCH_PROFILE and BUILD_TASTE_PROFILE return all three media', async () => {
    const expected = { profile: { medium: 'all' }, all: { medium: 'all' }, screen: { medium: 'screen' }, book: { medium: 'book' } };
    await expect(call(MessageType.BUILD_WATCH_PROFILE)).resolves.toEqual(expected);
    await expect(call(MessageType.BUILD_TASTE_PROFILE)).resolves.toEqual(expected);
  });

  it('GET_LLM_PROVIDER_CAPABILITIES defaults to openai', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    await expect(call(MessageType.GET_LLM_PROVIDER_CAPABILITIES)).resolves.toEqual({ provider: 'openai' });
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmProvider: 'anthropic' }));
    await expect(call(MessageType.GET_LLM_PROVIDER_CAPABILITIES)).resolves.toEqual({ provider: 'anthropic' });
  });

  it('GET_CURATOR_PROMPT_PREVIEW delegates to the LLM module', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs());
    vi.mocked(llm.buildCuratorPromptPreview).mockReturnValue('preview' as never);
    await expect(call(MessageType.GET_CURATOR_PROMPT_PREVIEW)).resolves.toBe('preview');
  });
});

describe('GET_PERSONALIZED_RECS', () => {
  const p = (tmdbId: string, over: Partial<PersonalizedRecommendation> = {}): PersonalizedRecommendation => ({
    tmdbId,
    title: `t-${tmdbId}`,
    year: 2020,
    type: 'movie',
    ratings: [],
    reason: 'r',
    confidenceSignal: 'high',
    ...over,
  });

  it('requires an enabled LLM with a key', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true }));
    await expect(call(MessageType.GET_PERSONALIZED_RECS)).resolves.toEqual({ error: 'no_llm_key', flat: [], grouped: null });
  });

  it('filters dismissed, resolves unresolved titles, and drops empty groups', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    await setFeedback([{ workId: 'gone', action: 'dismiss' }, { workId: 'res-gone', action: 'dismiss' }]);
    vi.mocked(llm.getPersonalizedRecommendations).mockResolvedValue({
      flat: [p('a'), p('gone'), p('', { title: 'Unresolved', seedTitle: 'S' })],
      grouped: [
        { seedTitle: 'S', recommendations: [p('a'), p('')] },
        { seedTitle: 'Only dismissed', recommendations: [p('gone')] },
      ],
    } as never);
    vi.mocked(resolveRecommendationCandidates).mockResolvedValue([
      { workId: 'res1', media: { ...media('res1', 'book'), posterUrl: 'https://p' }, reason: 'r1', seedTitle: 'S' },
      { workId: 'res2', media: media('res2', 'tv'), reason: 'r2' },
      { workId: 'res3', media: media('res3', 'movie'), reason: 'r3' },
      { workId: 'res4', media: media('res4', 'other' as never), reason: 'r4' },
      { workId: 'a', media: media('a'), reason: 'dup' },
      { workId: 'res-gone', media: media('res-gone'), reason: 'x' },
    ] as never);

    const out = (await call(MessageType.GET_PERSONALIZED_RECS)) as { flat: PersonalizedRecommendation[]; grouped: unknown[] };
    expect(resolveRecommendationCandidates).toHaveBeenCalledWith(
      [{ title: 'Unresolved', year: 2020, type: 'movie', reason: 'r', seedTitle: 'S' }],
      expect.anything(),
    );
    expect(out.flat.map((r) => [r.tmdbId, r.type])).toEqual([
      ['a', 'movie'],
      ['res1', 'book'],
      ['res2', 'tv'],
      ['res3', 'movie'],
      ['res4', 'movie'],
    ]);
    expect(out.flat[1]).toMatchObject({ posterUrl: 'https://p', confidenceSignal: 'medium', seedTitle: 'S' });
    expect(out.flat[2].posterUrl).toBeUndefined();
    expect(out.grouped).toEqual([{ seedTitle: 'S', recommendations: [p('a')] }]);
  });

  it('returns null groups when every group empties or none were returned', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    vi.mocked(llm.getPersonalizedRecommendations).mockResolvedValue({
      flat: [p('a')],
      grouped: [{ seedTitle: 'S', recommendations: [p('')] }],
    } as never);
    await expect(call(MessageType.GET_PERSONALIZED_RECS)).resolves.toEqual({ flat: [p('a')], grouped: null });
    vi.mocked(llm.getPersonalizedRecommendations).mockResolvedValue({ flat: [], grouped: null } as never);
    await expect(call(MessageType.GET_PERSONALIZED_RECS)).resolves.toEqual({ flat: [], grouped: null });
    expect(resolveRecommendationCandidates).not.toHaveBeenCalled();
  });

  it('reports llm_failed when generation throws', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ llmEnabled: true, llmApiKey: 'k' }));
    vi.mocked(llm.getPersonalizedRecommendations).mockRejectedValue(new Error('down'));
    await expect(call(MessageType.GET_PERSONALIZED_RECS)).resolves.toEqual({ error: 'llm_failed', flat: [], grouped: null });
  });
});

describe('weekly digest and dispatch', () => {
  it('GET_WEEKLY_DIGEST returns a fresh cached digest', async () => {
    vi.mocked(storage.getWeeklyDigest).mockResolvedValue(digest(2));
    vi.mocked(isDigestStale).mockReturnValue(false);
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toEqual(digest(2));
    expect(storage.getPreferences).not.toHaveBeenCalled();
  });

  it('GET_WEEKLY_DIGEST serves a stale cache and regenerates in the background', async () => {
    vi.mocked(storage.getWeeklyDigest).mockResolvedValue(digest(2));
    vi.mocked(isDigestStale).mockReturnValue(true);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: true }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValue(digest(3));
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toEqual(digest(2));
    await vi.waitFor(() => expect(storage.saveWeeklyDigest).toHaveBeenCalledWith(digest(3)));

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    vi.mocked(generateWeeklyDigest).mockRejectedValue(new Error('down'));
    await call(MessageType.GET_WEEKLY_DIGEST);
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith('[Subsume] Background weekly digest regen failed:', expect.any(Error)),
    );
  });

  it('GET_WEEKLY_DIGEST without a usable cache walks dispatch → weekly → discovery feed → empty', async () => {
    vi.mocked(storage.getWeeklyDigest).mockResolvedValue(undefined);
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: true }));

    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(1));
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toEqual(digest(1));

    vi.mocked(generateSubsumeDispatch).mockRejectedValueOnce(new Error('x'));
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(2));
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toEqual(digest(2));

    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(0));
    vi.mocked(generateWeeklyDigest).mockRejectedValueOnce(new Error('y'));
    vi.mocked(getDiscoveryFeed).mockResolvedValueOnce({ items: [{ id: 'f' }] } as never);
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toMatchObject({ fromFeed: true });

    vi.mocked(storage.getWeeklyDigest).mockResolvedValue(digest(0));
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(0));
    vi.mocked(getDiscoveryFeed).mockResolvedValueOnce({ items: [] } as never);
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toMatchObject({ items: [], llmGenerated: false });

    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(0));
    vi.mocked(getDiscoveryFeed).mockRejectedValueOnce(new Error('feed down'));
    await expect(call(MessageType.GET_WEEKLY_DIGEST)).resolves.toMatchObject({ items: [] });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Discovery feed fallback for weekly digest failed:', expect.any(Error));
  });

  it('REGENERATE_WEEKLY_DIGEST forces dispatch, then falls back to the weekly path', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: true }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(1));
    await expect(call(MessageType.REGENERATE_WEEKLY_DIGEST)).resolves.toEqual(digest(1));
    expect(generateSubsumeDispatch).toHaveBeenCalledWith(expect.anything(), { force: true });

    vi.mocked(generateSubsumeDispatch).mockRejectedValueOnce(new Error('x'));
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(2));
    await expect(call(MessageType.REGENERATE_WEEKLY_DIGEST)).resolves.toEqual(digest(2));
    expect(generateSubsumeDispatch).toHaveBeenCalledTimes(2);

    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(0));
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(4));
    await expect(call(MessageType.REGENERATE_WEEKLY_DIGEST)).resolves.toEqual(digest(4));

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(5));
    await expect(call(MessageType.REGENERATE_WEEKLY_DIGEST)).resolves.toEqual(digest(5));
    expect(storage.saveWeeklyDigest).toHaveBeenCalledTimes(4);
  });

  it('GET_SUBSUME_DISPATCH generates when enabled, else serves cache or resolves', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: true }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(1));
    await expect(call(MessageType.GET_SUBSUME_DISPATCH)).resolves.toEqual(digest(1));
    expect(storage.saveWeeklyDigest).toHaveBeenCalledWith(digest(1));

    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    vi.mocked(storage.getWeeklyDigest).mockResolvedValueOnce(digest(2));
    await expect(call(MessageType.GET_SUBSUME_DISPATCH)).resolves.toEqual(digest(2));

    vi.mocked(storage.getWeeklyDigest).mockResolvedValueOnce(undefined);
    vi.mocked(generateWeeklyDigest).mockResolvedValueOnce(digest(3));
    await expect(call(MessageType.GET_SUBSUME_DISPATCH)).resolves.toEqual(digest(3));
  });

  it('REGENERATE_SUBSUME_DISPATCH always forces dispatch on', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValueOnce(digest(1));
    await expect(call(MessageType.REGENERATE_SUBSUME_DISPATCH)).resolves.toEqual(digest(1));
    expect(generateSubsumeDispatch).toHaveBeenCalledWith(expect.objectContaining({ dispatchEnabled: true }), { force: true });
  });

  it('GET_DISCOVERY_FEED passes the force flag', async () => {
    vi.mocked(getDiscoveryFeed).mockResolvedValue({ items: [] } as never);
    await call(MessageType.GET_DISCOVERY_FEED, { force: true });
    expect(getDiscoveryFeed).toHaveBeenCalledWith(true);
    await call(MessageType.GET_DISCOVERY_FEED, null);
    expect(getDiscoveryFeed).toHaveBeenLastCalledWith(false);
  });
});
