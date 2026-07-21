import { render, h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, SanctuaryIntent, LibraryStatus } from '../shared/types';
import { applyThemePreference, applyCinemaAtmosphere, watchSystemTheme } from '../shared/theme';
import { DEFAULT_EMOTIONS, type EmotionalSpectrum } from '../shared/emotions';
import { EmotionalSliders } from './components/EmotionalSliders';
import { AuraVisualizer } from './components/AuraVisualizer';
import { FilmGrain } from './components/FilmGrain';
import { InlineNotice } from './components/NoticeProvider';
import { formatUserError } from './utils/formatUserError';
import { mediumLabel } from '../shared/productCopy';
import { legacyStatusLabel } from '../shared/statusLabels';
import '../shared/tokens.css';
import './styles/popup.css';
import './styles/emotional-components.css';
import './components/inline-notice.css';

interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

function openSanctuary(page?: string) {
  const url = chrome.runtime.getURL(`ui/index.html${page ? `?page=${page}` : ''}`);
  chrome.tabs.create({ url });
}

// Extract movie title from browser tab title
function extractMovieTitle(pageTitle: string, url?: string): { query: string; year?: number } | null {
  if (!pageTitle) return null;

  let query = '';
  let year: number | undefined;

  const yearMatch = pageTitle.match(/\((\d{4})\)/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  const lowercaseTitle = pageTitle.toLowerCase();
  
  // Skip obvious landing/non-film pages
  if (
    lowercaseTitle.includes('search') ||
    lowercaseTitle.includes('results') ||
    lowercaseTitle.includes('my list') ||
    lowercaseTitle.includes('watchlist') ||
    lowercaseTitle.includes('dashboard') ||
    lowercaseTitle.includes('sign in') ||
    lowercaseTitle.includes('login')
  ) {
    return null;
  }

  if (url && url.includes('letterboxd.com')) {
    // e.g. "La La Land (2016) directed by Damien Chazelle..."
    const match = pageTitle.match(/^(.*?)\s*\((\d{4})\)?/);
    if (match) query = match[1].trim();
  } else if (url && url.includes('imdb.com')) {
    // e.g. "La La Land (2016) - IMDb" or "Past Lives (2023) - Reference View - IMDb"
    const match = pageTitle.match(/^(.*?)\s*\((\d{4})\)?/);
    if (match) query = match[1].trim();
  } else if (pageTitle.includes('Wikipedia')) {
    const match = pageTitle.match(/^(.*?)\s*\(.*film.*\)/);
    if (match) query = match[1].trim();
  } else if (pageTitle.includes('Netflix')) {
    const match = pageTitle.match(/Watch\s+(.*?)\s*\|/i);
    if (match) query = match[1].trim();
  } else {
    // Fallback: match first segment before brackets/delimiters
    const match = pageTitle.match(/^(.*?)\s*\((\d{4})\)/);
    if (match) {
      query = match[1].trim();
    } else {
      const delMatch = pageTitle.match(/^(.*?)\s*[-|•]/);
      if (delMatch) {
        query = delMatch[1].trim();
      }
    }
  }

  // Clear queries that are too short or just garbage
  if (!query || query.length < 2 || query.length > 80) return null;

  return { query, year };
}

function Popup() {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'log'>('overview');
  const [items, setItems] = useState<JoinedItem[]>([]);
  const [stats, setStats] = useState({ total: 0, watched: 0, toWatch: 0 });
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search and log states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [emotions, setEmotions] = useState<EmotionalSpectrum>(DEFAULT_EMOTIONS);

  // Notes & Intent states
  const [logNotes, setLogNotes] = useState('');
  const [sanctuaryIntent, setSanctuaryIntent] = useState<SanctuaryIntent>('keep_memory');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [logActionError, setLogActionError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch library items and preferences
  async function loadLibraryData() {
    try {
      const [libRes, prefsRes] = await Promise.all([
        sendMessage(MessageType.GET_LIBRARY, { sortBy: 'addedAt' }),
        sendMessage<{ revealKeys?: boolean }, UserPreferences>(
          MessageType.GET_FULL_PREFERENCES,
          { revealKeys: false }
        ),
      ]);

      const joined = (libRes.data || []) as JoinedItem[];
      setItems(joined.slice(0, 4));
      setStats({
        total: joined.length,
        watched: joined.filter((j) => j.library.status === 'watched').length,
        toWatch: joined.filter((j) => j.library.status === 'to-watch').length,
      });

      const p = prefsRes.data!;
      setPrefs(p);
      const theme = p.theme ?? 'dark';
      applyThemePreference(theme);
      watchSystemTheme(theme);
      applyCinemaAtmosphere(p.cinemaAtmosphere ?? 'default');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load archive data');
      applyThemePreference('system');
      watchSystemTheme('system');
    }
  }

  // Initial load + active tab context scanning
  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadLibraryData();

      // Check current tab to prepopulate search query
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab && activeTab.title) {
            const detected = extractMovieTitle(activeTab.title, activeTab.url);
            if (detected) {
              setSearchQuery(detected.query);
              setActiveView('log');
            }
          }
        });
      }
      setLoading(false);
    }
    init();
  }, []);

  // Suggestions search query handler
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await sendMessage<any, MediaItem[]>(MessageType.DISCOVERY_SEARCH, {
          query: searchQuery,
        });
        if (res.success && res.data) {
          setSuggestions(res.data.slice(0, 5));
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error('[Subsume Popup] Title search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside suggestions dropdown handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmotionChange = (key: keyof EmotionalSpectrum, value: number) => {
    setEmotions((prev) => ({ ...prev, [key]: value }));
  };

  // Select movie from search list
  const handleSelectMovie = (movie: MediaItem) => {
    setSelectedMovie(movie);
    setSearchQuery(movie.canonicalTitle);
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    // Populate sliders with existing emotional values if already logged
    sendMessage(MessageType.GET_LIBRARY, { sortBy: 'addedAt' }).then((res) => {
      if (res.success && res.data) {
        const matchingItem = (res.data as JoinedItem[]).find(j => j.library.mediaId === movie.id);
        if (matchingItem?.library) {
          const lib = matchingItem.library;
          setEmotions({
            awe: lib.awe ?? DEFAULT_EMOTIONS.awe,
            melancholy: lib.melancholy ?? DEFAULT_EMOTIONS.melancholy,
            tension: lib.tension ?? DEFAULT_EMOTIONS.tension,
            warmth: lib.warmth ?? DEFAULT_EMOTIONS.warmth,
          });
          if (lib.notes) setLogNotes(lib.notes);
          if (lib.sanctuaryIntent) setSanctuaryIntent(lib.sanctuaryIntent);
        }
      }
    }).catch(() => {});
  };

  // Submit Reflection log
  const handleSaveLog = async () => {
    if (!selectedMovie) return;
    setIsSaving(true);
    try {
      // 1. Add movie to catalog database
      await sendMessage(MessageType.ADD_TO_LIST, {
        mediaItem: selectedMovie,
        type: selectedMovie.type,
      });

      // 2. Map sanctuary intent to library status
      const statusMap: Record<SanctuaryIntent, LibraryStatus> = {
        keep_memory: 'watched',
        revisit_this_month: 'watching',
        wishlist: 'to-watch',
      };
      await sendMessage(MessageType.UPDATE_STATUS, {
        mediaId: selectedMovie.id,
        status: statusMap[sanctuaryIntent],
      });

      // 3. Save notes and emotional spectrum ratings
      const notesRes = await sendMessage<
        {
          mediaId: string;
          notes: string;
          emotionalRecall?: string;
          awe?: number;
          melancholy?: number;
          tension?: number;
          warmth?: number;
        },
        { updated: boolean }
      >(MessageType.SET_USER_NOTES, {
        mediaId: selectedMovie.id,
        notes: logNotes.trim(),
        emotionalRecall: logNotes.trim() || undefined,
        awe: emotions.awe,
        melancholy: emotions.melancholy,
        tension: emotions.tension,
        warmth: emotions.warmth,
      });
      if (!notesRes.data?.updated) {
        throw new Error('Failed to persist emotional reflection to archive.');
      }

      // Display success feedback
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Reset states and reload library counts
        setSelectedMovie(null);
        setSearchQuery('');
        setLogNotes('');
        setEmotions(DEFAULT_EMOTIONS);
        setSanctuaryIntent('keep_memory');
        setActiveView('overview');
        loadLibraryData();
      }, 1500);

    } catch (err) {
      console.error('[Subsume Popup] Failed to log movie:', err);
      setLogActionError(`Could not save reflection: ${formatUserError(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="popup-shell">
        <div className="popup-loading">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="popup-shell">
        <header className="popup-header">
          <div className="popup-brand">
            <span className="popup-brand-mark"></span>
            Subsume
          </div>
          <div className="popup-tagline">Your picture palace</div>
        </header>
        <div className="popup-empty">
          <p>{error}</p>
          <button className="popup-btn popup-btn-primary" onClick={() => openSanctuary()}>Open the house</button>
        </div>
      </div>
    );
  }

  const overlaysOn = prefs?.posterOverlaysEnabled !== false;
  const hoverOn = prefs?.hoverCardsEnabled !== false;
  const hasTmdb = Boolean(prefs?.tmdbApiKey?.trim());
  const hasOmdb = Boolean(prefs?.omdbApiKey?.trim());

  return (
    <div className="popup-shell">
      <FilmGrain variant="popup" />
      {logActionError && (
        <div className="popup-inline-notice">
          <InlineNotice tone="error" onDismiss={() => setLogActionError(null)}>
            {logActionError}
          </InlineNotice>
        </div>
      )}
      {/* Success Animation overlay */}
      <div className={`log-success-overlay ${showSuccess ? 'active' : ''}`}>
        <div className="success-icon-circle">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h4 className="success-title">Reflection saved</h4>
        <p className="success-message">Added to your archive.</p>
      </div>

      {/* VIEW 1: Overview and Recent log history */}
      <div className={`popup-view ${activeView === 'overview' ? 'active' : ''}`}>
        <header className="popup-header">
          <div className="popup-brand-area">
            <div className="popup-brand">
              <span className="popup-brand-mark"></span>
              Subsume
            </div>
            <div className="popup-tagline">Capture what stayed with you</div>
          </div>
          <div className="popup-header-actions">
            <button
              type="button"
              className="popup-icon-btn"
              onClick={() => openSanctuary('settings')}
              title="Settings"
              aria-label="Open settings"
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <button type="button" className="popup-icon-btn" onClick={() => window.close()} title="Close" aria-label="Close popup">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        </header>

        <div className="popup-stats">
          <div className="popup-stat">
            <div className="popup-stat-value">{stats.total}</div>
            <div className="popup-stat-label">In archive</div>
          </div>
          <div className="popup-stat">
            <div className="popup-stat-value">{stats.watched}</div>
            <div className="popup-stat-label">Projected</div>
          </div>
          <div className="popup-stat">
            <div className="popup-stat-value">{stats.toWatch}</div>
            <div className="popup-stat-label">Anticipated</div>
          </div>
        </div>

        <div className="popup-status">
          <div>
            Marquee overlays:{' '}
            <strong className={overlaysOn && hoverOn ? 'popup-status-ok' : 'popup-status-warn'}>
              {overlaysOn && hoverOn ? 'On' : 'Partially off'}
            </strong>
          </div>
          <div>
            Rating sources:{' '}
            <strong className={hasTmdb || hasOmdb ? 'popup-status-ok' : 'popup-status-warn'}>
              {hasTmdb || hasOmdb ? (hasTmdb && hasOmdb ? 'TMDb + OMDb' : hasTmdb ? 'TMDb' : 'OMDb') : 'Free Sources (trakt)'}
            </strong>
          </div>
        </div>

        <div className="popup-section">
          <div className="popup-section-title">Recently inscribed</div>
          {items.length === 0 ? (
            <div className="popup-empty">
              <p>Your vault is empty. The first inscription is yours to make.</p>
              <button
                className="popup-btn"
                style={{ marginTop: '4px' }}
                onClick={async () => {
                  try {
                    await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {});
                    loadLibraryData();
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Load the highlight reel
              </button>
            </div>
          ) : (
            <div className="popup-recent">
              {items.map((item) => (
                <button
                  key={item.library.mediaId}
                  type="button"
                  className="popup-recent-item"
                  onClick={() => openSanctuary('library')}
                >
                  {item.media.posterUrl ? (
                    <img className="popup-recent-poster" src={item.media.posterUrl} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <div className="popup-recent-poster" />
                  )}
                  <div className="popup-recent-meta">
                    <div className="popup-recent-title">{item.media.canonicalTitle}</div>
                    <div className="popup-recent-sub">
                      <span>{item.media.year || '—'}</span>
                      <span>·</span>
                      <span className={`popup-status-badge ${item.library.status}`}>
                        {legacyStatusLabel(item.library.status, item.media.type)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="popup-actions">
          <button className="popup-btn popup-btn-primary" onClick={() => setActiveView('log')}>
            <span className="material-symbols-outlined popup-btn-icon" aria-hidden="true">videocam</span>
            Inscribe a title
          </button>
          <button className="popup-btn popup-btn-secondary" onClick={() => openSanctuary()} type="button">
            <span className="material-symbols-outlined popup-btn-icon" aria-hidden="true">open_in_new</span>
            Open the house
          </button>
        </div>
      </div>

      {/* VIEW 2: Interactive Log Movie Form */}
      <div className={`popup-view ${activeView === 'log' ? 'active' : ''}`}>
        <header className="popup-header">
          <div className="popup-brand-area">
            <div className="popup-brand">
              <span className="material-symbols-outlined popup-brand-capture-icon" aria-hidden="true">videocam</span>
              Inscribe a title
            </div>
            <div className="popup-tagline">From this page or the catalogue</div>
          </div>
          <div className="popup-header-actions">
            <button
              type="button"
              className="popup-icon-btn"
              onClick={() => openSanctuary('settings')}
              title="Settings"
              aria-label="Open settings"
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <button
              className="popup-close-btn"
              onClick={() => {
                setSelectedMovie(null);
                setSearchQuery('');
                setActiveView('overview');
              }}
              title="Back"
              aria-label="Back to overview"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
          </div>
        </header>

        <div className="ext-body">
          {/* Step 1: Search movie */}
          <div className="search-wrapper" ref={searchContainerRef}>
            <input
              type="text"
              className="search-input"
              role="combobox"
              aria-label="Search titles to inscribe"
              aria-expanded={showSuggestions && (suggestions.length > 0 || searchLoading)}
              aria-controls="popup-suggestions-list"
              aria-autocomplete="list"
              value={searchQuery}
              onInput={(e) => {
                setSearchQuery((e.target as HTMLInputElement).value);
                setShowSuggestions(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (!showSuggestions || suggestions.length === 0) {
                  if (e.key === 'Escape') setShowSuggestions(false);
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex((i) => (i + 1) % suggestions.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
                } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                  e.preventDefault();
                  handleSelectMovie(suggestions[highlightedIndex]);
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  setHighlightedIndex(-1);
                }
              }}
              placeholder="Search the repertoire..."
              autoComplete="off"
            />
            
            {showSuggestions && (suggestions.length > 0 || searchLoading) && (
              <ul
                id="popup-suggestions-list"
                className="suggestions-list"
                role="listbox"
                key={searchLoading ? 'searching' : `suggestions-${searchQuery}`}
              >
                {searchLoading ? (
                  <li className="suggestion-item suggestion-item--static" role="option" style={{ fontStyle: 'italic', justifyContent: 'center' }}>Searching the repertoire…</li>
                ) : (
                  suggestions.map((movie, index) => (
                    <li
                      key={movie.id}
                      role="option"
                      aria-selected={highlightedIndex === index}
                      className={`suggestion-item${highlightedIndex === index ? ' highlighted' : ''}`}
                      style={{ '--suggestion-index': Math.min(index, 5) } as Record<string, number>}
                      onClick={() => handleSelectMovie(movie)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className="suggestion-item-main">
                        <span className="suggestion-title">{movie.canonicalTitle}</span>
                        <span className="suggestion-meta">{mediumLabel(movie.type)}</span>
                      </div>
                      <span className="suggestion-year">{movie.year || '—'}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Selected Movie Preview Card */}
          {selectedMovie && (
            <div className="selected-movie-preview">
              <div className="selected-movie-preview-poster">
                {selectedMovie.posterUrl ? (
                  <img src={selectedMovie.posterUrl} alt={selectedMovie.canonicalTitle} />
                ) : (
                  <svg width="18" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  </svg>
                )}
              </div>
              <div className="selected-movie-preview-details">
                <h4>{selectedMovie.canonicalTitle}</h4>
                <p>{selectedMovie.year || '—'} · {mediumLabel(selectedMovie.type)}</p>
              </div>
              <button
                className="selected-movie-deselect-btn"
                onClick={() => {
                  setSelectedMovie(null);
                  setSearchQuery('');
                }}
                title="Deselect movie"
              >
                ×
              </button>
            </div>
          )}

          <EmotionalSliders
            values={emotions}
            onChange={handleEmotionChange}
            variant="popup"
            idPrefix="popup"
          />

          <AuraVisualizer values={emotions} variant="popup" />

          {/* Journal Notes */}
          <textarea
            className="ext-notes-textarea"
            aria-label="Journal notes"
            value={logNotes}
            onInput={(e) => setLogNotes((e.target as HTMLTextAreaElement).value)}
            placeholder="What resonance did this screening leave? A line, a scene, an afterglow..."
          />

          {/* Sanctuary Status Intent Selector — medium-aware operational labels */}
          <div className="intent-selector-group">
            <span className="intent-selector-label">
              {selectedMovie?.type === 'book' ? 'Reading status' : 'Screening status'}
            </span>
            <div className="intent-pills" role="group" aria-label="Sanctuary intent">
              <button
                type="button"
                className={`intent-pill ${sanctuaryIntent === 'keep_memory' ? 'active' : ''}`}
                onClick={() => setSanctuaryIntent('keep_memory')}
              >
                {legacyStatusLabel('watched', selectedMovie?.type ?? 'movie')}
              </button>
              <button
                type="button"
                className={`intent-pill ${sanctuaryIntent === 'revisit_this_month' ? 'active' : ''}`}
                onClick={() => setSanctuaryIntent('revisit_this_month')}
              >
                {legacyStatusLabel('watching', selectedMovie?.type ?? 'movie')}
              </button>
              <button
                type="button"
                className={`intent-pill ${sanctuaryIntent === 'wishlist' ? 'active' : ''}`}
                onClick={() => setSanctuaryIntent('wishlist')}
              >
                {legacyStatusLabel('to-watch', selectedMovie?.type ?? 'movie')}
              </button>
            </div>
          </div>
        </div>

        <div className="popup-actions" style={{ paddingTop: '8px' }}>
          <button
            className="popup-btn popup-btn-primary"
            onClick={handleSaveLog}
            disabled={!selectedMovie || isSaving}
          >
            {isSaving ? 'Saving reflection…' : 'Save reflection'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const root = document.getElementById('popup-root');
if (root) {
  render(<Popup />, root);
}