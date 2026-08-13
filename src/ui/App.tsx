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
import {
  FirstInscriptionGate,
  FIRST_INSCRIPTION_GATE_SESSION_KEY,
} from './components/FirstInscriptionGate';
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, PersonItem } from '../shared/types';
import { usePrefetch, prefetchPage, prefetchProps, type Page } from './hooks/usePrefetch';
import { applyThemePreference, applyCinemaAtmosphere, watchSystemTheme } from '../shared/theme';
import { FilmGrain } from './components/FilmGrain';
import { ensureDemoLibraryIfEmpty, seedPracticeLibraryIfEmpty } from './lib/ensureDemoLibrary';
import { useNotice } from './components/NoticeProvider';
import { formatUserError } from './utils/formatUserError';
import { Icon, type IconName } from './components/icons';
import { useSpringDrawer } from './hooks/useSpringDrawer';
import { incrementAppOpens } from '../shared/activationMetrics';
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
  /** House monoline icon name, or Roman numeral for primary house nav */
  icon: IconName | 'I' | 'II' | 'III';
}

/** Primary explore strip — max 4 destinations in desktop subnav */
const EXPLORE_NAV: NavItem[] = [
  { key: 'search', label: 'Search', icon: 'search' },
  { key: 'recommendations', label: 'Recommendations', icon: 'star' },
  { key: 'new-releases', label: 'Now Showing', icon: 'screen' },
  { key: 'people', label: 'Creators', icon: 'capture' },
];

/** Secondary destinations — drawer only under House tools */
const HOUSE_TOOLS_NAV: NavItem[] = [
  { key: 'stats', label: 'House Stats', icon: 'stats' },
  { key: 'alerts', label: 'Premiere Alerts', icon: 'alert' },
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
  // Wave 1 activation: default land is Discovery (first inscription path), not empty Archive
  if (page === 'home' || page === 'discovery') return 'home';
  if (page === 'library' || page === 'archive') return 'library';
  if (page === 'search') return 'search';
  if (page === 'recommendations') return 'recommendations';
  if (page === 'new-releases' || page === 'now-showing') return 'new-releases';
  if (page === 'people' || page === 'creators') return 'people';
  if (page === 'stats') return 'stats';
  if (page === 'settings') return 'settings';
  return 'home';
}

function NavIcon({ item }: { item: NavItem }) {
  if (item.icon === 'I' || item.icon === 'II' || item.icon === 'III') {
    return <span className="sidebar-nav-roman">{item.icon}</span>;
  }
  return <Icon name={item.icon} size={18} className="app-nav-house-icon" />;
}

function ExploreIcon({ name }: { name: IconName | string }) {
  if (name === 'I' || name === 'II' || name === 'III') {
    return <span className="sidebar-nav-roman">{name}</span>;
  }
  return <Icon name={name as IconName} size={16} className="app-subnav-icon" />;
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
  const initialPrefetchDone = useRef(false);
  const appOpenCounted = useRef(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const [gateSoftSkipped, setGateSoftSkipped] = useState(() => {
    try {
      return sessionStorage.getItem(FIRST_INSCRIPTION_GATE_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const prefersReducedMotion = useCallback(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const springDrawer = useSpringDrawer({
    prefersReducedMotion,
    onSettledClosed: () => {
      requestAnimationFrame(() => {
        menuToggleRef.current?.focus();
      });
    },
  });

  const drawerOpen = springDrawer.isOpen;
  const navMenuVisible = springDrawer.isVisible;
  const closeNavMenu = springDrawer.close;
  const drawerRef = springDrawer.drawerRef;

  const goToPage = (page: Page) => {
    setCurrentPage(page);
    prefetchPage(page);
    closeNavMenu();
  };

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
        // Device-only activation: one app open per options-page session
        if (!appOpenCounted.current) {
          appOpenCounted.current = true;
          void incrementAppOpens().catch(() => {});
        }
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

  // After first archive add, refresh prefs so the first-inscription gate can dismiss
  useEffect(() => {
    if (!prefs || prefs.firstInscriptionComplete) return;

    const refreshPrefs = () => {
      sendMessage<Record<string, unknown>, UserPreferences>(MessageType.GET_PREFERENCES, {})
        .then((res) => {
          if (res.success && res.data) setPrefs(res.data);
        })
        .catch(() => {});
    };

    const handleMessage = (message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        (message as { type: string }).type === 'LIBRARY_UPDATED' &&
        (message as { action?: string }).action === 'add'
      ) {
        refreshPrefs();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [prefs]);

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

  // Drawer open: move focus in, trap Tab, Esc closes (interruptible spring)
  useEffect(() => {
    if (!drawerOpen) return;

    const drawer = drawerRef.current as HTMLElement | null;
    const focusFirst = () => {
      if (!drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll(DRAWER_FOCUSABLE_SELECTOR),
      ) as HTMLElement[];
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
        drawer.querySelectorAll(DRAWER_FOCUSABLE_SELECTOR),
      ) as HTMLElement[];
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

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
  }, [drawerOpen, closeNavMenu, drawerRef]);

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
      // Land on Discovery with first-inscription prompt — never empty Archive
      setCurrentPage('home');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', 'home');
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* non-fatal */
      }
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

  const showFirstInscriptionGate =
    !prefs.firstInscriptionComplete && !gateSoftSkipped;

  const softDismissGateForSession = () => {
    try {
      sessionStorage.setItem(FIRST_INSCRIPTION_GATE_SESSION_KEY, '1');
    } catch {
      /* non-fatal */
    }
    setGateSoftSkipped(true);
  };

  const handleGateNavigateSearch = () => {
    // Soft-dismiss full-screen only so Search is usable; Discovery banner stays until complete
    softDismissGateForSession();
    setCurrentPage('search');
    prefetchPage('search');
  };

  const handleGatePracticeTitle = async () => {
    softDismissGateForSession();
    try {
      // Full demo seed when empty (no single-item seed API); open capture on first row.
      const library = await seedPracticeLibraryIfEmpty();
      const firstId = library[0]?.media?.id ?? library[0]?.library?.mediaId;
      // Refresh prefs so heal can mark firstInscriptionComplete when library non-empty
      const prefsRes = await sendMessage<Record<string, unknown>, UserPreferences>(
        MessageType.GET_PREFERENCES,
        {},
      );
      if (prefsRes.success && prefsRes.data) {
        setPrefs(prefsRes.data);
      }
      if (firstId) {
        setCaptureMediaId(firstId);
      } else {
        setCurrentPage('search');
        prefetchPage('search');
      }
    } catch (err) {
      console.error('[Subsume] Practice title seed failed:', err);
      setCurrentPage('search');
      prefetchPage('search');
    }
  };

  const handleGateSkipLater = async () => {
    const skippedAt = Date.now();
    const newPrefs = { ...prefs, firstInscriptionSkippedAt: skippedAt };
    try {
      await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
      setPrefs(newPrefs);
    } catch (err) {
      console.error('[Subsume] Failed to save firstInscriptionSkippedAt:', err);
    }
    softDismissGateForSession();
  };

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
        return <Settings onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      {showFirstInscriptionGate && (
        <FirstInscriptionGate
          onNavigate={handleGateNavigateSearch}
          onSkipLater={() => {
            void handleGateSkipLater();
          }}
          onPracticeTitle={handleGatePracticeTitle}
        />
      )}
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
              // Interruptible: open while closing is allowed (spring retarget)
              springDrawer.toggle();
            }}
          >
            <Icon name="menu" size={22} />
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
              <ExploreIcon name={item.icon} />
              <span className="app-subnav-label-full">{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {navMenuVisible && (
        <div
          ref={springDrawer.backdropRef}
          className="side-nav-backdrop app-mobile-nav-layer side-nav-backdrop--spring"
          role="presentation"
          onClick={closeNavMenu}
        />
      )}
      <aside
        ref={drawerRef}
        id="app-side-menu"
        className={`side-menu-drawer app-mobile-nav-layer side-menu-drawer--spring${drawerOpen ? ' is-open' : ''}`}
        aria-hidden={!drawerOpen}
        // Drawer is not a modal dialog; tabbability controlled via tabIndex when closed
        tabIndex={drawerOpen ? -1 : undefined}
        onPointerDown={(e) => {
          // Preact synthetic event → native fields for capture/velocity
          const ne = e as unknown as PointerEvent;
          springDrawer.onDrawerPointerDown(ne);
        }}
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
            <Icon name="close" size={20} />
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
                <ExploreIcon name={item.icon} />
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
                <ExploreIcon name={item.icon} />
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