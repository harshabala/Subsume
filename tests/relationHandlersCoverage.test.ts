import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type MediaItem } from '@/shared/types';
import type { CatalogWork, WorkRelation } from '@/shared/catalogTypes';

vi.mock('@/background/storage', () => ({
  deleteWorkRelation: vi.fn(),
  getMediaItem: vi.fn(),
  getWork: vi.fn(),
  getWorkRelationsForWork: vi.fn(),
  putMediaItem: vi.fn(),
  putWork: vi.fn(),
  putWorkRelation: vi.fn(),
}));
vi.mock('@/background/wikidata', () => ({
  fetchWikidataAdaptations: vi.fn(),
  matchAndStoreWikidataAdaptations: vi.fn(),
}));
vi.mock('@/background/discoverySearch', () => ({ discoverySearch: vi.fn() }));
vi.mock('@/background/openLibrary', () => ({ searchOpenLibrary: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { relationHandlers, relationLabelForWork, ensureWorkCataloged } from '@/background/handlers/relations';
import * as storage from '@/background/storage';
import { fetchWikidataAdaptations, matchAndStoreWikidataAdaptations } from '@/background/wikidata';
import { discoverySearch } from '@/background/discoverySearch';
import { searchOpenLibrary } from '@/background/openLibrary';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown) => relationHandlers[type]!(payload, sender);
const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  canonicalTitle: `T-${id}`,
  type: 'movie',
  year: 2000,
  genres: [],
  ratings: [],
  providers: [],
  ...over,
});
const work = (id: string, over: Partial<CatalogWork> = {}): CatalogWork => ({
  id,
  medium: 'book',
  canonicalTitle: `W-${id}`,
  genres: [],
  images: {},
  externalIds: [],
  creatorCredits: [],
  sourceProvenance: [],
  sourceConfidence: 'high',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});
const rel = (over: Partial<WorkRelation>): WorkRelation => ({
  id: 'r',
  fromWorkId: 'a',
  toWorkId: 'b',
  relation: 'adaptation_of',
  confidence: 'user_asserted',
  sourceProvider: 'user',
  createdAt: 1,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
  vi.mocked(storage.getWork).mockResolvedValue(undefined);
  vi.mocked(storage.getWorkRelationsForWork).mockResolvedValue([]);
});

describe('relationLabelForWork', () => {
  it('labels every relation from both ends', () => {
    expect(relationLabelForWork(rel({ relation: 'adaptation_of' }), 'a')).toEqual({ label: 'Adaptation of', linkedWorkId: 'b' });
    expect(relationLabelForWork(rel({ relation: 'adaptation_of' }), 'b')).toEqual({ label: 'Adapted as', linkedWorkId: 'a' });
    expect(relationLabelForWork(rel({ relation: 'adapted_as' }), 'a').label).toBe('Adapted as');
    expect(relationLabelForWork(rel({ relation: 'adapted_as' }), 'b').label).toBe('Adaptation of');
    expect(relationLabelForWork(rel({ relation: 'based_on' }), 'a')).toEqual({ label: 'Based on', linkedWorkId: 'b' });
    expect(relationLabelForWork(rel({ relation: 'based_on' }), 'b')).toEqual({ label: 'Source for', linkedWorkId: 'a' });
    expect(relationLabelForWork(rel({ relation: 'same_universe' }), 'a').label).toBe('Same universe');
    expect(relationLabelForWork(rel({ relation: 'same_universe' }), 'b').label).toBe('Related (same universe)');
  });
});

describe('ensureWorkCataloged', () => {
  it('stores media and work only when missing', async () => {
    await ensureWorkCataloged(media('m1'));
    expect(storage.putMediaItem).toHaveBeenCalledWith(media('m1'));
    expect(storage.putWork).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));

    vi.clearAllMocks();
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('m1', { canonicalTitle: 'Stored' }));
    vi.mocked(storage.getWork).mockResolvedValue(undefined);
    await ensureWorkCataloged(media('m1'));
    expect(storage.putMediaItem).not.toHaveBeenCalled();
    expect(storage.putWork).toHaveBeenCalledWith(expect.objectContaining({ canonicalTitle: 'Stored' }));

    vi.clearAllMocks();
    vi.mocked(storage.getWork).mockResolvedValue(work('m1'));
    await ensureWorkCataloged(media('m1'));
    expect(storage.putWork).not.toHaveBeenCalled();
  });
});

describe('GET_RELATED_WORKS', () => {
  it('returns nothing for a blank id', async () => {
    await expect(call(MessageType.GET_RELATED_WORKS, {})).resolves.toEqual({ related: [] });
    await expect(call(MessageType.GET_RELATED_WORKS, { workId: '  ' })).resolves.toEqual({ related: [] });
  });

  it('resolves linked works from media or works, keeps display + user-asserted edges, sorted', async () => {
    vi.mocked(storage.getWork).mockImplementation(async (id) => (id === 'c' ? work('c') : undefined));
    vi.mocked(storage.getWorkRelationsForWork).mockResolvedValue([
      rel({ id: '2', toWorkId: 'c', relation: 'adapted_as', confidence: 'medium', createdAt: 5 }),
      rel({ id: '1', toWorkId: 'missing', relation: 'sequel_to', confidence: 'user_asserted', createdAt: 2 }),
      rel({ id: '3', toWorkId: 'x', relation: 'remake_of', confidence: 'medium', createdAt: 1 }),
    ]);
    const out = (await call(MessageType.GET_RELATED_WORKS, { workId: 'a' })) as { related: Array<{ relation: WorkRelation; linkedWork?: MediaItem }> };
    expect(out.related.map((r) => r.relation.id)).toEqual(['1', '2']);
    expect(out.related[0].linkedWork).toBeUndefined();
    expect(out.related[1].linkedWork).toMatchObject({ id: 'c', type: 'book' });
  });

  it('opt-in Wikidata enrichment: stores hints, skips empty, logs failures, needs media', async () => {
    await call(MessageType.GET_RELATED_WORKS, { workId: 'a', enrich: true });
    expect(fetchWikidataAdaptations).not.toHaveBeenCalled();

    vi.mocked(storage.getMediaItem).mockResolvedValue(media('a', { providers: [{ provider: 'imdb', externalId: 'tt9' }] }));
    vi.mocked(fetchWikidataAdaptations).mockResolvedValueOnce([{ q: 1 }] as never);
    await call(MessageType.GET_RELATED_WORKS, { workId: 'a', enrich: true });
    expect(fetchWikidataAdaptations).toHaveBeenCalledWith({ imdbId: 'tt9', title: 'T-a', year: 2000, medium: 'movie' });
    expect(matchAndStoreWikidataAdaptations).toHaveBeenCalled();

    vi.mocked(matchAndStoreWikidataAdaptations).mockClear();
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('a', { providers: undefined as never }));
    vi.mocked(fetchWikidataAdaptations).mockResolvedValueOnce([]);
    await call(MessageType.GET_RELATED_WORKS, { workId: 'a', enrich: true });
    expect(matchAndStoreWikidataAdaptations).not.toHaveBeenCalled();

    vi.mocked(fetchWikidataAdaptations).mockRejectedValueOnce(new Error('sparql'));
    await call(MessageType.GET_RELATED_WORKS, { workId: 'a', enrich: true });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Wikidata adaptation enrichment skipped:', expect.any(Error));
  });
});

describe('ASSERT_WORK_RELATION', () => {
  it('validates ids and relation types', async () => {
    await expect(call(MessageType.ASSERT_WORK_RELATION, { toWorkId: 'b', relation: 'based_on' })).rejects.toThrow('required');
    await expect(call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', relation: 'based_on' })).rejects.toThrow('required');
    await expect(call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'a', relation: 'based_on' })).rejects.toThrow('itself');
    await expect(call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'b' })).rejects.toThrow('Unsupported relation type: undefined');
    await expect(call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'b', relation: 'loves' })).rejects.toThrow('Unsupported');
  });

  it('catalogs matching media snapshots, ignores mismatched ones, and stores a non-invertible edge once', async () => {
    const out = (await call(MessageType.ASSERT_WORK_RELATION, {
      fromWorkId: 'a',
      toWorkId: 'b',
      relation: 'based_on',
      fromMedia: media('a'),
      toMedia: media('b'),
    })) as { created: boolean; inverse?: WorkRelation };
    expect(out.created).toBe(true);
    expect(out.inverse).toBeUndefined();
    expect(storage.putMediaItem).toHaveBeenCalledTimes(2);
    expect(storage.putWorkRelation).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    vi.mocked(storage.getWorkRelationsForWork).mockResolvedValue([]);
    await call(MessageType.ASSERT_WORK_RELATION, {
      fromWorkId: 'a',
      toWorkId: 'b',
      relation: 'adaptation_of',
      fromMedia: media('other'),
      toMedia: media('other2'),
      alsoInverse: false,
    });
    expect(storage.putMediaItem).not.toHaveBeenCalled();
    expect(storage.putWorkRelation).toHaveBeenCalledTimes(1);
  });

  it('returns the duplicate edge, and skips an inverse that already exists', async () => {
    vi.mocked(storage.getWorkRelationsForWork).mockImplementation(async (id) =>
      id === 'a'
        ? [rel({ id: 'dup', fromWorkId: 'a', toWorkId: 'b', relation: 'adapted_as' })]
        : [rel({ id: 'inv', fromWorkId: 'b', toWorkId: 'a', relation: 'adaptation_of' })],
    );
    await expect(call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'b', relation: 'adapted_as' })).resolves.toMatchObject({
      created: false,
      relation: { id: 'dup' },
    });

    vi.mocked(storage.getWorkRelationsForWork).mockImplementation(async (id) =>
      id === 'a'
        ? [
            rel({ fromWorkId: 'a', toWorkId: 'z', relation: 'adapted_as' }),
            rel({ fromWorkId: 'a', toWorkId: 'b', relation: 'based_on' }),
            rel({ fromWorkId: 'x', toWorkId: 'b', relation: 'adapted_as' }),
          ]
        : [
            rel({ fromWorkId: 'b', toWorkId: 'a', relation: 'adaptation_of' }),
          ],
    );
    const out = (await call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'b', relation: 'adapted_as' })) as { created: boolean; inverse?: unknown };
    expect(out.created).toBe(true);
    expect(out.inverse).toBeUndefined();

    vi.mocked(storage.getWorkRelationsForWork).mockImplementation(async (id) =>
      id === 'a'
        ? []
        : [
            rel({ fromWorkId: 'q', toWorkId: 'a', relation: 'adaptation_of' }),
            rel({ fromWorkId: 'b', toWorkId: 'q', relation: 'adaptation_of' }),
            rel({ fromWorkId: 'b', toWorkId: 'a', relation: 'based_on' }),
          ],
    );
    const withInverse = (await call(MessageType.ASSERT_WORK_RELATION, { fromWorkId: 'a', toWorkId: 'b', relation: 'adapted_as' })) as { inverse?: WorkRelation };
    expect(withInverse.inverse).toMatchObject({ fromWorkId: 'b', toWorkId: 'a', relation: 'adaptation_of' });
  });
});

describe('SEARCH_ADAPTATION_CANDIDATES', () => {
  it('handles blank ids, unknown works and untitled works', async () => {
    await expect(call(MessageType.SEARCH_ADAPTATION_CANDIDATES, {})).resolves.toEqual({ candidates: [], direction: null });
    await expect(call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'nope' })).rejects.toThrow('Work not found: nope');
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('a', { canonicalTitle: '  ' }));
    await expect(call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'a' })).resolves.toEqual({ candidates: [], direction: null });
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('a', { canonicalTitle: undefined as never }));
    await expect(call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'a' })).resolves.toEqual({ candidates: [], direction: null });
  });

  it('book → screen candidates via discovery search, clamping the limit', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('bk', { type: 'book' }));
    vi.mocked(discoverySearch).mockResolvedValue([
      media('m1'),
      media('t1', { type: 'tv' }),
      media('b2', { type: 'book' }),
      media('bk'),
      media('m2'),
    ]);
    const out = (await call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'bk', limit: 2 })) as { candidates: MediaItem[]; direction: string };
    expect(out.candidates.map((c) => c.id)).toEqual(['m1', 't1']);
    expect(out.direction).toBe('adapted_as');
    await call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'bk', limit: 0 });
    await call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'bk', limit: 99 });
  });

  it('screen → book candidates via Open Library, excluding the source', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('mv'));
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      { work: work('ol1', { bookDetails: { authors: ['Herbert'] } as never }) },
      { work: work('ol2') },
      { work: work('mv') },
    ] as never);
    const out = (await call(MessageType.SEARCH_ADAPTATION_CANDIDATES, { workId: 'mv' })) as { candidates: MediaItem[]; direction: string };
    expect(searchOpenLibrary).toHaveBeenCalledWith({ query: 'T-mv', limit: 8 });
    expect(out.candidates.map((c) => [c.id, c.type, c.authors])).toEqual([
      ['ol1', 'book', ['Herbert']],
      ['ol2', 'book', undefined],
    ]);
    expect(out.direction).toBe('adaptation_of');
  });
});
