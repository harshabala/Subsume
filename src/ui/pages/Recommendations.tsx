import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import {
  MessageType,
  Recommendation,
  MediaItem,
  GroupedRecommendation,
  PersonalizedRecommendation,
  RecommendationGroup,
  WatchProfile,
} from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { RecommendationMediaCard } from '../components/RecommendationMediaCard';
import { RecommendationAiCard } from '../components/RecommendationAiCard';
import '../styles/recommendations.css';

interface RecommendationsProps {
  onOpenCuratorSettings?: () => void;
}

export function Recommendations({ onOpenCuratorSettings }: RecommendationsProps = {}) {
  // ── Existing rule-based state ─────────────────────────────────────────
  const [recs, setRecs] = useState<(Recommendation & { media: MediaItem })[]>([]);
  const [groupedRecs, setGroupedRecs] = useState<{ seedTitle: string; recommendations: (Recommendation & { media: MediaItem })[] }[]>([]);
  const [isGrouped, setIsGrouped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // ── Phase 4: Personalized AI state ────────────────────────────────────
  const [personalizedRecs, setPersonalizedRecs] = useState<PersonalizedRecommendation[]>([]);
  const [recGroups, setRecGroups] = useState<RecommendationGroup[] | null>(null);
  const [watchProfile, setWatchProfile] = useState<WatchProfile | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
  const [aiAddedIds, setAiAddedIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Existing rule-based fetch ─────────────────────────────────────────
  useEffect(() => {
    async function fetchRecs() {
      setLoading(true);
      try {
        const recResponse = await sendMessage<any, Recommendation[] | GroupedRecommendation[]>(
          MessageType.GET_RECOMMENDATIONS,
          {}
        );

        if (!recResponse.data || recResponse.data.length === 0) {
          setLoading(false);
          return;
        }

        const groupedData = recResponse.data;
        const hasGroups = Array.isArray(groupedData) && groupedData.length > 0 && 'seedTitle' in groupedData[0];

        if (hasGroups) {
          // Grouped path: unchanged, only Recommendation objects here
          const mediaIds = (groupedData as GroupedRecommendation[]).flatMap(g => g.recommendations.map(r => r.mediaId));

          if (mediaIds.length === 0) {
            setLoading(false);
            return;
          }

          const mediaResponse = await sendMessage<any, MediaItem[]>(
            MessageType.GET_MEDIA_ITEMS,
            { mediaIds }
          );

          if (mediaResponse.data) {
            const mediaMap = new Map(
              mediaResponse.data.map((m) => [m.id, m])
            );

            const hydratedGroups = (groupedData as GroupedRecommendation[]).map(group => {
              const hydratedRecs = group.recommendations
                .map(r => ({ ...r, media: mediaMap.get(r.mediaId)! }))
                .filter(r => r.media);
              return {
                seedTitle: group.seedTitle,
                recommendations: hydratedRecs,
              };
            }).filter(g => g.recommendations.length > 0);

            setGroupedRecs(hydratedGroups);
            setIsGrouped(true);
          }
        } else {
          // Flat path: may contain mix of Recommendation and MediaItem
          const flatData = groupedData as Array<Recommendation | MediaItem>;

          // Split into Recommendation (has mediaId) and MediaItem (has id but not mediaId)
          const recommendations: Recommendation[] = [];
          const mediaItems: MediaItem[] = [];

          for (const entry of flatData) {
            if ('mediaId' in entry) {
              recommendations.push(entry as Recommendation);
            } else if ('id' in entry) {
              mediaItems.push(entry as MediaItem);
            }
          }

          // Collect mediaIds from Recommendation entries
          const mediaIds = recommendations.map(r => r.mediaId);

          // Pre-hydrate MediaItem entries as if they were Recommendations
          const traktHydrated: (Recommendation & { media: MediaItem })[] = mediaItems.map(item => ({
            mediaId: item.id,
            media: item,
            explanation: 'Trending on Trakt',
          }));

          if (mediaIds.length === 0) {
            // Only have Trakt items, no Recommendations to fetch
            setRecs(traktHydrated);
            setIsGrouped(false);
            setLoading(false);
            return;
          }

          const mediaResponse = await sendMessage<any, MediaItem[]>(
            MessageType.GET_MEDIA_ITEMS,
            { mediaIds }
          );

          if (mediaResponse.data) {
            const mediaMap = new Map(
              mediaResponse.data.map((m) => [m.id, m])
            );

            // Hydrate Recommendation entries from mediaMap
            const hydratedFromBackend = recommendations
              .map((r) => ({ ...r, media: mediaMap.get(r.mediaId)! }))
              .filter((r) => r.media);

            // Merge both sets
            const allHydrated = [...hydratedFromBackend, ...traktHydrated];
            setRecs(allHydrated);
            setIsGrouped(false);
          }
        }
      } catch (err) {
        console.error('Failed to get recommendations', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecs();
  }, []);

  // ── Phase 4: Silently load watch profile on mount ──────────────────
  useEffect(() => {
    sendMessage<any, { profile: WatchProfile }>(
      MessageType.BUILD_WATCH_PROFILE,
      {}
    ).then(res => {
      if (res.success && res.data?.profile) {
        setWatchProfile(res.data.profile);
      }
    }).catch(() => {/* silent */});
  }, []);

  // ── Existing: add to library (rule-based) ────────────────────────────
  async function addToLibrary(media: MediaItem) {
    setActionError(null);
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds((prev) => new Set(prev).add(media.id));
      setAiAddedIds((prev) => new Set(prev).add(media.id));
    } catch (err) {
      console.error('Failed to add to library', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add title to your library.');
    }
  }

  const toggleGroup = (seedTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [seedTitle]: !prev[seedTitle],
    }));
  };

  // ── Phase 4: Generate personalized recs ───────────────────────────────
  async function generatePersonalized() {
    setRecsLoading(true);
    setRecsError(null);
    try {
      const res = await sendMessage<any, {
        flat: PersonalizedRecommendation[];
        grouped: RecommendationGroup[] | null;
        error?: string;
      }>(MessageType.GET_PERSONALIZED_RECS, {});

      if (res.success && res.data) {
        const { flat, grouped, error } = res.data;
        if (error === 'no_llm_key') {
          setRecsError('no_key');
        } else if (error === 'llm_failed') {
          setRecsError('failed');
        } else {
          setPersonalizedRecs(flat || []);
          setRecGroups(grouped || null);
          setViewMode(grouped !== null ? 'grouped' : 'flat');
        }
      } else {
        setRecsError('failed');
      }
    } catch {
      setRecsError('failed');
    } finally {
      setRecsLoading(false);
    }
  }

  // ── Phase 4: Add AI rec to library ────────────────────────────────────
  async function addAiRecToLibrary(rec: PersonalizedRecommendation) {
    if (!rec.tmdbId) return;
    setActionError(null);
    try {
      const mediaItem: MediaItem = {
        id: rec.tmdbId,
        canonicalTitle: rec.title,
        type: rec.type,
        year: rec.year,
        genres: [],
        ratings: rec.ratings,
        providers: [],
        posterUrl: rec.posterUrl || '',
      };
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem, type: rec.type });
      setAiAddedIds(prev => new Set(prev).add(rec.tmdbId));
    } catch (err) {
      console.error('Failed to add AI rec to library', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add recommendation to your library.');
    }
  }

  const hasNoRecs = isGrouped ? groupedRecs.length === 0 : recs.length === 0;
  const hasEnoughHistory = watchProfile !== null && watchProfile.totalWatched >= 3;
  const topGenres = (watchProfile?.favoriteGenres || []).slice(0, 3);

  const groupedTmdbIds = new Set(
    (recGroups || []).flatMap(g => g.recommendations.map(r => r.tmdbId))
  );
  const ungroupedRecs = personalizedRecs.filter(r => !groupedTmdbIds.has(r.tmdbId));

  return (
    <div className="page-container">
      {actionError && (
        <div className="sanctuary-empty-plaque" style={{ maxWidth: 500, margin: '0 auto 24px', borderColor: 'var(--border-hero)' }}>
          <p className="sanctuary-plaque-text" style={{ color: 'var(--text-reflection)' }}>{actionError}</p>
        </div>
      )}

      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Recommendations</span>
        </div>
        <h1 className="sanctuary-title">Recommendations</h1>
        <p className="sanctuary-description">
          Archival suggestions curated from your personal viewing history and cinematic preferences.
        </p>
      </header>

      {/* ── Existing rule-based section (unchanged) ── */}
      {loading ? (
        <div className="sanctuary-empty-plaque">
           <div className="subsume-spinner" style={{ margin: '0 auto 16px' }} />
           <p className="sanctuary-plaque-text">Loading recommendations…</p>
        </div>
      ) : hasNoRecs ? (
        <div className="sanctuary-empty-plaque">
          <span className="sanctuary-plaque-index">Not enough data</span>
          <h3 className="sanctuary-plaque-title">Not enough data</h3>
          <p className="sanctuary-plaque-text">
            Catalogue curation requires a broader foundation. Add further works to your sanctuary or mark existing acquisitions as watched.
          </p>
        </div>
      ) : isGrouped ? (
        <div className="recommendations-grouped-container">
          {groupedRecs.map(({ seedTitle, recommendations }) => {
            const isCollapsed = collapsedGroups[seedTitle] || false;
            return (
              <div key={seedTitle} className="recommendations-rule-group">
                <div 
                  className="recommendations-rule-group-header"
                  onClick={() => toggleGroup(seedTitle)}
                  style={{ marginBottom: isCollapsed ? '0px' : '16px' }}
                >
                  <span className="sanctuary-subtitle" style={{ marginRight: '4px' }}>[ {isCollapsed ? '+' : '–'} ]</span>
                  <h3 className="recommendations-rule-group-title">
                    Because you experienced <span className="recommendations-rule-group-title-highlight">{seedTitle}</span>
                  </h3>
                </div>
                {!isCollapsed && (
                  <div className="card-grid recommendations-rule-grid">
                    {recommendations.map(r => (
                      <RecommendationMediaCard
                        key={r.media.id}
                        media={r.media}
                        explanation={r.explanation}
                        onClick={() => setSelectedMedia(r.media)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-grid recommendations-rule-grid">
          {recs.map(r => (
            <RecommendationMediaCard
              key={r.media.id}
              media={r.media}
              explanation={r.explanation}
              onClick={() => setSelectedMedia(r.media)}
            />
          ))}
        </div>
      )}

      {/* ── Phase 4: AI Personalized Section ── */}
      <div className="recommendations-ai-section">

        {/* Profile context strip */}
        {watchProfile && (
          <p className="sanctuary-subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Curated from {watchProfile.totalWatched} archival film{watchProfile.totalWatched === 1 ? '' : 's'}
            {topGenres.length > 0 && ` · Top Sensibilities: ${topGenres.join(', ')}`}
          </p>
        )}

        <p className="recommendations-curator-explainer">
          Your private curator reads ratings, emotional recall, notes, wishlist, and filmmakers from your sanctuary,
          then asks your LLM provider for matches — nothing is sent except what you configure in{' '}
          {onOpenCuratorSettings ? (
            <button type="button" className="recommendations-curator-link" onClick={onOpenCuratorSettings}>
              Settings → AI curator
            </button>
          ) : (
            <span>Settings → AI curator</span>
          )}
          .
        </p>

        {/* EMPTY STATE */}
        {!hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">Unlock AI picks</span>
            <h3 className="sanctuary-plaque-title">Personalized Exhibition Portfolio</h3>
            <p className="sanctuary-plaque-text">Rate at least 3 cinematic works to help Subsume map your aesthetic sensibility.</p>
          </div>
        )}

        {/* GENERATE BUTTON */}
        {hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && !recsError && (
          <div className="recommendations-action-container">
            <button
              onClick={generatePersonalized}
              className="sanctuary-action-button"
            >
              Generate recommendations
            </button>
          </div>
        )}

        {/* NO KEY STATE */}
        {recsError === 'no_key' && (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">CONFIGURATION REQUIRED</span>
            <h3 className="sanctuary-plaque-title">No Intelligence Provider Configured</h3>
            <p className="sanctuary-plaque-text" style={{ marginBottom: '16px' }}>
              Configure an API key within Settings to enable personalized AI curation.
            </p>
            <button
              onClick={generatePersonalized}
              className="optical-button"
              style={{ padding: '8px 20px' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* FAILED STATE */}
        {recsError === 'failed' && (
          <div className="sanctuary-empty-plaque">
            <span className="sanctuary-plaque-index">SYSTEM ERROR</span>
            <h3 className="sanctuary-plaque-title">Curation Interrupted</h3>
            <p className="sanctuary-plaque-text" style={{ marginBottom: '16px' }}>
              The intelligence provider encountered an unexpected failure. Inspect your credentials or network connection.
            </p>
            <button
              onClick={generatePersonalized}
              className="optical-button"
              style={{ padding: '8px 20px' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {recsLoading && (
          <div>
            <div className="recommendations-loading-grid">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="recommendations-loading-card" style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
            <p className="recommendations-loading-text" style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>
              Curating exhibition from your aesthetic sensibilities...
            </p>
          </div>
        )}

        {/* RESULTS STATE */}
        {!recsLoading && personalizedRecs.length > 0 && (
          <div>
            {/* Header row */}
            <div className="recommendations-results-header">
              <span className="sanctuary-plaque-title" style={{ margin: 0, fontSize: '20px' }}>AI recommendations</span>
              <div className="recommendations-results-actions">
                {recGroups !== null && (
                  <div className="recommendations-view-mode-toggle">
                    {(['grouped', 'flat'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`recommendations-view-mode-btn ${viewMode === mode ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
                      >
                        {mode === 'grouped' ? 'By Theme' : 'All titles'}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={generatePersonalized}
                  className="optical-button"
                  style={{ padding: '6px 14px', fontSize: '10px' }}
                >
                  REGENERATE
                </button>
              </div>
            </div>

            {/* FLAT VIEW */}
            {(viewMode === 'flat' || recGroups === null) && (
              <div className="recommendations-flat-grid">
                {personalizedRecs.map(rec => (
                  <RecommendationAiCard
                    key={rec.tmdbId || rec.title}
                    rec={rec}
                    showSeedPill={true}
                    isAdded={aiAddedIds.has(rec.tmdbId)}
                    onCardClick={setSelectedMedia}
                    onAddClick={addAiRecToLibrary}
                  />
                ))}
              </div>
            )}

            {/* GROUPED VIEW */}
            {viewMode === 'grouped' && recGroups !== null && (
              <div className="recommendations-grouped-container">
                {recGroups.map(group => (
                  <div key={group.seedTitle}>
                    <div className="recommendations-grouped-section-header">
                      <span className="recommendations-grouped-section-bar" />
                      <span className="recommendations-grouped-section-title">
                        Curated around <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--text-reflection)' }}>{group.seedTitle}</span>
                      </span>
                    </div>
                    <div className="recommendations-grouped-section-scroll">
                      {group.recommendations.map(rec => (
                        <RecommendationAiCard
                          key={rec.tmdbId || rec.title}
                          rec={rec}
                          showSeedPill={false}
                          isAdded={aiAddedIds.has(rec.tmdbId)}
                          onCardClick={setSelectedMedia}
                          onAddClick={addAiRecToLibrary}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {ungroupedRecs.length > 0 && (
                  <div>
                    <div className="sanctuary-plaque-title" style={{ fontSize: '18px', marginTop: '24px' }}>More picks</div>
                    <div className="recommendations-flat-grid">
                      {ungroupedRecs.map(rec => (
                        <RecommendationAiCard
                          key={rec.tmdbId || rec.title}
                          rec={rec}
                          showSeedPill={true}
                          isAdded={aiAddedIds.has(rec.tmdbId)}
                          onCardClick={setSelectedMedia}
                          onAddClick={addAiRecToLibrary}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onAddToLibrary={() => addToLibrary(selectedMedia)}
        />
      )}
    </div>
  );
}
