import { MediaItem, MediaType } from '@/shared/types';
import { getPreferences, searchMediaByQuery } from './storage';
import { searchTvMazeMulti } from './tvmaze';
import { searchTrakt } from './trakt';
import { searchTitles, setTmdbApiKey } from './tmdb';
import { mergeMediaItems } from './mediaMerge';

const MAX_RESULTS = 20;

function normalizeKey(item: MediaItem): string {
  return `${item.canonicalTitle.toLowerCase().trim()}|${item.year}|${item.type}`;
}

function scoreRichness(item: MediaItem): number {
  let score = 0;
  if (item.posterUrl) score += 2;
  if (item.overview) score += 1;
  if (item.id.startsWith('tmdb_')) score += 3;
  if (item.id.startsWith('seed_') || item.id.startsWith('tvmaze_')) score += 1;
  return score;
}

function mergeResults(items: MediaItem[]): MediaItem[] {
  const map = new Map<string, MediaItem>();
  for (const item of items) {
    const key = normalizeKey(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const richer = scoreRichness(item) >= scoreRichness(existing) ? item : existing;
      const poorer = richer === item ? existing : item;
      // mergeMediaItems(incoming, existing) — existing is the enriched base
      map.set(key, mergeMediaItems(poorer, richer));
    }
  }
  return Array.from(map.values());
}

function rankResults(items: MediaItem[], query: string): MediaItem[] {
  const lowerQuery = query.toLowerCase();
  return [...items].sort((a, b) => {
    const aTitle = a.canonicalTitle.toLowerCase();
    const bTitle = b.canonicalTitle.toLowerCase();

    const aExact = aTitle === lowerQuery ? 1 : 0;
    const bExact = bTitle === lowerQuery ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;

    const aStarts = aTitle.startsWith(lowerQuery) ? 1 : 0;
    const bStarts = bTitle.startsWith(lowerQuery) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    return scoreRichness(b) - scoreRichness(a);
  });
}

/**
 * Search free data sources in parallel for discovery without requiring a TMDb key.
 * TVmaze, local IndexedDB/seed data, and Trakt are always queried; TMDb is added when configured.
 */
export async function discoverySearch(query: string, type?: MediaType): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const prefs = await getPreferences();
  const hasTmdbKey = Boolean(prefs.tmdbApiKey?.trim());
  if (hasTmdbKey) {
    setTmdbApiKey(prefs.tmdbApiKey!);
  }

  const tasks: Promise<MediaItem[]>[] = [
    searchMediaByQuery(trimmed, type, 10),
    searchTvMazeMulti(trimmed)
      .then((items) => (type ? items.filter((item) => item.type === type) : items))
      .catch(() => []),
    searchTrakt(trimmed, type).catch(() => []),
  ];

  if (hasTmdbKey) {
    tasks.push(searchTitles(trimmed, type).catch(() => []));
  }

  const settled = await Promise.allSettled(tasks);
  const allItems: MediaItem[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  return rankResults(mergeResults(allItems), trimmed).slice(0, MAX_RESULTS);
}