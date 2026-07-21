import { h } from 'preact';
import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Recommendations } from './pages/Recommendations';
import { NewReleases } from './pages/NewReleases';
import { Settings } from './pages/Settings';
import { Onboarding, type OnboardingPatch } from './pages/Onboarding';
import { Search } from './pages/Search';
import { Stats } from './pages/Stats';
import { People } from './pages/People';
import { Alerts } from './pages/Alerts';
import { PoeticCaptureCanvas } from './components/PoeticCaptureCanvas';
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, PersonItem } from '../shared/types';
import { usePrefetch, prefetchPage, prefetchProps, type Page } from './hooks/usePrefetch';
import { applyThemePreference, applyCinemaAtmosphere, watchSystemTheme } from '../shared/theme';
import { FilmGrain } from './components/FilmGrain';
import { ensureDemoLibraryIfEmpty } from './lib/ensureDemoLibrary';
import { useNotice } from './components/NoticeProvider';
import { formatUserError } from './utils/formatUserError';
import './styles/sidebar.css';
import './styles/app-nav.css';

const DRAWER_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface LibraryStats {
  movieCount: number;
  tvCount: number;
}

interface NavItem {
  key: Page;
  label: string;
  icon: string;
}

/** Primary explore strip — max 4 destinations in desktop subnav */
const EXPLORE_NAV: NavItem[] = [
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'recommendations', label: 'Recommendations', icon: 'auto_awesome' },
  { key: 'new-releases', label: 'Now Showing', icon: 'new_releases' },
  { key: 'people', label: 'Creators', icon: 'movie' },
];

/** Secondary destinations — drawer only under House tools */
const HOUSE_TOOLS_NAV: NavItem[] = [
  { key: 'stats', label: 'House Stats', icon: 'bar_chart' },
  { key: 'alerts', label: 'Premiere Alerts', icon: 'notifications' },
];

const PRIMARY_NAV: NavItem[] = [
  { key: 'library', label: 'Archive', icon: 'I' },
  { key: 'home', label: 'Discovery', icon: 'II' },
  { key: 'settings', label: 'Settings', icon: 'III' },
];

function getInitialPage(): Page {
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'alerts') return 'alerts';
  if (page === 'logs') return 'settings';
  // Returning users land in Archive unless deep-linked via ?page=
  if (page === 'home' || page === 'discovery') return 'home';
  if (page === 'library' || page === 'archive') return 'library';
  if (page === 'search') return 'search';
  if (page === 'recommendations') return 'recommendations';
  if (page === 'new-releases' || page === 'now-showing') return 'new-releases';
  if (page === 'people' || page === 'creators') return 'people';
  if (page === 'stats') return 'stats';
  if (page === 'settings') return 'settings';
  return 'library';
}

function NavIcon({ item }: { item: NavItem }) {
  return (
    <span className="sidebar-nav-roman">
      {item.icon}
    </span>
  );
}

export function App() {
  const { showNotice } = useNotice();
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
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [navMenuClosing, setNavMenuClosing] = useState(false);
  const navMenuVisible = navMenuOpen || navMenuClosing;
  const drawerOpen = navMenuOpen && !navMenuClosing;
  const initialPrefetchDone = useRef(false);
  const navCloseDoneRef = useRef(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const openNavMenu = () => {
    navCloseDoneRef.current = false;
    setNavMenuClosing(false);
    setNavMenuOpen(true);
  };

  const finishNavMenuClose = useCallback(() => {
    if (navCloseDoneRef.current) return;
    navCloseDoneRef.current = true;
    setNavMenuOpen(false);
    setNavMenuClosing(false);
    // Restore focus to menu toggle after drawer fully closes
    requestAnimationFrame(() => {
      menuToggleRef.current?.focus();
    });
  }, []);

  const closeNavMenu = useCallback(() => {
    if (!navMenuOpen || navMenuClosing) return;
    if (prefersReducedMotion()) {
      navCloseDoneRef.current = true;
      setNavMenuOpen(false);
      setNavMenuClosing(false);
      requestAnimationFrame(() => {
        menuToggleRef.current?.focus();
      });
      return;
    }
    navCloseDoneRef.current = false;
    setNavMenuClosing(true);
  }, [navMenuOpen, navMenuClosing]);

  const goToPage = (page: Page) => {
    setCurrentPage(page);
    prefetchPage(page);
    closeNavMenu();
  };

  useEffect(() => {
    if (!navMenuClosing) return;
    const drawer = drawerRef.current ?? document.getElementById('app-side-menu');
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== drawer) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
      finishNavMenuClose();
    };
    drawer?.addEventListener('transitionend', onEnd);
    const fallback = window.setTimeout(finishNavMenuClose, 280);
    return () => {
      drawer?.removeEventListener('transitionend', onEnd);
      window.clearTimeout(fallback);
    };
  }, [navMenuClosing, finishNavMenuClose]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'logs') {
      setCurrentPage('settings');
      window.location.hash = 'diagnostics';
      const clean = new URL(window.location.href);
      clean.searchParams.set('page', 'settings');
      window.history.replaceState({}, '', clean.pathname + clean.search + '#diagnostics');
    }
  }, []);

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

  // Drawer open: move focus in, trap Tab, Esc closes with animation
  useEffect(() => {
    if (!drawerOpen) return;

    const drawer = drawerRef.current;
    const focusFirst = () => {
      if (!drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR),
      );
      (focusable[0] ?? drawer).focus();
    };
    const focusTimer = window.setTimeout(focusFirst, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeNavMenu();
        return;
      }
      if (e.key !== 'Tab' || !drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen, closeNavMenu]);

  const completeOnboarding = async (patch: OnboardingPatch) => {
    if (!prefs) return;
    const newPrefs = {
      ...prefs,
      ...patch,
      onboardingComplete: true,
    };
    try {
      await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
      setPrefs(newPrefs);
    } catch (err) {
      console.error('[Subsume] Failed to save onboarding completion:', err);
      showNotice(`Onboarding could not be saved: ${formatUserError(err)}`, 'error');
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
        return <Library onNavigate={setCurrentPage} />;
      case 'search':
        return <Search />;
      case 'people':
        return <People />;
      case 'stats':
        return <Stats onNavigate={setCurrentPage} />;
      case 'recommendations':
        return (
          <Recommendations
            onNavigate={setCurrentPage}
            onOpenCuratorSettings={() => {
              window.location.hash = 'ai-curator';
              setCurrentPage('settings');
            }}
          />
        );
      case 'new-releases':
        return <NewReleases />;
      case 'alerts':
        return <Alerts />;
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
          <button
            type="button"
            ref={menuToggleRef}
            className="nav-menu-toggle"
            aria-label={drawerOpen ? 'Close' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls="app-side-menu"
            onClick={() => {
              if (drawerOpen) closeNavMenu();
              else if (!navMenuVisible) openNavMenu();
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
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

      {navMenuVisible && (
        <div
          className={`side-nav-backdrop app-mobile-nav-layer ${navMenuClosing ? 'closing' : ''}`}
          role="presentation"
          onClick={closeNavMenu}
        />
      )}
      <aside
        ref={drawerRef}
        id="app-side-menu"
        className={`side-menu-drawer app-mobile-nav-layer ${drawerOpen ? 'open' : ''}${navMenuClosing ? ' closing' : ''}`}
        aria-hidden={!drawerOpen}
        // Drawer is not a modal dialog; tabbability controlled via tabIndex when closed
        tabIndex={drawerOpen ? -1 : undefined}
      >
        <div className="side-menu-header">
          <span className="side-menu-title">Browse the house</span>
          <button
            type="button"
            className="side-menu-close"
            aria-label="Close navigation menu"
            tabIndex={drawerOpen ? 0 : -1}
            onClick={closeNavMenu}
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="side-menu-content">
          <div className="side-menu-section">
            <div className="side-menu-section-label">The house</div>
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`side-menu-item ${currentPage === item.key ? 'active' : ''}`}
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => goToPage(item.key)}
                {...prefetchProps(item.key)}
              >
                <NavIcon item={item} />
                <span className="side-menu-label">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="side-menu-section">
            <div className="side-menu-section-label">Explore</div>
            {EXPLORE_NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`side-menu-item ${currentPage === item.key ? 'active' : ''}`}
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => goToPage(item.key)}
                {...prefetchProps(item.key)}
              >
                <span className="material-symbols-outlined side-menu-roman" aria-hidden="true">{item.icon}</span>
                <span className="side-menu-label">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="side-menu-section">
            <div className="side-menu-section-label">House tools</div>
            {HOUSE_TOOLS_NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`side-menu-item ${currentPage === item.key ? 'active' : ''}`}
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => goToPage(item.key)}
                {...prefetchProps(item.key)}
              >
                <span className="material-symbols-outlined side-menu-roman" aria-hidden="true">{item.icon}</span>
                <span className="side-menu-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main
        className="main-content"
        // When drawer is open, take main out of the accessibility tree / tab order
        {...(drawerOpen ? ({ inert: true } as Record<string, unknown>) : {})}
        aria-hidden={drawerOpen ? true : undefined}
      >
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