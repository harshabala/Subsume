import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LibraryItem, MediaItem } from '@/shared/types';
import type { WorkRelation } from '@/shared/catalogTypes';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  getMediaItem: vi.fn(),
  getWork: vi.fn(),
  getWorkRelationsForWork: vi.fn(),
  putMediaItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/background/discoverySearch', () => ({
  discoverySearch: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

import {
  generateCrossMediumRecommendations,
  buildRelationBridgeExplanation,
  buildCandidateBridgeExplanation,
} from '@/background/crossMediumRecommendations';
import {
  getAllLibraryItems,
  getAllMediaMap,
  getMediaItem,
  getWork,
  getWorkRelationsForWork,
  putMediaItem,
} from '@/background/storage';
import { discoverySearch } from '@/background/discoverySearch';
import { searchOpenLibrary } from '@/background/openLibrary';

function bookMedia(id: string, title: string): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year: 1925,
    genres: ['Fiction'],
    ratings: [],
    providers: [],
    posterUrl: '',
    authors: ['F. Scott Fitzgerald'],
  };
}

function movieMedia(id: string, title: string): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'movie',
    year: 2013,
    genres: ['Drama'],
    ratings: [],
    providers: [],
    posterUrl: '',
  };
}

function libItem(mediaId: string, rating = 9): LibraryItem {
  return {
    mediaId,
    status: 'watched',
    addedAt: 1,
    updatedAt: 1,
    userRating: rating,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWork).mockResolvedValue(undefined);
  vi.mocked(getMediaItem).mockResolvedValue(undefined);
  vi.mocked(getWorkRelationsForWork).mockResolvedValue([]);
  vi.mocked(discoverySearch).mockResolvedValue([]);
  vi.mocked(searchOpenLibrary).mockResolvedValue([]);
});

describe('generateCrossMediumRecommendations', () => {
  it('returns empty when enabled is false (pref gate)', async () => {
    const seed = bookMedia('openlibrary_work_gatsby', 'The Great Gatsby');
    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(seed.id, 10)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [seed.id]: seed });

    const recs = await generateCrossMediumRecommendations({ enabled: false });
    expect(recs).toEqual([]);
    expect(getAllLibraryItems).not.toHaveBeenCalled();
    expect(getWorkRelationsForWork).not.toHaveBeenCalled();
    expect(discoverySearch).not.toHaveBeenCalled();
    expect(searchOpenLibrary).not.toHaveBeenCalled();
  });

  it('returns relation-based cross-medium hits from highly rated seeds', async () => {
    const book = bookMedia('openlibrary_work_gatsby', 'The Great Gatsby');
    const film = movieMedia('tmdb_movie_gatsby_2013', 'The Great Gatsby');
    const rel: WorkRelation = {
      id: 'wr_1',
      fromWorkId: book.id,
      toWorkId: film.id,
      relation: 'adapted_as',
      confidence: 'user_asserted',
      sourceProvider: 'user',
      createdAt: 1,
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(book.id, 10)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [book.id]: book });
    vi.mocked(getWorkRelationsForWork).mockResolvedValue([rel]);
    vi.mocked(getMediaItem).mockImplementation(async (id: string) =>
      id === film.id ? film : id === book.id ? book : undefined,
    );

    const recs = await generateCrossMediumRecommendations({
      enabled: true,
      allowCandidateSearch: false,
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].mediaId).toBe(film.id);
    expect(recs[0].media.canonicalTitle).toBe('The Great Gatsby');
    expect(recs[0].discoveryMode).toBe('cross_medium');
    expect(recs[0].seedTitle).toBe('The Great Gatsby');
    expect(recs[0].explanation).toMatch(/adapt/i);
    expect(recs[0].explanation).toContain('The Great Gatsby');
    expect(putMediaItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: film.id }),
    );
    // No invented search when relation hit found
    expect(discoverySearch).not.toHaveBeenCalled();
  });

  it('recommends source novel for a highly rated film via adaptation_of', async () => {
    const film = movieMedia('tmdb_movie_blade', 'Blade Runner');
    const book = bookMedia('openlibrary_work_andys', 'Do Androids Dream of Electric Sheep?');
    const rel: WorkRelation = {
      id: 'wr_2',
      fromWorkId: film.id,
      toWorkId: book.id,
      relation: 'adaptation_of',
      confidence: 'high',
      sourceProvider: 'wikidata',
      createdAt: 1,
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(film.id, 9)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [film.id]: film });
    vi.mocked(getWorkRelationsForWork).mockResolvedValue([rel]);
    vi.mocked(getMediaItem).mockImplementation(async (id: string) =>
      id === book.id ? book : id === film.id ? film : undefined,
    );

    const recs = await generateCrossMediumRecommendations({
      enabled: true,
      allowCandidateSearch: false,
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].mediaId).toBe(book.id);
    expect(recs[0].media.type).toBe('book');
    expect(recs[0].discoveryMode).toBe('cross_medium');
    expect(recs[0].explanation.toLowerCase()).toMatch(/source|adapt/);
  });

  it('never invents titles — skips relations whose target is missing from catalog', async () => {
    const book = bookMedia('openlibrary_work_x', 'Some Novel');
    const rel: WorkRelation = {
      id: 'wr_missing',
      fromWorkId: book.id,
      toWorkId: 'nonexistent_work_id',
      relation: 'adapted_as',
      confidence: 'medium',
      createdAt: 1,
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(book.id, 10)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [book.id]: book });
    vi.mocked(getWorkRelationsForWork).mockResolvedValue([rel]);
    vi.mocked(getMediaItem).mockResolvedValue(undefined);
    vi.mocked(getWork).mockResolvedValue(undefined);

    const recs = await generateCrossMediumRecommendations({
      enabled: true,
      allowCandidateSearch: false,
    });

    expect(recs).toEqual([]);
    // Never fabricate a MediaItem for the missing id
    expect(putMediaItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'nonexistent_work_id' }),
    );
  });

  it('excludes targets already in the user library', async () => {
    const book = bookMedia('openlibrary_work_gatsby', 'The Great Gatsby');
    const film = movieMedia('tmdb_movie_gatsby_2013', 'The Great Gatsby');
    const rel: WorkRelation = {
      id: 'wr_3',
      fromWorkId: book.id,
      toWorkId: film.id,
      relation: 'adapted_as',
      confidence: 'user_asserted',
      createdAt: 1,
    };

    vi.mocked(getAllLibraryItems).mockResolvedValue([
      libItem(book.id, 10),
      libItem(film.id, 8),
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({
      [book.id]: book,
      [film.id]: film,
    });
    vi.mocked(getWorkRelationsForWork).mockResolvedValue([rel]);
    vi.mocked(getMediaItem).mockResolvedValue(film);

    const recs = await generateCrossMediumRecommendations({
      enabled: true,
      allowCandidateSearch: false,
    });

    expect(recs).toEqual([]);
  });

  it('optional candidate search only uses provider-returned catalog works', async () => {
    const film = movieMedia('tmdb_movie_arrival', 'Arrival');
    const olBook = bookMedia(
      'openlibrary_work_story',
      'Story of Your Life',
    );

    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(film.id, 10)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [film.id]: film });
    vi.mocked(getWorkRelationsForWork).mockResolvedValue([]);
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.92,
        work: {
          id: olBook.id,
          medium: 'book',
          canonicalTitle: olBook.canonicalTitle,
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['Ted Chiang'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ]);

    const recs = await generateCrossMediumRecommendations({
      enabled: true,
      allowCandidateSearch: true,
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].mediaId).toBe(olBook.id);
    expect(recs[0].media.canonicalTitle).toBe('Story of Your Life');
    expect(recs[0].discoveryMode).toBe('cross_medium');
    expect(recs[0].explanation).toMatch(/catalog/i);
    // Title came from OL work, not LLM
    expect(searchOpenLibrary).toHaveBeenCalled();
  });

  it('returns empty when library has no highly rated seeds', async () => {
    const film = movieMedia('tmdb_1', 'Meh Film');
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      {
        mediaId: film.id,
        status: 'to-watch',
        addedAt: 1,
        updatedAt: 1,
        userRating: 4,
      },
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [film.id]: film });

    const recs = await generateCrossMediumRecommendations({ enabled: true });
    expect(recs).toEqual([]);
    expect(getWorkRelationsForWork).not.toHaveBeenCalled();
  });
});

describe('bridge explanation helpers', () => {
  it('buildRelationBridgeExplanation mentions seed and adaptation direction', () => {
    const book = bookMedia('b1', 'Dune');
    const film = movieMedia('m1', 'Dune');
    const rel: WorkRelation = {
      id: 'r',
      fromWorkId: book.id,
      toWorkId: film.id,
      relation: 'adapted_as',
      confidence: 'user_asserted',
      createdAt: 1,
    };
    const text = buildRelationBridgeExplanation(book, film, rel);
    expect(text).toContain('Dune');
    expect(text.length).toBeGreaterThan(20);
  });

  it('buildCandidateBridgeExplanation is cautious (candidate language)', () => {
    const film = movieMedia('m1', 'Arrival');
    const book = bookMedia('b1', 'Story of Your Life');
    const text = buildCandidateBridgeExplanation(film, book);
    expect(text.toLowerCase()).toMatch(/candidate|catalog/);
    expect(text).toContain('Arrival');
  });
});
