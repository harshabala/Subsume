import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaType } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';

const TYPE_OPTIONS: { value: MediaType | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
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

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await sendMessage<
        { query: string; type?: MediaType },
        MediaItem[]
      >(MessageType.SEARCH_TITLES, { query: query.trim(), type: typeFilter || undefined });
      if (res.success && res.data) {
        setResults(res.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('[Subsume] Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  const handleAdd = async (item: MediaItem) => {
    setAddingId(item.id);
    try {
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem: item,
        type: item.type,
      });
      setAddedIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.error('[Subsume] Failed to add:', err);
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
      <header className="page-header">
        <h2 className="page-title">Search</h2>
        <p className="page-subtitle">Find movies and TV shows on TMDb.</p>
      </header>

      <div style={{ maxWidth: 640, margin: '24px 32px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search for a title..."
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'var(--color-surface-hover)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: 8,
              fontSize: 15,
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn ${typeFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(opt.value)}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {searched && !loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: 16, marginBottom: 8, fontWeight: 600, color: 'var(--color-text)' }}>No results found</p>
          <p style={{ fontSize: 14 }}>Search for something else or verify your TMDb API key is set up in Settings.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="media-grid" style={{ padding: '0 32px' }}>
          {results.map((item) => (
            <div key={item.id} className="media-card" onClick={() => setSelectedMedia(item)} style={{ cursor: 'pointer' }}>
              <div className="media-poster">
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.canonicalTitle} loading="lazy" />
                ) : (
                  <div className="media-poster-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="2" y="3" width="20" height="18" rx="2" />
                      <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="media-info">
                <h3 className="media-title">{item.canonicalTitle}</h3>
                <div className="media-meta">
                  <span>{item.year || '—'}</span>
                  <span className="media-type-badge">
                    {item.type === 'tv' ? 'TV' : 'Movie'}
                  </span>
                  {item.ratings[0] && (
                    <span>⭐ {item.ratings[0].score.toFixed(1)}</span>
                  )}
                </div>
                {item.overview && (
                  <p className="media-overview">{item.overview}</p>
                )}
                <div style={{ marginTop: 12 }}>
                  {addedIds.has(item.id) ? (
                    <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>
                      ✓ Added to Library
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                      disabled={addingId === item.id}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      {addingId === item.id ? 'Adding...' : 'Add to Library'}
                    </button>
                  )}
                </div>
              </div>
            </div>
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
