/**
 * Phase 2 weekly Subsume Dispatch — multi-medium catalog-based selection.
 * Spec: docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md §10
 */

import type {
  MediaItem,
  UserPreferences,
  WeeklyDigest,
  WeeklyDigestItem,
} from '@/shared/types';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import { logger } from '@/shared/logger';
import {
  getAllLibraryItems,
  getAllMediaMap,
  getWeeklyDigest,
  putMediaItem,
  saveWeeklyDigest,
} from './storage';
import { generateWeeklyDigest } from './digest';
import { getDiscoveryFeed, discoveryFeedToWeeklyDigest } from './discoveryFeed';
import { searchOpenLibrary } from './openLibrary';

export const DISPATCH_PERIOD_STORAGE_KEY = 'subsume_dispatch_last_period';
export const DISPATCH_ALARM_NAME = 'subsumeDispatch';

const DEFAULT_WEEKDAY = 4; // Thursday (0 = Sunday)
const DEFAULT_LOCAL_TIME = '19:00';
const SCREEN_ITEM_CAP = 10;
const BOOK_ITEM_CAP = 6;
const MAX_BOOK_SEARCHES = 5;
const MAX_RESULTS_PER_SEARCH = 4;

export type GenerateDispatchOptions = {
  /** Skip period-key idempotency (manual "Generate now"). */
  force?: boolean;
};

/** ISO week key, e.g. `2026-W30`. Optional IANA timezone for local calendar week. */
export function weeklyPeriodKey(date: Date, timezone?: string): string {
  const parts = localDateParts(date, timezone);
  const { week, weekYear } = isoWeekFromYmd(parts.year, parts.month, parts.day);
  return `${weekYear}-W${String(week).padStart(2, '0')}`;
}

/**
 * Whether a new dispatch should run for the current weekly period.
 * Requires opt-in (`dispatchEnabled`) and a different period than last success.
 */
export function shouldRunDispatch(
  prefs: UserPreferences,
  lastPeriodKey: string | undefined | null,
  now: Date
): boolean {
  if (!prefs.dispatchEnabled) return false;
  const current = weeklyPeriodKey(now, prefs.dispatchTimezone);
  return lastPeriodKey !== current;
}

/**
 * Build multi-medium weekly digest (screen + books).
 * Catalog-only unless a future web-search path is enabled with provider capability.
 * Idempotent: one digest per weekly period unless `force`.
 */
export async function generateSubsumeDispatch(
  prefs: UserPreferences,
  options: GenerateDispatchOptions = {}
): Promise<WeeklyDigest> {
  const now = new Date();
  const periodKey = weeklyPeriodKey(now, prefs.dispatchTimezone);

  if (!options.force) {
    const lastKey = await getLastDispatchPeriodKey();
    if (lastKey === periodKey) {
      const cached = await getWeeklyDigest();
      if (cached && cached.items.length > 0) {
        logger.info('[Subsume] Dispatch already generated for', periodKey, '— returning cache');
        return cached;
      }
    }
  }

  const screen = await buildScreenCandidates(prefs);
  const books = await buildBookCandidates(prefs);

  const seen = new Set<string>();
  const items: WeeklyDigestItem[] = [];
  for (const item of [...screen.items, ...books]) {
    if (seen.has(item.mediaId)) continue;
    seen.add(item.mediaId);
    items.push(item);
  }

  // Catalog-based: llmGenerated true only when the screen path used LLM curation.
  // Never claims web research (web-grounded dispatch is not implemented in this path).
  const digest: WeeklyDigest = {
    generatedAt: Date.now(),
    items,
    llmGenerated: screen.llmGenerated,
  };

  await saveWeeklyDigest(digest);
  await setLastDispatchPeriodKey(periodKey);
  logger.info(
    '[Subsume] Subsume Dispatch saved for',
    periodKey,
    `(${digest.items.length} items, llm=${digest.llmGenerated})`
  );
  return digest;
}

/**
 * Create or clear the `subsumeDispatch` alarm based on prefs.
 * When enabled: weekly period, delayed until next preferred local Thursday 19:00.
 */
export async function reconcileDispatchAlarm(prefs: UserPreferences): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;

  if (!prefs.dispatchEnabled) {
    await clearAlarm(DISPATCH_ALARM_NAME);
    return;
  }

  const delayInMinutes = minutesUntilNextDispatch(prefs);
  await clearAlarm(DISPATCH_ALARM_NAME);
  chrome.alarms.create(DISPATCH_ALARM_NAME, {
    delayInMinutes: Math.max(1, delayInMinutes),
    periodInMinutes: 10080,
  });
  logger.info(
    '[Subsume] subsumeDispatch alarm scheduled in',
    Math.round(delayInMinutes),
    'minutes'
  );
}

// ─── Period key storage ──────────────────────────────────────────────────────

export async function getLastDispatchPeriodKey(): Promise<string | undefined> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return undefined;
  try {
    const result = await chrome.storage.local.get(DISPATCH_PERIOD_STORAGE_KEY);
    const value = result[DISPATCH_PERIOD_STORAGE_KEY];
    return typeof value === 'string' ? value : undefined;
  } catch {
    return undefined;
  }
}

async function setLastDispatchPeriodKey(key: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  try {
    await chrome.storage.local.set({ [DISPATCH_PERIOD_STORAGE_KEY]: key });
  } catch (err) {
    logger.warn('[Subsume] Failed to persist dispatch period key:', err);
  }
}

// ─── Screen candidates ───────────────────────────────────────────────────────

async function buildScreenCandidates(
  prefs: UserPreferences
): Promise<{ items: WeeklyDigestItem[]; llmGenerated: boolean }> {
  const enabled = prefs.enabledMedia;
  const screenOn = !enabled || enabled.movie !== false || enabled.tv !== false;
  if (!screenOn) {
    return { items: [], llmGenerated: false };
  }

  try {
    const digest = await generateWeeklyDigest(prefs);
    const screenItems = digest.items
      .filter((i) => i.type === 'movie' || i.type === 'tv')
      .slice(0, SCREEN_ITEM_CAP);
    if (screenItems.length > 0) {
      return { items: screenItems, llmGenerated: digest.llmGenerated };
    }
  } catch (err) {
    logger.warn('[Subsume] Screen digest path failed, trying discovery feed:', err);
  }

  try {
    const feed = await getDiscoveryFeed();
    const fromFeed = await discoveryFeedToWeeklyDigest(feed);
    const screenItems = fromFeed.items
      .filter((i) => i.type === 'movie' || i.type === 'tv')
      .slice(0, SCREEN_ITEM_CAP);
    return { items: screenItems, llmGenerated: false };
  } catch (err) {
    logger.error('[Subsume] Discovery feed fallback for dispatch failed:', err);
    return { items: [], llmGenerated: false };
  }
}

// ─── Book candidates ─────────────────────────────────────────────────────────

async function buildBookCandidates(prefs: UserPreferences): Promise<WeeklyDigestItem[]> {
  const enabled = prefs.enabledMedia;
  if (enabled && enabled.book === false) return [];
  if (prefs.openLibraryEnabled === false) return [];

  const library = await getAllLibraryItems();
  if (library.length === 0) return [];

  const mediaMap = await getAllMediaMap(library.map((l) => l.mediaId));
  const completedIds = new Set(
    library.filter((l) => l.status === 'watched').map((l) => l.mediaId)
  );
  const libraryIds = new Set(library.map((l) => l.mediaId));

  const authorCounts = new Map<string, { count: number; seedTitle: string }>();
  const subjectCounts = new Map<string, { count: number; seedTitle: string }>();

  for (const item of library) {
    const media = mediaMap[item.mediaId];
    if (!media || media.type !== 'book') continue;
    const seedTitle = media.canonicalTitle;
    const authors = media.authors ?? [];
    for (const author of authors) {
      const key = author.trim();
      if (!key) continue;
      const prev = authorCounts.get(key) ?? { count: 0, seedTitle };
      authorCounts.set(key, {
        count: prev.count + (item.status === 'watched' ? 2 : 1),
        seedTitle: item.status === 'watched' ? seedTitle : prev.seedTitle,
      });
    }
    for (const genre of media.genres ?? []) {
      const key = genre.trim();
      if (!key) continue;
      const prev = subjectCounts.get(key) ?? { count: 0, seedTitle };
      subjectCounts.set(key, {
        count: prev.count + 1,
        seedTitle: prev.seedTitle,
      });
    }
  }

  const maxSearches = Math.min(
    prefs.dispatchMaxSearches ?? MAX_BOOK_SEARCHES,
    MAX_BOOK_SEARCHES
  );

  const authorQueries = [...authorCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxSearches)
    .map(([author, meta]) => ({
      query: `author:"${author}"`,
      reason: `Because you completed ${meta.seedTitle}`,
      label: author,
    }));

  const remaining = maxSearches - authorQueries.length;
  const subjectQueries =
    remaining > 0
      ? [...subjectCounts.entries()]
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, remaining)
          .map(([subject, meta]) => ({
            query: subject,
            reason: `Because you enjoyed ${meta.seedTitle}`,
            label: subject,
          }))
      : [];

  // Fallback when library has books without authors/subjects
  const queries =
    authorQueries.length + subjectQueries.length > 0
      ? [...authorQueries, ...subjectQueries]
      : library
          .map((l) => mediaMap[l.mediaId])
          .filter((m): m is MediaItem => !!m && m.type === 'book')
          .slice(0, maxSearches)
          .map((m) => ({
            query: m.canonicalTitle,
            reason: `Because you completed ${m.canonicalTitle}`,
            label: m.canonicalTitle,
          }));

  if (queries.length === 0) return [];

  const items: WeeklyDigestItem[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    if (items.length >= BOOK_ITEM_CAP) break;
    try {
      const hits = await searchOpenLibrary({
        query: q.query,
        limit: MAX_RESULTS_PER_SEARCH,
      });
      for (const hit of hits) {
        if (items.length >= BOOK_ITEM_CAP) break;
        const media = catalogWorkToMediaItem(hit.work);
        media.type = 'book';
        if (hit.work.bookDetails?.authors) {
          media.authors = hit.work.bookDetails.authors;
        }
        if (libraryIds.has(media.id) || completedIds.has(media.id)) continue;
        if (seen.has(media.id)) continue;
        // Also skip by title match against completed library books
        const titleKey = media.canonicalTitle.trim().toLowerCase();
        const alreadyCompletedTitle = [...completedIds].some((id) => {
          const m = mediaMap[id];
          return m?.type === 'book' && m.canonicalTitle.trim().toLowerCase() === titleKey;
        });
        if (alreadyCompletedTitle) continue;

        seen.add(media.id);
        await putMediaItem(media);
        items.push({
          mediaId: media.id,
          title: media.canonicalTitle,
          year: media.year || 0,
          type: 'book',
          reason: q.reason,
          platforms: [],
        });
      }
    } catch (err) {
      logger.warn('[Subsume] Open Library dispatch search failed for', q.label, err);
    }
  }

  return items;
}

// ─── Schedule helpers ────────────────────────────────────────────────────────

export function minutesUntilNextDispatch(
  prefs: UserPreferences,
  now: Date = new Date()
): number {
  const weekday = prefs.dispatchWeekday ?? DEFAULT_WEEKDAY;
  const timeStr = prefs.dispatchLocalTime ?? DEFAULT_LOCAL_TIME;
  const [hourStr, minStr] = timeStr.split(':');
  const hour = Number(hourStr);
  const minute = Number(minStr);
  const targetHour = Number.isFinite(hour) ? hour : 19;
  const targetMinute = Number.isFinite(minute) ? minute : 0;

  const tz = prefs.dispatchTimezone;
  const parts = localDateParts(now, tz);
  // JS: 0=Sun … 4=Thu. Build a Date in local wall time then compare.
  const candidate = wallTimeToDate(
    parts.year,
    parts.month,
    parts.day,
    targetHour,
    targetMinute,
    tz
  );

  let dayDelta = (weekday - parts.weekday + 7) % 7;
  if (dayDelta === 0 && candidate.getTime() <= now.getTime()) {
    dayDelta = 7;
  }

  const target = wallTimeToDate(
    parts.year,
    parts.month,
    parts.day + dayDelta,
    targetHour,
    targetMinute,
    tz
  );

  const ms = target.getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / 60_000));
}

function clearAlarm(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.alarms.clear(name, () => resolve());
    } catch {
      resolve();
    }
  });
}

// ─── Date / timezone utils ───────────────────────────────────────────────────

function localDateParts(
  date: Date,
  timezone?: string
): { year: number; month: number; day: number; weekday: number } {
  if (!timezone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: date.getDay(),
    };
  }
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    });
    const bag = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value])
    ) as Record<string, string>;
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      year: Number(bag.year),
      month: Number(bag.month),
      day: Number(bag.day),
      weekday: weekdayMap[bag.weekday] ?? date.getDay(),
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: date.getDay(),
    };
  }
}

/** Approximate wall-clock Date for a local Y-M-D H:M (timezone-aware via offset probe). */
function wallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone?: string
): Date {
  // Normalize day overflow by constructing via UTC then adjusting
  const base = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  if (!timezone) {
    // Interpret as local wall time
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }
  try {
    // Find UTC instant whose local time in `timezone` matches the wall clock
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    // Start from UTC guess and refine once using observed offset
    let guess = base.getTime();
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value])
      ) as Record<string, string>;
      const asUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        0,
        0
      );
      const desired = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
      const delta = desired - asUtc;
      guess += delta;
      if (Math.abs(delta) < 60_000) break;
    }
    return new Date(guess);
  } catch {
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }
}

/** ISO-8601 week number and week-year from calendar Y-M-D. */
function isoWeekFromYmd(
  year: number,
  month: number,
  day: number
): { week: number; weekYear: number } {
  const utc = new Date(Date.UTC(year, month - 1, day));
  // Thursday in current week decides the year
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const weekYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { week, weekYear };
}
