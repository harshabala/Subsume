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

  return (
    <div className="page-container filmography-container">
      {/* Header */}
      <div className="filmography-topbar">
        <button onClick={onBack} className="filmography-back-btn">
          ← Back
        </button>

        <button onClick={(e) => { onUnfollow(e); onBack(); }} className="filmography-unfollow-btn">
          Unfollow
        </button>
      </div>

      {/* Person Bio Card */}
      <div className="filmography-bio-card">
        {person.profileImageUrl ? (
          <img
            src={`https://image.tmdb.org/t/p/w185${person.profileImageUrl}`}
            alt={person.name}
            className="filmography-bio-photo"
          />
        ) : (
          <div className="filmography-bio-placeholder">
            {person.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}

        <div className="filmography-bio-content">
          <div className="filmography-bio-header">
            <h2 className="filmography-bio-name">{person.name}</h2>
            <span className="filmography-bio-role">
              {person.role}
            </span>
          </div>

          <div className="filmography-bio-meta">
            <span>{syncString}</span>
            <span>·</span>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="filmography-bio-refresh"
            >
              Refresh
            </button>
          </div>

          {person.biography ? (
            <div className="filmography-bio-text-wrapper">
              <p className={`filmography-bio-text ${bioExpanded ? 'expanded' : ''}`}>
                {person.biography}
              </p>
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="filmography-bio-expand"
              >
                {bioExpanded ? 'Read less' : 'Read more'}
              </button>
            </div>
          ) : (
            <p className="filmography-bio-empty">
              No biography available.
            </p>
          )}

          {/* Add all watchlist button */}
          {notInLibraryCount > 0 && (
            <button
              onClick={handleAddAll}
              disabled={addingAll || addedAll}
              className="btn btn-primary filmography-add-all"
            >
              {addingAll ? 'Adding...' : addedAll ? 'Added!' : `Add all ${notInLibraryCount} titles to watchlist`}
            </button>
          )}
        </div>
      </div>

      {/* Filters and sorting Row */}
      <div className="filmography-filter-row">
        {/* Filter chips */}
        <div className="filmography-filter-chips">
          {(['all', 'movie', 'tv', 'library', 'unwatched'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`filmography-filter-chip ${filter === opt ? 'active' : ''}`}
            >
              {opt === 'all' ? 'All' : opt === 'movie' ? 'Movies' : opt === 'tv' ? 'TV' : opt === 'library' ? 'In Library' : 'Unwatched'}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="filmography-sort-wrapper">
          <span className="filmography-sort-label">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as any)}
            className="filmography-sort-select"
          >
            <option value="year-desc">Year (desc)</option>
            <option value="year-asc">Year (asc)</option>
            <option value="rating">Rating</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {/* Poster Grid */}
      {loading && sortedItems.length === 0 ? (
        <div className="people-loading">Loading filmography...</div>
      ) : sortedItems.length === 0 ? (
        <div className="people-empty-state" style={{ fontStyle: 'italic' }}>
          No titles found matching current filters.
        </div>
      ) : (
        <div className="card-grid people-content">
          {sortedItems.map((item) => {
            const libItem = libraryMap[item.id];
            const tmdbRating = item.ratings.find((r) => r.provider === 'tmdb');
            const imdbRating = item.ratings.find((r) => r.provider === 'imdb');

            return (
              <div
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="filmography-poster-card"
              >
                <div className="filmography-poster-wrapper">
                  {/* Top Left Badge: IMDb score */}
                  {imdbRating && (
                    <div className="filmography-poster-imdb">
                      IMDb {imdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {/* Top Right Badge: TMDb score */}
                  {tmdbRating && (
                    <div className="filmography-poster-tmdb">
                      ★ {tmdbRating.score.toFixed(1)}
                    </div>
                  )}

                  {/* Poster Image */}
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.canonicalTitle}
                      loading="lazy"
                      className="filmography-poster-img"
                    />
                  ) : (
                    <div className="filmography-poster-placeholder">
                      {item.canonicalTitle}
                    </div>
                  )}

                  {/* Bottom Overlay Dot Indicator */}
                  {libItem && (
                    <div
                      className={`filmography-poster-dot status-${libItem.status}`}
                    />
                  )}
                </div>

                {/* Poster Footer: Title & meta */}
                <h4 className="filmography-poster-title">
                  {item.canonicalTitle}
                </h4>
                <div className="filmography-poster-footer">
                  <span className="filmography-poster-year">{item.year || '—'}</span>
                  {libItem && libItem.status === 'watched' && libItem.userRating && (
                    <span className="filmography-poster-user-rating">
                      ★ {libItem.userRating}/10
                    </span>
                  )}
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
