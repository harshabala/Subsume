import { h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, PersonItem, MediaItem, LibraryItem, LibraryStatus } from '@/shared/types';
import { DetailModal } from './DetailModal';

export interface FilmographyProps {
  person: PersonItem;
  onBack: () => void;
  onUnfollow: (e: MouseEvent) => void;
}

export function FilmographyView({ person: initialPerson, onBack, onUnfollow }: FilmographyProps) {
  const [filmography, setFilmography] = useState<MediaItem[]>([]);
  const [person, setPerson] = useState<PersonItem>(initialPerson);
  const [loading, setLoading] = useState(false);
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryItem>>({});
  const [bioExpanded, setBioExpanded] = useState(false);
  
  // Modal selected item
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Add all watchlist states
  const [addingAll, setAddingAll] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  // Filters and sorts
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv' | 'library' | 'unwatched'>('all');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'rating' | 'title'>('year-desc');

  const loadFilmography = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sendMessage<{ personId: string }, { items: MediaItem[]; person: PersonItem }>(
        MessageType.GET_FILMOGRAPHY,
        { personId: initialPerson.id }
      );
      const libRes = await sendMessage<any, { library: LibraryItem; media: MediaItem }[]>(
        MessageType.GET_LIBRARY,
        {}
      );

      if (res.success && res.data) {
        setFilmography(res.data.items);
        setPerson(res.data.person || initialPerson);
      }
      if (libRes.success && libRes.data) {
        const map: Record<string, LibraryItem> = {};
        for (const item of libRes.data) {
          map[item.library.mediaId] = item.library;
        }
        setLibraryMap(map);
      }
    } catch (err) {
      console.error('[Subsume] Failed to load filmography details:', err);
    } finally {
      setLoading(false);
    }
  }, [initialPerson]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message && message.type === 'FILMMAKERS_UPDATED' && message.personId === person.id) {
        loadFilmography();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [person.id, loadFilmography]);

  useEffect(() => {
    loadFilmography();

    // Silently sync if lastSyncedAt is 0 or older than 7 days
    const sevenDaysMs = 1000 * 60 * 60 * 24 * 7;
    if (initialPerson.lastSyncedAt === 0 || Date.now() - initialPerson.lastSyncedAt > sevenDaysMs) {
      sendMessage<{ personId: string }, { synced: number }>(MessageType.SYNC_FILMOGRAPHY, {
        personId: initialPerson.id,
      }).then((res) => {
        if (res.success) {
          loadFilmography();
        }
      });
    }
  }, [initialPerson, loadFilmography]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const syncRes = await sendMessage<{ personId: string }, { synced: number }>(
        MessageType.SYNC_FILMOGRAPHY,
        { personId: person.id }
      );
      if (syncRes.success) {
        await loadFilmography();
      }
    } catch (err) {
      console.error('[Subsume] Sync failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const notInLibraryCount = useMemo(() => {
    return filmography.filter((item) => !libraryMap[item.id]).length;
  }, [filmography, libraryMap]);

  const handleAddAll = async () => {
    const unadded = filmography.filter((item) => !libraryMap[item.id]);
    if (unadded.length === 0) return;
    setAddingAll(true);
    try {
      // Process sequentially to protect IndexedDB and Chrome message ports from flooding
      for (const item of unadded) {
        await sendMessage(MessageType.ADD_TO_LIST, {
          mediaItem: item,
          type: item.type,
        });
      }
      setAddedAll(true);
      await loadFilmography();
    } catch (err) {
      console.error('[Subsume] Failed to add all to watchlist:', err);
    } finally {
      setAddingAll(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return filmography.filter((item) => {
      const inLibrary = !!libraryMap[item.id];
      if (filter === 'movie') return item.type === 'movie';
      if (filter === 'tv') return item.type === 'tv';
      if (filter === 'library') return inLibrary;
      if (filter === 'unwatched') {
        const isWatched = libraryMap[item.id]?.status === 'watched';
        return !isWatched;
      }
      return true;
    });
  }, [filmography, filter, libraryMap]);

  // Sort items
  const sortedItems = useMemo(() => {
    const items = [...filteredItems];
    items.sort((a, b) => {
      if (sortBy === 'year-desc') {
        return b.year - a.year;
      }
      if (sortBy === 'year-asc') {
        return a.year - b.year;
      }
      if (sortBy === 'rating') {
        const aScore = a.ratings.find((r) => r.provider === 'tmdb')?.score || 0;
        const bScore = b.ratings.find((r) => r.provider === 'tmdb')?.score || 0;
        return bScore - aScore;
      }
      if (sortBy === 'title') {
        return a.canonicalTitle.localeCompare(b.canonicalTitle, undefined, { sensitivity: 'base' });
      }
      return 0;
    });
    return items;
  }, [filteredItems, sortBy]);

  // Formatted last synced time string
  const syncString = useMemo(() => {
    if (person.lastSyncedAt === 0) return 'Syncing...';
    const deltaMs = Date.now() - person.lastSyncedAt;
    const deltaDays = Math.floor(deltaMs / (1000 * 60 * 60 * 24));
    if (deltaDays === 0) return 'Synced today';
    if (deltaDays === 1) return 'Synced 1 day ago';
    return `Synced ${deltaDays} days ago`;
  }, [person.lastSyncedAt]);

  // DetailModal status/rating helpers
  const handleUpdateStatus = async (mediaId: string, status: LibraryStatus) => {
    const res = await sendMessage(MessageType.UPDATE_STATUS, { mediaId, status });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], mediaId, status, updatedAt: Date.now(), addedAt: prev[mediaId]?.addedAt || Date.now() },
      }));
    }
  };

  const handleUpdateRating = async (mediaId: string, rating: number) => {
    const res = await sendMessage(MessageType.SET_USER_RATING, { mediaId, rating });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], userRating: rating },
      }));
    }
  };

  const handleUpdateTags = async (mediaId: string, tags: string[]) => {
    const res = await sendMessage(MessageType.SET_USER_TAGS, { mediaId, tags });
    if (res.success) {
      setLibraryMap((prev) => ({
        ...prev,
        [mediaId]: { ...prev[mediaId], userTags: tags },
      }));
    }
  };

  const btnRestraintStyle = {
    background: 'transparent',
    border: '1px solid var(--border-restraint)',
    color: 'var(--text-reflection)',
    padding: '8px 18px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const btnGoldStyle = {
    background: 'var(--border-hero)',
    border: 'none',
    color: 'hsl(240, 18%, 5%)',
    padding: '10px 24px',
    borderRadius: 2,
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  return (
    <div className="page-container filmography-container" style={{ background: 'var(--bg-sanctuary)', minHeight: '100vh', color: 'var(--text-artwork)', paddingBottom: 64 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <button onClick={onBack} style={btnRestraintStyle}>
          ← Archival Index
        </button>

        <button onClick={(e) => { onUnfollow(e); onBack(); }} style={{ ...btnRestraintStyle, color: 'hsl(0, 60%, 65%)' }}>
          Rescind Surveillance (Unfollow)
        </button>
      </div>

      {/* Person Bio Card */}
      <div
        style={{
          background: 'var(--bg-plaque)',
          border: '1px solid var(--border-hero)',
          borderRadius: 4,
          padding: 32,
          marginBottom: 36,
          backdropFilter: 'var(--blur-hero)',
          display: 'flex',
          gap: 32,
          flexWrap: 'wrap',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ width: 140, height: 140, flexShrink: 0, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border-restraint)', background: 'hsl(240, 18%, 6%)' }}>
          {person.profileImageUrl ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
              alt={person.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 36, color: 'var(--border-hero)' }}>
              {person.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--border-hero)', display: 'block', marginBottom: 4 }}>
                {person.role || 'Auteur Sanctum'}
              </span>
              <h2 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 32, fontWeight: 400, color: 'var(--text-sanctuary)', margin: 0 }}>{person.name}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <span>{syncString}</span>
              <span>·</span>
              <button
                onClick={handleRefresh}
                disabled={loading}
                style={{ background: 'transparent', border: 'none', color: 'var(--border-hero)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', padding: 0 }}
              >
                Re-Index
              </button>
            </div>
          </div>

          {person.biography ? (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: 'var(--font-editorial)', fontSize: 15, lineHeight: 1.6, color: 'var(--text-reflection)', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: bioExpanded ? 'none' : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {person.biography}
              </p>
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                style={{ background: 'transparent', border: 'none', color: 'var(--border-hero)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', padding: 0 }}
              >
                {bioExpanded ? 'Fold Inscription' : 'Expand Inscription'}
              </button>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 14, color: 'var(--text-meta)', margin: '16px 0 0 0' }}>
              No biographical dossier recorded.
            </p>
          )}

          {notInLibraryCount > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid var(--border-restraint)', paddingTop: 16 }}>
              <button
                onClick={handleAddAll}
                disabled={addingAll || addedAll}
                style={btnGoldStyle}
              >
                {addingAll ? 'Inscribing Ledger...' : addedAll ? 'Sanctuary Ledger Updated' : `Enroll all ${notInLibraryCount} works into sanctuary`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters and sorting Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border-restraint)', paddingBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['all', 'movie', 'tv', 'library', 'unwatched'] as const).map((opt) => {
            const active = filter === opt;
            return (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                style={{
                  background: active ? 'hsla(43, 74%, 49%, 0.1)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-hero)' : 'var(--border-restraint)'}`,
                  color: active ? 'var(--border-hero)' : 'var(--text-reflection)',
                  padding: '6px 14px',
                  borderRadius: 2,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  cursor: 'pointer'
                }}
              >
                {opt === 'all' ? 'Entire Strip' : opt === 'movie' ? 'Cinema' : opt === 'tv' ? 'Series' : opt === 'library' ? 'In Library' : 'Unviewed'}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-meta)' }}>
          <span>Projection Ordering:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
            style={{
              background: 'hsla(0, 0%, 100%, 0.03)',
              border: '1px solid var(--border-restraint)',
              color: 'var(--text-sanctuary)',
              padding: '6px 12px',
              borderRadius: 2,
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="year-desc" style={{ background: 'hsl(240, 18%, 8%)' }}>Chronological (Latest)</option>
            <option value="year-asc" style={{ background: 'hsl(240, 18%, 8%)' }}>Chronological (Earliest)</option>
            <option value="rating" style={{ background: 'hsl(240, 18%, 8%)' }}>Critical Resonance</option>
            <option value="title" style={{ background: 'hsl(240, 18%, 8%)' }}>Inscription A–Z</option>
          </select>
        </div>
      </div>

      {/* Film Strip Presentation Grid */}
      {loading && sortedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-meta)' }}>Inspecting archival reel...</div>
      ) : sortedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-meta)' }}>
          No cinematic frames match current projection specifications.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 24 }}>
          {sortedItems.map((item) => {
            const libItem = libraryMap[item.id];
            const tmdbRating = item.ratings.find((r) => r.provider === 'tmdb');
            const imdbRating = item.ratings.find((r) => r.provider === 'imdb');

            return (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                style={{
                  background: 'var(--bg-plaque)',
                  border: '1px solid var(--border-restraint)',
                  borderRadius: 2,
                  padding: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
              >
                {/* Sprocket / Tick marks simulation border */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, opacity: 0.3 }}>
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                </div>

                <div style={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '2/3', background: 'hsl(240, 18%, 6%)' }}>
                  {imdbRating && (
                    <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, background: 'rgba(5,5,8,0.85)', border: '1px solid var(--border-restraint)', color: 'var(--text-sanctuary)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2 }}>
                      IMDb {imdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {tmdbRating && (
                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, background: 'rgba(5,5,8,0.85)', border: '1px solid var(--border-hero)', color: 'var(--border-hero)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2 }}>
                      {tmdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.canonicalTitle}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, textAlign: 'center', fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 13, color: 'var(--text-meta)' }}>
                      {item.canonicalTitle}
                    </div>
                  )}

                  {libItem && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: libItem.status === 'watched' ? 'var(--border-hero)' : libItem.status === 'watching' ? 'hsl(140, 60%, 50%)' : 'hsl(0, 0%, 80%)',
                        boxShadow: '0 0 6px var(--border-hero)'
                      }}
                    />
                  )}
                </div>

                {/* Sprocket / Tick marks bottom simulation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 8, opacity: 0.3 }}>
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                  <span style={{ width: 6, height: 2, background: 'var(--border-hero)' }} />
                </div>

                <div style={{ padding: '0 4px 4px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <h4 style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 15, fontWeight: 400, color: 'var(--text-sanctuary)', margin: '0 0 6px 0', lineHeight: 1.2 }}>
                    {item.canonicalTitle}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-meta)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <span>{item.year || '—'}</span>
                    {libItem && libItem.status === 'watched' && libItem.userRating && (
                      <span style={{ color: 'var(--border-hero)', fontWeight: 600 }}>
                        {libItem.userRating}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          libraryItem={libraryMap[selectedMedia.id]}
          onClose={() => setSelectedMedia(null)}
          onUpdateStatus={(status) => handleUpdateStatus(selectedMedia.id, status)}
          onUpdateRating={(rating) => handleUpdateRating(selectedMedia.id, rating)}
          onUpdateTags={(tags) => handleUpdateTags(selectedMedia.id, tags)}
          onAddToLibrary={async () => {
            await sendMessage(MessageType.ADD_TO_LIST, {
              mediaItem: selectedMedia,
              type: selectedMedia.type,
            });
            await loadFilmography();
          }}
        />
      )}
    </div>
  );
}
