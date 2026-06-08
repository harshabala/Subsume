import { h, Fragment } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, MediaItem, LibraryStatus, GetLibraryPageRequest } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Want to Watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'abandoned', label: 'Abandoned' },
];

type SortOption = 'added' | 'rating' | 'title' | 'year';

export function Library() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JoinedItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('added');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  async function fetchLibrary(page: number, append: boolean = false) {
    if (page === 0 && !append) {
      setLoading(true);
    }
    try {
      const limit = 40;
      const offset = page * limit;
      const res = await sendMessage<GetLibraryPageRequest, JoinedItem[]>(MessageType.GET_LIBRARY_PAGE, {
        limit,
        offset,
        type: activeTab === 'movies' ? 'movie' : 'tv',
      });
      if (res.success && res.data) {
        if (append) {
          setItems((prev) => [...prev, ...res.data!]);
        } else {
          setItems(res.data);
        }
        
        if (res.data.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (err) {
      console.error('Failed to load library page', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchLibrary(0, false);
  }, [activeTab]);

  const loadNextPage = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchLibrary(nextPage, true);
  };

  async function updateStatus(mediaId: string, status: LibraryStatus) {
    const res = await sendMessage(MessageType.UPDATE_STATUS, { mediaId, status });
    if (res.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.library.mediaId === mediaId
            ? { ...item, library: { ...item.library, status } }
            : item
        )
      );
      setSelectedItem(prev => {
        if (prev && prev.library.mediaId === mediaId) {
          return { ...prev, library: { ...prev.library, status } };
        }
        return prev;
      });
    }
  }

  async function updateRating(mediaId: string, rating: number) {
    const res = await sendMessage(MessageType.SET_USER_RATING, { mediaId, rating });
    if (res.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.library.mediaId === mediaId
            ? { ...item, library: { ...item.library, userRating: rating } }
            : item
        )
      );
      setSelectedItem(prev => {
        if (prev && prev.library.mediaId === mediaId) {
          return { ...prev, library: { ...prev.library, userRating: rating } };
        }
        return prev;
      });
    }
  }

  async function updateNotes(mediaId: string, notes: string) {
    const res = await sendMessage(MessageType.SET_USER_NOTES, { mediaId, notes });
    if (res.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.library.mediaId === mediaId
            ? { ...item, library: { ...item.library, notes: notes.trim() || undefined } }
            : item
        )
      );
      setSelectedItem((prev) => {
        if (prev && prev.library.mediaId === mediaId) {
          return { ...prev, library: { ...prev.library, notes: notes.trim() || undefined } };
        }
        return prev;
      });
    }
  }

  async function updateTags(mediaId: string, tags: string[]) {
    const res = await sendMessage(MessageType.SET_USER_TAGS, { mediaId, tags });
    if (res.success) {
      setItems((prev) =>
        prev.map((item) =>
          item.library.mediaId === mediaId
            ? { ...item, library: { ...item.library, userTags: tags } }
            : item
        )
      );
      setSelectedItem(prev => {
        if (prev && prev.library.mediaId === mediaId) {
          return { ...prev, library: { ...prev.library, userTags: tags } };
        }
        return prev;
      });
    }
  }

  async function removeItem(mediaId: string) {
    const res = await sendMessage(MessageType.REMOVE_FROM_LIBRARY, { mediaId });
    if (res.success) {
      setItems((prev) => prev.filter((item) => item.library.mediaId !== mediaId));
      setRemoveConfirmId(null);
    }
  }

  const allTags = Array.from(
    new Set(items.flatMap((item) => item.library.userTags || []))
  );

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter(({ library, media }) => {
        const matchesStatus = !statusFilter || library.status === statusFilter;
        const matchesTag = !activeTagFilter || (library.userTags && library.userTags.includes(activeTagFilter));
        const matchesSearch = !searchQuery ||
          (media?.canonicalTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (media?.genres || []).some(g => g.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch && matchesTag;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return (b.library.userRating || 0) - (a.library.userRating || 0);
          case 'title':
            return (a.media?.canonicalTitle || '').localeCompare(b.media?.canonicalTitle || '', undefined, { sensitivity: 'base' });
          case 'year':
            return (b.media?.year || 0) - (a.media?.year || 0);
          case 'added':
          default:
            return b.library.addedAt - a.library.addedAt;
        }
      });
  }, [items, statusFilter, activeTagFilter, searchQuery, sortBy]);

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">Your Library</h2>
        <p className="page-subtitle">Manage everything you want to watch or have watched.</p>
      </header>

      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          Movies
        </button>
        <button
          className={`tab-item ${activeTab === 'tv' ? 'active' : ''}`}
          onClick={() => setActiveTab('tv')}
        >
          TV Shows
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '0 32px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search your library..."
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 12px',
            background: 'var(--color-surface-hover)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value as LibraryStatus | '')}
          style={{
            padding: '8px 12px',
            background: 'var(--color-surface-hover)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option value={opt.value} key={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortOption)}
          style={{
            padding: '8px 12px',
            background: 'var(--color-surface-hover)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <option value="added">Date Added</option>
          <option value="rating">Your Rating</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="library-content" style={{ padding: '0 32px' }}>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Filter:</span>
            <span
              onClick={() => setActiveTagFilter('')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                background: activeTagFilter === '' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: activeTagFilter === '' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                cursor: 'pointer',
                color: activeTagFilter === '' ? 'var(--color-surface)' : 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              All
            </span>
            {allTags.map((tag) => (
              <span
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? '' : tag)}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  background: activeTagFilter === tag ? 'var(--primary)' : 'rgba(201, 168, 76, 0.05)',
                  border: activeTagFilter === tag ? '1px solid var(--primary)' : '1px solid rgba(201, 168, 76, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  color: activeTagFilter === tag ? 'var(--color-surface)' : 'var(--primary)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state" style={{ padding: 0 }}>
            <div className="subsume-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#a78bfa', width: 32, height: 32, borderWidth: 3}} />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Gathering your watchlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍿</div>
            <h3 className="empty-state-title">Your library is a ghost town</h3>
            <p className="empty-state-description">
              Enjoy this moment of peace before you add 500 titles you promise to watch but never actually get to.
            </p>
            <p className="empty-state-hint" style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 400 }}>
              Hover over titles while browsing or search manually to populate your list.
            </p>
          </div>
        ) : (
          <Fragment>
            <div className="card-grid">
              {filteredAndSortedItems.map(({ library, media }) => (
                 <div key={library.mediaId} className="media-card" onClick={() => setSelectedItem({ library, media })} style={{ cursor: 'pointer' }}>
                  <div className="media-card-poster">
                    {media?.posterUrl ? (
                      <img src={media.posterUrl} alt={media.canonicalTitle} loading="lazy" />
                    ) : (
                      <div className="empty-poster text-center p-4">No Image</div>
                    )}
                  </div>
                  <div className="media-card-body">
                    <h4 className="media-card-title">{media?.canonicalTitle || 'Unknown Title'}</h4>
                    <div className="media-card-meta">
                      <span>{media?.year}</span>
                      {media?.ratings?.find(r => r.provider === 'tmdb') && (
                         <span className="media-card-rating">
                           ⭐ {media.ratings.find(r => r.provider === 'tmdb')!.score.toFixed(1)}
                         </span>
                      )}
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                       <select
                         value={library.status}
                         onChange={(e) => updateStatus(library.mediaId, (e.target as HTMLSelectElement).value as LibraryStatus)}
                         onClick={(e) => e.stopPropagation()}
                        style={{
                          background: 'var(--color-surface-elevated)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 6,
                          padding: '6px 8px',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option value={opt.value} key={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      {library.status === 'watched' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Your rating:</span>
                           <input
                             type="range"
                             min={1}
                             max={10}
                             step={1}
                             value={library.userRating || 5}
                             onChange={(e) => updateRating(library.mediaId, parseInt((e.target as HTMLInputElement).value, 10))}
                             onClick={(e) => e.stopPropagation()}
                             style={{ flex: 1, cursor: 'pointer' }}
                           />
                          <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
                            {library.userRating || 5}
                          </span>
                        </div>
                      )}

                      {removeConfirmId === library.mediaId ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Remove?</span>
                           <button
                             className="btn btn-primary"
                             style={{ padding: '4px 10px', fontSize: 12 }}
                             onClick={(e) => { e.stopPropagation(); removeItem(library.mediaId); }}
                           >
                             Yes
                           </button>
                           <button
                             className="btn btn-secondary"
                             style={{ padding: '4px 10px', fontSize: 12 }}
                             onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(null); }}
                           >
                             No
                           </button>
                        </div>
                      ) : (
                         <button
                           className="btn btn-secondary"
                           style={{ padding: '4px 10px', fontSize: 12, alignSelf: 'flex-start' }}
                           onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(library.mediaId); }}
                         >
                           🗑️ Remove
                         </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', marginBottom: '16px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={loadNextPage}
                  style={{ padding: '10px 24px', fontSize: '14px', minWidth: '150px' }}
                >
                  Load more
                </button>
              </div>
            )}
          </Fragment>
        )}
      </div>

      {selectedItem && (
        <DetailModal
          media={selectedItem.media}
          libraryItem={selectedItem.library}
          onClose={() => setSelectedItem(null)}
          onUpdateStatus={(status) => updateStatus(selectedItem.library.mediaId, status)}
          onUpdateRating={(rating) => updateRating(selectedItem.library.mediaId, rating)}
          onUpdateTags={(tags) => updateTags(selectedItem.library.mediaId, tags)}
          onUpdateNotes={(notes) => updateNotes(selectedItem.library.mediaId, notes)}
        />
      )}
    </div>
  );
}
