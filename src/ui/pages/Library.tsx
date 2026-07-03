import { h, Fragment } from 'preact';
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, LibraryItem, LibraryStatus, GetLibraryPageRequest } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { logger } from '@/shared/logger';
import {
  JoinedItem,
  SortOption,
  IntentFilterOption,
  ArchiveHeader,
  IntentNavigation,
  ArchiveControls,
  TagFilterBar,
  HardcoverSpineCard,
} from '../components/archive';
import { EmptyStateProjection } from '../components/EmptyStateProjection';
import type { EmotionalSpectrum } from '@/shared/emotions';

export function Library() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [intentFilter, setIntentFilter] = useState<IntentFilterOption>('all');
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JoinedItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<LibraryStatus | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('added');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function fetchLibrary(page: number, append: boolean = false, isCancelled?: () => boolean) {
    if (page === 0 && !append) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const limit = 40;
      const offset = page * limit;
      const res = await sendMessage<GetLibraryPageRequest, JoinedItem[]>(MessageType.GET_LIBRARY_PAGE, {
        limit,
        offset,
        type: activeTab === 'movies' ? 'movie' : 'tv',
      });
      if (!isMountedRef.current || (isCancelled && isCancelled())) {
        return;
      }
      if (res.success && res.data) {
        setLoadError(false);
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
      } else {
        if (page === 0 && !append) {
          setLoadError(true);
        }
      }
    } catch (err: unknown) {
      logger.error('Failed to load library page', err);
      if (page === 0 && !append) {
        setLoadError(true);
      }
    } finally {
      if (isMountedRef.current && (!isCancelled || !isCancelled())) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    setCurrentPage(0);
    setHasMore(true);
    fetchLibrary(0, false, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const loadNextPage = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchLibrary(nextPage, true);
  };

  function updateLibraryItem(mediaId: string, patch: Partial<LibraryItem>) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.library.mediaId !== mediaId) return item;
        const hasDiff = Object.entries(patch).some(([k, v]) => (item.library as unknown as Record<string, unknown>)[k] !== v);
        return hasDiff ? { ...item, library: { ...item.library, ...patch } } : item;
      })
    );
    setSelectedItem((prev) => {
      if (!prev || prev.library.mediaId !== mediaId) return prev;
      const hasDiff = Object.entries(patch).some(([k, v]) => (prev.library as unknown as Record<string, unknown>)[k] !== v);
      return hasDiff ? { ...prev, library: { ...prev.library, ...patch } } : prev;
    });
  }

  async function updateStatus(mediaId: string, status: LibraryStatus) {
    setActionError(null);
    try {
      await sendMessage(MessageType.UPDATE_STATUS, { mediaId, status });
      if (isMountedRef.current) {
        updateLibraryItem(mediaId, { status });
      }
    } catch (err) {
      logger.error('Failed to update status', err);
      if (isMountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to update status.');
      }
    }
  }

  async function updateRating(mediaId: string, rating: number) {
    setActionError(null);
    try {
      await sendMessage(MessageType.SET_USER_RATING, { mediaId, rating });
      if (isMountedRef.current) {
        updateLibraryItem(mediaId, { userRating: rating });
      }
    } catch (err) {
      logger.error('Failed to update rating', err);
      if (isMountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to update rating.');
      }
    }
  }

  async function updateNotes(
    mediaId: string,
    notes: string,
    atmosphere?: string,
    lingeringThought?: string,
    emotions?: EmotionalSpectrum,
  ) {
    setActionError(null);
    try {
      await sendMessage(MessageType.SET_USER_NOTES, {
        mediaId,
        notes,
        atmosphere: atmosphere || undefined,
        lingeringThought: lingeringThought || undefined,
        awe: emotions?.awe,
        melancholy: emotions?.melancholy,
        tension: emotions?.tension,
        warmth: emotions?.warmth,
      });
      if (isMountedRef.current) {
        updateLibraryItem(mediaId, {
          notes: notes.trim() || undefined,
          atmosphere: atmosphere?.trim() || undefined,
          lingeringThought: lingeringThought?.trim() || undefined,
          awe: emotions?.awe,
          melancholy: emotions?.melancholy,
          tension: emotions?.tension,
          warmth: emotions?.warmth,
        });
      }
    } catch (err) {
      logger.error('Failed to update notes', err);
      if (isMountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to update notes.');
      }
    }
  }

  async function updateTags(mediaId: string, tags: string[]) {
    setActionError(null);
    try {
      await sendMessage(MessageType.SET_USER_TAGS, { mediaId, tags });
      if (isMountedRef.current) {
        updateLibraryItem(mediaId, { userTags: tags });
      }
    } catch (err) {
      logger.error('Failed to update tags', err);
      if (isMountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to update tags.');
      }
    }
  }

  async function removeItem(mediaId: string) {
    setActionError(null);
    try {
      await sendMessage(MessageType.REMOVE_FROM_LIBRARY, { mediaId });
      if (isMountedRef.current) {
        setItems((prev) => prev.filter((item) => item.library.mediaId !== mediaId));
        setRemoveConfirmId(null);
      }
    } catch (err) {
      logger.error('Failed to remove item', err);
      if (isMountedRef.current) {
        setActionError(err instanceof Error ? err.message : 'Failed to remove item from library.');
      }
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
        const itemIntent = library.sanctuaryIntent || 'wishlist';
        const matchesIntent = intentFilter === 'all' || itemIntent === intentFilter;
        const matchesSearch = !searchQuery ||
          (media?.canonicalTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (media?.genres || []).some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch && matchesTag && matchesIntent;
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
  }, [items, statusFilter, activeTagFilter, searchQuery, sortBy, intentFilter]);

  return (
    <div className="page-container">
      <ArchiveHeader />

      {actionError && (
        <div className="sanctuary-empty-plaque" style={{ maxWidth: 500, margin: '0 auto 24px', borderColor: 'var(--border-hero)' }}>
          <p className="sanctuary-plaque-text" style={{ color: 'var(--text-reflection)' }}>{actionError}</p>
        </div>
      )}

      <IntentNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        intentFilter={intentFilter}
        setIntentFilter={setIntentFilter}
      />

      <ArchiveControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="library-content" style={{ padding: '0 32px' }}>
        <TagFilterBar
          allTags={allTags}
          activeTagFilter={activeTagFilter}
          setActiveTagFilter={setActiveTagFilter}
        />

        {loading ? (
          <div className="library-skeleton-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-card" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : loadError ? (
          <div className="sanctuary-empty-plaque library-error-plaque">
            <span className="sanctuary-plaque-index">Archive Unreachable</span>
            <h3 className="sanctuary-plaque-title">Could not open your sanctuary</h3>
            <p className="sanctuary-plaque-text library-error-text">
              The archive could not be reached. Check your connection and try again.
            </p>
            <button
              onClick={() => fetchLibrary(0, false)}
              className="optical-button library-retry-btn"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyStateProjection
            className="library-empty-state"
            hint="Hover over titles while browsing or capture moments to populate your collection."
          />
        ) : (
          <Fragment>
            <div className="card-grid">
              {filteredAndSortedItems.map(({ library, media }) => (
                <HardcoverSpineCard
                  key={library.mediaId}
                  library={library}
                  media={media}
                  onSelect={() => setSelectedItem({ library, media })}
                  onUpdateStatus={updateStatus}
                  onUpdateRating={updateRating}
                  onRemoveItem={removeItem}
                  removeConfirmId={removeConfirmId}
                  setRemoveConfirmId={setRemoveConfirmId}
                />
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
          onUpdateNotes={(notes, atmosphere, lingeringThought, emotions) =>
            updateNotes(selectedItem.library.mediaId, notes, atmosphere, lingeringThought, emotions)
          }
        />
      )}
    </div>
  );
}
