import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaItem, UserPreferences } from '@/shared/types';

vi.mock('@/background/tmdb', () => ({
  getLatestReleases: vi.fn(),
  searchTitle: vi.fn(),
}));

vi.mock('@/background/context', () => ({
  buildWatchProfile: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  putMediaItem: vi.fn(),
  findMediaByTitle: vi.fn(),
}));

vi.mock('@/background/llm', () => ({
  callLLMProvider: vi.fn(),
}));

import { getLatestReleases, searchTitle } from '@/background/tmdb';
import { getAllLibraryItems, findMediaByTitle } from '@/background/storage';
import { callLLMProvider } from '@/background/llm';
import {
  generateWeeklyDigest,
  generateRuleBasedDigest,
  resolveDigestItem,
} from '@/background/digest';

const basePrefs: UserPreferences = {
  favoriteGenres: ['28', '18'],
  platforms: ['8'],
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  onboardingComplete: true,
};

function makeMedia(
  id: string,
  title: string,
  year: number,
  type: 'movie' | 'tv',
  genres: string[],
  tmdbScore: number,
  platforms: string[] = []
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type,
    year,
    genres,
    ratings: [{ provider: 'tmdb', score: tmdbScore }],
    providers: [{ provider: 'tmdb', externalId: id.split('_').pop() || '1' }],
    posterUrl: '',
    streamingAvailability: platforms.map((platform) => ({ region: 'US', platform })),
  };
}

describe('generateRuleBasedDigest', () => {
  it('ranks genre-matching releases by TMDb rating and returns top 12', () => {
    const releases = [
      makeMedia('tmdb_movie_1', 'Alpha', 2024, 'movie', ['Action'], 7.1, ['Netflix']),
      makeMedia('tmdb_movie_2', 'Beta', 2024, 'movie', ['Drama'], 8.4, ['Prime Video']),
      makeMedia('tmdb_movie_3', 'Gamma', 2024, 'movie', ['Comedy'], 9.5, ['Hulu']),
      makeMedia('tmdb_tv_1', 'Delta', 2024, 'tv', ['Action'], 8.0, ['Disney+']),
    ];

    const digest = generateRuleBasedDigest(basePrefs, releases);

    expect(digest).toHaveLength(3);
    expect(digest[0].title).toBe('Beta');
    expect(digest[1].title).toBe('Delta');
    expect(digest[2].title).toBe('Alpha');
    expect(digest.every((item) => item.reason.length > 0)).toBe(true);
    expect(digest[0].platforms).toEqual(['Prime Video']);
    expect(digest[0].reason).toContain('Drama');
  });

  it('matches TMDb genre IDs from Settings against media genre names', () => {
    const prefs: UserPreferences = {
      ...basePrefs,
      favoriteGenres: ['18', '28'], // Drama, Action IDs from Settings
    };
    const releases = [
      makeMedia('tmdb_movie_1', 'Action Hit', 2024, 'movie', ['Action'], 7.5),
      makeMedia('tmdb_movie_2', 'Comedy Miss', 2024, 'movie', ['Comedy'], 9.0),
    ];

    const digest = generateRuleBasedDigest(prefs, releases);

    expect(digest).toHaveLength(1);
    expect(digest[0].title).toBe('Action Hit');
    expect(digest[0].reason).toContain('Action');
  });

  it('matches Science Fiction TMDb names against Sci-Fi Settings genre IDs', () => {
    const prefs: UserPreferences = {
      ...basePrefs,
      favoriteGenres: ['878'],
    };
    const releases = [
      makeMedia('tmdb_movie_1', 'Arrival', 2024, 'movie', ['Science Fiction'], 8.2),
      makeMedia('tmdb_movie_2', 'Comedy Miss', 2024, 'movie', ['Comedy'], 9.0),
    ];

    const digest = generateRuleBasedDigest(prefs, releases);

    expect(digest).toHaveLength(1);
    expect(digest[0].title).toBe('Arrival');
    expect(digest[0].reason).toContain('Science Fiction');
  });

  it('falls back to all releases when no favorite genres match', () => {
    const prefs: UserPreferences = {
      ...basePrefs,
      favoriteGenres: ['Horror'],
    };
    const releases = [
      makeMedia('tmdb_movie_1', 'One', 2024, 'movie', ['Comedy'], 6.0),
      makeMedia('tmdb_movie_2', 'Two', 2024, 'movie', ['Romance'], 8.2),
    ];

    const digest = generateRuleBasedDigest(prefs, releases);

    expect(digest).toHaveLength(2);
    expect(digest[0].title).toBe('Two');
    expect(digest[0].reason).toContain('Top-rated');
  });
});

describe('resolveDigestItem', () => {
  it('resolves items that match releases by title and year', async () => {
    const releases = [
      makeMedia('tmdb_movie_1', 'In List', 2024, 'movie', ['Action'], 8.0, ['Netflix']),
    ];

    const result = await resolveDigestItem(
      { title: 'In List', year: 2024, type: 'movie', reason: 'Great pick' },
      releases
    );

    expect(result).not.toBeNull();
    expect(result!.title).toBe('In List');
    expect(result!.mediaId).toBe('tmdb_movie_1');
    expect(result!.reason).toBe('Great pick');
  });

  it('skips LLM items not in releases without external title lookup', async () => {
    const releases = [
      makeMedia('tmdb_movie_1', 'In List', 2024, 'movie', ['Action'], 8.0),
    ];

    const result = await resolveDigestItem(
      { title: 'Hallucinated Title', year: 2024, type: 'movie', reason: 'Fake pick' },
      releases
    );

    expect(result).toBeNull();
    expect(findMediaByTitle).not.toHaveBeenCalled();
    expect(searchTitle).not.toHaveBeenCalled();
  });
});

describe('generateWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLatestReleases).mockImplementation(async (type) => {
      if (type === 'movie') {
        return [
          makeMedia('tmdb_movie_1', 'Movie Pick', 2024, 'movie', ['Action'], 8.1, ['Netflix']),
        ];
      }
      return [
        makeMedia('tmdb_tv_1', 'Show Pick', 2024, 'tv', ['Drama'], 7.9, ['Prime Video']),
      ];
    });
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      {
        mediaId: 'tmdb_movie_99',
        status: 'watched',
        addedAt: 1,
        updatedAt: 1,
      },
    ]);
  });

  it('uses rule-based fallback when no LLM key is configured', async () => {
    const digest = await generateWeeklyDigest(basePrefs);

    expect(getLatestReleases).toHaveBeenCalledWith('movie', basePrefs, 7);
    expect(getLatestReleases).toHaveBeenCalledWith('tv', basePrefs, 7);
    expect(digest.llmGenerated).toBe(false);
    expect(digest.items.length).toBeGreaterThan(0);
    expect(digest.items[0].platforms.length).toBeGreaterThan(0);
    expect(digest.generatedAt).toBeGreaterThan(0);
  });

  it('uses rule-based fallback when watched count is below 3 even with LLM key', async () => {
    const prefs: UserPreferences = {
      ...basePrefs,
      llmEnabled: true,
      llmApiKey: 'test-key',
      llmProvider: 'openai',
    };

    const digest = await generateWeeklyDigest(prefs);

    expect(digest.llmGenerated).toBe(false);
    expect(callLLMProvider).not.toHaveBeenCalled();
    expect(digest.items.map((item) => item.title)).toContain('Movie Pick');
    expect(digest.items.map((item) => item.title)).toContain('Show Pick');
  });

  it('does not use LLM when llmEnabled is false even with API key present', async () => {
    const prefs: UserPreferences = {
      ...basePrefs,
      llmEnabled: false,
      llmApiKey: 'test-key',
      llmProvider: 'openai',
    };
    vi.mocked(getAllLibraryItems).mockResolvedValue([
      { mediaId: 'tmdb_movie_99', status: 'watched', addedAt: 1, updatedAt: 1 },
      { mediaId: 'tmdb_movie_98', status: 'watched', addedAt: 1, updatedAt: 1 },
      { mediaId: 'tmdb_movie_97', status: 'watched', addedAt: 1, updatedAt: 1 },
      { mediaId: 'tmdb_movie_96', status: 'watched', addedAt: 1, updatedAt: 1 },
    ]);

    const digest = await generateWeeklyDigest(prefs);

    expect(callLLMProvider).not.toHaveBeenCalled();
    expect(digest.llmGenerated).toBe(false);
    expect(digest.items.length).toBeGreaterThan(0);
  });
});