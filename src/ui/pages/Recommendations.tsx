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

// ─── Keyframe injection (pulse skeleton) ──────────────────────────────────
const PULSE_STYLE = `
@keyframes subsume-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`;

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

  // ── Existing rule-based card renderer (untouched) ────────────────────
  const renderMediaCard = ({ media, explanation }: (Recommendation & { media: MediaItem })) => (
    <div key={media.id} className="media-card" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => setSelectedMedia(media)}>
       <div style={{ display: 'flex', gap: 16, padding: 16 }}>
         <div className="media-card-poster" style={{ width: 80, flexShrink: 0 }}>
           {media.posterUrl ? (
             <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" />
           ) : (
             <div className="empty-poster text-center p-4">No Image</div>
           )}
         </div>
         <div>
           <h4 className="media-card-title">{media.canonicalTitle}</h4>
           <div className="media-card-meta">
             <span>{media.year}</span>
             {media.ratings?.find(r => r.provider === 'tmdb') && (
                <span className="media-card-rating">
                  ⭐ {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
                </span>
             )}
           </div>
           <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {media.genres.slice(0, 2).map((g) => (
                <span key={g} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>{g}</span>
              ))}
           </div>
         </div>
       </div>

       <div style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '12px 16px', borderTop: '1px solid rgba(124, 58, 237, 0.2)', flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--fg-subtle)',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {explanation}
            </span>
          </div>
       </div>
    </div>
  );

  // ── Phase 4: AI poster card renderer ──────────────────────────────────
  const renderAiCard = (rec: PersonalizedRecommendation, showSeedPill: boolean) => {
    const tmdbRating = rec.ratings.find(r => r.provider === 'tmdb');
    const isAdded = aiAddedIds.has(rec.tmdbId);

    return (
      <div
        key={rec.tmdbId || rec.title}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          cursor: rec.tmdbId ? 'pointer' : 'default',
          minWidth: 140,
          flex: '0 0 auto',
        }}
        onClick={() => {
          if (rec.tmdbId) {
            const media: MediaItem = {
              id: rec.tmdbId,
              canonicalTitle: rec.title,
              type: rec.type,
              year: rec.year,
              genres: [],
              ratings: rec.ratings,
              providers: [],
              posterUrl: rec.posterUrl || '',
            };
            setSelectedMedia(media);
          }
        }}
      >
        {/* Poster */}
        <div style={{ position: 'relative', aspectRatio: '2/3', background: 'var(--bg-sunken)' }}>
          {rec.posterUrl ? (
            <img
              src={rec.posterUrl}
              alt={rec.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--fg-subtle)', fontSize: 11, padding: 8,
              textAlign: 'center', lineHeight: 1.3,
            }}>
              {rec.title}
            </div>
          )}
          {tmdbRating && (
            <div style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.75)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              padding: '2px 5px', borderRadius: 4,
            }}>
              ★ {tmdbRating.score.toFixed(1)}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <div style={{
            fontWeight: 600, fontSize: 12, color: 'var(--fg-base)', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {rec.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
            {rec.year} · {rec.type === 'movie' ? 'Movie' : 'TV'}
          </div>
          <div style={{
            fontSize: 12, fontStyle: 'italic', color: 'var(--fg-subtle)',
            lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          }}>
            {rec.reason}
          </div>
          {showSeedPill && rec.seedTitle && (
            <div style={{
              fontSize: 10, color: 'var(--fg-subtle)',
              background: 'var(--bg-sunken)', border: '1px solid var(--border)',
              borderRadius: 99, padding: '2px 8px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              Because you liked {rec.seedTitle}
            </div>
          )}
          {rec.tmdbId && (
            <button
              disabled={isAdded}
              onClick={e => { e.stopPropagation(); addAiRecToLibrary(rec); }}
              style={{
                marginTop: 4, fontSize: 11, fontWeight: 600,
                background: isAdded ? 'var(--bg-sunken)' : 'var(--gold)',
                color: isAdded ? 'var(--fg-subtle)' : '#121212',
                border: 'none', borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                cursor: isAdded ? 'default' : 'pointer',
                transition: 'background 0.15s',
                alignSelf: 'flex-start',
              }}
            >
              {isAdded ? '✓ Added' : '+ Add'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const hasNoRecs = isGrouped ? groupedRecs.length === 0 : recs.length === 0;
  const hasEnoughHistory = watchProfile !== null && watchProfile.totalWatched >= 3;
  const topGenres = (watchProfile?.favoriteGenres || []).slice(0, 3);

  const groupedTmdbIds = new Set(
    (recGroups || []).flatMap(g => g.recommendations.map(r => r.tmdbId))
  );
  const ungroupedRecs = personalizedRecs.filter(r => !groupedTmdbIds.has(r.tmdbId));

  return (
    <div className="page-container">
      <style>{PULSE_STYLE}</style>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="page-title">Recommendations</h2>
          <span className="status-badge to-watch">Algorithm</span>
        </div>
        <p className="page-subtitle">Smart suggestions based on your library and preferences.</p>
      </header>

      {/* ── Existing rule-based section (unchanged) ── */}
      {loading ? (
        <div className="empty-state">
           <div className="subsume-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', width: 32, height: 32, borderWidth: 3}} />
           <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Analyzing library...</p>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {groupedRecs.map(({ seedTitle, recommendations }) => {
            const isCollapsed = collapsedGroups[seedTitle] || false;
            return (
              <div key={seedTitle} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                <div 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    cursor: 'pointer', userSelect: 'none',
                    marginBottom: isCollapsed ? '0px' : '16px'
                  }}
                  onClick={() => toggleGroup(seedTitle)}
                >
                  <span style={{ 
                    fontSize: '10px', color: 'var(--primary)',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                    transition: 'transform 0.2s ease', display: 'inline-block'
                  }}>▼</span>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--fg-base)', margin: 0 }}>
                    Because you watched <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>{seedTitle}</span>
                  </h3>
                </div>
                {!isCollapsed && (
                  <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {recommendations.map(r => renderMediaCard(r))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {recs.map(r => renderMediaCard(r))}
        </div>
      )}

      {/* ── Phase 4: AI Personalized Section ── */}
      <div style={{ marginTop: 48, borderTop: '1px solid var(--border)', paddingTop: 32 }}>

        {/* Profile context strip */}
        {watchProfile && (
          <p style={{
            fontSize: 11, color: 'var(--fg-subtle)',
            textAlign: 'center', marginBottom: 16, marginTop: 0,
          }}>
            Based on {watchProfile.totalWatched} film{watchProfile.totalWatched === 1 ? '' : 's'} watched
            {topGenres.length > 0 && ` · Top genres: ${topGenres.join(', ')}`}
          </p>
        )}

        {/* EMPTY STATE */}
        {!hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--fg-subtle)' }}>
            <p style={{ marginBottom: 4 }}>Start watching to unlock personalized picks.</p>
            <p style={{ fontSize: 12, fontStyle: 'italic' }}>Rate at least 3 films to help Subsume understand your taste.</p>
          </div>
        )}

        {/* GENERATE BUTTON */}
        {hasEnoughHistory && !recsLoading && personalizedRecs.length === 0 && !recsError && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <button
              onClick={generatePersonalized}
              style={{
                background: 'var(--gold)', color: '#121212',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '10px 24px', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
            >
              ✨ Get Personalized Recommendations
            </button>
          </div>
        )}

        {/* NO KEY STATE */}
        {recsError === 'no_key' && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: 'var(--fg-base)', marginBottom: 4 }}>No LLM provider configured.</p>
            <p style={{ color: 'var(--fg-subtle)', fontSize: 13, marginBottom: 12 }}>
              Add an API key in Settings to enable AI recommendations.
            </p>
            <button
              onClick={generatePersonalized}
              style={{ marginTop: 8, fontSize: 12, background: 'transparent', color: 'var(--fg-subtle)', border: 'none', cursor: 'pointer' }}
            >
              ↺ Retry
            </button>
          </div>
        )}

        {/* FAILED STATE */}
        {recsError === 'failed' && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: 'var(--fg-base)', marginBottom: 4 }}>Something went wrong with the AI provider.</p>
            <p style={{ color: 'var(--fg-subtle)', fontSize: 13, marginBottom: 12 }}>
              Check your API key in Settings and try again.
            </p>
            <button
              onClick={generatePersonalized}
              style={{
                marginTop: 8, background: 'var(--bg-elevated)', color: 'var(--fg-base)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '6px 16px', fontSize: 13, cursor: 'pointer',
              }}
            >
              ↺ Retry
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {recsLoading && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: '100%', height: 200,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  animation: 'subsume-pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, fontStyle: 'italic', color: 'var(--fg-subtle)' }}>
              Curating picks based on your taste...
            </p>
          </div>
        )}

        {/* RESULTS STATE */}
        {!recsLoading && personalizedRecs.length > 0 && (
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--fg-base)', fontSize: 15 }}>AI Picks for You</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {recGroups !== null && (
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
                    {(['grouped', 'flat'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        style={{
                          fontSize: 11, fontWeight: 600,
                          padding: '3px 10px', border: 'none',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          background: viewMode === mode ? 'var(--gold)' : 'transparent',
                          color: viewMode === mode ? '#000' : 'var(--fg-subtle)',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {mode === 'grouped' ? 'By Theme' : 'All Titles'}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={generatePersonalized}
                  style={{ fontSize: 12, background: 'transparent', color: 'var(--fg-subtle)', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ↺ Regenerate
                </button>
              </div>
            </div>

            {/* FLAT VIEW */}
            {(viewMode === 'flat' || recGroups === null) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {personalizedRecs.map(rec => renderAiCard(rec, true))}
              </div>
            )}

            {/* GROUPED VIEW */}
            {viewMode === 'grouped' && recGroups !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {recGroups.map(group => (
                  <div key={group.seedTitle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ display: 'inline-block', width: 3, height: '1.2em', background: 'var(--gold)', flexShrink: 0, alignSelf: 'center' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-base)' }}>
                        Because you loved {group.seedTitle}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' } as any}>
                      {group.recommendations.map(rec => renderAiCard(rec, false))}
                    </div>
                  </div>
                ))}
                {ungroupedRecs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-base)', marginBottom: 12 }}>More Picks</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                      {ungroupedRecs.map(rec => renderAiCard(rec, true))}
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
