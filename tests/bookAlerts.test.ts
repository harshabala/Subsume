import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaItem, WatchAlert } from '@/shared/types';

vi.mock('@/background/tmdb', () => ({
  getLatestReleases: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  getAllWatchAlerts: vi.fn(),
  putWatchAlert: vi.fn(),
  putMediaItems: vi.fn(),
}));

import {
  mediaMatchesWatchAlert,
  findNewAlertMatches,
  checkBookAlerts,
  checkWatchAlerts,
} from '@/background/alerts';
import { searchOpenLibrary } from '@/background/openLibrary';
import { getLatestReleases } from '@/background/tmdb';
import {
  getAllWatchAlerts,
  putWatchAlert,
  putMediaItems,
} from '@/background/storage';

function makeBookMedia(
  id: string,
  title: string,
  authors: string[] = [],
  year = 2024
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year,
    genres: [],
    ratings: [],
    providers: [{ provider: 'openlibrary', externalId: id.replace(/^openlibrary_work_/, '') }],
    posterUrl: '',
    authors,
  };
}

function makeScreenMedia(
  id: string,
  title: string,
  type: 'movie' | 'tv' = 'movie'
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type,
    year: 2024,
    genres: ['Sci-Fi'],
    ratings: [{ provider: 'tmdb', score: 7.5 }],
    providers: [{ provider: 'tmdb', externalId: '1' }],
    posterUrl: '',
    streamingAvailability: [{ region: 'US', platform: 'Netflix' }],
  };
}

function makeBookAlert(overrides: Partial<WatchAlert> = {}): WatchAlert {
  return {
    id: 'alert_book_1',
    name: 'Murakami books',
    type: 'book',
    keyword: undefined,
    authorKeyword: 'Murakami',
    enabled: true,
    createdAt: Date.now(),
    lastNotifiedMediaIds: [],
    ...overrides,
  };
}

describe('mediaMatchesWatchAlert — book type', () => {
  it('matches book media by authorKeyword substring', () => {
    const alert = makeBookAlert({ authorKeyword: 'Murakami', keyword: undefined });
    const media = makeBookMedia(
      'openlibrary_work_OL1W',
      'Kafka on the Shore',
      ['Haruki Murakami']
    );
    expect(mediaMatchesWatchAlert(alert, media)).toBe(true);
  });

  it('matches book media by title keyword', () => {
    const alert = makeBookAlert({
      keyword: 'gatsby',
      authorKeyword: undefined,
    });
    const media = makeBookMedia(
      'openlibrary_work_OL468431W',
      'The Great Gatsby',
      ['F. Scott Fitzgerald']
    );
    expect(mediaMatchesWatchAlert(alert, media)).toBe(true);
  });

  it('requires both keyword and authorKeyword when both are set', () => {
    const alert = makeBookAlert({
      keyword: 'Kafka',
      authorKeyword: 'Murakami',
    });
    const match = makeBookMedia(
      'openlibrary_work_OL1W',
      'Kafka on the Shore',
      ['Haruki Murakami']
    );
    const wrongAuthor = makeBookMedia(
      'openlibrary_work_OL2W',
      'Kafka on the Shore',
      ['Someone Else']
    );
    const wrongTitle = makeBookMedia(
      'openlibrary_work_OL3W',
      'Norwegian Wood',
      ['Haruki Murakami']
    );

    expect(mediaMatchesWatchAlert(alert, match)).toBe(true);
    expect(mediaMatchesWatchAlert(alert, wrongAuthor)).toBe(false);
    expect(mediaMatchesWatchAlert(alert, wrongTitle)).toBe(false);
  });

  it('does not match screen media against book alerts', () => {
    const alert = makeBookAlert({ keyword: 'Dune' });
    const movie = makeScreenMedia('tmdb_movie_1', 'Dune');
    expect(mediaMatchesWatchAlert(alert, movie)).toBe(false);
  });

  it('does not match books against type=both screen alerts', () => {
    const alert: WatchAlert = {
      id: 'a1',
      name: 'All screen',
      type: 'both',
      enabled: true,
      createdAt: Date.now(),
    };
    const book = makeBookMedia('openlibrary_work_OL1W', 'Any Book', ['Author']);
    expect(mediaMatchesWatchAlert(alert, book)).toBe(false);
  });

  it('rejects disabled book alerts', () => {
    const alert = makeBookAlert({ enabled: false });
    const media = makeBookMedia(
      'openlibrary_work_OL1W',
      'Kafka on the Shore',
      ['Haruki Murakami']
    );
    expect(mediaMatchesWatchAlert(alert, media)).toBe(false);
  });
});

describe('findNewAlertMatches with book media', () => {
  it('returns only unnotified book matches', () => {
    const alert = makeBookAlert({
      keyword: undefined,
      authorKeyword: 'Murakami',
      lastNotifiedMediaIds: ['openlibrary_work_OL1W'],
    });
    const media = [
      makeBookMedia('openlibrary_work_OL1W', 'Kafka on the Shore', ['Haruki Murakami']),
      makeBookMedia('openlibrary_work_OL2W', 'Norwegian Wood', ['Haruki Murakami']),
      makeBookMedia('openlibrary_work_OL3W', 'Other Novel', ['Jane Doe']),
    ];

    const matches = findNewAlertMatches([alert], media);

    expect(matches).toHaveLength(1);
    expect(matches[0].media.id).toBe('openlibrary_work_OL2W');
  });

  it('keeps screen matching independent of book media in the same pool', () => {
    const screenAlert: WatchAlert = {
      id: 'screen',
      name: 'Sci-Fi Netflix',
      type: 'movie',
      genres: ['878'],
      platforms: ['8'],
      enabled: true,
      createdAt: Date.now(),
      lastNotifiedMediaIds: [],
    };
    const bookAlert = makeBookAlert({ authorKeyword: 'Murakami' });
    const media = [
      makeScreenMedia('tmdb_movie_9', 'Arrival'),
      makeBookMedia('openlibrary_work_OL9W', '1Q84', ['Haruki Murakami']),
    ];

    // Genre 878 → Sci-Fi; Arrival has Sci-Fi; platform Netflix id 8
    const screenMatches = findNewAlertMatches([screenAlert], media);
    const bookMatches = findNewAlertMatches([bookAlert], media);

    expect(screenMatches.map((m) => m.media.id)).toEqual(['tmdb_movie_9']);
    expect(bookMatches.map((m) => m.media.id)).toEqual(['openlibrary_work_OL9W']);
  });
});

describe('checkBookAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(putMediaItems).mockResolvedValue(undefined);
  });

  it('searches Open Library and returns matching book media', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL100W',
          medium: 'book',
          canonicalTitle: 'Kafka on the Shore',
          firstReleaseYear: 2002,
          genres: [],
          images: {},
          externalIds: [
            {
              provider: 'openlibrary',
              externalId: 'OL100W',
              url: 'https://openlibrary.org/works/OL100W',
            },
          ],
          creatorCredits: [{ name: 'Haruki Murakami', role: 'author' }],
          bookDetails: { authors: ['Haruki Murakami'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const alert = makeBookAlert({
      authorKeyword: 'Murakami',
      keyword: undefined,
    });
    const matches = await checkBookAlerts([alert]);

    expect(searchOpenLibrary).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.stringContaining('Murakami') })
    );
    expect(putMediaItems).toHaveBeenCalled();
    expect(matches).toHaveLength(1);
    expect(matches[0].media.type).toBe('book');
    expect(matches[0].media.canonicalTitle).toBe('Kafka on the Shore');
  });

  it('skips already-notified media ids', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL100W',
          medium: 'book',
          canonicalTitle: 'Kafka on the Shore',
          firstReleaseYear: 2002,
          genres: [],
          images: {},
          externalIds: [
            { provider: 'openlibrary', externalId: 'OL100W' },
          ],
          creatorCredits: [{ name: 'Haruki Murakami', role: 'author' }],
          bookDetails: { authors: ['Haruki Murakami'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const alert = makeBookAlert({
      authorKeyword: 'Murakami',
      lastNotifiedMediaIds: ['openlibrary_work_OL100W'],
    });
    const matches = await checkBookAlerts([alert]);
    expect(matches).toHaveLength(0);
  });
});

describe('checkWatchAlerts with book alerts', () => {
  const prefs = {
    favoriteGenres: [],
    platforms: [],
    region: 'US',
    llmEnabled: false,
    hoverCardsEnabled: true,
    posterOverlaysEnabled: true,
    disabledDomains: [],
    detectionSensitivity: 'medium' as const,
    onboardingComplete: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(putWatchAlert).mockResolvedValue(undefined);
    vi.mocked(putMediaItems).mockResolvedValue(undefined);
    vi.mocked(getLatestReleases).mockResolvedValue([]);
    vi.mocked(searchOpenLibrary).mockResolvedValue([]);
  });

  it('runs book checks without requiring TMDb when only book alerts exist', async () => {
    vi.mocked(getAllWatchAlerts).mockResolvedValue([
      makeBookAlert({ authorKeyword: 'Murakami' }),
    ]);
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL200W',
          medium: 'book',
          canonicalTitle: 'Norwegian Wood',
          firstReleaseYear: 1987,
          genres: [],
          images: {},
          externalIds: [{ provider: 'openlibrary', externalId: 'OL200W' }],
          creatorCredits: [{ name: 'Haruki Murakami', role: 'author' }],
          bookDetails: { authors: ['Haruki Murakami'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const matches = await checkWatchAlerts(prefs);

    expect(getLatestReleases).not.toHaveBeenCalled();
    expect(searchOpenLibrary).toHaveBeenCalled();
    expect(matches).toHaveLength(1);
    expect(matches[0].media.id).toBe('openlibrary_work_OL200W');
    expect(putWatchAlert).toHaveBeenCalled();
  });

  it('keeps screen alert path working alongside book alerts', async () => {
    vi.mocked(getAllWatchAlerts).mockResolvedValue([
      {
        id: 'screen_1',
        name: 'Sci-Fi',
        type: 'movie',
        genres: ['878'],
        platforms: ['8'],
        enabled: true,
        createdAt: Date.now(),
        lastNotifiedMediaIds: [],
      },
      makeBookAlert({ id: 'book_1', authorKeyword: 'Murakami' }),
    ]);
    vi.mocked(getLatestReleases).mockImplementation(async (type) => {
      if (type === 'movie') {
        return [makeScreenMedia('tmdb_movie_77', 'Blade Runner')];
      }
      return [];
    });
    vi.mocked(searchOpenLibrary).mockResolvedValue([]);

    const matches = await checkWatchAlerts(prefs);

    expect(getLatestReleases).toHaveBeenCalledWith('movie', prefs, 7);
    expect(getLatestReleases).toHaveBeenCalledWith('tv', prefs, 7);
    expect(searchOpenLibrary).toHaveBeenCalled();
    expect(matches.some((m) => m.media.id === 'tmdb_movie_77')).toBe(true);
  });
});
