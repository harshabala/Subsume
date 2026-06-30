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
      { key: 'home', label: 'Home', icon: 'I' },
      { key: 'library', label: 'Library', icon: 'II' },
      { key: 'search', label: 'Search', icon: 'III' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { key: 'recommendations', label: 'Recommendations', icon: 'IV' },
      { key: 'new-releases', label: "What's New", icon: 'V' },
      { key: 'people', label: 'Filmmakers', icon: 'VI' },
      { key: 'stats', label: 'Stats', icon: 'VII' },
      { key: 'alerts', label: 'Alerts', icon: 'VIII' },
    ],
  },
  {
    label: 'App',
    items: [
      { key: 'settings', label: 'Settings', icon: 'IX' },
      { key: 'logs', label: 'Logs', icon: 'X' }
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
  return (
    <span className="sidebar-nav-roman">
      {item.icon}
    </span>
  );
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const initialPrefetchDone = useRef(false);

  useEffect(() => {
    sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    }).catch(() => {});

    sendMessage<Record<string, unknown>, { library: LibraryItem; media: MediaItem }[]>(MessageType.GET_LIBRARY, {}).then((res) => {
      if (res.success && res.data) {
        const movieCount = res.data.filter((item) => item.media?.type === 'movie').length;
        const tvCount = res.data.filter((item) => item.media?.type === 'tv').length;
        setStats({ movieCount, tvCount });
      }
    }).catch(() => {});

    sendMessage<Record<string, unknown>, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
      if (res.success && res.data?.people) {
        setPeopleCount(res.data.people.length);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialPrefetchDone.current) {
      initialPrefetchDone.current = true;
      prefetchPage(currentPage);
    }
  }, [currentPage]);

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (message && typeof message === 'object' && 'type' in message && (message as Record<string, unknown>).type === 'FILMMAKERS_UPDATED') {
        sendMessage<Record<string, unknown>, { people: PersonItem[] }>(MessageType.GET_ALL_PEOPLE, {}).then((res) => {
          if (res.success && res.data?.people) {
            setPeopleCount(res.data.people.length);
          }
        }).catch(() => {});
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const completeOnboarding = async () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, onboardingComplete: true };
    try {
      await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
      setPrefs(newPrefs);
    } catch (err) {
      console.error('[Subsume] Failed to save onboarding completion:', err);
    }
  };

  if (!prefs) {
    return (
      <div className="app-layout">
        <nav className="fixed-top-nav">
          <div className="nav-logo">Subsume</div>
          <div className="nav-tabs-skeleton">
            <div className="skeleton skeleton-tab" style={{ width: '80px', height: '16px' }} />
            <div className="skeleton skeleton-tab" style={{ width: '80px', height: '16px' }} />
            <div className="skeleton skeleton-tab" style={{ width: '80px', height: '16px' }} />
          </div>
        </nav>
        <main className="main-content">
          <div className="page-container">
            <div className="skeleton app-skeleton-header" />
            <div className="app-skeleton-stats-grid">
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
        return <Home onNavigate={setCurrentPage} onOpenCapture={setCaptureMediaId} />;
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
      {/* Top Navigation Bar */}
      <nav className="fixed-top-nav">
        <div className="nav-logo">Subsume</div>
        <div className="nav-tabs">
          <button
            onClick={() => {
              setCurrentPage('library');
              prefetchPage('library');
            }}
            className={`nav-tab-btn ${currentPage === 'library' ? 'active' : ''}`}
          >
            Sanctuary
          </button>
          <button
            onClick={() => {
              setCurrentPage('home');
              prefetchPage('home');
            }}
            className={`nav-tab-btn ${currentPage === 'home' ? 'active' : ''}`}
          >
            Discovery
          </button>
          <button
            onClick={() => {
              setCurrentPage('settings');
              prefetchPage('settings');
            }}
            className={`nav-tab-btn ${currentPage === 'settings' ? 'active' : ''}`}
          >
            Settings
          </button>
        </div>
        <button className="nav-menu-toggle" onClick={() => setIsMenuOpen(true)}>
          <span className="material-symbols-outlined">menu</span>
        </button>
      </nav>

      {/* Backdrop for Slide-out Navigation */}
      {isMenuOpen && (
        <div className="side-nav-backdrop" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Slide-out Navigation Menu */}
      <div className={`side-menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <span className="side-menu-title">Catalogue Directory</span>
          <button className="side-menu-close" onClick={() => setIsMenuOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="side-menu-content">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="side-menu-section">
              <span className="side-menu-section-label">{section.label}</span>
              {section.items.map((item) => (
                <button
                  key={item.key}
                  className={`side-menu-item ${currentPage === item.key ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentPage(item.key);
                    prefetchPage(item.key);
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="side-menu-roman">{item.icon}</span>
                  <span className="side-menu-label">
                    <span>{item.label}</span>
                    {item.key === 'people' && peopleCount > 0 && (
                      <span className="sidebar-nav-badge stat-value">
                        {peopleCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="side-menu-footer">
          <span>v0.1.0</span>
          <span>{stats.movieCount} M / {stats.tvCount} T</span>
        </div>
      </div>

      {/* Main Content Area */}
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