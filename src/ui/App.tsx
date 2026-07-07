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
import { applyThemePreference, applyCinemaAtmosphere, watchSystemTheme } from '../shared/theme';
import { FilmGrain } from './components/FilmGrain';
import { ensureDemoLibraryIfEmpty } from './lib/ensureDemoLibrary';
import './styles/sidebar.css';
import './styles/app-nav.css';

interface LibraryStats {
  movieCount: number;
  tvCount: number;
}

interface NavItem {
  key: Page;
  label: string;
  icon: string;
}

const EXPLORE_NAV: NavItem[] = [
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'recommendations', label: 'Recommendations', icon: 'auto_awesome' },
  { key: 'new-releases', label: "What's New", icon: 'new_releases' },
  { key: 'people', label: 'Filmmakers', icon: 'movie' },
  { key: 'stats', label: 'Stats', icon: 'bar_chart' },
  { key: 'alerts', label: 'Alerts', icon: 'notifications' },
  { key: 'logs', label: 'Logs', icon: 'description' },
];

const PRIMARY_NAV: NavItem[] = [
  { key: 'library', label: 'Library', icon: 'I' },
  { key: 'home', label: 'Discovery', icon: 'II' },
  { key: 'settings', label: 'Settings', icon: 'III' },
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
  const initialPrefetchDone = useRef(false);

  const goToPage = (page: Page) => {
    setCurrentPage(page);
    prefetchPage(page);
  };

  useEffect(() => {
    sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_PREFERENCES, {}).then((res) => {
      if (res.success && res.data) {
        setPrefs(res.data);
        const theme = res.data.theme ?? 'dark';
        applyThemePreference(theme);
        watchSystemTheme(theme);
        applyCinemaAtmosphere(res.data.cinemaAtmosphere ?? 'default');
      }
    }).catch(() => {});

    ensureDemoLibraryIfEmpty().then((library) => {
      const movieCount = library.filter((item) => item.media?.type === 'movie').length;
      const tvCount = library.filter((item) => item.media?.type === 'tv').length;
      setStats({ movieCount, tvCount });
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
        return <Recommendations onOpenCuratorSettings={() => {
          window.location.hash = 'ai-curator';
          setCurrentPage('settings');
        }} />;
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
      <FilmGrain variant="app" />
      <header className="app-nav-shell">
        <nav className="fixed-top-nav" aria-label="Primary">
          <div className="nav-logo">Subsume</div>
          <div className="nav-tabs">
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => goToPage(item.key)}
                className={`nav-tab-btn ${currentPage === item.key ? 'active' : ''}`}
                aria-current={currentPage === item.key ? 'page' : undefined}
                {...prefetchProps(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
        <nav className="app-subnav" aria-label="Explore">
          {EXPLORE_NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => goToPage(item.key)}
              className={`app-subnav-link ${currentPage === item.key ? 'active' : ''}`}
              aria-current={currentPage === item.key ? 'page' : undefined}
              {...prefetchProps(item.key)}
            >
              <span className="material-symbols-outlined app-subnav-icon">{item.icon}</span>
              <span className="app-subnav-label-full">{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

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