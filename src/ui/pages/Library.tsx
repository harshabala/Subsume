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

export function Library() {
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [intentFilter, setIntentFilter] = useState<IntentFilterOption>('all');
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
    } catch (err: unknown) {
      logger.error('Failed to load library page', err);
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
    const res = await sendMessage(MessageType.UPDATE_STATUS, { mediaId, status });
    if (res.success && isMountedRef.current) {
      updateLibraryItem(mediaId, { status });
    }
  }

  async function updateRating(mediaId: string, rating: number) {
    const res = await sendMessage(MessageType.SET_USER_RATING, { mediaId, rating });
    if (res.success && isMountedRef.current) {
      updateLibraryItem(mediaId, { userRating: rating });
    }
  }

  async function updateNotes(mediaId: string, notes: string) {
    const res = await sendMessage(MessageType.SET_USER_NOTES, { mediaId, notes });
    if (res.success && isMountedRef.current) {
      updateLibraryItem(mediaId, { notes: notes.trim() || undefined });
    }
  }

  async function updateTags(mediaId: string, tags: string[]) {
    const res = await sendMessage(MessageType.SET_USER_TAGS, { mediaId, tags });
    if (res.success && isMountedRef.current) {
      updateLibraryItem(mediaId, { userTags: tags });
    }
  }

  async function removeItem(mediaId: string) {
    const res = await sendMessage(MessageType.REMOVE_FROM_LIBRARY, { mediaId });
    if (res.success && isMountedRef.current) {
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
          <div className="empty-state" style={{ padding: 0 }}>
            <div className="subsume-spinner" />
            <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>Gathering your sanctuary titles...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📖</div>
            <h3 className="empty-state-title" style={{ fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)' }}>Your archive is quiet</h3>
            <p className="empty-state-description">
              A blank canvas waiting for titles that leave an imprint on your memory.
            </p>
            <p className="empty-state-hint" style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 400 }}>
              Hover over titles while browsing or capture moments to populate your collection.
            </p>
          </div>
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
          onUpdateNotes={(notes) => updateNotes(selectedItem.library.mediaId, notes)}
        />
      )}
    </div>
  );
}
