import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaItem, WatchAlert } from '@/shared/types';

vi.mock('@/background/tmdb', () => ({
  getLatestReleases: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  getAllWatchAlerts: vi.fn(),
  putWatchAlert: vi.fn(),
  putMediaItems: vi.fn(),
}));

import {
  mediaMatchesWatchAlert,
  findNewAlertMatches,
  checkWatchAlerts,
} from '@/background/alerts';
import { getLatestReleases } from '@/background/tmdb';
import {
  getAllWatchAlerts,
  putWatchAlert,
  putMediaItems,
} from '@/background/storage';

function makeMedia(
  id: string,
  title: string,
  type: 'movie' | 'tv',
  genres: string[],
  platforms: string[] = []
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type,
    year: 2024,
    genres,
    ratings: [{ provider: 'tmdb', score: 7.5 }],
    providers: [{ provider: 'tmdb', externalId: id.split('_').pop() || '1' }],
    posterUrl: '',
    streamingAvailability: platforms.map((platform) => ({
      region: 'US',
      platform,
    })),
  };
}

function makeAlert(overrides: Partial<WatchAlert> = {}): WatchAlert {
  return {
    id: 'alert_1',
    name: 'Test Alert',
    type: 'both',
    genres: ['878'],
    platforms: ['8'],
    enabled: true,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('mediaMatchesWatchAlert', () => {
  it('matches when genre, platform, and keyword criteria are satisfied', () => {
    const alert = makeAlert({
      genres: ['878'],
      platforms: ['8'],
      keyword: 'dune',
      type: 'movie',
    });
    const media = makeMedia(
      'tmdb_movie_1',
      'Dune: Part Two',
      'movie',
      ['Sci-Fi', 'Adventure'],
      ['Netflix']
    );

    expect(mediaMatchesWatchAlert(alert, media)).toBe(true);
  });

  it('matches TMDb provider aliases against alert platform IDs via formatPlatformName', () => {
    const alert = makeAlert({
      genres: ['878'],
      platforms: ['9'],
      type: 'movie',
    });
    const media = makeMedia(
      'tmdb_movie_3',
      'The Tomorrow War',
      'movie',
      ['Sci-Fi'],
      ['Amazon Prime Video']
    );

    expect(mediaMatchesWatchAlert(alert, media)).toBe(true);
  });

  it('rejects mismatched type and missing keyword matches', () => {
    const alert = makeAlert({
      type: 'tv',
      keyword: 'office',
      genres: ['35'],
      platforms: ['9'],
    });
    const movie = makeMedia(
      'tmdb_movie_2',
      'The Office Movie',
      'movie',
      ['Comedy'],
      ['Prime Video']
    );
    const show = makeMedia(
      'tmdb_tv_2',
      'Parks and Recreation',
      'tv',
      ['Comedy'],
      ['Prime Video']
    );

    expect(mediaMatchesWatchAlert(alert, movie)).toBe(false);
    expect(mediaMatchesWatchAlert(alert, show)).toBe(false);
  });
});

describe('findNewAlertMatches', () => {
  it('dedupes media that was already notified for an alert', () => {
    const alert = makeAlert({
      lastNotifiedMediaIds: ['tmdb_movie_1'],
    });
    const media = [
      makeMedia('tmdb_movie_1', 'Dune: Part Two', 'movie', ['Sci-Fi'], ['Netflix']),
      makeMedia('tmdb_movie_2', 'Arrival', 'movie', ['Sci-Fi'], ['Netflix']),
    ];

    const matches = findNewAlertMatches([alert], media);

    expect(matches).toHaveLength(1);
    expect(matches[0].media.id).toBe('tmdb_movie_2');
  });
});

describe('checkWatchAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllWatchAlerts).mockResolvedValue([
      makeAlert({ id: 'alert_1', lastNotifiedMediaIds: [] }),
    ]);
    vi.mocked(getLatestReleases).mockImplementation(async (type) => {
      if (type === 'movie') {
        return [
          makeMedia('tmdb_movie_3', 'Blade Runner', 'movie', ['Sci-Fi'], ['Netflix']),
        ];
      }
      return [];
    });
    vi.mocked(putWatchAlert).mockResolvedValue(undefined);
    vi.mocked(putMediaItems).mockResolvedValue(undefined);
  });

  it('fetches recent releases and persists alert check metadata', async () => {
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

    const matches = await checkWatchAlerts(prefs);

    expect(getLatestReleases).toHaveBeenCalledWith('movie', prefs, 7);
    expect(getLatestReleases).toHaveBeenCalledWith('tv', prefs, 7);
    expect(matches).toHaveLength(1);
    expect(matches[0].media.canonicalTitle).toBe('Blade Runner');
    expect(putWatchAlert).toHaveBeenCalled();
    expect(putMediaItems).toHaveBeenCalledWith([matches[0].media]);

    const savedAlert = vi.mocked(putWatchAlert).mock.calls[0][0];
    expect(savedAlert.lastCheckedAt).toBeGreaterThan(0);
    expect(savedAlert.lastMatchAt).toBeGreaterThan(0);
    expect(savedAlert.lastNotifiedMediaIds).toContain('tmdb_movie_3');
  });

  it('uses prefetched releases without calling getLatestReleases', async () => {
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
    const prefetched = [
      makeMedia('tmdb_movie_4', 'Interstellar', 'movie', ['Sci-Fi'], ['Netflix']),
    ];

    const matches = await checkWatchAlerts(prefs, prefetched);

    expect(getLatestReleases).not.toHaveBeenCalled();
    expect(matches).toHaveLength(1);
    expect(matches[0].media.canonicalTitle).toBe('Interstellar');
  });
});