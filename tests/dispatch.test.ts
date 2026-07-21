import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem, UserPreferences, WeeklyDigest } from '@/shared/types';

vi.mock('@/background/digest', () => ({
  generateWeeklyDigest: vi.fn(),
}));

vi.mock('@/background/discoveryFeed', () => ({
  getDiscoveryFeed: vi.fn(),
  discoveryFeedToWeeklyDigest: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  getWeeklyDigest: vi.fn(),
  saveWeeklyDigest: vi.fn(),
  putMediaItem: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

import { generateWeeklyDigest } from '@/background/digest';
import {
  getAllLibraryItems,
  getAllMediaMap,
  getWeeklyDigest,
  saveWeeklyDigest,
  putMediaItem,
} from '@/background/storage';
import { searchOpenLibrary } from '@/background/openLibrary';
import {
  weeklyPeriodKey,
  shouldRunDispatch,
  shouldRunLegacyWeeklyDigest,
  generateSubsumeDispatch,
  reconcileDispatchAlarm,
  DISPATCH_PERIOD_STORAGE_KEY,
  DISPATCH_ALARM_NAME,
  WEEKLY_DIGEST_ALARM_NAME,
} from '@/background/dispatch';

const basePrefs: UserPreferences = {
  favoriteGenres: [],
  platforms: ['8'],
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  onboardingComplete: true,
  dispatchEnabled: true,
  dispatchWeekday: 4,
  dispatchLocalTime: '19:00',
  dispatchMaxSearches: 5,
  dispatchWebSearchEnabled: false,
  openLibraryEnabled: true,
  enabledMedia: { movie: true, tv: true, book: true },
};

function makeBookMedia(
  id: string,
  title: string,
  authors: string[],
  year = 2000
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year,
    genres: ['Fiction'],
    ratings: [],
    providers: [{ provider: 'openlibrary', externalId: id }],
    posterUrl: '',
    authors,
  };
}

describe('weeklyPeriodKey', () => {
  it('formats as YYYY-Www (ISO week)', () => {
    // 2026-07-20 is a Monday in ISO week 30 of 2026
    const key = weeklyPeriodKey(new Date(2026, 6, 20));
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
    expect(key).toBe('2026-W30');
  });

  it('handles early January belonging to previous week-year', () => {
    // 2021-01-01 is Friday of ISO week 53 of 2020
    const key = weeklyPeriodKey(new Date(2021, 0, 1));
    expect(key).toBe('2020-W53');
  });
});

describe('shouldRunDispatch', () => {
  it('returns false when dispatch is disabled', () => {
    const prefs = { ...basePrefs, dispatchEnabled: false };
    expect(shouldRunDispatch(prefs, undefined, new Date(2026, 6, 20))).toBe(false);
  });

  it('returns true when no last period key', () => {
    expect(shouldRunDispatch(basePrefs, undefined, new Date(2026, 6, 20))).toBe(true);
    expect(shouldRunDispatch(basePrefs, null, new Date(2026, 6, 20))).toBe(true);
  });

  it('returns false when last period matches current (idempotent)', () => {
    const now = new Date(2026, 6, 20);
    const current = weeklyPeriodKey(now);
    expect(shouldRunDispatch(basePrefs, current, now)).toBe(false);
  });

  it('returns true when last period differs', () => {
    const now = new Date(2026, 6, 20);
    expect(shouldRunDispatch(basePrefs, '2026-W29', now)).toBe(true);
  });
});

describe('shouldRunLegacyWeeklyDigest (single generation path)', () => {
  it('runs legacy path only when dispatch is off', () => {
    expect(shouldRunLegacyWeeklyDigest(false)).toBe(true);
    expect(shouldRunLegacyWeeklyDigest(undefined)).toBe(true);
    expect(shouldRunLegacyWeeklyDigest(true)).toBe(false);
  });
});

describe('reconcileDispatchAlarm (single alarm armed)', () => {
  beforeEach(() => {
    vi.mocked(chrome.alarms.get).mockImplementation(
      ((_name: string, cb?: (alarm?: chrome.alarms.Alarm) => void) => {
        if (cb) cb(undefined);
        return Promise.resolve(undefined);
      }) as typeof chrome.alarms.get
    );
    vi.mocked(chrome.alarms.clear).mockImplementation(
      ((_name: string, cb?: (wasCleared: boolean) => void) => {
        if (cb) cb(true);
        return Promise.resolve(true);
      }) as typeof chrome.alarms.clear
    );
    vi.mocked(chrome.alarms.create).mockClear();
    vi.mocked(chrome.alarms.clear).mockClear();
  });

  it('when dispatchEnabled: clears weeklyDigest and creates subsumeDispatch only', async () => {
    await reconcileDispatchAlarm({ ...basePrefs, dispatchEnabled: true });

    const cleared = vi.mocked(chrome.alarms.clear).mock.calls.map((c) => c[0]);
    expect(cleared).toContain(WEEKLY_DIGEST_ALARM_NAME);
    expect(cleared).toContain(DISPATCH_ALARM_NAME);

    const created = vi.mocked(chrome.alarms.create).mock.calls.map((c) => c[0]);
    expect(created).toContain(DISPATCH_ALARM_NAME);
    expect(created).not.toContain(WEEKLY_DIGEST_ALARM_NAME);
  });

  it('when dispatch disabled: clears subsumeDispatch and ensures weeklyDigest', async () => {
    await reconcileDispatchAlarm({ ...basePrefs, dispatchEnabled: false });

    const cleared = vi.mocked(chrome.alarms.clear).mock.calls.map((c) => c[0]);
    expect(cleared).toContain(DISPATCH_ALARM_NAME);
    expect(cleared).not.toContain(WEEKLY_DIGEST_ALARM_NAME);

    const created = vi.mocked(chrome.alarms.create).mock.calls.map((c) => c[0]);
    expect(created).toContain(WEEKLY_DIGEST_ALARM_NAME);
    expect(created).not.toContain(DISPATCH_ALARM_NAME);
  });

  it('when dispatch disabled and weeklyDigest already exists: does not recreate it', async () => {
    vi.mocked(chrome.alarms.get).mockImplementation(
      ((name: string, cb?: (alarm?: chrome.alarms.Alarm) => void) => {
        const alarm =
          name === WEEKLY_DIGEST_ALARM_NAME
            ? ({ name: WEEKLY_DIGEST_ALARM_NAME, scheduledTime: 1 } as chrome.alarms.Alarm)
            : undefined;
        if (cb) cb(alarm);
        return Promise.resolve(alarm);
      }) as typeof chrome.alarms.get
    );

    await reconcileDispatchAlarm({ ...basePrefs, dispatchEnabled: false });

    const created = vi.mocked(chrome.alarms.create).mock.calls.map((c) => c[0]);
    expect(created).not.toContain(WEEKLY_DIGEST_ALARM_NAME);
  });
});

describe('generateSubsumeDispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(putMediaItem).mockResolvedValue(undefined);
    vi.mocked(saveWeeklyDigest).mockResolvedValue(undefined);

    vi.mocked(generateWeeklyDigest).mockResolvedValue({
      generatedAt: Date.now(),
      llmGenerated: false,
      items: [
        {
          mediaId: 'tmdb_movie_1',
          title: 'Screen Pick',
          year: 2026,
          type: 'movie',
          reason: 'Top-rated new release',
          platforms: ['Netflix'],
        },
      ],
    });

    vi.mocked(getAllLibraryItems).mockResolvedValue([
      {
        mediaId: 'ol_book_1',
        status: 'watched',
        addedAt: 1,
        updatedAt: 1,
      },
    ]);
    vi.mocked(getAllMediaMap).mockResolvedValue({
      ol_book_1: makeBookMedia('ol_book_1', 'The Great Gatsby', ['F. Scott Fitzgerald'], 1925),
    });

    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL999W',
          medium: 'book',
          canonicalTitle: 'Tender Is the Night',
          firstReleaseYear: 1934,
          genres: [],
          images: {},
          externalIds: [{ provider: 'openlibrary', externalId: 'OL999W' }],
          creatorCredits: [],
          bookDetails: { authors: ['F. Scott Fitzgerald'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  });

  it('returns mixed movie and book items from catalog paths', async () => {
    const digest = await generateSubsumeDispatch(basePrefs);

    expect(digest.items.length).toBeGreaterThanOrEqual(2);
    const types = new Set(digest.items.map((i) => i.type));
    expect(types.has('movie')).toBe(true);
    expect(types.has('book')).toBe(true);
    expect(digest.llmGenerated).toBe(false);

    const book = digest.items.find((i) => i.type === 'book');
    expect(book?.reason).toMatch(/Because you completed/i);
    expect(saveWeeklyDigest).toHaveBeenCalled();
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [DISPATCH_PERIOD_STORAGE_KEY]: expect.stringMatching(/^\d{4}-W\d{2}$/),
      })
    );
  });

  it('second call same period returns cached digest without regenerating', async () => {
    const cached: WeeklyDigest = {
      generatedAt: 123,
      llmGenerated: false,
      items: [
        {
          mediaId: 'cached_1',
          title: 'Cached Pick',
          year: 2026,
          type: 'movie',
          reason: 'Cached',
          platforms: [],
        },
      ],
    };

    const period = weeklyPeriodKey(new Date());
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      [DISPATCH_PERIOD_STORAGE_KEY]: period,
    });
    vi.mocked(getWeeklyDigest).mockResolvedValue(cached);

    const digest = await generateSubsumeDispatch(basePrefs);

    expect(digest).toEqual(cached);
    expect(generateWeeklyDigest).not.toHaveBeenCalled();
    expect(searchOpenLibrary).not.toHaveBeenCalled();
    expect(saveWeeklyDigest).not.toHaveBeenCalled();
  });

  it('force regenerates even when period already completed', async () => {
    const period = weeklyPeriodKey(new Date());
    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      [DISPATCH_PERIOD_STORAGE_KEY]: period,
    });
    vi.mocked(getWeeklyDigest).mockResolvedValue({
      generatedAt: 1,
      llmGenerated: false,
      items: [{ mediaId: 'old', title: 'Old', year: 1, type: 'movie', reason: 'x', platforms: [] }],
    });

    const digest = await generateSubsumeDispatch(basePrefs, { force: true });

    expect(generateWeeklyDigest).toHaveBeenCalled();
    expect(digest.items.some((i) => i.title === 'Screen Pick')).toBe(true);
    expect(saveWeeklyDigest).toHaveBeenCalled();
  });

  it('skips books already completed in the library', async () => {
    vi.mocked(searchOpenLibrary).mockResolvedValue([
      {
        matchScore: 1,
        work: {
          id: 'ol_book_1',
          medium: 'book',
          canonicalTitle: 'The Great Gatsby',
          firstReleaseYear: 1925,
          genres: [],
          images: {},
          externalIds: [{ provider: 'openlibrary', externalId: '1' }],
          creatorCredits: [],
          bookDetails: { authors: ['F. Scott Fitzgerald'] },
          sourceProvenance: [],
          sourceConfidence: 'high',
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const digest = await generateSubsumeDispatch(basePrefs);
    const bookIds = digest.items.filter((i) => i.type === 'book').map((i) => i.mediaId);
    expect(bookIds).not.toContain('ol_book_1');
  });
});
