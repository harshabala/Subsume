import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType, type MediaItem } from '@/shared/types';
import type { WorkRelation } from '@/shared/catalogTypes';
import {
  putWorkRelation,
  getWorkRelationsForWork,
  deleteWorkRelation,
  putMediaItem,
} from '@/background/storage';
import {
  relationHandlers,
  relationLabelForWork,
} from '@/background/handlers/relations';

vi.mock('@/background/discoverySearch', () => ({
  discoverySearch: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

vi.mock('@/background/wikidata', () => ({
  fetchWikidataAdaptations: vi.fn().mockResolvedValue([]),
  matchAndStoreWikidataAdaptations: vi.fn().mockResolvedValue(0),
}));

import { discoverySearch } from '@/background/discoverySearch';
import { searchOpenLibrary } from '@/background/openLibrary';

const sender = {} as chrome.runtime.MessageSender;

const bookMedia: MediaItem = {
  id: 'openlibrary_work_gatsby',
  canonicalTitle: 'The Great Gatsby',
  type: 'book',
  year: 1925,
  genres: ['Fiction'],
  ratings: [],
  providers: [],
  posterUrl: '',
  authors: ['F. Scott Fitzgerald'],
};

const filmMedia: MediaItem = {
  id: 'tmdb_movie_gatsby_2013',
  canonicalTitle: 'The Great Gatsby',
  type: 'movie',
  year: 2013,
  genres: ['Drama'],
  ratings: [],
  providers: [{ provider: 'imdb', externalId: 'tt1343092', url: 'https://www.imdb.com/title/tt1343092/' }],
  posterUrl: '',
};

describe('work relation storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('put/get relations in both directions (from and to)', async () => {
    const rel: WorkRelation = {
      id: 'wr_storage_both_1',
      fromWorkId: bookMedia.id,
      toWorkId: filmMedia.id,
      relation: 'adapted_as',
      confidence: 'user_asserted',
      sourceProvider: 'user',
      createdAt: Date.now(),
    };

    await putWorkRelation(rel);

    const fromBook = await getWorkRelationsForWork(bookMedia.id);
    expect(fromBook.some((r) => r.id === rel.id)).toBe(true);

    const fromFilm = await getWorkRelationsForWork(filmMedia.id);
    expect(fromFilm.some((r) => r.id === rel.id)).toBe(true);

    await deleteWorkRelation(rel.id);
    const after = await getWorkRelationsForWork(bookMedia.id);
    expect(after.some((r) => r.id === rel.id)).toBe(false);
  });

  it('relationLabelForWork flips adaptation perspective', () => {
    const rel: WorkRelation = {
      id: 'x',
      fromWorkId: bookMedia.id,
      toWorkId: filmMedia.id,
      relation: 'adapted_as',
      confidence: 'user_asserted',
      createdAt: 1,
    };
    expect(relationLabelForWork(rel, bookMedia.id)).toEqual({
      label: 'Adapted as',
      linkedWorkId: filmMedia.id,
    });
    expect(relationLabelForWork(rel, filmMedia.id)).toEqual({
      label: 'Adaptation of',
      linkedWorkId: bookMedia.id,
    });
  });
});

describe('relationHandlers', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await putMediaItem(bookMedia);
    await putMediaItem(filmMedia);
  });

  it('ASSERT_WORK_RELATION then GET_RELATED_WORKS returns the edge', async () => {
    const assert = relationHandlers[MessageType.ASSERT_WORK_RELATION]!;
    const get = relationHandlers[MessageType.GET_RELATED_WORKS]!;

    const result = (await assert(
      {
        fromWorkId: bookMedia.id,
        toWorkId: filmMedia.id,
        relation: 'adapted_as',
        confidence: 'user_asserted',
      },
      sender,
    )) as { relation: WorkRelation; created: boolean; inverse?: WorkRelation };

    expect(result.created).toBe(true);
    expect(result.relation.fromWorkId).toBe(bookMedia.id);
    expect(result.relation.toWorkId).toBe(filmMedia.id);
    expect(result.relation.relation).toBe('adapted_as');
    expect(result.relation.confidence).toBe('user_asserted');
    expect(result.inverse?.relation).toBe('adaptation_of');

    const listed = (await get(
      { workId: bookMedia.id, enrich: false },
      sender,
    )) as {
      related: Array<{
        label: string;
        linkedWorkId: string;
        linkedWork?: MediaItem;
        relation: WorkRelation;
      }>;
    };

    expect(listed.related.length).toBeGreaterThanOrEqual(1);
    const hit = listed.related.find((r) => r.linkedWorkId === filmMedia.id);
    expect(hit).toBeTruthy();
    expect(hit!.label).toBe('Adapted as');
    expect(hit!.linkedWork?.canonicalTitle).toBe('The Great Gatsby');

    // Film side should see inverse label
    const fromFilm = (await get(
      { workId: filmMedia.id, enrich: false },
      sender,
    )) as { related: Array<{ label: string; linkedWorkId: string }> };
    const reverse = fromFilm.related.find((r) => r.linkedWorkId === bookMedia.id);
    expect(reverse?.label).toBe('Adaptation of');
  });

  it('ASSERT is idempotent for the same edge', async () => {
    const assert = relationHandlers[MessageType.ASSERT_WORK_RELATION]!;
    const first = (await assert(
      {
        fromWorkId: 'ol_work_assert_idem',
        toWorkId: 'tmdb_movie_assert_idem',
        relation: 'adaptation_of',
        confidence: 'user_asserted',
      },
      sender,
    )) as { created: boolean; relation: WorkRelation };
    const second = (await assert(
      {
        fromWorkId: 'ol_work_assert_idem',
        toWorkId: 'tmdb_movie_assert_idem',
        relation: 'adaptation_of',
        confidence: 'user_asserted',
      },
      sender,
    )) as { created: boolean; relation: WorkRelation };

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.relation.id).toBe(first.relation.id);
  });

  it('SEARCH_ADAPTATION_CANDIDATES for a book searches discovery (screen)', async () => {
    vi.mocked(discoverySearch).mockResolvedValue([
      filmMedia,
      {
        id: 'tmdb_movie_other',
        canonicalTitle: 'Other Film',
        type: 'movie',
        year: 2000,
        genres: [],
        ratings: [],
        providers: [],
        posterUrl: '',
      },
    ]);

    const search = relationHandlers[MessageType.SEARCH_ADAPTATION_CANDIDATES]!;
    const res = (await search({ workId: bookMedia.id }, sender)) as {
      candidates: MediaItem[];
      direction: string;
    };

    expect(discoverySearch).toHaveBeenCalledWith('The Great Gatsby', undefined);
    expect(res.direction).toBe('adapted_as');
    expect(res.candidates.every((c) => c.type === 'movie' || c.type === 'tv')).toBe(true);
    expect(res.candidates.some((c) => c.id === filmMedia.id)).toBe(true);
  });

  it('SEARCH_ADAPTATION_CANDIDATES for a movie searches Open Library (books)', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        work: {
          id: 'openlibrary_work_gatsby',
          medium: 'book' as const,
          canonicalTitle: 'The Great Gatsby',
          firstReleaseYear: 1925,
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['F. Scott Fitzgerald'] },
          sourceProvenance: [],
          sourceConfidence: 'high' as const,
          createdAt: 1,
          updatedAt: 1,
        },
        matchScore: 0.95,
      },
    ]);

    const search = relationHandlers[MessageType.SEARCH_ADAPTATION_CANDIDATES]!;
    const res = (await search({ workId: filmMedia.id }, sender)) as {
      candidates: MediaItem[];
      direction: string;
    };

    expect(searchOpenLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'The Great Gatsby' }),
    );
    expect(res.direction).toBe('adaptation_of');
    expect(res.candidates[0]?.type).toBe('book');
    expect(res.candidates[0]?.canonicalTitle).toBe('The Great Gatsby');
    // Candidates must not require a prior library merge of ratings/notes
    expect(res.candidates[0]?.ratings).toEqual([]);
  });

  it('rejects self-relations', async () => {
    const assert = relationHandlers[MessageType.ASSERT_WORK_RELATION]!;
    await expect(
      assert(
        {
          fromWorkId: bookMedia.id,
          toWorkId: bookMedia.id,
          relation: 'adapted_as',
          confidence: 'user_asserted',
        },
        sender,
      ),
    ).rejects.toThrow(/itself/i);
  });
});
