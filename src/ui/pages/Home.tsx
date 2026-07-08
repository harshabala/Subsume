import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  MediaItem,
  MediaType,
  LibraryItem,
  Recommendation,
  UserPreferences,
  WeeklyDigest,
  WeeklyDigestItem,
  DiscoveryFeed,
  DiscoveryFeedItem,
} from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { SanctuaryMediaCard } from '../components/SanctuaryMediaCard';
import { DiscoveryFeedCard } from '../components/DiscoveryFeedCard';
import { PlatformChips } from '../components/PlatformChips';
import { EmotionalWeatherChart } from '../components/EmotionalWeatherChart';
import { getEmotionalSpectrum, hasEmotionalData } from '@/shared/emotions';
import { getPlatformNameById } from '@/shared/platforms';
import '../styles/discovery-search.css';
import '../styles/discovery-layout.css';
import { ensureDemoLibraryIfEmpty } from '../lib/ensureDemoLibrary';
import { getReflectionExcerpt } from '../components/archive/constants';
import { truncateForExcerpt } from '@/shared/textTruncate';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

interface DigestPick extends WeeklyDigestItem {
  media?: MediaItem;
}

interface HomeProps {
  onNavigate: (page: 'library' | 'recommendations' | 'new-releases') => void;
  onOpenCapture?: (mediaId: string) => void;
}

function pickRating(media: MediaItem): string | null {
  const imdb = media.ratings.find((r) => r.provider === 'imdb');
  if (imdb) return `IMDb ${imdb.score}/10`;
  const tmdb = media.ratings.find((r) => r.provider === 'tmdb');
  if (tmdb) return `TMDb ${tmdb.score.toFixed(1)}`;
  return null;
}

function platformsToAvailability(platforms: string[]) {
  return platforms.map((platform) => ({ region: '', platform }));
}

function pickSynopsisForMedia(
  media: MediaItem,
  items: JoinedItem[],
  fallback: string | undefined
): string | undefined {
  const match = items.find(({ media: m }) => m.id === media.id);
  const reflection = match ? getReflectionExcerpt(match.library) : undefined;
  if (reflection) return truncateForExcerpt(reflection);
  return fallback;
}

function feedItemToDigestPick(item: DiscoveryFeedItem): DigestPick {
  return {
    mediaId: item.id,
    title: item.title,
    year: item.year,
    type: item.type,
    reason: item.reason,
    platforms: [],
    media: {
      id: item.id,
      canonicalTitle: item.title,
      type: item.type,
      year: item.year,
      genres: [],
      ratings: item.rating ? [{ provider: 'tvmaze', score: item.rating, votes: 0 }] : [],
      providers: item.url ? [{ provider: item.source === 'trakt' ? 'trakt' : 'tvmaze', externalId: item.id, url: item.url }] : [],
      posterUrl: item.posterUrl || '',
      overview: item.reason,
    },
  };
}

const DISCOVERY_TYPE_FILTERS: { value: MediaType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Series' },
];

const SEARCH_DEBOUNCE_MS = 350;

interface CataloguePulseItem {
  id: string;
  label: string;
  value: number | string;
  onClick?: () => void;
}

function DiscoveryCataloguePulse({ items }: { items: CataloguePulseItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="discovery-catalogue-pulse" aria-label="Your catalogue at a glance">
      {items.map((item) => (
        <li key={item.id} style={{ display: 'contents' }}>
          {item.onClick ? (
            <button type="button" className="discovery-pulse-item" onClick={item.onClick}>
              <span className="discovery-pulse-value">{item.value}</span>
              <span className="discovery-pulse-label">{item.label}</span>
            </button>
          ) : (
            <div className="discovery-pulse-item discovery-pulse-item--static">
              <span className="discovery-pulse-value">{item.value}</span>
              <span className="discovery-pulse-label">{item.label}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Home({ onNavigate, onOpenCapture }: HomeProps) {
  const [loading, setLoading] = useState(true);
  const [refreshingDigest, setRefreshingDigest] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);
  const [watchedCount, setWatchedCount] = useState(0);
  const [toWatchCount, setToWatchCount] = useState(0);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [weeklyPicks, setWeeklyPicks] = useState<DigestPick[]>([]);
  const [usingFreeFeed, setUsingFreeFeed] = useState(false);
  const [discoveryFeed, setDiscoveryFeed] = useState<DiscoveryFeed | null>(null);
  const [feedCount, setFeedCount] = useState(0);
  const [picks, setPicks] = useState<(Recommendation & { media: MediaItem })[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<MediaType | ''>('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<JoinedItem[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedSectionRef = useRef<HTMLElement | null>(null);

  const hydrateDigestPicks = async (digest: WeeklyDigest) => {
    const items = digest.items.slice(0, 12);
    if (items.length === 0) {
      setWeeklyPicks([]);
      return;
    }

    const mediaRes = await sendMessage<any, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, {
      mediaIds: items.map((item) => item.mediaId),
    });

    const mediaMap = new Map((mediaRes.data || []).map((m) => [m.id, m]));
    setWeeklyPicks(
      items.map((item) => ({
        ...item,
        media: mediaMap.get(item.mediaId),
      }))
    );
  };

  const applyDiscoveryFeedFallback = (feed: DiscoveryFeed) => {
    setDiscoveryFeed(feed);
    setFeedCount(feed.items.length);
    setUsingFreeFeed(true);
    setWeeklyDigest(null);
    setWeeklyPicks(feed.items.slice(0, 12).map(feedItemToDigestPick));
  };

  const loadDiscoveryFeed = async (force = false) => {
    setFeedError(null);
    try {
      const feedRes = await sendMessage<{ force?: boolean }, DiscoveryFeed>(
        MessageType.GET_DISCOVERY_FEED,
        { force }
      );
      if (feedRes.success && feedRes.data) {
        setDiscoveryFeed(feedRes.data);
        setFeedCount(feedRes.data.items.length);
        if (feedRes.data.items.length === 0) {
          setFeedError('Discovery feed returned no items. Check your connection and try refreshing.');
        }
        return feedRes.data;
      }
      setFeedError('Could not load the discovery feed.');
    } catch (err) {
      console.error('[Subsume] Discovery feed failed', err);
      setFeedError(err instanceof Error ? err.message : 'Discovery feed failed to load.');
    }
    return null;
  };

  const loadWeeklyDigest = async () => {
    const digestRes = await sendMessage<{}, WeeklyDigest>(MessageType.GET_WEEKLY_DIGEST, {});
    if (digestRes.success && digestRes.data && digestRes.data.items.length > 0) {
      setWeeklyDigest(digestRes.data);
      setUsingFreeFeed(false);
      await hydrateDigestPicks(digestRes.data);
      return;
    }

    const feed = await loadDiscoveryFeed();
    if (feed && feed.items.length > 0) {
      applyDiscoveryFeedFallback(feed);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [prefsResult, digestResult, recsResult, feedResult] = await Promise.allSettled([
          sendMessage<{}, UserPreferences>(MessageType.GET_PREFERENCES, {}),
          sendMessage<{}, WeeklyDigest>(MessageType.GET_WEEKLY_DIGEST, {}),
          sendMessage<any, Recommendation[]>(MessageType.GET_RECOMMENDATIONS, {}),
          sendMessage<{ force?: boolean }, DiscoveryFeed>(MessageType.GET_DISCOVERY_FEED, {}),
        ]);

        const prefsRes = prefsResult.status === 'fulfilled' ? prefsResult.value : null;
        const digestRes = digestResult.status === 'fulfilled' ? digestResult.value : null;
        const recsRes = recsResult.status === 'fulfilled' ? recsResult.value : null;
        const feedRes = feedResult.status === 'fulfilled' ? feedResult.value : null;

        if (digestResult.status === 'rejected') {
          console.error('[Subsume] Weekly digest load failed', digestResult.reason);
        }
        if (feedResult.status === 'rejected') {
          console.error('[Subsume] Discovery feed load failed', feedResult.reason);
          setFeedError(
            feedResult.reason instanceof Error
              ? feedResult.reason.message
              : 'Discovery feed failed to load.'
          );
        }

        const libraryItems = await ensureDemoLibraryIfEmpty();

        if (prefsRes?.success && prefsRes.data) setPrefs(prefsRes.data);

        setLibraryItems(libraryItems);
        setLibraryCount(libraryItems.length);
        setWatchedCount(libraryItems.filter((i) => i.library.status === 'watched').length);
        setToWatchCount(libraryItems.filter((i) => i.library.status === 'to-watch').length);

        if (feedRes?.success && feedRes.data) {
          setDiscoveryFeed(feedRes.data);
          setFeedCount(feedRes.data.items.length);
        }

        if (digestRes?.success && digestRes.data && digestRes.data.items.length > 0) {
          setWeeklyDigest(digestRes.data);
          setUsingFreeFeed(false);
          await hydrateDigestPicks(digestRes.data);
        } else if (feedRes?.success && feedRes.data && feedRes.data.items.length > 0) {
          applyDiscoveryFeedFallback(feedRes.data);
        } else if (!feedRes?.success || !feedRes.data?.items.length) {
          setFeedError('Discovery feed is empty. Refresh to pull trending titles from Trakt and TVmaze.');
        }

        const recData = recsRes?.data || [];
        if (recData.length > 0 && !('seedTitle' in recData[0])) {
          const mediaIds = (recData as Recommendation[]).map((r) => r.mediaId).slice(0, 6);
          const mediaRes = await sendMessage<any, MediaItem[]>(MessageType.GET_MEDIA_ITEMS, { mediaIds });
          if (mediaRes.data) {
            const mediaMap = new Map(mediaRes.data.map((m) => [m.id, m]));
            const hydrated = (recData as Recommendation[])
              .map((r) => ({ ...r, media: mediaMap.get(r.mediaId)! }))
              .filter((r) => r.media)
              .slice(0, 6);
            setPicks(hydrated);
          }
        }
      } catch (err) {
        console.error('[Subsume] Failed to load home dashboard', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setSearchActive(false);
      return;
    }

    setSearchActive(true);
    setSearchLoading(true);
    setSearchError(null);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await sendMessage<
          { query: string; type?: MediaType },
          MediaItem[]
        >(MessageType.DISCOVERY_SEARCH, {
          query: trimmed,
          type: searchType || undefined,
        });
        setSearchResults(res.data ?? []);
      } catch (err) {
        console.error('[Subsume] Discovery search failed', err);
        setSearchResults([]);
        setSearchError(err instanceof Error ? err.message : 'Search failed. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, searchType]);

  const handleRefreshDigest = async () => {
    setRefreshingDigest(true);
    try {
      const [digestRes, feedRes] = await Promise.all([
        sendMessage<{}, WeeklyDigest>(MessageType.REGENERATE_WEEKLY_DIGEST, {}),
        sendMessage<{ force?: boolean }, DiscoveryFeed>(MessageType.GET_DISCOVERY_FEED, { force: true }),
      ]);

      if (feedRes.success && feedRes.data) {
        setDiscoveryFeed(feedRes.data);
        setFeedCount(feedRes.data.items.length);
      }

      if (digestRes.success && digestRes.data && digestRes.data.items.length > 0) {
        setWeeklyDigest(digestRes.data);
        setUsingFreeFeed(false);
        await hydrateDigestPicks(digestRes.data);
      } else if (feedRes.success && feedRes.data && feedRes.data.items.length > 0) {
        applyDiscoveryFeedFallback(feedRes.data);
      }
    } catch (err) {
      console.error('[Subsume] Failed to refresh weekly digest', err);
      setFeedError(err instanceof Error ? err.message : 'Failed to refresh programme.');
    } finally {
      setRefreshingDigest(false);
    }
  };

  const handleAdd = async (media: MediaItem) => {
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds((prev) => new Set(prev).add(media.id));
      setLibraryCount((c) => c + 1);
      setToWatchCount((c) => c + 1);
    } catch (err) {
      console.error('Failed to add to library', err);
    }
  };

  const platformNames = (prefs?.platforms || [])
    .map((id) => getPlatformNameById(id))
    .filter(Boolean)
    .join(', ');

  const digestBadge = weeklyDigest?.llmGenerated ? 'Personally Curated' : 'Editorial Selection';

  const heroFromFeed = discoveryFeed?.items[0]
    ? feedItemToDigestPick(discoveryFeed.items[0]).media
    : null;
  const heroMedia =
    weeklyPicks.find((p) => p.media)?.media ||
    picks[0]?.media ||
    heroFromFeed ||
    null;
  const heroTitle = heroMedia?.canonicalTitle || 'Your cinematic sanctuary awaits';
  const heroDirector = heroMedia?.wikidataDirectorBio || 'Acquire a title to begin reflecting';
  const heroRating = heroMedia ? pickRating(heroMedia) : null;
  const heroLibraryMatch = libraryItems.find(({ media }) => media.id === heroMedia?.id);
  const heroReflection = heroLibraryMatch
    ? getReflectionExcerpt(heroLibraryMatch.library)
    : undefined;
  const heroIsReflection = Boolean(heroReflection);
  const heroQuote = heroReflection
    ? truncateForExcerpt(heroReflection)
    : heroMedia?.overview
      ? truncateForExcerpt(heroMedia.overview)
      : 'Browse the discovery feed or search the archive below to find your first title.';
  const heroPoster =
    heroMedia?.posterUrl ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80';
  const canReflect = Boolean(heroMedia);

  const recentlyReflected = libraryItems
    .filter(({ library }) => hasEmotionalData(library))
    .sort((a, b) => b.library.updatedAt - a.library.updatedAt)
    .slice(0, 6);

  const pulseItems: CataloguePulseItem[] = [
    {
      id: 'sanctuary',
      label: 'In sanctuary',
      value: loading ? '—' : libraryCount,
      onClick: () => onNavigate('library'),
    },
    {
      id: 'anticipated',
      label: 'Anticipated',
      value: loading ? '—' : toWatchCount,
      onClick: () => onNavigate('library'),
    },
    {
      id: 'reflected',
      label: 'Reflected',
      value: loading ? '—' : watchedCount,
      onClick: () => onNavigate('library'),
    },
  ];

  if (!loading && feedCount > 0) {
    pulseItems.push({
      id: 'feed',
      label: 'Live feed items',
      value: feedCount,
      onClick: () => feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    });
  }

  if (!loading && picks.length > 0) {
    pulseItems.push({
      id: 'picks',
      label: 'Curated picks',
      value: picks.length,
      onClick: () => onNavigate('recommendations'),
    });
  }

  return (
    <div className="page-container sanctuary-page focus-pull-active">
      <div className="discovery-ambient-layer" aria-hidden="true" />
      <div className="lobby-container">
        <div className="hero-poster-column">
          <div className="hero-poster-frame">
            <img src={heroPoster} alt={heroTitle} className="hero-poster-img" />
            <div className="catalogue-plaque-card">
              <div className="plaque-header">
                {heroRating && <span className="plaque-rating">{heroRating}</span>}
                <span className="plaque-index">No. 001</span>
              </div>
              <h3 className="plaque-title">{heroTitle}</h3>
              <p className="plaque-director">
                {heroMedia?.wikidataDirectorBio ? `Directed by ${heroDirector}` : heroDirector}
              </p>
              <blockquote
                className={`plaque-quote${heroIsReflection ? ' plaque-quote--reflection' : ''}`}
              >
                "{heroQuote}"
              </blockquote>
              <div className="plaque-actions">
                <button
                  className="plaque-btn reflect"
                  disabled={!canReflect}
                  title={canReflect ? 'Open reflection canvas' : 'Acquire a title first'}
                  onClick={() => heroMedia && onOpenCapture?.(heroMedia.id)}
                >
                  Reflect
                </button>
                <button
                  className="plaque-btn archive"
                  onClick={() => onNavigate('library')}
                >
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-info-column">
          <span className="lobby-act">Act I</span>
          <h2 className="lobby-heading">Discovery</h2>
          <p className="lobby-desc">
            Welcome to the entry hall of your sanctuary. Search the archive, follow the live wire, and return to titles you have already reflected on.
          </p>
          <DiscoveryCataloguePulse items={pulseItems} />
        </div>
      </div>

      <section className="discovery-search-section" aria-label="Discover films and series">
        <div className="discovery-search-bar">
          <input
            type="search"
            className="discovery-search-input"
            placeholder="Discover films & series..."
            value={searchQuery}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            aria-label="Search films and series"
          />
        </div>

        <div className="discovery-search-filters" role="group" aria-label="Filter by media type">
          {DISCOVERY_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`discovery-search-filter${searchType === filter.value ? ' active' : ''}`}
              onClick={() => setSearchType(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {searchLoading && (
          <p className="discovery-search-status" role="status">Searching catalogue…</p>
        )}

        {searchError && (
          <p className="discovery-search-status error" role="alert">{searchError}</p>
        )}

        {searchActive && !searchLoading && !searchError && searchResults.length === 0 && (
          <div className="sanctuary-empty-plaque discovery-search-empty">
            <span className="sanctuary-plaque-index">No Matches</span>
            <p className="sanctuary-plaque-text">
              No titles matched your query. Films are searched via Trakt; series via TVmaze and Trakt.
            </p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="discovery-search-results">
            <div className="discovery-search-results-grid">
              {searchResults.map((media) => (
                <SanctuaryMediaCard
                  key={media.id}
                  media={media}
                  synopsis={
                    media.overview
                      ? media.overview.length > 100
                        ? `${media.overview.slice(0, 97)}…`
                        : media.overview
                      : undefined
                  }
                  onOpen={setSelectedMedia}
                  onAdd={handleAdd}
                  added={addedIds.has(media.id)}
                  addLabel="Add to library"
                  addedLabel="Acquired"
                  meta={
                    <div className="sanctuary-card-meta">
                      <span>{media.year || '—'}</span>
                      <span>{media.type === 'tv' ? 'Series' : 'Film'}</span>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {!loading && feedError && (
        <div className="sanctuary-empty-plaque home-feed-notice">
          <span className="sanctuary-plaque-index">Feed Notice</span>
          <p className="sanctuary-plaque-text">{feedError}</p>
          <button className="optical-button sm" onClick={() => loadDiscoveryFeed(true)}>
            Retry Discovery Feed
          </button>
        </div>
      )}

      {!loading && discoveryFeed && discoveryFeed.items.length > 0 && (
        <section
          id="discovery-live-feed"
          ref={feedSectionRef}
          className="discovery-feed-section"
          aria-labelledby="discovery-feed-heading"
        >
          <div className="discovery-feed-header">
            <div>
              <span className="discovery-feed-kicker">Live Wire</span>
              <h3 id="discovery-feed-heading" className="discovery-feed-title">
                Discovery Feed
              </h3>
              <p className="discovery-feed-desc">
                Trending on Trakt and premieres from TVmaze, no API keys required
              </p>
            </div>
            <div className="discovery-feed-meta">
              <span>{discoveryFeed.trendingCount} trending</span>
              <span>{discoveryFeed.premiereCount} premieres</span>
            </div>
          </div>
          <div className="discovery-feed-list">
            {discoveryFeed.items.slice(0, 8).map((item, index) => (
              <DiscoveryFeedCard
                key={item.id}
                item={item}
                index={index}
                onSelect={(feedItem) => {
                  const pick = feedItemToDigestPick(feedItem);
                  if (pick.media) setSelectedMedia(pick.media);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="home-main-content">
          <div className="home-skeleton-card-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="home-main-content">
          <section className="home-discovery-section">
            <EmotionalWeatherChart items={libraryItems.map((item) => item.library)} />
          </section>

          {recentlyReflected.length > 0 && (
            <section className="home-discovery-section">
              <div className="home-section-header">
                <div>
                  <h3 className="home-section-title">Recently Reflected</h3>
                  <p className="home-section-desc">Your latest emotional projections from the sanctuary</p>
                </div>
              </div>
              <div className="recently-reflected-strip">
                {recentlyReflected.map(({ library, media }) => {
                  const spectrum = getEmotionalSpectrum(library);
                  return (
                    <button
                      key={library.mediaId}
                      type="button"
                      className="recently-reflected-card"
                      onClick={() => setSelectedMedia(media)}
                    >
                      {media.posterUrl ? (
                        <img
                          src={media.posterUrl}
                          alt={media.canonicalTitle}
                          className="recently-reflected-poster"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="recently-reflected-poster" />
                      )}
                      <div className="recently-reflected-meta">
                        <div className="recently-reflected-title">{media.canonicalTitle}</div>
                        <div className="recently-reflected-aura" aria-hidden="true">
                          <span style={{ background: 'var(--color-awe)', flex: spectrum.awe }} />
                          <span style={{ background: 'var(--color-melancholy)', flex: spectrum.melancholy }} />
                          <span style={{ background: 'var(--color-tension)', flex: spectrum.tension }} />
                          <span style={{ background: 'var(--color-warmth)', flex: spectrum.warmth }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="home-section-header">
              <div>
                <h3 className="home-section-title">Picked For You</h3>
                <p className="home-section-desc">
                  {watchedCount >= 3 ? 'Curated from your sanctuary reflections' : 'Reflect on 3+ watched titles to unlock AI picks'}
                </p>
              </div>
              <button className="optical-button sm" onClick={() => onNavigate('recommendations')}>
                Explore All
              </button>
            </div>

            {picks.length === 0 ? (
              <div className="sanctuary-empty-plaque home-empty-notice">
                <span className="sanctuary-plaque-index">Sanctuary Notice</span>
                <p className="sanctuary-plaque-text">Add a few titles and mark some as watched to unlock personalized reflections.</p>
              </div>
            ) : (
              <div className="home-picks-grid">
                {picks.map(({ media, explanation }) => (
                  <SanctuaryMediaCard
                    key={media.id}
                    media={media}
                    synopsis={explanation}
                    onOpen={setSelectedMedia}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="home-section-header wrap">
              <div>
                <div className="home-section-title-row">
                  <h3 className="home-section-title">This Week</h3>
                  {weeklyDigest && (
                    <span className={`home-digest-badge ${weeklyDigest.llmGenerated ? 'ai' : 'algo'}`}>
                      {digestBadge}
                    </span>
                  )}
                </div>
                <p className="home-section-desc">
                  {usingFreeFeed
                    ? 'Free discovery feed · Trakt trending and TV premieres'
                    : platformNames
                      ? `Programme arrivals on ${platformNames}`
                      : 'Curated programme releases'}
                </p>
              </div>
              <div className="home-btn-group">
                <button
                  className="optical-button sm"
                  disabled={refreshingDigest}
                  onClick={handleRefreshDigest}
                >
                  {refreshingDigest ? 'Refreshing…' : 'Refresh Programme'}
                </button>
                <button className="optical-button sm" onClick={() => onNavigate('new-releases')}>
                  Full Programme
                </button>
              </div>
            </div>

            {weeklyPicks.length === 0 ? (
              <div className="sanctuary-empty-plaque home-empty-notice">
                <span className="sanctuary-plaque-index">Programme Notice</span>
                <p className="sanctuary-plaque-text">No programme items yet. Refresh to pull the latest free discovery feed.</p>
              </div>
            ) : (
              <div className="home-weekly-grid">
                {weeklyPicks.map((pick) => {
                  const media = pick.media;
                  const rating = media ? pickRating(media) : null;
                  const availability = platformsToAvailability(pick.platforms);

                  return media ? (
                    <SanctuaryMediaCard
                      key={pick.mediaId}
                      media={media}
                      title={pick.title}
                      synopsis={pickSynopsisForMedia(media, libraryItems, pick.reason)}
                      onOpen={setSelectedMedia}
                      onAdd={handleAdd}
                      added={addedIds.has(media.id)}
                      afterSynopsis={
                        <div className="home-chips-wrap">
                          <PlatformChips availability={availability} max={3} compact />
                        </div>
                      }
                      meta={
                        <div className="sanctuary-card-meta">
                          <span>{pick.year}</span>
                          {rating && <span>{rating}</span>}
                        </div>
                      }
                    />
                  ) : (
                    <article key={pick.mediaId} className="sanctuary-media-card">
                      <div className="sanctuary-card-poster">
                        <div className="sanctuary-poster-placeholder">
                          <span className="sanctuary-placeholder-title">No Image</span>
                        </div>
                      </div>
                      <div className="sanctuary-card-content">
                        <h4 className="sanctuary-card-title">{pick.title}</h4>
                        <p className="sanctuary-card-synopsis">{pick.reason}</p>
                        <div className="home-chips-wrap">
                          <PlatformChips availability={availability} max={3} compact />
                        </div>
                        <div className="sanctuary-card-meta">
                          <span>{pick.year}</span>
                          {rating && <span>{rating}</span>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onAddToLibrary={() => handleAdd(selectedMedia)}
        />
      )}
    </div>
  );
}