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
  generateSubsumeDispatch,
  reconcileDispatchAlarm,
  shouldRunLegacyWeeklyDigest,
  DISPATCH_ALARM_NAME,
  WEEKLY_DIGEST_ALARM_NAME,
} from './dispatch';
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

/** OS notification — no private notes or reflection text. */
async function notifyWeeklyDigestReady(digest: WeeklyDigest, multiMedium: boolean) {
  if (digest.items.length === 0) return;

  setNotificationBadge('weekly-digest');
  const count = digest.items.length;
  const title = multiMedium
    ? 'Subsume — your weekly selection'
    : 'Subsume — weekly curator digest';
  const message = multiMedium
    ? `${count} pick${count === 1 ? '' : 's'} from your archive and catalogs — open Subsume`
    : `${count} personalized pick${count === 1 ? '' : 's'} from your background curator — open Recommendations in Subsume`;

  chrome.notifications.create('weekly-digest', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
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

    // Legacy weekly digest (screen-only). Only runs when dispatch is off.
    // When dispatch is on, generation is owned solely by subsumeDispatch.
    if (alarm.name === WEEKLY_DIGEST_ALARM_NAME) {
      try {
        logger.info('[Subsume] Weekly digest alarm triggered.');
        const prefs = await getPreferences();
        if (!shouldRunLegacyWeeklyDigest(prefs.dispatchEnabled)) {
          logger.info(
            '[Subsume] weeklyDigest skipped — dispatchEnabled; multi-medium path owns generation.'
          );
          return;
        }
        const digest = await generateWeeklyDigest(prefs);
        await saveWeeklyDigest(digest);
        await notifyWeeklyDigestReady(digest, false);
      } catch (err) {
        logger.error('[Subsume] Weekly digest generation failed:', err);
      }
    }

    if (alarm.name === DISPATCH_ALARM_NAME) {
      try {
        logger.info('[Subsume] Subsume Dispatch alarm triggered.');
        const prefs = await getPreferences();
        if (!prefs.dispatchEnabled) {
          logger.info('[Subsume] Dispatch disabled — skipping subsumeDispatch alarm.');
          return;
        }
        const digest = await generateSubsumeDispatch(prefs);
        await notifyWeeklyDigestReady(digest, true);
      } catch (err) {
        logger.error('[Subsume] Subsume Dispatch generation failed:', err);
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

  // Single weekly path: reconcile arms either weeklyDigest (legacy) or subsumeDispatch.
  getPreferences()
    .then((prefs) => reconcileDispatchAlarm(prefs))
    .catch((err) => {
      logger.error('[Subsume] Failed to reconcile dispatch alarm:', err);
    });
}
