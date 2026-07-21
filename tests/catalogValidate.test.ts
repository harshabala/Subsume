import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem, UserPreferences } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  putMediaItem: vi.fn().mockResolvedValue(undefined),
  findMediaByTitle: vi.fn(),
}));

vi.mock('@/background/tmdb', () => ({
  searchTitle: vi.fn(),
  searchTitles: vi.fn(),
  setTmdbApiKey: vi.fn(),
}));

vi.mock('@/background/discoverySearch', () => ({
  discoverySearch: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

import { resolveRecommendationCandidates } from '@/background/catalogValidate';
import { putMediaItem, findMediaByTitle } from '@/background/storage';
import { searchTitle, searchTitles } from '@/background/tmdb';
import { discoverySearch } from '@/background/discoverySearch';
import { searchOpenLibrary } from '@/background/openLibrary';

const basePrefs: UserPreferences = {
  favoriteGenres: [],
  platforms: [],
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  onboardingComplete: true,
  enabledMedia: { movie: true, tv: true, book: true },
  tmdbApiKey: 'test-key',
};

function movie(id: string, title: string, year = 2020): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'movie',
    year,
    genres: ['Drama'],
    ratings: [],
    providers: [],
    posterUrl: '',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveRecommendationCandidates', () => {
  it('resolves movie candidates via TMDb searchTitle and persists them', async () => {
    vi.mocked(findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(searchTitle).mockResolvedValue(movie('tmdb_1', 'Dune', 2021));

    const resolved = await resolveRecommendationCandidates(
      [{ title: 'Dune', year: 2021, type: 'movie', reason: 'Epic sci-fi' }],
      basePrefs
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0].workId).toBe('tmdb_1');
    expect(resolved[0].media.canonicalTitle).toBe('Dune');
    expect(resolved[0].reason).toBe('Epic sci-fi');
    expect(putMediaItem).toHaveBeenCalled();
  });

  it('uses local cache when findMediaByTitle hits', async () => {
    vi.mocked(findMediaByTitle).mockResolvedValue(movie('local_99', 'Cached Film', 2019));

    const resolved = await resolveRecommendationCandidates(
      [{ title: 'Cached Film', year: 2019, type: 'movie', reason: 'Because cache' }],
      basePrefs
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0].workId).toBe('local_99');
    expect(searchTitle).not.toHaveBeenCalled();
  });

  it('drops candidates that cannot be resolved', async () => {
    vi.mocked(findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(searchTitle).mockResolvedValue(null);
    vi.mocked(searchTitles).mockResolvedValue([]);
    vi.mocked(discoverySearch).mockResolvedValue([]);

    const resolved = await resolveRecommendationCandidates(
      [{ title: 'Invented Nonsense 9999', type: 'movie', reason: 'fake' }],
      basePrefs
    );

    expect(resolved).toEqual([]);
  });

  it('resolves books via Open Library first hit when score is high', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 1,
        work: {
          id: 'openlibrary_work_OL468431W',
          medium: 'book',
          canonicalTitle: 'The Great Gatsby',
          firstReleaseYear: 1925,
          genres: [],
          images: { primary: 'https://covers.openlibrary.org/b/id/1-L.jpg' },
          externalIds: [],
          creatorCredits: [],
          bookDetails: { authors: ['F. Scott Fitzgerald'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ]);

    const resolved = await resolveRecommendationCandidates(
      [
        {
          title: 'The Great Gatsby',
          year: 1925,
          type: 'book',
          reason: 'Jazz Age classic',
          seedTitle: 'Tender Is the Night',
        },
      ],
      basePrefs
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0].workId).toBe('openlibrary_work_OL468431W');
    expect(resolved[0].media.type).toBe('book');
    expect(resolved[0].seedTitle).toBe('Tender Is the Night');
    expect(putMediaItem).toHaveBeenCalled();
  });

  it('drops book candidates with low match scores', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.2,
        work: {
          id: 'openlibrary_work_OL1W',
          medium: 'book',
          canonicalTitle: 'Unrelated',
          genres: [],
          images: {},
          externalIds: [],
          creatorCredits: [],
          sourceProvenance: [],
          sourceConfidence: 'low',
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ]);

    const resolved = await resolveRecommendationCandidates(
      [{ title: 'Something Else', type: 'book', reason: 'nope' }],
      basePrefs
    );

    expect(resolved).toEqual([]);
  });

  it('respects enabledMedia.book false', async () => {
    const prefs = {
      ...basePrefs,
      enabledMedia: { movie: true, tv: true, book: false },
    };

    const resolved = await resolveRecommendationCandidates(
      [{ title: 'Any Book', type: 'book', reason: 'x' }],
      prefs
    );

    expect(resolved).toEqual([]);
    expect(searchOpenLibrary).not.toHaveBeenCalled();
  });

  it('caps results at 15', async () => {
    vi.mocked(findMediaByTitle).mockResolvedValue(undefined);
    vi.mocked(searchTitle).mockImplementation(async (title: string) =>
      movie(`tmdb_${title}`, title)
    );

    const candidates = Array.from({ length: 20 }, (_, i) => ({
      title: `Film ${i}`,
      type: 'movie' as const,
      reason: 'batch',
    }));

    const resolved = await resolveRecommendationCandidates(candidates, basePrefs);
    expect(resolved).toHaveLength(15);
  });
});
