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
import type { CollectionFilter, MediumFilter } from '../components/archive/IntentNavigation';
import { resolveSanctuaryIntent } from '../components/archive/constants';
import { EmptyStateProjection } from '../components/EmptyStateProjection';
import type { EmotionalSpectrum } from '@/shared/emotions';
import type { MediaType } from '@/shared/types';

function mediumFilterToType(filter: MediumFilter): MediaType | undefined {
  if (filter === 'movies') return 'movie';
  if (filter === 'tv') return 'tv';
  if (filter === 'books') return 'book';
  // 'all' and 'screen' — no single type; client-side filter for screen
  return undefined;
}

export function Library() {
  const [activeTab, setActiveTab] = useState<MediumFilter>('all');
  const [intentFilter, setIntentFilter] = useState<IntentFilterOption>('all');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all');
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JoinedItem | null>(null);
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
      const type = mediumFilterToType(activeTab);
      const res = await sendMessage<GetLibraryPageRequest, JoinedItem[]>(MessageType.GET_LIBRARY_PAGE, {
        limit,
        offset,
        type,
      });
      if (!isMountedRef.current || (isCancelled && isCancelled())) {
        return;
      }
      if (res.success && res.data) {
        setLoadError(false);
        let pageItems = res.data;
        // Client-side medium filters when type is broad
        if (activeTab === 'screen') {
          pageItems = pageItems.filter((i) => i.media?.type === 'movie' || i.media?.type === 'tv');
        } else if (activeTab === 'all') {
          // keep all
        }
        if (append) {
          setItems((prev) => [...prev, ...pageItems]);
        } else {
          setItems(pageItems);
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

  const filtersActive =
    collectionFilter !== 'all' ||
    intentFilter !== 'all' ||
    !!activeTagFilter ||
    searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setCollectionFilter('all');
    setIntentFilter('all');
    setActiveTagFilter('');
    setSearchQuery('');
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter(({ library, media }) => {
        const matchesCollection =
          collectionFilter === 'all' || library.status === collectionFilter;
        const matchesTag = !activeTagFilter || (library.userTags && library.userTags.includes(activeTagFilter));
        const itemIntent = resolveSanctuaryIntent(library);
        const matchesIntent = intentFilter === 'all' || itemIntent === intentFilter;
        const matchesSearch = !searchQuery ||
          (media?.canonicalTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (media?.genres || []).some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCollection && matchesSearch && matchesTag && matchesIntent;
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
  }, [items, collectionFilter, activeTagFilter, searchQuery, sortBy, intentFilter]);

  const emptyCopy = (() => {
    if (activeTab === 'books') {
      return {
        title: 'No books inscribed yet',
        message: 'When a title stays with you, open its page and leave the first inscription.',
        hint: 'Browse any page for a book that holds you, or search the catalogue.',
      };
    }
    if (activeTab === 'screen' || activeTab === 'movies' || activeTab === 'tv') {
      const screenNoun =
        activeTab === 'tv' ? 'series' : activeTab === 'movies' ? 'films' : 'titles';
      return {
        title: `No ${screenNoun} inscribed yet`,
        message: 'Open any title page and leave the first inscription before the moment passes.',
        hint: 'Browse on the web or capture a moment to enrol your first frame.',
      };
    }
    return {
      title: 'Nothing inscribed yet',
      message: 'Films, shows, and books you keep live here as inscriptions in a private vault.',
      hint: 'Browse titles on the web or capture a moment to leave your first mark.',
    };
  })();

  return (
    <div className="page-container">
      <ArchiveHeader />

      {actionError && (
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque">
          <p className="sanctuary-plaque-text sanctuary-notice-plaque-text">{actionError}</p>
        </div>
      )}

      <IntentNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        intentFilter={intentFilter}
        setIntentFilter={setIntentFilter}
        collectionFilter={collectionFilter}
        setCollectionFilter={setCollectionFilter}
      />

      <ArchiveControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
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
            <span className="sanctuary-plaque-index">Vault unreachable</span>
            <h3 className="sanctuary-plaque-title">Could not open the archive</h3>
            <p className="sanctuary-plaque-text library-error-text">
              The vault could not be reached. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => fetchLibrary(0, false)}
              className="optical-button library-retry-btn"
            >
              Try Again
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyStateProjection
            className="library-empty-state"
            title={emptyCopy.title}
            message={emptyCopy.message}
            hint={emptyCopy.hint}
          />
        ) : filteredAndSortedItems.length === 0 ? (
          <EmptyStateProjection
            className="library-empty-state library-filtered-empty"
            title="No inscriptions match"
            message="These filters leave the shelf empty. Broaden the view, or clear them to see what you have already kept."
            hint={
              hasMore
                ? 'Filters apply to titles already loaded. Load more of the vault if you expect a match further down.'
                : undefined
            }
            actionLabel="Clear filters"
            onAction={clearAllFilters}
          />
        ) : (
          <Fragment>
            <div className="archive-results-meta" aria-live="polite">
              <span className="archive-results-count">
                {filteredAndSortedItems.length === items.length
                  ? `${filteredAndSortedItems.length} inscription${filteredAndSortedItems.length === 1 ? '' : 's'}`
                  : `${filteredAndSortedItems.length} of ${items.length} inscriptions`}
                {hasMore ? ' loaded' : ''}
              </span>
              {filtersActive && (
                <button
                  type="button"
                  className="archive-clear-filters-btn"
                  onClick={clearAllFilters}
                >
                  Clear filters
                </button>
              )}
            </div>

            {filtersActive && hasMore && (
              <p className="archive-pagination-note">
                Filters apply to titles already opened from the vault. Load more to search deeper.
              </p>
            )}

            <div className="card-grid">
              {filteredAndSortedItems.map(({ library, media }, index) => (
                <HardcoverSpineCard
                  key={library.mediaId}
                  library={library}
                  media={media}
                  index={index}
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
              <div className="archive-load-more-wrap">
                <button
                  type="button"
                  className="optical-button archive-load-more-btn"
                  onClick={loadNextPage}
                >
                  Open more of the vault
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
