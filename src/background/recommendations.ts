import { LibraryItem, MediaItem, Recommendation } from '@/shared/types';
import { getAllLibraryItems, getAllMediaMap } from './storage';

/**
 * Generates rule-based recommendations from the user's local library.
 * 
 * Logic:
 * 1. Only consider items currently 'to-watch'.
 * 2. Analyze the user's 'watched' items to find their favorite genres.
 * 3. Score the 'to-watch' items based on genre match, TMDb rating, and recency.
 */
export async function generateRuleBasedRecommendations(
  basedOnMediaId?: string
): Promise<Recommendation[]> {
  const library = await getAllLibraryItems();
  const mediaIds = library.map((l) => l.mediaId);
  const mediaMap = await getAllMediaMap(mediaIds);

  const watched = library.filter((l) => l.status === 'watched');
  const toWatch = library.filter((l) => l.status === 'to-watch');

  if (toWatch.length === 0) return [];

  // Step 1: Analyze user's favorite genres based on watched history
  // If no watched history, fallback to all genres being equal.
  const genreTally: Record<string, number> = {};
  for (const item of watched) {
    const media = mediaMap[item.mediaId];
    if (!media) continue;

    // Weight highly-rated items more
    const weight = item.userRating ? (item.userRating / 10) * 2 : 1;
    for (const genre of media.genres) {
      genreTally[genre] = (genreTally[genre] || 0) + weight;
    }
  }

  // Find max tally for normalization
  const maxTally = Math.max(...Object.values(genreTally), 1);

  // Step 2: Score to-watch items
  type ScoredItem = { mediaId: string; score: number; reasons: string[] };
  const scoredItems: ScoredItem[] = [];

  for (const item of toWatch) {
    const media = mediaMap[item.mediaId];
    if (!media) continue;

    let score = 0;
    const reasons: string[] = [];

    // Genre score (0 to 10)
    let genreScore = 0;
    for (const genre of media.genres) {
      if (genreTally[genre]) {
        genreScore += (genreTally[genre] / maxTally) * 5;
      }
    }
    // Cap genre score
    if (genreScore > 10) genreScore = 10;
    score += genreScore;

    if (genreScore > 5) {
      reasons.push('Matches your favorite genres');
    }

    // Rating score (0 to 10)
    const tmdbRating = media.ratings.find((r) => r.provider === 'tmdb');
    if (tmdbRating && tmdbRating.score > 7) {
      score += tmdbRating.score; // Add full score (e.g., 8.5)
      reasons.push(`Highly rated (${tmdbRating.score}/10)`);
    } else if (tmdbRating) {
      score += tmdbRating.score * 0.5; // less weight for mediocre ratings
    }

    // Similarity bonus
    if (basedOnMediaId) {
      const baseMedia = mediaMap[basedOnMediaId];
      if (baseMedia) {
        // Shared genres
        const shared = media.genres.filter((g) => baseMedia.genres.includes(g));
        if (shared.length > 0) {
          score += shared.length * 2;
          reasons.push(`Because you just watched ${baseMedia.canonicalTitle}`);
        }
      }
    }

    scoredItems.push({ mediaId: item.mediaId, score, reasons });
  }

  // Step 3: Sort by descending score
  scoredItems.sort((a, b) => b.score - a.score);

  // Return top 10
  return scoredItems.slice(0, 10).map((si) => ({
    mediaId: si.mediaId,
    explanation: si.reasons.join(' • ') || 'A great title in your watchlist',
  }));
}
