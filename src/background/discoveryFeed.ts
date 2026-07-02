import { DiscoveryFeed, DiscoveryFeedItem, MediaType, WeeklyDigest } from '@/shared/types';
import { getTraktTrending } from './trakt';
import { fetchTvMazePremieres } from './tvmaze';
import { fetchWikipediaSummary } from './wikidata';

const CACHE = new Map<string, { data: DiscoveryFeed; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const ENRICH_COUNT = 5;
const TRENDING_LIMIT = 10;
const PREMIERE_LIMIT = 12;

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function dedupeKey(title: string, type: MediaType): string {
  return `${type}:${normalizeTitle(title)}`;
}

function formatPremiereReason(
  title: string,
  airdate: string,
  isSeriesPremiere: boolean,
  isSeasonPremiere: boolean,
  season: number
): string {
  const formattedDate = new Date(`${airdate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (isSeriesPremiere) {
    return `Series premiere: ${title} debuts ${formattedDate}`;
  }
  if (isSeasonPremiere) {
    return `Season ${season} premiere airing ${formattedDate}`;
  }
  return `New episode premieres ${formattedDate}`;
}

function trendingToFeedItem(
  entry: { title: string; year: number; traktSlug: string; watchers: number },
  type: MediaType
): DiscoveryFeedItem {
  const path = type === 'tv' ? 'shows' : 'movies';
  return {
    id: `discovery_trakt_${type}_${entry.traktSlug}`,
    title: entry.title,
    year: entry.year,
    type,
    source: 'trakt',
    reason: `${entry.watchers.toLocaleString()} watchers trending on Trakt this week`,
    url: `https://trakt.tv/${path}/${entry.traktSlug}`,
  };
}

function premiereToFeedItem(
  premiere: Awaited<ReturnType<typeof fetchTvMazePremieres>>[number]
): DiscoveryFeedItem {
  return {
    id: `discovery_tvmaze_tv_${premiere.showId}`,
    title: premiere.title,
    year: premiere.year,
    type: 'tv',
    source: 'tvmaze',
    reason: formatPremiereReason(
      premiere.title,
      premiere.airdate,
      premiere.isSeriesPremiere,
      premiere.isSeasonPremiere,
      premiere.season
    ),
    posterUrl: premiere.posterUrl,
    rating: premiere.rating,
    url: premiere.url,
  };
}

async function enrichTopItems(items: DiscoveryFeedItem[]): Promise<DiscoveryFeedItem[]> {
  const topItems = items.slice(0, ENRICH_COUNT);
  const enriched = await Promise.all(
    topItems.map(async (item) => {
      const summary = await fetchWikipediaSummary(item.title, item.year);
      if (!summary) return item;
      return {
        ...item,
        reason: summary.length > 180 ? `${summary.slice(0, 177)}…` : summary,
        source: 'wikidata' as const,
      };
    })
  );

  return [...enriched, ...items.slice(ENRICH_COUNT)];
}

export async function generateDiscoveryFeed(options?: {
  enrichSummaries?: boolean;
}): Promise<DiscoveryFeed> {
  const enrichSummaries = options?.enrichSummaries ?? true;

  const [movieTrending, tvTrending, premieres] = await Promise.all([
    getTraktTrending('movie', TRENDING_LIMIT),
    getTraktTrending('tv', TRENDING_LIMIT),
    fetchTvMazePremieres(7),
  ]);

  const seen = new Set<string>();
  const items: DiscoveryFeedItem[] = [];

  for (const premiere of premieres.slice(0, PREMIERE_LIMIT)) {
    const key = dedupeKey(premiere.title, 'tv');
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(premiereToFeedItem(premiere));
  }

  for (const entry of movieTrending) {
    const key = dedupeKey(entry.title, 'movie');
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trendingToFeedItem(entry, 'movie'));
  }

  for (const entry of tvTrending) {
    const key = dedupeKey(entry.title, 'tv');
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trendingToFeedItem(entry, 'tv'));
  }

  const feedItems = enrichSummaries ? await enrichTopItems(items) : items;

  return {
    generatedAt: Date.now(),
    items: feedItems,
    trendingCount: movieTrending.length + tvTrending.length,
    premiereCount: premieres.length,
  };
}

export function isDiscoveryFeedStale(feed: DiscoveryFeed | undefined): boolean {
  if (!feed) return true;
  return Date.now() - feed.generatedAt > CACHE_TTL;
}

export async function getDiscoveryFeed(force = false): Promise<DiscoveryFeed> {
  const cacheKey = 'discovery_feed';
  const cached = CACHE.get(cacheKey);

  if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const feed = await generateDiscoveryFeed();
  CACHE.set(cacheKey, { data: feed, timestamp: Date.now() });
  return feed;
}

export function __clearDiscoveryFeedCache(): void {
  CACHE.clear();
}

export function discoveryFeedToWeeklyDigest(feed: DiscoveryFeed): WeeklyDigest {
  return {
    generatedAt: feed.generatedAt,
    llmGenerated: false,
    items: feed.items.slice(0, 12).map((item) => ({
      mediaId: item.id,
      title: item.title,
      year: item.year,
      type: item.type,
      reason: item.reason,
      platforms: [],
    })),
  };
}