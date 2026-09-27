import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type LibraryItem, type MediaItem } from '@/shared/types';
import type { BookEdition, CatalogWork } from '@/shared/catalogTypes';

vi.mock('@/background/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/background/storage')>();
  return {
    isValidMediaItem: actual.isValidMediaItem,
    intentForStatus: actual.intentForStatus,
    putMediaItem: vi.fn(),
    getMediaItem: vi.fn(),
    putLibraryItem: vi.fn(),
    getLibraryItem: vi.fn(),
    getPreferences: vi.fn(),
    getEditionsForWork: vi.fn(),
    putEdition: vi.fn(),
    getRelationship: vi.fn(),
    putRelationship: vi.fn(),
    getAllLibraryItems: vi.fn(),
    getAllMediaMap: vi.fn(),
  };
});
vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
  resolveOpenLibraryIsbn: vi.fn(),
  getOpenLibraryWork: vi.fn(),
  getOpenLibraryEditionsForWork: vi.fn(),
}));
vi.mock('@/background/googleBooks', () => ({ searchGoogleBooks: vi.fn() }));
vi.mock('@/background/originRateLimit', () => ({
  originHostFromSender: vi.fn(() => 'site.test'),
  tryConsumeOriginRateLimit: vi.fn(() => ({ allowed: true, retryAfterMs: 0 })),
  ORIGIN_RATE_LIMIT_REASON: 'rate_limited',
}));
vi.mock('@/background/context', () => ({ invalidateProfileCache: vi.fn() }));
vi.mock('@/background/activationHooks', () => ({ onNewLibraryItemCreated: vi.fn() }));
vi.mock('@/background/handlers/utils', () => ({ broadcastMessage: vi.fn() }));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { bookHandlers } from '@/background/handlers/books';
import * as storage from '@/background/storage';
import * as ol from '@/background/openLibrary';
import { searchGoogleBooks } from '@/background/googleBooks';
import { tryConsumeOriginRateLimit } from '@/background/originRateLimit';
import { invalidateProfileCache } from '@/background/context';
import { broadcastMessage } from '@/background/handlers/utils';
import { onNewLibraryItemCreated } from '@/background/activationHooks';
import { logger } from '@/shared/logger';

const sender = {} as chrome.runtime.MessageSender;
const call = (type: MessageType, payload: unknown) => bookHandlers[type]!(payload, sender);
const work = (id: string, over: Partial<CatalogWork> = {}): CatalogWork => ({
  id,
  medium: 'book',
  canonicalTitle: `Title ${id}`,
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
const withAuthors = (id: string, title: string, authors?: string[]) =>
  work(id, { canonicalTitle: title, bookDetails: authors ? ({ authors } as CatalogWork['bookDetails']) : undefined });
const edition = (id: string, coverUrl?: string) => ({ id, coverUrl }) as BookEdition;
const media = (id: string, over: Partial<MediaItem> = {}): MediaItem => ({
  id,
  canonicalTitle: id,
  type: 'book',
  year: 2000,
  genres: [],
  ratings: [],
  providers: [],
  ...over,
});
const VALID_ISBN13 = '9780441172719'; // Dune
const VALID_ISBN10 = '0441172717';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tryConsumeOriginRateLimit).mockReturnValue({ allowed: true, retryAfterMs: 0 } as never);
  vi.mocked(storage.getPreferences).mockResolvedValue({} as never);
  vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
  vi.mocked(storage.getLibraryItem).mockResolvedValue(undefined);
  vi.mocked(storage.getRelationship).mockResolvedValue(undefined);
});

describe('SEARCH_WORKS', () => {
  it('returns nothing for blank queries', async () => {
    await expect(call(MessageType.SEARCH_WORKS, {})).resolves.toEqual({ works: [] });
  });

  it('merges Open Library and Google Books, deduping by title + authors', async () => {
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([
      { work: withAuthors('ol1', 'Dune', ['Frank Herbert']), matchScore: 1 },
      { work: work('ol2', { canonicalTitle: undefined as never }), matchScore: 0.5 },
    ] as never);
    vi.mocked(storage.getPreferences).mockResolvedValue({ googleBooksApiKey: ' key ' } as never);
    vi.mocked(searchGoogleBooks).mockResolvedValue([
      { work: withAuthors('gb1', 'dune ', [' frank herbert', '']), matchScore: 1 },
      { work: withAuthors('gb2', 'Children of Dune', ['Frank Herbert']), matchScore: 0.8 },
      { work: withAuthors('gb3', 'Dune Messiah'), matchScore: 0.7 },
    ] as never);
    const out = (await call(MessageType.SEARCH_WORKS, { query: ' dune ', medium: 'book', limit: 5 })) as { works: MediaItem[]; medium: string };
    expect(ol.searchOpenLibrary).toHaveBeenCalledWith({ query: 'dune', limit: 5 });
    expect(searchGoogleBooks).toHaveBeenCalledWith('dune', ' key ', 5);
    expect(out.works.map((w) => [w.id, w.type, w.authors])).toEqual([
      ['ol1', 'book', ['Frank Herbert']],
      ['ol2', 'book', undefined],
      ['gb2', 'book', ['Frank Herbert']],
      ['gb3', 'book', undefined],
    ]);
    expect(out.medium).toBe('book');
  });

  it('tolerates provider failures and skips books for screen-only searches', async () => {
    vi.mocked(ol.searchOpenLibrary).mockRejectedValue(new Error('ol'));
    vi.mocked(storage.getPreferences).mockRejectedValue(new Error('prefs'));
    await expect(call(MessageType.SEARCH_WORKS, { query: 'x' })).resolves.toEqual({ works: [], medium: 'all' });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Open Library search failed:', expect.any(Error));
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Google Books search failed:', expect.any(Error));

    vi.clearAllMocks();
    vi.mocked(storage.getPreferences).mockResolvedValue({} as never);
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([]);
    await expect(call(MessageType.SEARCH_WORKS, { query: 'x' })).resolves.toEqual({ works: [], medium: 'all' });
    expect(searchGoogleBooks).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await expect(call(MessageType.SEARCH_WORKS, { query: 'x', medium: 'movie' })).resolves.toEqual({ works: [], medium: 'movie' });
    expect(ol.searchOpenLibrary).not.toHaveBeenCalled();
  });
});

describe('RESOLVE_PAGE_CANDIDATE', () => {
  it('rate limits per origin', async () => {
    vi.mocked(tryConsumeOriginRateLimit).mockReturnValue({ allowed: false, retryAfterMs: 1200 } as never);
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book' })).resolves.toEqual({
      resolved: false,
      reason: 'rate_limited',
      retryAfterMs: 1200,
    });
  });

  it('rejects non-book candidates', async () => {
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, null)).resolves.toMatchObject({ reason: 'not_a_book_candidate' });
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'movie' })).resolves.toMatchObject({ reason: 'not_a_book_candidate' });
  });

  it('resolves via ISBN (skipping invalid ones), preferring the edition cover', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ work: withAuthors('ol_w', 'Dune', ['FH']), edition: edition('ed1', 'https://cover') } as never);
    vi.mocked(storage.getLibraryItem).mockResolvedValue({ status: 'watched' } as LibraryItem);
    const out = (await call(MessageType.RESOLVE_PAGE_CANDIDATE, {
      medium: 'book',
      isbn13: ['123', VALID_ISBN13],
      isbn10: [VALID_ISBN10],
    })) as { resolved: boolean; media: MediaItem; inLibrary: boolean; libraryStatus?: string };
    expect(ol.resolveOpenLibraryIsbn).toHaveBeenNthCalledWith(1, VALID_ISBN13);
    expect(ol.resolveOpenLibraryIsbn).toHaveBeenNthCalledWith(2, VALID_ISBN13);
    expect(out).toMatchObject({ resolved: true, inLibrary: true, libraryStatus: 'watched' });
    expect(out.media).toMatchObject({ type: 'book', authors: ['FH'], posterUrl: 'https://cover', preferredEditionId: 'ed1' });
  });

  it('keeps the work cover when the edition has none', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn).mockResolvedValue({
      work: work('ol_w', { images: { primary: 'https://work-cover' } }),
      edition: edition('ed1'),
    } as never);
    const out = (await call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', isbn13: [VALID_ISBN13] })) as { media: MediaItem; inLibrary: boolean };
    expect(out.media.posterUrl).toBe('https://work-cover');
    expect(out.media.authors).toBeUndefined();
    expect(out.inLibrary).toBe(false);
  });

  it('falls back to a confident title search, else no match', async () => {
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([{ work: withAuthors('ol_t', 'Dune', ['FH']), matchScore: 0.9 }] as never);
    const byConfidence = (await call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', title: 'Dune', confidence: 0.7 })) as { media: MediaItem };
    expect(ol.searchOpenLibrary).toHaveBeenCalledWith({ query: 'Dune', limit: 3 });
    expect(byConfidence.media.authors).toEqual(['FH']);

    vi.mocked(storage.getLibraryItem).mockResolvedValue({ status: 'to-watch' } as LibraryItem);
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([{ work: work('ol_t'), matchScore: 0.9 }] as never);
    const byAuthor = (await call(MessageType.RESOLVE_PAGE_CANDIDATE, {
      medium: 'book',
      title: 'Dune',
      confidence: 0.1,
      authorOrCreator: ['Herbert'],
    })) as { libraryStatus: string };
    expect(ol.searchOpenLibrary).toHaveBeenLastCalledWith({ query: 'Dune Herbert', limit: 3 });
    expect(byAuthor.libraryStatus).toBe('to-watch');

    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([{ work: work('weak'), matchScore: 0.2 }] as never);
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', title: 'Dune', confidence: 0.9 })).resolves.toMatchObject({ reason: 'no_catalog_match' });
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([]);
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', title: 'Dune', confidence: 0.9 })).resolves.toMatchObject({ reason: 'no_catalog_match' });

    vi.mocked(ol.searchOpenLibrary).mockClear();
    await call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', title: 'Dune', confidence: 0.1, authorOrCreator: [] });
    await call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', title: 'Dune', confidence: 0.1 });
    await call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', confidence: 1 });
    expect(ol.searchOpenLibrary).not.toHaveBeenCalled();
  });

  it('logs lookup failures', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn).mockRejectedValue(new Error('ol down'));
    await expect(call(MessageType.RESOLVE_PAGE_CANDIDATE, { medium: 'book', isbn13: [VALID_ISBN13] })).resolves.toMatchObject({ reason: 'no_catalog_match' });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] RESOLVE_PAGE_CANDIDATE failed:', expect.any(Error));
  });
});

describe('GET_WORK_DETAILS', () => {
  it('returns stored media, fetches Open Library works, or null', async () => {
    await expect(call(MessageType.GET_WORK_DETAILS, {})).resolves.toBeNull();
    vi.mocked(storage.getMediaItem).mockResolvedValueOnce(media('m'));
    await expect(call(MessageType.GET_WORK_DETAILS, { workId: 'm' })).resolves.toEqual(media('m'));
    await expect(call(MessageType.GET_WORK_DETAILS, { workId: 'tmdb_movie_1' })).resolves.toBeNull();

    vi.mocked(ol.getOpenLibraryWork).mockResolvedValueOnce(work('openlibrary_work_OL1W'));
    const fetched = (await call(MessageType.GET_WORK_DETAILS, { workId: 'openlibrary_work_OL1W' })) as MediaItem;
    expect(fetched).toMatchObject({ id: 'openlibrary_work_OL1W', type: 'book' });
    expect(storage.putMediaItem).toHaveBeenCalled();

    vi.mocked(ol.getOpenLibraryWork).mockResolvedValueOnce(null);
    await expect(call(MessageType.GET_WORK_DETAILS, { workId: 'openlibrary_work_OL2W' })).resolves.toBeNull();
    vi.mocked(ol.getOpenLibraryWork).mockRejectedValueOnce(new Error('ol'));
    await expect(call(MessageType.GET_WORK_DETAILS, { workId: 'openlibrary_work_OL3W' })).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] GET_WORK_DETAILS OL failed:', expect.any(Error));
  });
});

describe('ADD_TO_ARCHIVE', () => {
  const valid = media('openlibrary_work_OL9W', { canonicalTitle: 'Dune', year: 1965 });

  it('validates status, media and ids', async () => {
    await expect(call(MessageType.ADD_TO_ARCHIVE, { status: 5, workId: 'x' })).rejects.toThrow('Invalid ADD_TO_ARCHIVE status');
    await expect(call(MessageType.ADD_TO_ARCHIVE, { status: 'read' })).rejects.toThrow('Invalid ADD_TO_ARCHIVE status');
    await expect(call(MessageType.ADD_TO_ARCHIVE, { mediaItem: { id: 'bad' } })).rejects.toThrow('Invalid media item payload');
    await expect(call(MessageType.ADD_TO_ARCHIVE, null)).rejects.toThrow('requires workId or mediaItem');
    await expect(call(MessageType.ADD_TO_ARCHIVE, { workId: 7 })).rejects.toThrow('requires workId or mediaItem');
    await expect(call(MessageType.ADD_TO_ARCHIVE, { workId: 'not valid!' })).rejects.toThrow('Invalid workId');
    await expect(call(MessageType.ADD_TO_ARCHIVE, { workId: 'openlibrary_work_OL9W' })).rejects.toThrow('media not found');
  });

  it('adds new media with defaults, then updates keeping existing fields', async () => {
    await expect(call(MessageType.ADD_TO_ARCHIVE, { mediaItem: valid, status: null })).resolves.toEqual({ added: true, mediaId: valid.id });
    expect(vi.mocked(storage.putLibraryItem).mock.calls[0][0]).toMatchObject({ status: 'to-watch', sanctuaryIntent: 'wishlist' });
    expect(onNewLibraryItemCreated).toHaveBeenCalled();
    expect(invalidateProfileCache).toHaveBeenCalled();
    expect(broadcastMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'add', mediaId: valid.id }));

    vi.clearAllMocks();
    vi.mocked(storage.getMediaItem).mockResolvedValue(media(valid.id, { canonicalTitle: 'Dune', year: 1965, overview: 'stored' }));
    vi.mocked(storage.getLibraryItem).mockResolvedValue({
      mediaId: valid.id,
      status: 'watching',
      addedAt: 3,
      sanctuaryIntent: 'keep_close',
      notes: 'n',
    } as LibraryItem);
    await call(MessageType.ADD_TO_ARCHIVE, { mediaItem: valid });
    expect(vi.mocked(storage.putMediaItem).mock.calls[0][0].overview).toBe('stored');
    expect(vi.mocked(storage.putLibraryItem).mock.calls[0][0]).toMatchObject({ status: 'watching', addedAt: 3, sanctuaryIntent: 'keep_close', notes: 'n' });
    expect(onNewLibraryItemCreated).not.toHaveBeenCalled();

    await call(MessageType.ADD_TO_ARCHIVE, { workId: ` ${valid.id} `, status: 'watched' });
    expect(vi.mocked(storage.putLibraryItem).mock.calls[1][0].status).toBe('watched');
  });

  it('ignores broadcast failures for new items', async () => {
    vi.mocked(broadcastMessage).mockRejectedValueOnce(new Error('tabs'));
    await expect(call(MessageType.ADD_TO_ARCHIVE, { mediaItem: valid })).resolves.toEqual({ added: true, mediaId: valid.id });
  });
});

describe('CHECK_ARCHIVE_STATUS and GET_ARCHIVE', () => {
  it('checks by workId or mediaId with id validation', async () => {
    await expect(call(MessageType.CHECK_ARCHIVE_STATUS, null)).resolves.toEqual({ inLibrary: false });
    await expect(call(MessageType.CHECK_ARCHIVE_STATUS, { workId: 'bad id' })).resolves.toEqual({ inLibrary: false });
    vi.mocked(storage.getLibraryItem).mockResolvedValue({ status: 'watched', userRating: 8 } as LibraryItem);
    await expect(call(MessageType.CHECK_ARCHIVE_STATUS, { mediaId: 'tmdb_movie_1' })).resolves.toEqual({ inLibrary: true, status: 'watched', userRating: 8 });
    vi.mocked(storage.getLibraryItem).mockResolvedValue(undefined);
    await expect(call(MessageType.CHECK_ARCHIVE_STATUS, { workId: 'tmdb_movie_1' })).resolves.toEqual({ inLibrary: false, status: undefined, userRating: undefined });
  });

  it('joins library with media and filters by type and status', async () => {
    vi.mocked(storage.getAllLibraryItems).mockResolvedValue([
      { mediaId: 'a', status: 'watched' },
      { mediaId: 'b', status: 'to-watch' },
      { mediaId: 'ghost', status: 'watched' },
    ] as LibraryItem[]);
    vi.mocked(storage.getAllMediaMap).mockResolvedValue({ a: media('a'), b: media('b', { type: 'movie' }) });
    const all = (await call(MessageType.GET_ARCHIVE, null)) as unknown[];
    expect(all).toHaveLength(2);
    const books = (await call(MessageType.GET_ARCHIVE, { type: 'book' })) as Array<{ media: MediaItem }>;
    expect(books.map((j) => j.media.id)).toEqual(['a']);
    const todo = (await call(MessageType.GET_ARCHIVE, { status: 'to-watch' })) as Array<{ media: MediaItem }>;
    expect(todo.map((j) => j.media.id)).toEqual(['b']);
  });
});

describe('editions', () => {
  it('GET_BOOK_EDITIONS requires a workId', async () => {
    await expect(call(MessageType.GET_BOOK_EDITIONS, null)).rejects.toThrow('workId is required');
  });

  it('fetches Open Library editions when none are cached and orders the preferred one first', async () => {
    vi.mocked(storage.getEditionsForWork)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([edition('e1'), edition('e2')]);
    vi.mocked(ol.getOpenLibraryEditionsForWork).mockResolvedValue([edition('e1'), edition('e2')]);
    vi.mocked(storage.getRelationship).mockResolvedValue({ preferredEditionId: 'e2' } as never);
    const out = (await call(MessageType.GET_BOOK_EDITIONS, { workId: 'openlibrary_work_OL1W' })) as { editions: BookEdition[]; preferredEditionId: string };
    expect(storage.putEdition).toHaveBeenCalledTimes(2);
    expect(out.editions[0].id).toBe('e2');
    expect(out.preferredEditionId).toBe('e2');
  });

  it('uses the media preferred edition, tolerates OL failures, and reports null when unset', async () => {
    vi.mocked(storage.getEditionsForWork).mockResolvedValue([]);
    vi.mocked(ol.getOpenLibraryEditionsForWork).mockRejectedValue(new Error('ol'));
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('m', { preferredEditionId: 'm-ed' }));
    await expect(call(MessageType.GET_BOOK_EDITIONS, { workId: 'openlibrary_work_OL1W' })).resolves.toEqual({ editions: [], preferredEditionId: 'm-ed' });
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] GET_BOOK_EDITIONS OL fetch failed:', expect.any(Error));

    vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
    vi.mocked(storage.getEditionsForWork).mockResolvedValue([edition('x')]);
    await expect(call(MessageType.GET_BOOK_EDITIONS, { workId: 'tmdb_movie_1' })).resolves.toEqual({ editions: [edition('x')], preferredEditionId: null });
  });

  it('SET_PREFERRED_EDITION validates and updates relationship, library and media', async () => {
    await expect(call(MessageType.SET_PREFERRED_EDITION, { workId: 'w' })).rejects.toThrow('workId and editionId are required');
    await expect(call(MessageType.SET_PREFERRED_EDITION, null)).rejects.toThrow('required');

    await expect(call(MessageType.SET_PREFERRED_EDITION, { workId: 'w', editionId: ' e ' })).resolves.toEqual({ updated: true, workId: 'w', preferredEditionId: 'e' });
    expect(vi.mocked(storage.putRelationship).mock.calls[0][0]).toMatchObject({ workId: 'w', status: 'planned', preferredEditionId: 'e' });
    expect(storage.putLibraryItem).not.toHaveBeenCalled();
    expect(storage.putMediaItem).not.toHaveBeenCalled();

    vi.mocked(storage.getRelationship).mockResolvedValue({ workId: 'w', status: 'completed' } as never);
    vi.mocked(storage.getLibraryItem).mockResolvedValue({ mediaId: 'w' } as LibraryItem);
    vi.mocked(storage.getMediaItem).mockResolvedValue(media('w'));
    await call(MessageType.SET_PREFERRED_EDITION, { workId: 'w', editionId: 'e2' });
    expect(vi.mocked(storage.putRelationship).mock.calls[1][0]).toMatchObject({ status: 'completed', preferredEditionId: 'e2' });
    expect(vi.mocked(storage.putLibraryItem).mock.calls[0][0].preferredEditionId).toBe('e2');
    expect(vi.mocked(storage.putMediaItem).mock.calls[0][0].preferredEditionId).toBe('e2');
  });
});

describe('IMPORT_GOODREADS_CSV', () => {
  it('requires rows or CSV text', async () => {
    await expect(call(MessageType.IMPORT_GOODREADS_CSV, null)).rejects.toThrow('requires csvText or rows');
    await expect(call(MessageType.IMPORT_GOODREADS_CSV, { rows: [] })).rejects.toThrow('requires csvText or rows');
  });

  it('imports rows by ISBN or title, reports failures, and caps the batch', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn).mockImplementation(async (isbn) =>
      isbn === VALID_ISBN13 ? ({ work: withAuthors('ol_dune', 'Dune', ['FH']), edition: edition('e') } as never) : null,
    );
    vi.mocked(ol.searchOpenLibrary).mockImplementation(async ({ query }) => {
      if (query.startsWith('Emma')) return [{ work: work('ol_weak', { canonicalTitle: 'Totally Different' }), matchScore: 1 }, { work: work('ol_emma', { canonicalTitle: 'Emma' }), matchScore: 0.3 }] as never;
      if (query.startsWith('Boom')) throw new Error('search exploded');
      return [];
    });
    vi.mocked(storage.getMediaItem).mockImplementation(async (id) => (id === 'ol_emma' ? media('ol_emma', { overview: 'stored' }) : undefined));
    vi.mocked(storage.getLibraryItem).mockImplementation(async (id) =>
      id === 'ol_emma' ? ({ mediaId: id, addedAt: 5, userRating: 6, contemplatedAt: 9 } as LibraryItem) : undefined,
    );

    const out = (await call(MessageType.IMPORT_GOODREADS_CSV, {
      cap: 4.7,
      rows: [
        { rowIndex: 1, title: 'Dune', isbn13: VALID_ISBN13, myRating: 5, exclusiveShelf: 'read', dateRead: '2020/01/02' },
        { rowIndex: 2, title: 'Emma', author: 'Austen', isbn13: 'bad', exclusiveShelf: 'currently-reading' },
        { rowIndex: 3, title: '  ' },
        { rowIndex: 4, title: 'Nothing', isbn13: '9780000000002' },
        { rowIndex: 5, title: 'Over cap' },
      ],
    })) as Record<string, unknown> & { results: Array<Record<string, unknown>> };

    expect(out).toMatchObject({ imported: 2, skipped: 1, failed: 1, truncated: true, totalDataRows: 5, processed: 4 });
    expect(out.warnings).toEqual(['Import capped at 4 of 5 rows (not a full Goodreads sync).']);
    expect(out.results.map((r) => r.ok)).toEqual([true, true, false, false]);
    expect(out.results[2]).toMatchObject({ title: '(empty)', error: 'Empty title' });
    const lib = vi.mocked(storage.putLibraryItem).mock.calls.map((c) => c[0]);
    expect(lib[0]).toMatchObject({ mediaId: 'ol_dune', status: 'watched', userRating: 10 });
    expect(lib[0].contemplatedAt).toBeTypeOf('number');
    expect(lib[1]).toMatchObject({ mediaId: 'ol_emma', status: 'watching', addedAt: 5, userRating: 6, contemplatedAt: 9 });
    expect(vi.mocked(storage.putMediaItem).mock.calls[1][0].overview).toBe('stored');
    expect(invalidateProfileCache).toHaveBeenCalled();
  });

  it('parses CSV text, logs ISBN failures, reports thrown errors, and skips cache invalidation with no imports', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn).mockRejectedValue(new Error('isbn down'));
    vi.mocked(ol.searchOpenLibrary).mockImplementation(async ({ query }) => {
      if (query.startsWith('Boom')) throw new Error('search exploded');
      if (query.startsWith('Weird')) throw 'not an error';
      return [{ work: undefined, matchScore: 1 }] as never;
    });
    const csv = [
      'Title,Author,ISBN13,My Rating,Exclusive Shelf,Date Read',
      `Dune,Frank Herbert,="${VALID_ISBN13}",0,to-read,`,
      'Boom,,,,,',
      'Weird,,,,,',
    ].join('\n');
    const out = (await call(MessageType.IMPORT_GOODREADS_CSV, { csvText: csv, cap: 0 })) as Record<string, unknown> & { results: Array<Record<string, unknown>> };
    expect(out).toMatchObject({ imported: 0, failed: 3, truncated: false, totalDataRows: 3 });
    expect(out.results.map((r) => r.error)).toEqual([
      'Could not resolve via Open Library (ISBN/title)',
      'search exploded',
      'Import failed',
    ]);
    expect(logger.warn).toHaveBeenCalledWith('[Subsume] Goodreads import ISBN resolve failed:', 'Dune', expect.any(Error));
    expect(invalidateProfileCache).not.toHaveBeenCalled();
  });

  it('accepts pre-parsed rows under the cap and an ISBN hit without a work', async () => {
    vi.mocked(ol.resolveOpenLibraryIsbn).mockResolvedValue({ work: undefined } as never);
    vi.mocked(ol.searchOpenLibrary).mockResolvedValue([{ work: work('ol_x', { canonicalTitle: 'X Marks' }), matchScore: 1 }] as never);
    const out = (await call(MessageType.IMPORT_GOODREADS_CSV, {
      rows: [{ rowIndex: 1, title: 'X Marks', isbn13: VALID_ISBN13 }, { rowIndex: 2, title: undefined as never }],
    })) as Record<string, unknown>;
    expect(out).toMatchObject({ imported: 1, skipped: 1, truncated: false, warnings: [] });
  });
});
