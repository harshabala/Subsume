import { getAllLibraryItems, getMediaItem, getAllPeople, getPreferences } from './storage';
import { WatchProfile, WatchProfileEntry, CrewRole } from '@/shared/types';
import { resolveGenreNames } from '@/shared/genres';

// ─── In-memory cache ────────────────────────────────────────────────────────

let profileCache: WatchProfile | null = null;
let profileCacheBuiltAt: number = 0;
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── buildWatchProfile ───────────────────────────────────────────────────────

/**
 * Builds a structured WatchProfile from the user's library and followed people.
 * Results are cached for PROFILE_CACHE_TTL ms to avoid redundant IDB reads
 * across rapid GET_PERSONALIZED_RECS calls.
 */
export async function buildWatchProfile(): Promise<WatchProfile> {
  // Return cached profile if still fresh
  if (profileCache !== null && Date.now() - profileCacheBuiltAt < PROFILE_CACHE_TTL) {
    return profileCache;
  }

  // Fetch all data in parallel
  const [allLibraryItems, allPeople, prefs] = await Promise.all([
    getAllLibraryItems(),
    getAllPeople(),
    getPreferences(),
  ]);

  // Separate watched items (cap at 100 for IDB fetches)
  const watchedItems = allLibraryItems
    .filter(l => l.status === 'watched')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100);

  const totalWatched = allLibraryItems.filter(l => l.status === 'watched').length;

  // Resolve MediaItems for all watched library items
  const resolvedPairs = await Promise.all(
    watchedItems.map(async (libraryItem) => {
      const media = await getMediaItem(libraryItem.mediaId);
      if (!media) return null;
      return { libraryItem, media };
    })
  );

  const validPairs = resolvedPairs.filter(
    (p): p is { libraryItem: NonNullable<typeof watchedItems[0]>; media: NonNullable<Awaited<ReturnType<typeof getMediaItem>>> } => p !== null
  );

  // Build WatchProfileEntry from each pair
  function toEntry(pair: typeof validPairs[0]): WatchProfileEntry {
    const { libraryItem, media } = pair;
    return {
      title: media.canonicalTitle,
      year: media.year,
      genres: media.genres,
      userRating: libraryItem.userRating ?? 0,
      noteExcerpt: libraryItem.notes ? libraryItem.notes.slice(0, 100) : undefined,
    };
  }

  // Bucket into rating tiers
  const topRatedRaw = validPairs
    .filter(p => p.libraryItem.userRating !== undefined && p.libraryItem.userRating >= 8)
    .sort((a, b) => {
      const ratingDiff = (b.libraryItem.userRating ?? 0) - (a.libraryItem.userRating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return b.media.year - a.media.year;
    })
    .slice(0, 20);

  const likedRaw = validPairs
    .filter(p => p.libraryItem.userRating !== undefined && p.libraryItem.userRating >= 6 && p.libraryItem.userRating <= 7)
    .slice(0, 15);

  const dislikedRaw = validPairs
    .filter(p => p.libraryItem.userRating !== undefined && p.libraryItem.userRating <= 4)
    .slice(0, 10);

  const unratedRaw = validPairs
    .filter(p => p.libraryItem.userRating === undefined)
    .slice(0, 10);

  const topRated = topRatedRaw.map(toEntry);
  const liked = likedRaw.map(toEntry);
  const disliked = dislikedRaw.map(toEntry);
  const unrated = unratedRaw.map(toEntry);

  // Followed creators — cap at 10
  const followedCreators = allPeople
    .slice(0, 10)
    .map(p => ({ name: p.name, role: p.role as CrewRole }));

  // Favorite genres — use preferences or derive from topRated
  let favoriteGenres: string[] = resolveGenreNames(prefs.favoriteGenres || []);
  if (favoriteGenres.length === 0 && topRated.length > 0) {
    const genreCount: Record<string, number> = {};
    for (const entry of topRated) {
      for (const genre of entry.genres) {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      }
    }
    favoriteGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
  }

  const profile: WatchProfile = {
    topRated,
    liked,
    disliked,
    unrated,
    followedCreators,
    favoriteGenres,
    totalWatched,
  };

  profileCache = profile;
  profileCacheBuiltAt = Date.now();

  return profile;
}

// ─── invalidateProfileCache ─────────────────────────────────────────────────

/**
 * Clears the in-memory WatchProfile cache.
 * Must be called whenever a library item is added or updated so that the
 * next getPersonalizedRecommendations call rebuilds from fresh IDB data.
 */
export function invalidateProfileCache(): void {
  profileCache = null;
}
