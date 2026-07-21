import { getAllLibraryItems, getMediaItem, getAllPeople, getPreferences } from './storage';
import { WatchProfile, WatchProfileEntry, CrewRole, MediaItem, LibraryItem } from '@/shared/types';
import { resolveGenreNames } from '@/shared/genres';

// ─── In-memory cache ────────────────────────────────────────────────────────

export type TasteMedium = 'screen' | 'book' | 'all';

const profileCache = new Map<TasteMedium, { profile: WatchProfile; builtAt: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function matchesMedium(media: MediaItem, medium: TasteMedium): boolean {
  if (medium === 'all') return true;
  if (medium === 'book') return media.type === 'book';
  // screen
  return media.type === 'movie' || media.type === 'tv';
}

// ─── buildTasteProfileForMedium ──────────────────────────────────────────────

/**
 * Builds a structured WatchProfile filtered by medium.
 * - screen: movies + TV only
 * - book: books only
 * - all: everything (legacy buildWatchProfile behaviour)
 */
export async function buildTasteProfileForMedium(medium: TasteMedium): Promise<WatchProfile> {
  const cached = profileCache.get(medium);
  if (cached && Date.now() - cached.builtAt < PROFILE_CACHE_TTL) {
    return cached.profile;
  }

  const [allLibraryItems, allPeople, prefs] = await Promise.all([
    getAllLibraryItems(),
    getAllPeople(),
    getPreferences(),
  ]);

  // Completed experiences (watched / read)
  const completedItems = allLibraryItems
    .filter((l) => l.status === 'watched')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100);

  const wishlistItems = allLibraryItems
    .filter((l) => l.status === 'to-watch' || l.status === 'watching')
    .sort((a, b) => b.addedAt - a.addedAt)
    .slice(0, 15);

  type Pair = { libraryItem: LibraryItem; media: MediaItem };

  const resolvePairs = async (items: LibraryItem[]): Promise<Pair[]> => {
    const resolved = await Promise.all(
      items.map(async (libraryItem) => {
        const media = await getMediaItem(libraryItem.mediaId);
        if (!media || !matchesMedium(media, medium)) return null;
        return { libraryItem, media };
      })
    );
    return resolved.filter((p): p is Pair => p !== null);
  };

  const validPairs = await resolvePairs(completedItems);
  const validWishlist = await resolvePairs(wishlistItems);

  // Count all completed of this medium (not just the capped slice used for buckets)
  const totalCompleted = (
    await Promise.all(
      allLibraryItems
        .filter((l) => l.status === 'watched')
        .map(async (l) => {
          const media = await getMediaItem(l.mediaId);
          return media && matchesMedium(media, medium) ? 1 : 0;
        })
    )
  ).reduce((a: number, b: number) => a + b, 0);

  function toEntry(pair: Pair): WatchProfileEntry {
    const { libraryItem, media } = pair;
    const noteSource =
      libraryItem.emotionalRecall ||
      libraryItem.qualitativeNotes ||
      libraryItem.notes ||
      '';
    const excerpt = noteSource ? noteSource.slice(0, 100) : undefined;
    return {
      title: media.canonicalTitle,
      year: media.year,
      genres: media.genres,
      userRating: libraryItem.userRating ?? 0,
      noteExcerpt: libraryItem.notes ? libraryItem.notes.slice(0, 100) : excerpt,
      emotionalRecall: libraryItem.emotionalRecall
        ? libraryItem.emotionalRecall.slice(0, 200)
        : undefined,
      qualitativeExcerpt: libraryItem.qualitativeNotes
        ? libraryItem.qualitativeNotes.slice(0, 150)
        : undefined,
    };
  }

  const topRatedRaw = validPairs
    .filter((p) => p.libraryItem.userRating !== undefined && p.libraryItem.userRating >= 8)
    .sort((a, b) => {
      const ratingDiff = (b.libraryItem.userRating ?? 0) - (a.libraryItem.userRating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return b.media.year - a.media.year;
    })
    .slice(0, 20);

  const likedRaw = validPairs
    .filter(
      (p) =>
        p.libraryItem.userRating !== undefined &&
        p.libraryItem.userRating >= 6 &&
        p.libraryItem.userRating <= 7
    )
    .slice(0, 15);

  const dislikedRaw = validPairs
    .filter((p) => p.libraryItem.userRating !== undefined && p.libraryItem.userRating <= 4)
    .slice(0, 10);

  const unratedRaw = validPairs
    .filter((p) => p.libraryItem.userRating === undefined)
    .slice(0, 10);

  const topRated = topRatedRaw.map(toEntry);
  const liked = likedRaw.map(toEntry);
  const disliked = dislikedRaw.map(toEntry);
  const unrated = unratedRaw.map(toEntry);

  const wishlist = validWishlist.map((pair) => ({
    title: pair.media.canonicalTitle,
    year: pair.media.year,
    genres: pair.media.genres,
    userRating: pair.libraryItem.userRating ?? 0,
    noteExcerpt: pair.libraryItem.emotionalRecall?.slice(0, 100),
  }));

  // Followed creators — for book medium prefer authors (writer role + openlibrary ids)
  const followedCreators = allPeople
    .filter((p) => {
      if (medium === 'book') {
        return p.role === 'writer' || p.id.startsWith('openlibrary_author_');
      }
      if (medium === 'screen') {
        return !p.id.startsWith('openlibrary_author_');
      }
      return true;
    })
    .slice(0, 10)
    .map((p) => ({ name: p.name, role: p.role as CrewRole }));

  let favoriteGenres: string[] = resolveGenreNames(prefs.favoriteGenres || []);
  if (medium === 'book') {
    // Prefer subjects derived from top-rated books over screen genre prefs
    favoriteGenres = [];
  }
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
    totalWatched: totalCompleted,
    wishlist,
  };

  profileCache.set(medium, { profile, builtAt: Date.now() });
  return profile;
}

// ─── buildWatchProfile ───────────────────────────────────────────────────────

/**
 * Builds a structured WatchProfile from the user's library and followed people.
 * Results are cached for PROFILE_CACHE_TTL ms to avoid redundant IDB reads
 * across rapid GET_PERSONALIZED_RECS calls.
 */
export async function buildWatchProfile(): Promise<WatchProfile> {
  return buildTasteProfileForMedium('all');
}

// ─── invalidateProfileCache ─────────────────────────────────────────────────

/**
 * Clears the in-memory WatchProfile cache.
 * Must be called whenever a library item is added or updated so that the
 * next getPersonalizedRecommendations call rebuilds from fresh IDB data.
 */
export function invalidateProfileCache(): void {
  profileCache.clear();
}
