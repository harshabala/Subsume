import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LibraryItem, MediaItem } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  putMediaItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

import { generateCatalogBookRecommendations } from '@/background/bookRecommendations';
import {
  getAllLibraryItems,
  getAllMediaMap,
  putMediaItem,
} from '@/background/storage';
import { searchOpenLibrary } from '@/background/openLibrary';

function bookMedia(id: string, title: string, authors: string[] = [], genres: string[] = []): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year: 2000,
    genres,
    ratings: [],
    providers: [],
    posterUrl: '',
    authors,
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
});

describe('generateCatalogBookRecommendations', () => {
  it('returns empty when library has no books', async () => {
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      libItem('tmdb_1'),
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({
      tmdb_1: {
        id: 'tmdb_1',
        canonicalTitle: 'A Film',
        type: 'movie',
        year: 2020,
        genres: [],
        ratings: [],
        providers: [],
        posterUrl: '',
      },
    });

    const recs = await generateCatalogBookRecommendations();
    expect(recs).toEqual([]);
    expect(searchOpenLibrary).not.toHaveBeenCalled();
  });

  it('searches Open Library by seed authors and excludes library works', async () => {
    const seed = bookMedia(
      'openlibrary_work_OL1W',
      'Beloved',
      ['Toni Morrison'],
      ['Fiction']
    );
    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(seed.id, 10)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [seed.id]: seed });

    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.95,
        work: {
          id: 'openlibrary_work_OL1W',
          medium: 'book',
          canonicalTitle: 'Beloved',
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['Toni Morrison'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 0,
          updatedAt: 0,
        },
      },
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL2W',
          medium: 'book',
          canonicalTitle: 'Song of Solomon',
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['Toni Morrison'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ]);

    const recs = await generateCatalogBookRecommendations(5);

    expect(searchOpenLibrary).toHaveBeenCalled();
    expect(recs.some((r) => r.id === 'openlibrary_work_OL1W')).toBe(false);
    expect(recs.some((r) => r.id === 'openlibrary_work_OL2W')).toBe(true);
    expect(recs.every((r) => r.type === 'book')).toBe(true);
    expect(putMediaItem).toHaveBeenCalled();
  });

  it('never invents titles — only returns catalog search hits', async () => {
    const seed = bookMedia('openlibrary_work_OL9W', 'Gatsby', ['Fitzgerald'], ['Jazz Age']);
    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(seed.id)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [seed.id]: seed });
    vi.mocked(searchOpenLibrary).mockResolvedValue([]);

    const recs = await generateCatalogBookRecommendations();
    expect(recs).toEqual([]);
  });

  it('respects the limit cap', async () => {
    const seed = bookMedia('openlibrary_work_OL3W', 'Seed Book', ['Author'], ['Lit']);
    vi.mocked(getAllLibraryItems).mockResolvedValue([libItem(seed.id)]);
    vi.mocked(getAllMediaMap).mockResolvedValue({ [seed.id]: seed });

    vi.mocked(searchOpenLibrary).mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({
        matchScore: 0.9,
        work: {
          id: `openlibrary_work_OL${100 + i}W`,
          medium: 'book' as const,
          canonicalTitle: `Related ${i}`,
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['Author'] },
          sourceProvenance: [],
          sourceConfidence: 'high' as const,
          createdAt: 0,
          updatedAt: 0,
        },
      }))
    );

    const recs = await generateCatalogBookRecommendations(3);
    expect(recs.length).toBeLessThanOrEqual(3);
  });
});
