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
  onNavigate?: (page: 'search' | 'library' | 'home' | 'new-releases') => void;
}

export function Recommendations({ onOpenCuratorSettings, onNavigate }: RecommendationsProps = {}) {
  // ── Existing rule-based state ─────────────────────────────────────────
  const [recs, setRecs] = useState<(Recommendation & { media: MediaItem })[]>([]);
  const [groupedRecs, setGroupedRecs] = useState<{ seedTitle: string; recommendations: (Recommendation & { media: MediaItem })[] }[]>([]);
  const [isGrouped, setIsGrouped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
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
  async function fetchLedgerRecs() {
    setLoading(true);
    setLedgerError(null);
    try {
      const recResponse = await sendMessage<any, Recommendation[] | GroupedRecommendation[]>(
        MessageType.GET_RECOMMENDATIONS,
        {}
      );

      if (!recResponse.data || recResponse.data.length === 0) {
        setRecs([]);
        setGroupedRecs([]);
        setIsGrouped(false);
        return;
      }

      const groupedData = recResponse.data;
      const hasGroups = Array.isArray(groupedData) && groupedData.length > 0 && 'seedTitle' in groupedData[0];

      if (hasGroups) {
        // Grouped path: unchanged, only Recommendation objects here
        const mediaIds = (groupedData as GroupedRecommendation[]).flatMap(g => g.recommendations.map(r => r.mediaId));

        if (mediaIds.length === 0) {
          setRecs([]);
          setGroupedRecs([]);
          setIsGrouped(false);
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
          setRecs([]);
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
          explanation:
            item.type === 'book'
              ? 'Related to books in your archive'
              : 'Now showing on Trakt',
        }));

        if (mediaIds.length === 0) {
          // Only have Trakt items, no Recommendations to fetch
          setRecs(traktHydrated);
          setGroupedRecs([]);
          setIsGrouped(false);
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
          setGroupedRecs([]);
          setIsGrouped(false);
        }
      }
    } catch (err) {
      console.error('Failed to get recommendations', err);
      setRecs([]);
      setGroupedRecs([]);
      setIsGrouped(false);
      setLedgerError(err instanceof Error ? err.message : 'Failed to load ledger recommendations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLedgerRecs();
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
      console.error('Failed to add to archive', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add title to your archive.');
    }
  }

  async function dismissRecommendation(workId: string) {
    try {
      await sendMessage(MessageType.SUBMIT_RECOMMENDATION_FEEDBACK, {
        workId,
        action: 'dismiss',
      });
      setRecs((prev) => prev.filter((r) => r.media.id !== workId));
      setGroupedRecs((prev) =>
        prev
          .map((g) => ({
            ...g,
            recommendations: g.recommendations.filter((r) => r.media.id !== workId),
          }))
          .filter((g) => g.recommendations.length > 0)
      );
      setPersonalizedRecs((prev) => prev.filter((r) => r.tmdbId !== workId));
      setRecGroups((prev) =>
        prev
          ? prev
              .map((g) => ({
                ...g,
                recommendations: g.recommendations.filter((r) => r.tmdbId !== workId),
              }))
              .filter((g) => g.recommendations.length > 0)
          : null
      );
    } catch (err) {
      console.error('Failed to dismiss recommendation', err);
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
      console.error('Failed to add AI rec to archive', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add recommendation to your archive.');
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
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque">
          <p className="sanctuary-plaque-text sanctuary-notice-plaque-text">{actionError}</p>
        </div>
      )}

      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Marquee Programme · Ledger First</span>
        </div>
        <h1 className="sanctuary-title">Recommendations</h1>
        <p className="sanctuary-description">
          Primary selections from your viewing ledger and resonance notes. Below, an optional house curator can deepen the programme when you ask.
        </p>
      </header>

      {/* ── Primary: rule-based / ledger recommendations (full width) ── */}
      <section className="recommendations-ledger-section" aria-label="Ledger recommendations">
        <div
          key={loading ? 'rule-loading' : ledgerError ? 'rule-error' : hasNoRecs ? 'rule-empty' : isGrouped ? 'rule-grouped' : 'rule-flat'}
          className="recommendations-phase"
        >
          {loading ? (
            <div className="sanctuary-empty-plaque">
               <div className="subsume-spinner sanctuary-spinner-centered" />
               <p className="sanctuary-plaque-text">Reviewing your repertoire...</p>
            </div>
          ) : ledgerError ? (
            <div className="sanctuary-empty-plaque">
              <span className="sanctuary-plaque-index">Ledger unreachable</span>
              <h3 className="sanctuary-plaque-title">Could Not Load Recommendations</h3>
              <p className="sanctuary-plaque-text recommendations-plaque-text">
                The programme could not reach your viewing ledger. Check your connection, then try again.
              </p>
              <button
                type="button"
                onClick={fetchLedgerRecs}
                className="optical-button recommendations-retry-btn"
              >
                Try again
              </button>
            </div>
          ) : hasNoRecs ? (
            <div className="sanctuary-empty-plaque">
              <span className="sanctuary-plaque-index">Programme awaiting</span>
              <h3 className="sanctuary-plaque-title">Your Ledger Needs More Reels</h3>
              <p className="sanctuary-plaque-text">
                Ledger recommendations grow with what you watch and remember. Add works to your archive, or mark screenings as complete.
              </p>
              {onNavigate && (
                <button
                  type="button"
                  className="optical-button recommendations-retry-btn"
                  onClick={() => onNavigate('search')}
                >
                  Search catalogue
                </button>
              )}
            </div>
          ) : isGrouped ? (
            <div className="recommendations-grouped-container">
              {groupedRecs.map(({ seedTitle, recommendations }) => {
                const isCollapsed = collapsedGroups[seedTitle] || false;
                const panelId = `rec-group-${seedTitle.replace(/\s+/g, '-').toLowerCase()}`;
                return (
                  <div key={seedTitle} className="recommendations-rule-group">
                    <button
                      type="button"
                      className="recommendations-rule-group-header"
                      onClick={() => toggleGroup(seedTitle)}
                      aria-expanded={!isCollapsed}
                      aria-controls={panelId}
                      style={{ marginBottom: isCollapsed ? '0px' : '16px' }}
                    >
                      <span className="sanctuary-subtitle recommendations-rule-group-toggle" aria-hidden="true">
                        [ {isCollapsed ? '+' : '–'} ]
                      </span>
                      <span className="recommendations-rule-group-title">
                        Because you experienced <span className="recommendations-rule-group-title-highlight">{seedTitle}</span>
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div id={panelId} className="card-grid recommendations-rule-grid">
                        {recommendations.map(r => (
                          <RecommendationMediaCard
                            key={r.media.id}
                            media={r.media}
                            explanation={r.explanation}
                            onClick={() => setSelectedMedia(r.media)}
                            onDismiss={dismissRecommendation}
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
                  onDismiss={dismissRecommendation}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Secondary: AI House Curator (progressive disclosure, closed by default) ── */}
      <details className="recommendations-ai-section">
        <summary className="recommendations-ai-summary">
          <span className="recommendations-ai-summary-label">House Curator</span>
          <span className="recommendations-ai-summary-hint">Optional · AI programme from your archive</span>
        </summary>

        <div className="recommendations-ai-body">
          {/* Profile context strip */}
          {watchProfile && (
            <p className="sanctuary-subtitle recommendations-profile-summary">
              Curated from {watchProfile.totalWatched} screening{watchProfile.totalWatched === 1 ? '' : 's'} in your ledger
              {topGenres.length > 0 && ` · Favoured sensibilities: ${topGenres.join(', ')}`}
            </p>
          )}

          <p className="recommendations-curator-explainer">
            Your house curator reads ratings, emotional reflections, notes, wishlist entries, and favoured filmmakers from your archive,
            then consults the programme service you configure in{' '}
            {onOpenCuratorSettings ? (
              <button type="button" className="recommendations-curator-link" onClick={onOpenCuratorSettings}>
                Settings → AI curator
              </button>
            ) : (
              <span>Settings → AI curator</span>
            )}
            .
          </p>

          {/* EMPTY STATE — AI history only, inside secondary section */}
          {!hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && (
            <div className="sanctuary-empty-plaque">
              <span className="sanctuary-plaque-index">Three screenings to begin</span>
              <h3 className="sanctuary-plaque-title">Personal Exhibition Portfolio</h3>
              <p className="sanctuary-plaque-text">Rate at least three works so the house curator can sense your aesthetic inclinations.</p>
            </div>
          )}

          {/* GENERATE BUTTON */}
          {hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && !recsError && (
            <div className="recommendations-action-container">
              <button
                type="button"
                onClick={generatePersonalized}
                className="sanctuary-action-button"
              >
                Curate my programme
              </button>
            </div>
          )}

          {/* NO KEY STATE — AI only */}
          {recsError === 'no_key' && (
            <div className="sanctuary-empty-plaque">
              <span className="sanctuary-plaque-index">Curator key needed</span>
              <h3 className="sanctuary-plaque-title">House Curator Awaiting Keys</h3>
              <p className="sanctuary-plaque-text recommendations-plaque-text">
                Add an API key in Settings to enable personalised curation from your archive.
              </p>
              <button
                type="button"
                onClick={generatePersonalized}
                className="optical-button recommendations-retry-btn"
              >
                Try again
              </button>
            </div>
          )}

          {/* FAILED STATE — AI only */}
          {recsError === 'failed' && (
            <div className="sanctuary-empty-plaque">
              <span className="sanctuary-plaque-index">Projection interrupted</span>
              <h3 className="sanctuary-plaque-title">Curation Could Not Complete</h3>
              <p className="sanctuary-plaque-text recommendations-plaque-text">
                The programme service returned an error. Check your credentials or connection, then try again.
              </p>
              <button
                type="button"
                onClick={generatePersonalized}
                className="optical-button recommendations-retry-btn"
              >
                Try again
              </button>
            </div>
          )}

          {/* LOADING STATE */}
          {recsLoading && (
            <div key="ai-loading" className="recommendations-phase">
              <div className="recommendations-loading-grid">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="recommendations-loading-card" style={{ animationDelay: `${i * 0.04}s` }} />
                ))}
              </div>
              <p className="recommendations-loading-text recommendations-loading-text-editorial">
                Curating exhibition from your aesthetic sensibilities...
              </p>
            </div>
          )}

          {/* RESULTS STATE */}
          {!recsLoading && personalizedRecs.length > 0 && (
            <div key="ai-results" className="recommendations-phase">
              <div className="recommendations-results-header">
                <span className="sanctuary-plaque-title recommendations-exhibition-title">Curator&apos;s programme</span>
                <div className="recommendations-results-actions">
                  {recGroups !== null && (
                    <div className="recommendations-view-mode-toggle" role="group" aria-label="View mode">
                      {(['grouped', 'flat'] as const).map(mode => (
                        <button
                          type="button"
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          aria-pressed={viewMode === mode}
                          className={`recommendations-view-mode-btn ${viewMode === mode ? 'recommendations-view-mode-btn-active' : 'recommendations-view-mode-btn-inactive'}`}
                        >
                          {mode === 'grouped' ? 'By programme' : 'Full marquee'}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={generatePersonalized}
                    className="optical-button recommendations-regen-btn"
                  >
                    Refresh programme
                  </button>
                </div>
              </div>

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
                      onDismiss={dismissRecommendation}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'grouped' && recGroups !== null && (
                <div className="recommendations-grouped-container">
                  {recGroups.map(group => (
                    <div key={group.seedTitle}>
                      <div className="recommendations-grouped-section-header">
                        <span className="recommendations-grouped-section-bar" />
                        <span className="recommendations-grouped-section-title">
                          Curated around <span className="recommendations-grouped-seed-title">{group.seedTitle}</span>
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
                            onDismiss={dismissRecommendation}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {ungroupedRecs.length > 0 && (
                    <div>
                      <div className="sanctuary-plaque-title recommendations-further-title">Further selections</div>
                      <div className="recommendations-flat-grid">
                        {ungroupedRecs.map(rec => (
                          <RecommendationAiCard
                            key={rec.tmdbId || rec.title}
                            rec={rec}
                            showSeedPill={true}
                            isAdded={aiAddedIds.has(rec.tmdbId)}
                            onCardClick={setSelectedMedia}
                            onAddClick={addAiRecToLibrary}
                            onDismiss={dismissRecommendation}
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
      </details>

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
