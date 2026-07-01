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
import { usePrefetch, prefetchPage, prefetchProps, type Page } from './hooks/usePrefetch';
import './styles/sidebar.css';

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
  const { prefetchPageOnMount } = usePrefetch();
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
  const [isBackdropVisible, setIsBackdropVisible] = useState(false);
  const [isBackdropClosing, setIsBackdropClosing] = useState(false);
  const initialPrefetchDone = useRef(false);

  const openMenu = () => {
    setIsBackdropVisible(true);
    setIsBackdropClosing(false);
    setIsMenuOpen(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsBackdropClosing(true);
  };

  const handleBackdropAnimationEnd = (e: AnimationEvent) => {
    if (isBackdropClosing && e.animationName === 'fadeOutBackdrop') {
      setIsBackdropVisible(false);
      setIsBackdropClosing(false);
    }
  };

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
      prefetchPageOnMount(currentPage);
    }
  }, [currentPage, prefetchPageOnMount]);

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
      alert('Failed to complete onboarding: ' + (err instanceof Error ? err.message : String(err)));
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
            onClick={() => setCurrentPage('library')}
            className={`nav-tab-btn ${currentPage === 'library' ? 'active' : ''}`}
            aria-current={currentPage === 'library' ? 'page' : undefined}
            {...prefetchProps('library')}
          >
            Sanctuary
          </button>
          <button
            onClick={() => setCurrentPage('home')}
            className={`nav-tab-btn ${currentPage === 'home' ? 'active' : ''}`}
            aria-current={currentPage === 'home' ? 'page' : undefined}
            {...prefetchProps('home')}
          >
            Discovery
          </button>
          <button
            onClick={() => setCurrentPage('settings')}
            className={`nav-tab-btn ${currentPage === 'settings' ? 'active' : ''}`}
            aria-current={currentPage === 'settings' ? 'page' : undefined}
            {...prefetchProps('settings')}
          >
            Settings
          </button>
        </div>
        <button
          className="nav-menu-toggle"
          onClick={openMenu}
          aria-expanded={isMenuOpen}
          aria-controls="side-menu-drawer"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </nav>

      {/* Backdrop for Slide-out Navigation */}
      {isBackdropVisible && (
        <div
          className={`side-nav-backdrop ${isBackdropClosing ? 'closing' : ''}`}
          onClick={closeMenu}
          onAnimationEnd={handleBackdropAnimationEnd}
        />
      )}

      {/* Slide-out Navigation Menu */}
      <div id="side-menu-drawer" className={`side-menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <span className="side-menu-title">Catalogue Directory</span>
          <button className="side-menu-close" onClick={closeMenu}>
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
                  aria-current={currentPage === item.key ? 'page' : undefined}
                  onClick={() => {
                    setCurrentPage(item.key);
                    prefetchPage(item.key);
                    closeMenu();
                  }}
                  {...prefetchProps(item.key)}
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