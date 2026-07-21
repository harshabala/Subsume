import {
  WatchAlert,
  WatchAlertMatch,
  MediaItem,
  UserPreferences,
} from '@/shared/types';
import { AVAILABLE_GENRES, hasGenreMatch } from '@/shared/genres';
import { AVAILABLE_PLATFORMS, formatPlatformName } from '@/shared/platforms';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
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
    .filter((name) => name !== undefined) as string[];
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

/** Optional author substring match (books). Empty authorKeyword always matches. */
function matchesAuthor(alert: WatchAlert, media: MediaItem): boolean {
  const authorKeyword = alert.authorKeyword?.trim();
  if (!authorKeyword) return true;
  const needle = authorKeyword.toLowerCase();
  const authors = media.authors ?? [];
  return authors.some((name) => name.toLowerCase().includes(needle));
}

/**
 * Type matching:
 * - book → media must be book
 * - movie / tv → exact
 * - both (default) → movie or tv only (not books)
 */
function matchesType(alert: WatchAlert, media: MediaItem): boolean {
  const alertType = alert.type ?? 'both';
  if (alertType === 'both') {
    return media.type === 'movie' || media.type === 'tv';
  }
  if (alertType === 'book') {
    return media.type === 'book';
  }
  return media.type === alertType;
}

export function mediaMatchesWatchAlert(alert: WatchAlert, media: MediaItem): boolean {
  if (!alert.enabled) return false;
  if (!matchesType(alert, media)) return false;

  // Book alerts: keyword on title + optional author; skip TMDb genre/platform chips
  if (alert.type === 'book' || media.type === 'book') {
    if (!matchesKeyword(alert, media)) return false;
    if (!matchesAuthor(alert, media)) return false;
    return true;
  }

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

function bookSearchQuery(alert: WatchAlert): string {
  const parts = [alert.keyword?.trim(), alert.authorKeyword?.trim()].filter(
    (p): p is string => Boolean(p)
  );
  if (parts.length > 0) return parts.join(' ');
  return alert.name.trim();
}

/**
 * Search Open Library for each book alert and return new matches.
 * Does not touch TMDb. Persists discovered book media for later display.
 */
export async function checkBookAlerts(
  bookAlerts: WatchAlert[]
): Promise<WatchAlertMatch[]> {
  const enabled = bookAlerts.filter((a) => a.enabled && a.type === 'book');
  if (enabled.length === 0) return [];

  const { searchOpenLibrary } = await import('./openLibrary');
  const allMedia: MediaItem[] = [];
  const seen = new Set<string>();

  for (const alert of enabled) {
    const query = bookSearchQuery(alert);
    if (!query) continue;

    try {
      const results = await searchOpenLibrary({ query, limit: 15 });
      for (const hit of results) {
        const media = catalogWorkToMediaItem(hit.work);
        media.type = 'book';
        if (hit.work.bookDetails?.authors?.length) {
          media.authors = hit.work.bookDetails.authors;
        } else if (hit.work.creatorCredits?.length) {
          media.authors = hit.work.creatorCredits
            .filter((c) => c.role === 'author' || !c.role)
            .map((c) => c.name);
        }
        media.subtitle = hit.work.subtitle;
        if (seen.has(media.id)) continue;
        seen.add(media.id);
        allMedia.push(media);
      }
    } catch {
      // Provider failures should not block other alerts
    }
  }

  if (allMedia.length > 0) {
    await putMediaItems(allMedia);
  }

  return findNewAlertMatches(enabled, allMedia);
}

async function persistAlertCheckResults(
  enabledAlerts: WatchAlert[],
  matches: WatchAlertMatch[]
): Promise<void> {
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

  const screenAlerts = enabledAlerts.filter((alert) => alert.type !== 'book');
  const bookAlerts = enabledAlerts.filter((alert) => alert.type === 'book');

  const screenPromise = (async (): Promise<WatchAlertMatch[]> => {
    if (screenAlerts.length === 0) return [];

    let allMedia: MediaItem[];
    if (prefetchedReleases) {
      allMedia = prefetchedReleases.filter((m) => m.type !== 'book');
    } else {
      const [movies, tv] = await Promise.all([
        getLatestReleases('movie', prefs, 7),
        getLatestReleases('tv', prefs, 7),
      ]);
      allMedia = [...movies, ...tv];
    }
    return findNewAlertMatches(screenAlerts, allMedia);
  })();

  const bookPromise =
    bookAlerts.length > 0 ? checkBookAlerts(bookAlerts) : Promise.resolve([]);

  const [screenMatches, bookMatches] = await Promise.all([
    screenPromise,
    bookPromise,
  ]);
  const matches = [...screenMatches, ...bookMatches];

  await persistAlertCheckResults(enabledAlerts, matches);

  return matches;
}
