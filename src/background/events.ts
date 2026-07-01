import { logger } from '@/shared/logger';
import {
  WeeklyDigest,
  WatchAlertMatch,
} from '@/shared/types';
import { getLatestReleases } from './tmdb';
import { getPreferences, saveWeeklyDigest } from './storage';
import { checkWatchAlerts } from './alerts';
import { generateWeeklyDigest } from './digest';
import {
  setNotificationBadge,
  clearNotificationBadge,
  NotificationBadgeKind,
} from './notifications';

async function notifyWatchAlertMatches(
  matches: WatchAlertMatch[],
  options?: { updateBadge?: boolean }
) {
  if (matches.length === 0) return;

  const byAlert = new Map<string, WatchAlertMatch[]>();
  for (const match of matches) {
    const existing = byAlert.get(match.alert.id) || [];
    existing.push(match);
    byAlert.set(match.alert.id, existing);
  }

  for (const [alertId, alertMatches] of byAlert) {
    const alert = alertMatches[0].alert;
    const titles = alertMatches.slice(0, 3).map((match) => match.media.canonicalTitle);
    let message = titles.join(', ');
    if (alertMatches.length > 3) {
      message += ` and ${alertMatches.length - 3} more`;
    }

    chrome.notifications.create(`watch-alert-${alertId}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: `Alert: ${alert.name}`,
      message,
      priority: 1,
    });
  }

  if (options?.updateBadge !== false) {
    setNotificationBadge('watch-alert');
  }
}

async function notifyWeeklyDigestReady(digest: WeeklyDigest) {
  if (digest.items.length === 0) return;

  setNotificationBadge('weekly-digest');
  chrome.notifications.create('weekly-digest', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Your weekly watchlist is ready',
    message:
      digest.items.length +
      ' personalized pick' +
      (digest.items.length === 1 ? '' : 's') +
      ' curated for you',
    priority: 1,
  });
}

const DAILY_RELEASE_WINDOW_DAYS = 7;

export function setupLifecycleAndAlarms(): void {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      logger.info('[Subsume] Extension installed — welcome!');
      chrome.tabs.create({ url: chrome.runtime.getURL('ui/index.html') });
    }
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'dailyRefresh') {
      try {
        logger.info('[Subsume] Daily refresh triggered.');
        const prefs = await getPreferences();

        const [movies, tv] = await Promise.all([
          getLatestReleases('movie', prefs, DAILY_RELEASE_WINDOW_DAYS),
          getLatestReleases('tv', prefs, DAILY_RELEASE_WINDOW_DAYS),
        ]);
        const allReleases = [...movies, ...tv];

        let dailyBadge: NotificationBadgeKind | null = null;

        if (
          (prefs.favoriteGenres.length > 0 || prefs.platforms.length > 0) &&
          allReleases.length > 0
        ) {
          chrome.notifications.create('daily-new-releases', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'New Releases Available',
            message:
              allReleases.length +
              ' new title' +
              (allReleases.length === 1 ? '' : 's') +
              ' matching your preferences',
            priority: 1,
          });
          dailyBadge = 'new-releases';
        }

        try {
          const alertMatches = await checkWatchAlerts(prefs, allReleases);
          await notifyWatchAlertMatches(alertMatches, { updateBadge: false });
          if (alertMatches.length > 0) {
            dailyBadge = dailyBadge ?? 'watch-alert';
          }
        } catch (err) {
          logger.error('[Subsume] Watch alert check failed:', err);
        }

        if (dailyBadge) {
          setNotificationBadge(dailyBadge);
        }
      } catch (err) {
        logger.error('[Subsume] Daily refresh alarm failed:', err);
      }
    }

    if (alarm.name === 'weeklyDigest') {
      try {
        logger.info('[Subsume] Weekly digest alarm triggered.');
        const prefs = await getPreferences();
        const digest = await generateWeeklyDigest(prefs);
        await saveWeeklyDigest(digest);
        await notifyWeeklyDigestReady(digest);
      } catch (err) {
        logger.error('[Subsume] Weekly digest generation failed:', err);
      }
    }
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    if (
      notificationId === 'daily-new-releases' ||
      notificationId === 'weekly-digest' ||
      notificationId.startsWith('watch-alert-')
    ) {
      clearNotificationBadge();
      const page = notificationId.startsWith('watch-alert-') ? '?page=alerts' : '';
      chrome.tabs.create({ url: chrome.runtime.getURL(`ui/index.html${page}`) });
      chrome.notifications.clear(notificationId);
    }
  });

  // Run once a day (guarded to prevent resetting the schedule on MV3 restart)
  chrome.alarms.get('dailyRefresh', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('dailyRefresh', { periodInMinutes: 1440 });
    }
  });

  // Run once every 7 days (guarded to prevent resetting the schedule on MV3 restart)
  chrome.alarms.get('weeklyDigest', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('weeklyDigest', { periodInMinutes: 10080 });
    }
  });
}