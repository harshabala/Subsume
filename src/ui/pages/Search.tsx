import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaType } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';
import { SanctuaryMediaCard } from '../components/SanctuaryMediaCard';
import {
  mediumLabel,
  ADD_TO_ARCHIVE_LABEL,
  IN_ARCHIVE_LABEL,
  failedToAddToArchiveMessage,
} from '@/shared/productCopy';

const TYPE_OPTIONS: { value: MediaType | ''; label: string }[] = [
  { value: '', label: 'All works' },
  { value: 'movie', label: 'Films' },
  { value: 'tv', label: 'Series' },
  { value: 'book', label: 'Books' },
];

export function Search() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | ''>('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const q = query.trim();
      if (typeFilter === 'book') {
        const res = await sendMessage<
          { query: string; medium?: 'book' | 'all'; limit?: number },
          { works: MediaItem[] }
        >(MessageType.SEARCH_WORKS, { query: q, medium: 'book', limit: 20 });
        setResults(res.data?.works ?? []);
      } else {
        const res = await sendMessage<
          { query: string; type?: MediaType },
          MediaItem[]
        >(MessageType.DISCOVERY_SEARCH, { query: q, type: typeFilter || undefined });
        const screen = res.data ?? [];
        // When searching all works, also pull Open Library hits
        if (!typeFilter) {
          try {
            const books = await sendMessage<
              { query: string; medium?: 'book' | 'all'; limit?: number },
              { works: MediaItem[] }
            >(MessageType.SEARCH_WORKS, { query: q, medium: 'book', limit: 8 });
            const bookWorks = books.data?.works ?? [];
            const seen = new Set(screen.map((m) => m.id));
            setResults([...screen, ...bookWorks.filter((b) => !seen.has(b.id))]);
          } catch {
            setResults(screen);
          }
        } else {
          setResults(screen);
        }
      }
    } catch (err) {
      console.error('[Subsume] Search failed:', err);
      setResults([]);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  const handleAdd = async (item: MediaItem) => {
    setAddingId(item.id);
    setError(null);
    try {
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem: item,
        type: item.type,
      });
      setAddedIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.error('[Subsume] Failed to add:', err);
      setError(err instanceof Error ? err.message : failedToAddToArchiveMessage());
    } finally {
      setAddingId(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="page-container">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Catalogue Discovery · Vault Index</span>
        </div>
        <h1 className="sanctuary-title">Search Archive</h1>
        <p className="sanctuary-description">
          Search films, series, and books. Screen discovery uses Trakt, TVmaze, and TMDb when configured; books use Open Library by default.
        </p>
      </header>

      {error && (
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque">
          <p className="sanctuary-plaque-text sanctuary-notice-plaque-text">{error}</p>
        </div>
      )}

      <div className="optical-search-container">
        <div className="sanctuary-filter-row">
          <input
            type="search"
            aria-label="Search films, series, and books"
            placeholder="Title, author, director, or cast..."
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            className="optical-input"
          />
          <button
            type="button"
            className="optical-button"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching catalogue...' : 'Search'}
          </button>
        </div>

        <div className="sanctuary-filter-chips" role="group" aria-label="Format filter">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={typeFilter === opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className="optical-button"
              style={{
                padding: '8px 16px',
                fontSize: '11px',
                borderColor: typeFilter === opt.value ? 'var(--border-hero)' : 'var(--border-restraint)',
                color: typeFilter === opt.value ? 'var(--text-reflection)' : 'var(--text-meta)',
                background: typeFilter === opt.value ? 'hsla(45, 90%, 65%, 0.08)' : 'var(--bg-plaque)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="sanctuary-empty-plaque sanctuary-notice-plaque sanctuary-notice-plaque--centered">
          <span className="sanctuary-plaque-index">No matches</span>
          <h3 className="sanctuary-plaque-title">Nothing in the catalogue</h3>
          <p className="sanctuary-plaque-text">
            No titles matched your search. Try a different spelling, a director&apos;s name, or broaden the format filter.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="card-grid sanctuary-card-grid-padded">
          {results.map((item) => (
            <SanctuaryMediaCard
              key={item.id}
              media={item}
              synopsis={item.overview || undefined}
              onOpen={setSelectedMedia}
              onAdd={handleAdd}
              added={addedIds.has(item.id)}
              adding={addingId === item.id}
              addLabel={ADD_TO_ARCHIVE_LABEL}
              addedLabel={IN_ARCHIVE_LABEL}
              meta={
                <div className="sanctuary-card-meta">
                  <span className="sanctuary-card-badge medium-badge" data-medium={item.type}>
                    {mediumLabel(item.type)}
                  </span>
                  <span>{item.year || 'ARCHIVAL'}</span>
                  {item.ratings[0] && (
                    <span style={{ color: 'var(--text-artwork)' }}>
                      SCORE {item.ratings[0].score.toFixed(1)}
                    </span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {selectedMedia && (
        <DetailModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onAddToLibrary={() => handleAdd(selectedMedia)}
        />
      )}
    </div>
  );
}
