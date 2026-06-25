import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Recommendations } from './pages/Recommendations';
import { NewReleases } from './pages/NewReleases';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';
import { Search } from './pages/Search';
import { Stats } from './pages/Stats';
import { People } from './pages/People';
import { Alerts } from './pages/Alerts';
import { Logs } from './pages/Logs';
import { PoeticCaptureCanvas } from './components/PoeticCaptureCanvas';
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, PersonItem } from '../shared/types';
import './styles/sidebar.css';

type Page = 'home' | 'library' | 'search' | 'people' | 'stats' | 'recommendations' | 'new-releases' | 'alerts' | 'settings' | 'logs';

interface LibraryStats {
  movieCount: number;
  tvCount: number;
}

interface NavItem {
  key: Page;
  label: string;
  icon: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { key: 'home', label: 'Home', icon: '🏠' },
      { key: 'library', label: 'Library', icon: '📚' },
      { key: 'search', label: 'Search', icon: '🔍' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { key: 'recommendations', label: 'Recommendations', icon: '✨' },
      { key: 'new-releases', label: "What's New", icon: '🆕' },
      { key: 'people', label: 'Filmmakers', icon: '👤' },
      { key: 'stats', label: 'Stats', icon: '📊' },
      { key: 'alerts', label: 'Alerts', icon: '🔔' },
    ],
  },
  {
    label: 'App',
    items: [
      { key: 'settings', label: 'Settings', icon: '⚙️' },
      { key: 'logs', label: 'Logs', icon: '📝' }
    ],
  },
];

const PREFETCH_BY_PAGE: Partial<Record<Page, Array<{ type: MessageType; payload?: unknown }>>> = {
  home: [
    { type: MessageType.GET_WEEKLY_DIGEST },
    { type: MessageType.GET_RECOMMENDATIONS },
    { type: MessageType.GET_LIBRARY },
  ],
  library: [{ type: MessageType.GET_LIBRARY }],
  recommendations: [{ type: MessageType.GET_RECOMMENDATIONS }],
  'new-releases': [{ type: MessageType.GET_LATEST_RELEASES, payload: { type: 'movie' } }],
  stats: [{ type: MessageType.GET_LIBRARY }],
  people: [{ type: MessageType.GET_ALL_PEOPLE }],
  alerts: [{ type: MessageType.GET_WATCH_ALERTS }],
};

const prefetchedPages = new Set<Page>();

function prefetchPage(page: Page) {
  if (prefetchedPages.has(page)) return;
  const requests = PREFETCH_BY_PAGE[page];
  if (!requests) return;
  prefetchedPages.add(page);
  for (const req of requests) {
    sendMessage(req.type, req.payload ?? {}).catch(() => {});
  }
}

function getInitialPage(): Page {
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'alerts') return 'alerts';
  return 'home';
}

function NavIcon({ item }: { item: NavItem }) {
  if (item.key === 'people') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'block' }}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  return <>{item.icon}</>;
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [captureMediaId, setCaptureMediaId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('act') === 'capture') {
      return params.get('mediaId');
    }
    return null;
  });
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<LibraryStats>({ movieCount: 0, tvCount: 0 });
  const [peopleCount, setPeopleCount] = useState(0);
  const initialPrefetchDone = useRef(false);

  useEffect(() => {
    sendMessage<any, UserPreferences>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    });

    sendMessage<any, { library: LibraryItem; media: MediaItem }[]>(MessageType.GET_LIBRARY, {}).then((res) => {
      if (res.success && res.data) {
        const movieCount = res.data.filter((item) => item.media?.type === 'movie').length;
        const tvCount = res.data.filter((item) => item.media?.type === 'tv').length;
        setStats({ movieCount, tvCount });
      }
    });

    sendMessage<any, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
      if (res.success && res.data?.people) {
        setPeopleCount(res.data.people.length);
      }
    });
  }, []);

  useEffect(() => {
    if (!initialPrefetchDone.current) {
      initialPrefetchDone.current = true;
      prefetchPage(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message && message.type === 'FILMMAKERS_UPDATED') {
        sendMessage<any, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
          if (res.success && res.data?.people) {
            setPeopleCount(res.data.people.length);
          }
        });
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const completeOnboarding = async () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, onboardingComplete: true };
    await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
    setPrefs(newPrefs);
  };

  if (!prefs) {
    return (
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">S</div>
              <h1 className="sidebar-title">Subsume</h1>
            </div>
          </div>
          <nav className="sidebar-nav">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-nav-item" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </nav>
        </aside>
        <main className="main-content">
          <div className="page-container">
            <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 16 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '0 32px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton skeleton-stat" style={{ animationDelay: `${i * 40}ms` }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!prefs.onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'library':
        return <Library />;
      case 'search':
        return <Search />;
      case 'people':
        return <People />;
      case 'stats':
        return <Stats />;
      case 'recommendations':
        return <Recommendations />;
      case 'new-releases':
        return <NewReleases />;
      case 'alerts':
        return <Alerts />;
      case 'logs':
        return <Logs />;
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">S</div>
            <h1 className="sidebar-title">Subsume</h1>
          </div>
          <p className="sidebar-tagline">Movies & TV Tracker</p>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="sidebar-nav-section">
              <span className="sidebar-nav-section-label">{section.label}</span>
              {section.items.map((item) => (
                <button
                  key={item.key}
                  className={`sidebar-nav-item ${currentPage === item.key ? 'active' : ''}`}
                  onClick={() => setCurrentPage(item.key)}
                  onMouseEnter={() => prefetchPage(item.key)}
                  onFocus={() => prefetchPage(item.key)}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left' }}
                >
                  <span
                    className="sidebar-nav-icon"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20 }}
                  >
                    <NavIcon item={item} />
                  </span>
                  <span
                    className="sidebar-nav-label"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                  >
                    <span>{item.label}</span>
                    {item.key === 'people' && peopleCount > 0 && (
                      <span
                        className="sidebar-nav-badge stat-value"
                        style={{
                          background: 'var(--primary)',
                          color: '#121212',
                          borderRadius: 10,
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 'bold',
                          marginLeft: 8,
                          lineHeight: '1.2',
                        }}
                      >
                        {peopleCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stats">
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{stats.movieCount}</span>
              <span className="sidebar-stat-label">Movies</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{stats.tvCount}</span>
              <span className="sidebar-stat-label">TV Shows</span>
            </div>
          </div>
          <p className="sidebar-version">v0.1.0</p>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
        {captureMediaId && (
          <PoeticCaptureCanvas
            mediaId={captureMediaId}
            onClose={() => setCaptureMediaId(null)}
          />
        )}
      </main>
    </div>
  );
}