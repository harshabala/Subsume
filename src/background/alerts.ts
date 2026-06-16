import {
  WatchAlert,
  WatchAlertMatch,
  MediaItem,
  UserPreferences,
} from '@/shared/types';
import { AVAILABLE_GENRES, hasGenreMatch } from '@/shared/genres';
import { AVAILABLE_PLATFORMS, formatPlatformName } from '@/shared/platforms';
import { getLatestReleases } from './tmdb';
import {
  getAllWatchAlerts,
  putWatchAlert,
  putMediaItems,
} from './storage';

const GENRE_ID_TO_NAME: Record<string, string> = Object.fromEntries(
  AVAILABLE_GENRES.map((genre) => [genre.id, genre.name])
);

function platformNamesForAlert(alert: WatchAlert): string[] {
  return (alert.platforms || [])
    .map((id) => AVAILABLE_PLATFORMS.find((platform) => platform.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function genreNamesForAlert(alert: WatchAlert): string[] {
  return (alert.genres || [])
    .map((id) => GENRE_ID_TO_NAME[id])
    .filter(Boolean);
}

function mediaPlatformNames(media: MediaItem): string[] {
  return (media.streamingAvailability || []).map((info) =>
    formatPlatformName(info.platform)
  );
}

function hasPlatformMatch(alertPlatformNames: string[], media: MediaItem): boolean {
  if (alertPlatformNames.length === 0) return true;

  const mediaPlatforms = mediaPlatformNames(media);
  return alertPlatformNames.some((alertPlatform) =>
    mediaPlatforms.some((mediaPlatform) => mediaPlatform === alertPlatform)
  );
}

function hasGenreOverlap(alertGenreNames: string[], media: MediaItem): boolean {
  return hasGenreMatch(alertGenreNames, media.genres);
}

function matchesKeyword(alert: WatchAlert, media: MediaItem): boolean {
  const keyword = alert.keyword?.trim();
  if (!keyword) return true;
  return media.canonicalTitle.toLowerCase().includes(keyword.toLowerCase());
}

function matchesType(alert: WatchAlert, media: MediaItem): boolean {
  const alertType = alert.type ?? 'both';
  if (alertType === 'both') return true;
  return media.type === alertType;
}

export function mediaMatchesWatchAlert(alert: WatchAlert, media: MediaItem): boolean {
  if (!alert.enabled) return false;
  if (!matchesType(alert, media)) return false;
  if (!hasGenreOverlap(genreNamesForAlert(alert), media)) return false;
  if (!hasPlatformMatch(platformNamesForAlert(alert), media)) return false;
  if (!matchesKeyword(alert, media)) return false;
  return true;
}

export function findNewAlertMatches(
  alerts: WatchAlert[],
  mediaItems: MediaItem[]
): WatchAlertMatch[] {
  const matches: WatchAlertMatch[] = [];

  for (const alert of alerts) {
    if (!alert.enabled) continue;

    const notified = new Set(alert.lastNotifiedMediaIds || []);
    for (const media of mediaItems) {
      if (notified.has(media.id)) continue;
      if (mediaMatchesWatchAlert(alert, media)) {
        matches.push({ alert, media });
      }
    }
  }

  return matches;
}

export async function checkWatchAlerts(
  prefs: UserPreferences,
  prefetchedReleases?: MediaItem[]
): Promise<WatchAlertMatch[]> {
  const alerts = await getAllWatchAlerts();
  const enabledAlerts = alerts.filter((alert) => alert.enabled);
  if (enabledAlerts.length === 0) {
    return [];
  }

  let allMedia: MediaItem[];
  if (prefetchedReleases) {
    allMedia = prefetchedReleases;
  } else {
    const [movies, tv] = await Promise.all([
      getLatestReleases('movie', prefs, 7),
      getLatestReleases('tv', prefs, 7),
    ]);
    allMedia = [...movies, ...tv];
  }
  const matches = findNewAlertMatches(enabledAlerts, allMedia);
  const now = Date.now();
  const updatedAlerts = new Map<string, WatchAlert>();

  for (const alert of enabledAlerts) {
    updatedAlerts.set(alert.id, { ...alert, lastCheckedAt: now });
  }

  for (const match of matches) {
    const current = updatedAlerts.get(match.alert.id) || { ...match.alert };
    current.lastMatchAt = now;
    current.lastNotifiedMediaIds = [
      ...(current.lastNotifiedMediaIds || []),
      match.media.id,
    ].slice(-200);
    updatedAlerts.set(match.alert.id, current);
  }

  await Promise.all(
    Array.from(updatedAlerts.values()).map((alert) => putWatchAlert(alert))
  );

  if (matches.length > 0) {
    await putMediaItems(matches.map((match) => match.media));
  }

  return matches;
}