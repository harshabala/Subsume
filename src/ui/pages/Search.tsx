import { h } from 'preact';
import { useState, useCallback } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType, MediaItem, MediaType } from '@/shared/types';
import { DetailModal } from '../components/DetailModal';

const TYPE_OPTIONS: { value: MediaType | ''; label: string }[] = [
  { value: '', label: 'Complete Archive' },
  { value: 'movie', label: 'Feature Films' },
  { value: 'tv', label: 'Series / Television' },
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
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Catalogue No. 02 — Precision Archival Query</span>
        </div>
        <h1 className="sanctuary-title">Search Archive</h1>
        <p className="sanctuary-description">
          Query the global cinematic repository with archival precision and museum filters.
        </p>
      </header>

      <div className="optical-search-container">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="ENTER TITLE OR CATALOGUE QUERY..."
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            className="optical-input"
          />
          <button
            className="optical-button"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'INSPECTING...' : 'QUERY'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
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
        <div className="sanctuary-empty-plaque" style={{ maxWidth: 500, margin: '48px auto' }}>
          <span className="sanctuary-plaque-index">REF. NULL-RESULT</span>
          <h3 className="sanctuary-plaque-title">No Archival Matches Found</h3>
          <p className="sanctuary-plaque-text">
            The global repository yielded no works corresponding to your optical query. Refine search parameters or verify provider configuration.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="card-grid" style={{ padding: '0 32px', maxWidth: 1200, margin: '0 auto 48px' }}>
          {results.map((item) => (
            <div key={item.id} className="sanctuary-media-card" onClick={() => setSelectedMedia(item)} style={{ cursor: 'pointer' }}>
              <div className="sanctuary-card-poster">
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.canonicalTitle} loading="lazy" className="sanctuary-poster-img" />
                ) : (
                  <div className="sanctuary-poster-placeholder">
                    <span className="sanctuary-placeholder-title">{item.canonicalTitle}</span>
                  </div>
                )}
              </div>
              <div className="sanctuary-card-content">
                <h3 className="sanctuary-card-title">{item.canonicalTitle}</h3>
                <div className="sanctuary-card-meta">
                  <span>{item.year || 'ARCHIVAL'}</span>
                  <span className="sanctuary-card-badge">
                    {item.type === 'tv' ? 'Series' : 'Film'}
                  </span>
                  {item.ratings[0] && (
                    <span style={{ color: 'var(--text-artwork)' }}>
                      SCORE {item.ratings[0].score.toFixed(1)}
                    </span>
                  )}
                </div>
                {item.overview && (
                  <p className="sanctuary-card-synopsis">{item.overview}</p>
                )}
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  {addedIds.has(item.id) ? (
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '0.05em', color: 'var(--text-meta)' }}>
                      Archived in Sanctuary
                    </span>
                  ) : (
                    <button
                      className="sanctuary-acquire-btn"
                      onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                      disabled={addingId === item.id}
                      style={{ width: '100%', padding: '8px', fontSize: '11px' }}
                    >
                      {addingId === item.id ? 'Acquiring...' : '+ Acquire'}
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
