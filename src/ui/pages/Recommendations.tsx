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

export function Recommendations() {
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

        let mediaIds: string[] = [];
        if (hasGroups) {
          mediaIds = (groupedData as GroupedRecommendation[]).flatMap(g => g.recommendations.map(r => r.mediaId));
        } else {
          mediaIds = (groupedData as Recommendation[]).map((r) => r.mediaId);
        }

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

          if (hasGroups) {
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
          } else {
            const hydrated = (groupedData as Recommendation[])
              .map((r) => ({ ...r, media: mediaMap.get(r.mediaId)! }))
              .filter((r) => r.media);

            setRecs(hydrated);
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
    try {
      await sendMessage(MessageType.ADD_TO_LIST, { mediaItem: media, type: media.type });
      setAddedIds((prev) => new Set(prev).add(media.id));
    } catch (err) {
      console.error('Failed to add to library', err);
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
      <header className="page-header">
        <div className="recommendations-header-badge">
          <h2 className="page-title">Recommendations</h2>
          <span className="status-badge to-watch">Algorithm</span>
        </div>
        <p className="page-subtitle">Smart suggestions based on your library and preferences.</p>
      </header>

      {/* ── Existing rule-based section (unchanged) ── */}
      {loading ? (
        <div className="empty-state">
           <div className="subsume-spinner" />
           <p className="recommendations-loading-spinner-container">Analyzing library...</p>
        </div>
      ) : hasNoRecs ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <h3 className="empty-state-title">Not enough data</h3>
          <p className="empty-state-description">
            Add a few more "to-watch" items to your library. Marking titles as "watched" will significantly improve your recommendations!
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
                  <span className={`recommendations-rule-group-icon ${isCollapsed ? 'recommendations-rule-group-icon-collapsed' : ''}`}>▼</span>
                  <h3 className="recommendations-rule-group-title">
                    Because you watched <span className="recommendations-rule-group-title-highlight">{seedTitle}</span>
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
          <p className="recommendations-page-subtitle">
            Based on {watchProfile.totalWatched} film{watchProfile.totalWatched === 1 ? '' : 's'} watched
            {topGenres.length > 0 && ` · Top genres: ${topGenres.join(', ')}`}
          </p>
        )}

        {/* EMPTY STATE */}
        {!hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && (
          <div className="recommendations-empty-container">
            <p className="recommendations-empty-title">Start watching to unlock personalized picks.</p>
            <p className="recommendations-empty-subtitle">Rate at least 3 films to help Subsume understand your taste.</p>
          </div>
        )}

        {/* GENERATE BUTTON */}
        {hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && !recsError && (
          <div className="recommendations-action-container">
            <button
              onClick={generatePersonalized}
              className="recommendations-generate-button"
            >
              ✨ Get Personalized Recommendations
            </button>
          </div>
        )}

        {/* NO KEY STATE */}
        {recsError === 'no_key' && (
          <div className="recommendations-error-container">
            <p className="recommendations-error-title">No LLM provider configured.</p>
            <p className="recommendations-error-subtitle">
              Add an API key in Settings to enable AI recommendations.
            </p>
            <button
              onClick={generatePersonalized}
              className="recommendations-error-retry-text"
            >
              ↺ Retry
            </button>
          </div>
        )}

        {/* FAILED STATE */}
        {recsError === 'failed' && (
          <div className="recommendations-error-container">
            <p className="recommendations-error-title">Something went wrong with the AI provider.</p>
            <p className="recommendations-error-subtitle">
              Check your API key in Settings and try again.
            </p>
            <button
              onClick={generatePersonalized}
              className="recommendations-error-retry-btn"
            >
              ↺ Retry
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
            <p className="recommendations-loading-text">
              Curating picks based on your taste...
            </p>
          </div>
        )}

        {/* RESULTS STATE */}
        {!recsLoading && personalizedRecs.length > 0 && (
          <div>
            {/* Header row */}
            <div className="recommendations-results-header">
              <span className="recommendations-results-title">AI Picks for You</span>
              <div className="recommendations-results-actions">
                {recGroups !== null && (
                  <div className="recommendations-view-mode-toggle">
                    {(['grouped', 'flat'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`recommendations-view-mode-btn ${viewMode === mode ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
                      >
                        {mode === 'grouped' ? 'By Theme' : 'All Titles'}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={generatePersonalized}
                  className="recommendations-regenerate-btn"
                >
                  ↺ Regenerate
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
                        Because you loved {group.seedTitle}
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
                    <div className="recommendations-grouped-more-title">More Picks</div>
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
