import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem, UserPreferences, WatchAlertMatch, WeeklyDigest } from '@/shared/types';

vi.mock('@/background/tmdb', () => ({ getLatestReleases: vi.fn() }));
vi.mock('@/background/storage', () => ({ getPreferences: vi.fn(), saveWeeklyDigest: vi.fn() }));
vi.mock('@/background/alerts', () => ({ checkWatchAlerts: vi.fn() }));
vi.mock('@/background/digest', () => ({ generateWeeklyDigest: vi.fn() }));
vi.mock('@/background/dispatch', () => ({
  generateSubsumeDispatch: vi.fn(),
  reconcileDispatchAlarm: vi.fn(),
  shouldRunLegacyWeeklyDigest: vi.fn(),
  DISPATCH_ALARM_NAME: 'subsumeDispatch',
  WEEKLY_DIGEST_ALARM_NAME: 'weeklyDigest',
}));
vi.mock('@/background/notifications', () => ({
  setNotificationBadge: vi.fn(),
  clearNotificationBadge: vi.fn(),
}));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() } }));

import { setupLifecycleAndAlarms } from '@/background/events';
import { getLatestReleases } from '@/background/tmdb';
import { getPreferences, saveWeeklyDigest } from '@/background/storage';
import { checkWatchAlerts } from '@/background/alerts';
import { generateWeeklyDigest } from '@/background/digest';
import {
  generateSubsumeDispatch,
  reconcileDispatchAlarm,
  shouldRunLegacyWeeklyDigest,
} from '@/background/dispatch';
import { setNotificationBadge, clearNotificationBadge } from '@/background/notifications';
import { logger } from '@/shared/logger';

type AlarmListener = (alarm: { name: string }) => Promise<void>;

const prefs = (over: Partial<UserPreferences> = {}) =>
  ({ favoriteGenres: ['18'], platforms: [], dispatchEnabled: true, ...over }) as UserPreferences;
const media = (id: string): MediaItem =>
  ({ id, canonicalTitle: `T${id}`, type: 'movie', year: 2024, genres: [], ratings: [], providers: [] });
const digest = (n: number) => ({ items: Array.from({ length: n }, (_, i) => ({ mediaId: `m${i}` })) }) as WeeklyDigest;

function setup() {
  vi.mocked(getPreferences).mockResolvedValue(prefs());
  vi.mocked(reconcileDispatchAlarm).mockResolvedValue(undefined as never);
  setupLifecycleAndAlarms();
  const installed = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls[0][0] as (d: { reason: string }) => void;
  const onAlarm = vi.mocked(chrome.alarms.onAlarm.addListener).mock.calls[0][0] as unknown as AlarmListener;
  const onClicked = vi.mocked(chrome.notifications.onClicked.addListener).mock.calls[0][0] as (id: string) => void;
  return { installed, onAlarm, onClicked };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('setupLifecycleAndAlarms', () => {
  it('opens the welcome page only on first install', () => {
    const { installed } = setup();
    installed({ reason: 'update' });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    installed({ reason: 'install' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://test-extension-id/ui/index.html' });
  });

  it('creates the daily alarm only when it does not already exist', () => {
    setup();
    expect(chrome.alarms.create).toHaveBeenCalledWith('dailyRefresh', { periodInMinutes: 1440 });
    vi.mocked(chrome.alarms.create).mockClear();
    vi.mocked(chrome.alarms.get).mockImplementationOnce(((_n: string, cb: (a?: unknown) => void) => cb({ name: 'dailyRefresh' })) as never);
    setupLifecycleAndAlarms();
    expect(chrome.alarms.create).not.toHaveBeenCalled();
  });

  it('logs when reconciling the dispatch alarm fails', async () => {
    vi.mocked(getPreferences).mockRejectedValueOnce(new Error('db down'));
    setupLifecycleAndAlarms();
    await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith('[Subsume] Failed to reconcile dispatch alarm:', expect.any(Error)));
  });

  it('daily refresh: new-release notification, grouped alert notifications, and the release badge', async () => {
    const { onAlarm } = setup();
    vi.mocked(getLatestReleases).mockImplementation(async (type) => (type === 'movie' ? [media('1')] : []));
    const alertA = { id: 'a', name: 'A' };
    const matches = ['1', '2', '3', '4', '5'].map((id) => ({ alert: alertA, media: media(id) })) as WatchAlertMatch[];
    matches.push({ alert: { id: 'b', name: 'B' }, media: media('9') } as WatchAlertMatch);
    vi.mocked(checkWatchAlerts).mockResolvedValue(matches);

    await onAlarm({ name: 'dailyRefresh' });

    expect(chrome.notifications.create).toHaveBeenCalledWith('daily-new-releases', expect.objectContaining({
      message: '1 new title matching your preferences',
    }));
    expect(chrome.notifications.create).toHaveBeenCalledWith('watch-alert-a', expect.objectContaining({
      title: 'Alert: A',
      message: 'T1, T2, T3 and 2 more',
    }));
    expect(chrome.notifications.create).toHaveBeenCalledWith('watch-alert-b', expect.objectContaining({ message: 'T9' }));
    expect(setNotificationBadge).toHaveBeenCalledTimes(1);
    expect(setNotificationBadge).toHaveBeenCalledWith('new-releases');
  });

  it('daily refresh: plural message, no release notice without taste prefs, alert badge fallback', async () => {
    const { onAlarm } = setup();
    vi.mocked(getPreferences).mockResolvedValue(prefs({ favoriteGenres: [], platforms: [] }));
    vi.mocked(getLatestReleases).mockResolvedValue([media('1'), media('2')]);
    vi.mocked(checkWatchAlerts).mockResolvedValue([{ alert: { id: 'a', name: 'A' }, media: media('1') }] as WatchAlertMatch[]);
    await onAlarm({ name: 'dailyRefresh' });
    expect(chrome.notifications.create).not.toHaveBeenCalledWith('daily-new-releases', expect.anything());
    expect(setNotificationBadge).toHaveBeenCalledWith('watch-alert');

    vi.clearAllMocks();
    vi.mocked(getPreferences).mockResolvedValue(prefs({ favoriteGenres: [], platforms: ['8'] }));
    vi.mocked(checkWatchAlerts).mockResolvedValue([]);
    await onAlarm({ name: 'dailyRefresh' });
    expect(chrome.notifications.create).toHaveBeenCalledWith('daily-new-releases', expect.objectContaining({
      message: '4 new titles matching your preferences',
    }));
  });

  it('daily refresh: no badge when nothing matched; alert failures and refresh failures are logged', async () => {
    const { onAlarm } = setup();
    vi.mocked(getLatestReleases).mockResolvedValue([]);
    vi.mocked(checkWatchAlerts).mockRejectedValue(new Error('alerts broke'));
    await onAlarm({ name: 'dailyRefresh' });
    expect(setNotificationBadge).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Watch alert check failed:', expect.any(Error));

    vi.mocked(getPreferences).mockRejectedValueOnce(new Error('prefs broke'));
    await onAlarm({ name: 'dailyRefresh' });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Daily refresh alarm failed:', expect.any(Error));
  });

  it('legacy weekly digest runs only when dispatch is off', async () => {
    const { onAlarm } = setup();
    vi.mocked(shouldRunLegacyWeeklyDigest).mockReturnValue(false);
    await onAlarm({ name: 'weeklyDigest' });
    expect(generateWeeklyDigest).not.toHaveBeenCalled();

    vi.mocked(shouldRunLegacyWeeklyDigest).mockReturnValue(true);
    vi.mocked(generateWeeklyDigest).mockResolvedValue(digest(1));
    await onAlarm({ name: 'weeklyDigest' });
    expect(saveWeeklyDigest).toHaveBeenCalled();
    expect(setNotificationBadge).toHaveBeenCalledWith('weekly-digest');
    expect(chrome.notifications.create).toHaveBeenCalledWith('weekly-digest', expect.objectContaining({
      title: 'Subsume — weekly curator digest',
      message: '1 personalized pick from your background curator — open Recommendations in Subsume',
    }));

    vi.mocked(generateWeeklyDigest).mockResolvedValue(digest(2));
    await onAlarm({ name: 'weeklyDigest' });
    expect(chrome.notifications.create).toHaveBeenLastCalledWith('weekly-digest', expect.objectContaining({
      message: expect.stringMatching(/^2 personalized picks/),
    }));

    vi.mocked(generateWeeklyDigest).mockRejectedValue(new Error('llm down'));
    await onAlarm({ name: 'weeklyDigest' });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Weekly digest generation failed:', expect.any(Error));
  });

  it('dispatch alarm respects the toggle, notifies non-empty selections and logs failures', async () => {
    const { onAlarm } = setup();
    vi.mocked(getPreferences).mockResolvedValue(prefs({ dispatchEnabled: false }));
    await onAlarm({ name: 'subsumeDispatch' });
    expect(generateSubsumeDispatch).not.toHaveBeenCalled();

    vi.mocked(getPreferences).mockResolvedValue(prefs({ dispatchEnabled: true }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValue(digest(0));
    await onAlarm({ name: 'subsumeDispatch' });
    expect(chrome.notifications.create).not.toHaveBeenCalled();

    vi.mocked(generateSubsumeDispatch).mockResolvedValue(digest(1));
    await onAlarm({ name: 'subsumeDispatch' });
    expect(chrome.notifications.create).toHaveBeenCalledWith('weekly-digest', expect.objectContaining({
      title: 'Subsume — your weekly selection',
      message: '1 pick from your archive and catalogs — open Subsume',
    }));
    vi.mocked(generateSubsumeDispatch).mockResolvedValue(digest(3));
    await onAlarm({ name: 'subsumeDispatch' });
    expect(chrome.notifications.create).toHaveBeenLastCalledWith('weekly-digest', expect.objectContaining({
      message: '3 picks from your archive and catalogs — open Subsume',
    }));

    vi.mocked(generateSubsumeDispatch).mockRejectedValue(new Error('x'));
    await onAlarm({ name: 'subsumeDispatch' });
    expect(logger.error).toHaveBeenCalledWith('[Subsume] Subsume Dispatch generation failed:', expect.any(Error));
  });

  it('ignores unknown alarms', async () => {
    const { onAlarm } = setup();
    await onAlarm({ name: 'something-else' });
    expect(getLatestReleases).not.toHaveBeenCalled();
  });

  it('notification clicks open the right page and clear the badge; unknown ids are ignored', () => {
    const { onClicked } = setup();
    onClicked('watch-alert-a');
    expect(clearNotificationBadge).toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://test-extension-id/ui/index.html?page=alerts' });
    expect(chrome.notifications.clear).toHaveBeenCalledWith('watch-alert-a');
    onClicked('weekly-digest');
    onClicked('daily-new-releases');
    expect(chrome.tabs.create).toHaveBeenLastCalledWith({ url: 'chrome-extension://test-extension-id/ui/index.html' });
    vi.clearAllMocks();
    onClicked('other');
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});
