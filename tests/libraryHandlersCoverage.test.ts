import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type LibraryItem, type MediaItem } from '@/shared/types';
import type { Reflection } from '@/shared/catalogTypes';

vi.mock('@/background/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/background/storage')>();
  return {
    intentForStatus: actual.intentForStatus,
    isValidMediaItem: actual.isValidMediaItem,
    getMediaItem: vi.fn(),
    putMediaItem: vi.fn(),
    getLibraryItem: vi.fn(),
    putLibraryItem: vi.fn(),
    removeLibraryItem: vi.fn(),
    getAllLibraryItems: vi.fn(),
    getLibraryPage: vi.fn(),
    getAllMediaMap: vi.fn(),
    getReflectionsForWork: vi.fn(),
    putReflection: vi.fn(),
    getRelationship: vi.fn(),
    putRelationship: vi.fn(),
    seedDemoLibraryIfEmpty: vi.fn(),
    mergeSeedCatalog: vi.fn(),
  };
});
vi.mock('@/background/activationHooks', () => ({ onNewLibraryItemCreated: vi.fn() }));
vi.mock('@/background/context', () => ({ invalidateProfileCache: vi.fn() }));
vi.mock('@/background/handlers/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/background/handlers/utils')>()),
  broadcastMessage: vi.fn(),
}));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { libraryHandlers } from '@/background/handlers/library';
import * as storage from '@/background/storage';
import { onNewLibraryItemCreated } from '@/background/activationHooks';
import { broadcastMessage } from '@/background/handlers/utils';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown) => libraryHandlers[type]!(payload, sender);
const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  canonicalTitle: id,
  type: 'movie',
  year: 2000,
  genres: [],
  ratings: [],
  providers: [],
  ...over,
});
const lib = (mediaId: string, over: Partial<LibraryItem> = {}) =>
  ({ mediaId, status: 'watched', addedAt: 1, updatedAt: 1, ...over }) as LibraryItem;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(storage.getReflectionsForWork).mockResolvedValue([]);
  vi.mocked(storage.getRelationship).mockResolvedValue(undefined);
});

describe('SET_USER_TAGS', () => {
  it('updates tags on known items only', async () => {
    vi.mocked(storage.getLibraryItem).mockResolvedValueOnce(undefined);
    await expect(call(MessageType.SET_USER_TAGS, { mediaId: 'x', tags: ['a'] })).resolves.toEqual({ updated: false });
    vi.mocked(storage.getLibraryItem).mockResolvedValueOnce(lib('m'));
    await expect(call(MessageType.SET_USER_TAGS, { mediaId: 'm', tags: ['noir'] })).resolves.toEqual({ updated: true });
    expect(vi.mocked(storage.putLibraryItem).mock.calls[0][0].userTags).toEqual(['noir']);
    expect(broadcastMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', mediaId: 'm' }));
  });
});

describe('SET_USER_NOTES reflections', () => {
  it('appends a first impression from notes, skipping duplicates of the latest body', async () => {
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib('m'));
    vi.mocked(storage.getReflectionsForWork).mockResolvedValue([
      { id: 'b', createdAt: 1, body: 'older', kind: 'progress_note' },
      { id: 'a', createdAt: 1, body: 'same text', kind: 'progress_note' },
      { id: 'c', createdAt: 2, body: '  same text ', kind: 'progress_note' },
    ] as Reflection[]);
    await call(MessageType.SET_USER_NOTES, { mediaId: 'm', notes: 'same text' });
    expect(storage.putReflection).not.toHaveBeenCalled();
    expect(onNewLibraryItemCreated).toHaveBeenCalled();

    await call(MessageType.SET_USER_NOTES, { mediaId: 'm', notes: 'new text' });
    expect(vi.mocked(storage.putReflection).mock.calls[0][0]).toMatchObject({ kind: 'first_impression', body: 'new text' });
  });

  it('uses later_reflection after a first impression and updates the relationship excerpt', async () => {
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib('m'));
    vi.mocked(storage.getReflectionsForWork).mockResolvedValue([{ id: 'a', createdAt: 1, body: 'x', kind: 'first_impression' }] as Reflection[]);
    vi.mocked(storage.getRelationship).mockResolvedValue({ workId: 'm' } as never);
    const long = 'y'.repeat(300);
    await call(MessageType.SET_USER_NOTES, { mediaId: 'm', emotionalRecall: long, notes: 'ignored' });
    expect(vi.mocked(storage.putReflection).mock.calls[0][0]).toMatchObject({ kind: 'later_reflection', body: long });
    const excerpt = vi.mocked(storage.putRelationship).mock.calls[0][0].latestReflectionExcerpt!;
    expect(excerpt).toHaveLength(280);

    await call(MessageType.SET_USER_NOTES, { mediaId: 'm', notes: 'short' });
    expect(vi.mocked(storage.putRelationship).mock.calls[1][0].latestReflectionExcerpt).toBe('short');
  });

  it('skips reflections for empty notes and logs append failures', async () => {
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib('m'));
    await call(MessageType.SET_USER_NOTES, { mediaId: 'm', notes: '   ', awe: 50 });
    expect(storage.getReflectionsForWork).not.toHaveBeenCalled();
    expect(onNewLibraryItemCreated).not.toHaveBeenCalled();

    vi.mocked(storage.getReflectionsForWork).mockRejectedValue(new Error('db'));
    await expect(call(MessageType.SET_USER_NOTES, { mediaId: 'm', notes: 'n' })).resolves.toEqual({ updated: true });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] SET_USER_NOTES reflection append failed:', expect.any(Error));
  });
});

describe('ADD_TO_LIST', () => {
  it('merges with existing media', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('tmdb_movie_5', { overview: 'stored overview' }));
    vi.mocked(storage.getLibraryItem).mockResolvedValue(lib('tmdb_movie_5'));
    await call(MessageType.ADD_TO_LIST, { mediaItem: media('tmdb_movie_5') });
    expect(vi.mocked(storage.putMediaItem).mock.calls[0][0].overview).toBe('stored overview');
    expect(onNewLibraryItemCreated).not.toHaveBeenCalled();
  });
});

describe('GET_LIBRARY', () => {
  const setup = () => {
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([
      lib('a', { status: 'watched', addedAt: 1, userRating: 5 }),
      lib('b', { status: 'to-watch', addedAt: 3 }),
      lib('c', { status: 'watched', addedAt: 2, userRating: 9 }),
      lib('ghost', { status: 'watched', addedAt: 4 }),
      lib('d', { status: 'watched', addedAt: 0 }),
    ]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({
      a: media('a', { year: 1990, genres: ['drama'], ratings: [{ provider: 'tmdb', score: 6 }] }),
      b: media('b', { type: 'tv', year: 2010, genres: ['drama'], ratings: [{ provider: 'tmdb', score: 8 }] }),
      c: media('c', { year: 2020, genres: ['comedy'] }),
      d: media('d', { year: undefined as never, genres: undefined as never }),
    });
  };
  const ids = (out: unknown) => (out as Array<{ library: LibraryItem }>).map((j) => j.library.mediaId);

  it('filters by status, type, genre and year range', async () => {
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { status: 'watched' }))).toEqual(['c', 'a', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { type: 'tv' }))).toEqual(['b']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { genre: 'drama' }))).toEqual(['b', 'a']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { yearRange: { min: 2000, max: 2015 } }))).toEqual(['b']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { yearRange: { min: 1995, max: 2100 } }))).toEqual(['b', 'c']);
  });

  it('sorts by year, rating, userRating, addedAt and unknown keys', async () => {
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([lib('y1', { addedAt: 1 }), lib('y2', { addedAt: 2 })]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({
      y1: media('y1', { year: undefined as never }),
      y2: media('y2', { year: 1999 }),
    });
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'year' }))).toEqual(['y2', 'y1']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'year' }))).toEqual(['c', 'b', 'a', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'rating' }))).toEqual(['b', 'a', 'c', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'userRating' }))).toEqual(['c', 'a', 'b', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'addedAt' }))).toEqual(['b', 'c', 'a', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, { sortBy: 'weird' }))).toEqual(['b', 'c', 'a', 'd']);
    setup();
    expect(ids(await call(MessageType.GET_LIBRARY, null))).toEqual(['b', 'c', 'a', 'd']);
  });
});

describe('GET_LIBRARY_PAGE and RESTORE_DEMO_LIBRARY', () => {
  it('clamps paging and drops rows without media', async () => {
    vi.mocked(storage.getLibraryPage).mockResolvedValue([lib('a'), lib('ghost')]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ a: media('a') });
    const out = (await call(MessageType.GET_LIBRARY_PAGE, { limit: 500, offset: -5, type: 'movie' })) as unknown[];
    expect(storage.getLibraryPage).toHaveBeenCalledWith(100, 0, 'movie');
    expect(out).toEqual([{ library: lib('a'), media: media('a') }]);
    await call(MessageType.GET_LIBRARY_PAGE, { limit: 0, offset: 3 });
    expect(storage.getLibraryPage).toHaveBeenLastCalledWith(1, 3, undefined);
  });

  it('reports whether demo data was seeded or merged', async () => {
    const run = async (empty: boolean, mediaAdded: number, libraryAdded: number) => {
      vi.mocked(storage.seedDemoLibraryIfEmpty).mockResolvedValue(empty);
      vi.mocked(storage.mergeSeedCatalog).mockResolvedValue({ mediaAdded, libraryAdded, libraryUpdated: 0 } as never);
      return (await call(MessageType.RESTORE_DEMO_LIBRARY, {})) as { seeded: boolean };
    };
    expect((await run(true, 0, 0)).seeded).toBe(true);
    expect((await run(false, 2, 0)).seeded).toBe(true);
    expect((await run(false, 0, 1)).seeded).toBe(true);
    expect((await run(false, 0, 0))).toMatchObject({ seeded: false, mediaAdded: 0 });
  });
});
