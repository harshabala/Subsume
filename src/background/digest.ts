import {
  UserPreferences,
  MediaItem,
  WatchProfile,
  WeeklyDigest,
  WeeklyDigestItem,
} from '@/shared/types';
import { resolveGenreNames, genresMatch } from '@/shared/genres';
import { getLatestReleases } from './tmdb';
import { buildWatchProfile } from './context';
import { getAllLibraryItems } from './storage';
import { callLLMProvider } from './llm';
import { getEffectivePrompt, buildTasteProfilePayload } from '@/shared/prompts';

const DIGEST_STALE_MS = 7 * 24 * 60 * 60 * 1000;
const RULE_BASED_COUNT = 12;
const LLM_MIN_COUNT = 15;
const LLM_MAX_COUNT = 20;
const RECENT_DAYS = 7;

function getTmdbRating(item: MediaItem): number {
  return item.ratings.find((r) => r.provider === 'tmdb')?.score ?? 0;
}

function getPlatformNames(item: MediaItem): string[] {
  return (item.streamingAvailability || []).map((s) => s.platform);
}

function mediaToDigestItem(item: MediaItem, reason: string): WeeklyDigestItem {
  return {
    mediaId: item.id,
    title: item.canonicalTitle,
    year: item.year,
    type: item.type,
    reason,
    platforms: getPlatformNames(item),
  };
}

function buildDigestPrompt(profile: WatchProfile, releases: MediaItem[], prefs: UserPreferences): string {
  const releaseLines = releases
    .slice(0, 40)
    .map(
      (r) =>
        `- ${r.canonicalTitle} (${r.year}) [${r.type}] genres: ${r.genres.join(', ') || 'unknown'}`
    )
    .join('\n');

  const tasteJson = JSON.stringify(buildTasteProfilePayload(profile), null, 2);

  return [
    getEffectivePrompt('curatorSystem', prefs),
    '',
    'TASTE PROFILE (JSON):',
    tasteJson,
    '',
    'New releases from the past 7 days (pick ONLY from this list):',
    releaseLines,
    '',
    'TASK:',
    getEffectivePrompt('digest', prefs),
  ].join('\n');
}

function findReleaseMatch(
  releases: MediaItem[],
  title: string,
  year?: number,
  type?: 'movie' | 'tv'
): MediaItem | undefined {
  const normalized = title.trim().toLowerCase();
  return releases.find((r) => {
    const titleMatch = r.canonicalTitle.toLowerCase() === normalized;
    const yearMatch = !year || r.year === year;
    const typeMatch = !type || r.type === type;
    return titleMatch && yearMatch && typeMatch;
  });
}

export async function resolveDigestItem(
  raw: { title: string; year?: number; type?: 'movie' | 'tv'; reason: string },
  releases: MediaItem[]
): Promise<WeeklyDigestItem | null> {
  const reason = raw.reason?.trim() || 'A strong match for your taste this week.';
  const type = raw.type ?? 'movie';
  const year = raw.year ?? 0;

  const fromReleases = findReleaseMatch(releases, raw.title, year || undefined, type);
  if (!fromReleases) {
    return null;
  }

  return mediaToDigestItem(fromReleases, reason);
}

async function generateLLMDigest(
  prefs: UserPreferences,
  releases: MediaItem[]
): Promise<WeeklyDigestItem[]> {
  const profile = await buildWatchProfile();
  const prompt = buildDigestPrompt(profile, releases, prefs);
  const rawText = await callLLMProvider(prompt, prefs);
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  let parsed: Array<{
    title: string;
    year?: number;
    type?: 'movie' | 'tv';
    reason?: string;
  }>;

  try {
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  } catch (parseErr) {
    console.error('[Subsume] Failed to parse digest JSON:', parseErr, 'Raw:', rawText);
    return [];
  }

  const resolved = await Promise.all(
    parsed
      .filter((item) => item.title?.trim())
      .slice(0, LLM_MAX_COUNT)
      .map((item) =>
        resolveDigestItem(
          {
            title: item.title,
            year: item.year,
            type: item.type,
            reason: item.reason || 'Recommended based on your watch profile.',
          },
          releases
        )
      )
  );

  const seen = new Set<string>();
  const unique: WeeklyDigestItem[] = [];
  for (const item of resolved) {
    if (!item || seen.has(item.mediaId)) continue;
    seen.add(item.mediaId);
    unique.push(item);
    if (unique.length >= LLM_MAX_COUNT) break;
  }

  return unique;
}

export function generateRuleBasedDigest(
  prefs: UserPreferences,
  releases: MediaItem[]
): WeeklyDigestItem[] {
  const favoriteGenreNames = resolveGenreNames(prefs.favoriteGenres || []);
  let candidates = releases;

  if (favoriteGenreNames.length > 0) {
    const genreMatches = releases.filter((r) =>
      r.genres.some((g) => favoriteGenreNames.some((fav) => genresMatch(fav, g)))
    );
    if (genreMatches.length > 0) {
      candidates = genreMatches;
    }
  }

  const sorted = [...candidates].sort((a, b) => getTmdbRating(b) - getTmdbRating(a));

  return sorted.slice(0, RULE_BASED_COUNT).map((item) => {
    const matchedGenre = item.genres.find((g) =>
      favoriteGenreNames.some((fav) => genresMatch(fav, g))
    );
    const rating = getTmdbRating(item);
    const reason = matchedGenre
      ? `Highly rated ${matchedGenre} release (${rating.toFixed(1)} on TMDb) matching your favorite genres.`
      : `Top-rated new release this week (${rating.toFixed(1)} on TMDb).`;
    return mediaToDigestItem(item, reason);
  });
}

export function isDigestStale(digest: WeeklyDigest | undefined): boolean {
  if (!digest) return true;
  return Date.now() - digest.generatedAt > DIGEST_STALE_MS;
}

export async function generateWeeklyDigest(prefs: UserPreferences): Promise<WeeklyDigest> {
  const [movies, tv] = await Promise.all([
    getLatestReleases('movie', prefs, RECENT_DAYS),
    getLatestReleases('tv', prefs, RECENT_DAYS),
  ]);
  const releases = [...movies, ...tv];

  const library = await getAllLibraryItems();
  const watchedCount = library.filter((l) => l.status === 'watched').length;
  const hasLLM = prefs.llmEnabled && !!prefs.llmApiKey;

  let items: WeeklyDigestItem[] = [];
  let llmGenerated = false;

  if (hasLLM && watchedCount >= 3 && releases.length > 0) {
    try {
      const llmItems = await generateLLMDigest(prefs, releases);
      if (llmItems.length >= LLM_MIN_COUNT) {
        items = llmItems;
        llmGenerated = true;
      } else if (llmItems.length > 0) {
        items = llmItems;
        llmGenerated = true;
      }
    } catch (err) {
      console.error('[Subsume] LLM digest failed, falling back to rule-based:', err);
    }
  }

  if (!llmGenerated) {
    items = generateRuleBasedDigest(prefs, releases);
  }

  return {
    generatedAt: Date.now(),
    items,
    llmGenerated,
  };
}