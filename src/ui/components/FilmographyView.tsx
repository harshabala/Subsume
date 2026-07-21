import { h } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, PersonItem, MediaItem, LibraryItem, LibraryStatus } from '@/shared/types';
import { DetailModal } from './DetailModal';

export interface FilmographyProps {
  person: PersonItem;
  onBack: () => void;
  onUnfollow: () => void;
}

export function FilmographyView({ person: initialPerson, onBack, onUnfollow }: FilmographyProps) {
  const [filmography, setFilmography] = useState<MediaItem[]>([]);
  const [person, setPerson] = useState<PersonItem>(initialPerson);
  const [loading, setLoading] = useState(false);
  const [libraryMap, setLibraryMap] = useState<Record<string, LibraryItem>>({});
  const [bioExpanded, setBioExpanded] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

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
      const libRes = await sendMessage<Record<string, unknown>, { library: LibraryItem; media: MediaItem }[]>(
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
    const handleMessage = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && (message as Record<string, unknown>).type === 'FILMMAKERS_UPDATED' && (message as Record<string, unknown>).personId === person.id) {
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
      }).catch(() => {});
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

  return (
    <div className="page-container filmography-container">
      {/* Topbar */}
      <div className="filmography-topbar">
        <button type="button" onClick={onBack} className="filmography-filter-btn">
          ← Back to filmmakers
        </button>

        {confirmUnfollow ? (
          <div
            className="filmography-unfollow-confirm"
            role="group"
            aria-labelledby="filmography-unfollow-label"
            aria-describedby="filmography-unfollow-desc"
          >
            <span id="filmography-unfollow-label" className="filmography-unfollow-label">
              Unfollow {person.name}?
            </span>
            <span id="filmography-unfollow-desc" className="sr-only">
              Stop following this creator and remove them from your registry
            </span>
            <button
              type="button"
              className="filmography-filter-btn rescind"
              onClick={() => {
                onUnfollow();
                onBack();
              }}
            >
              Unfollow
            </button>
            <button
              type="button"
              className="filmography-filter-btn"
              onClick={() => setConfirmUnfollow(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmUnfollow(true)}
            className="filmography-filter-btn rescind"
          >
            Unfollow
          </button>
        )}
      </div>

      {/* Person Bio Card */}
      <div className="filmography-bio-card">
        <div className="filmography-avatar-wrap">
          {person.profileImageUrl ? (
            <img
              src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
              alt={person.name}
              className="filmography-avatar-img"
            />
          ) : (
            <div className="filmography-avatar-fallback">
              {person.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className="filmography-bio-main">
          <div className="filmography-bio-header">
            <div>
              <span className="filmography-bio-role">
                {person.role || 'Filmmaker'}
              </span>
              <h2 className="filmography-bio-name">{person.name}</h2>
            </div>
            <div className="filmography-sync-row">
              <span>{syncString}</span>
              <span>·</span>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="filmography-text-btn"
              >
                Refresh filmography
              </button>
            </div>
          </div>

          {person.biography ? (
            <div className="filmography-bio-text-wrap">
              <p className={`filmography-bio-p ${bioExpanded ? 'expanded' : ''}`}>
                {person.biography}
              </p>
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="filmography-text-btn"
              >
                {bioExpanded ? 'Show less' : 'Read more'}
              </button>
            </div>
          ) : (
            <p className="filmography-bio-empty">
              No biography on file yet.
            </p>
          )}

          {notInLibraryCount > 0 && (
            <div className="filmography-add-all-wrap">
              <button
                onClick={handleAddAll}
                disabled={addingAll || addedAll}
                className="filmography-add-all-btn"
              >
                {addingAll ? 'Adding to archive…' : addedAll ? 'All added to archive' : `Add all ${notInLibraryCount} to archive`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters and sorting Row */}
      <div className="filmography-filter-bar">
        <div className="filmography-filter-group">
          {(['all', 'movie', 'tv', 'library', 'unwatched'] as const).map((opt) => {
            const active = filter === opt;
            return (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`filmography-filter-btn ${active ? 'active' : ''}`}
              >
                {opt === 'all' ? 'Entire Strip' : opt === 'movie' ? 'Cinema' : opt === 'tv' ? 'Series' : opt === 'library' ? 'In Library' : 'Unviewed'}
              </button>
            );
          })}
        </div>

        <div className="filmography-sort-group">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as typeof sortBy)}
            className="filmography-sort-select"
          >
            <option value="year-desc">Chronological (Latest)</option>
            <option value="year-asc">Chronological (Earliest)</option>
            <option value="rating">Rating</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* Film Strip Presentation Grid */}
      {loading && sortedItems.length === 0 ? (
        <div className="filmography-grid-empty">Loading filmography…</div>
      ) : sortedItems.length === 0 ? (
        <div className="filmography-grid-empty">
          No titles match these filters.
        </div>
      ) : (
        <div className="filmography-grid">
          {sortedItems.map((item) => {
            const libItem = libraryMap[item.id];
            const tmdbRating = item.ratings.find((r) => r.provider === 'tmdb');
            const imdbRating = item.ratings.find((r) => r.provider === 'imdb');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMedia(item)}
                className="filmography-card"
                aria-label={`Open ${item.canonicalTitle}${item.year ? `, ${item.year}` : ''}`}
              >
                {/* Sprocket / Tick marks simulation border */}
                <div className="filmography-sprockets" aria-hidden="true">
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                </div>

                <div className="filmography-poster-wrap">
                  {imdbRating && (
                    <div className="filmography-badge-imdb">
                      IMDb {imdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {tmdbRating && (
                    <div className="filmography-badge-tmdb">
                      {tmdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="filmography-poster-img"
                    />
                  ) : (
                    <div className="filmography-poster-fallback">
                      {item.canonicalTitle}
                    </div>
                  )}

                  {libItem && (
                    <div className={`filmography-status-dot ${libItem.status}`} />
                  )}
                </div>

                {/* Sprocket / Tick marks bottom simulation */}
                <div className="filmography-sprockets bottom" aria-hidden="true">
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                  <span className="filmography-sprocket-hole" />
                </div>

                <div className="filmography-card-meta">
                  <span className="filmography-card-title">
                    {item.canonicalTitle}
                  </span>
                  <div className="filmography-card-info">
                    <span>{item.year || '—'}</span>
                    {libItem && libItem.status === 'watched' && libItem.userRating && (
                      <span className="filmography-card-rating">
                        {libItem.userRating}/10
                      </span>
                    )}
                  </div>
                </div>
              </button>
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
