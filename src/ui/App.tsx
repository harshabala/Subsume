import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
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
import { sendMessage } from '../shared/messages';
import { MessageType, UserPreferences, LibraryItem, MediaItem, PersonItem } from '../shared/types';
import './styles/sidebar.css';

type Page = 'home' | 'library' | 'search' | 'people' | 'stats' | 'recommendations' | 'new-releases' | 'alerts' | 'settings';

interface LibraryStats {
  movieCount: number;
  tvCount: number;
}

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'library', label: 'Library', icon: '📚' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'people', label: 'Filmmakers', icon: '👤' },
  { key: 'stats', label: 'Stats', icon: '📊' },
  { key: 'recommendations', label: 'Recommendations', icon: '✨' },
  { key: 'new-releases', label: "What's New", icon: '🆕' },
  { key: 'alerts', label: 'Alerts', icon: '🔔' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

function getInitialPage(): Page {
  const page = new URLSearchParams(window.location.search).get('page');
  if (page === 'alerts') return 'alerts';
  return 'home';
}

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [stats, setStats] = useState<LibraryStats>({ movieCount: 0, tvCount: 0 });
  const [peopleCount, setPeopleCount] = useState(0);

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
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
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
      case 'settings':
        return <Settings />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">S</div>
            <h1 className="sidebar-title">Subsume</h1>
          </div>
          <p className="sidebar-tagline">Movies & TV Tracker</p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.key)}
              style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left' }}
            >
              <span className="sidebar-nav-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20 }}>
                {item.key === 'people' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'block' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : item.icon}
              </span>
              <span className="sidebar-nav-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.label}</span>
                {item.key === 'people' && peopleCount > 0 && (
                  <span
                    className="sidebar-nav-badge"
                    style={{
                      background: 'var(--gold)',
                      color: '#121212',
                      borderRadius: 10,
                      padding: '1px 6px',
                      fontSize: 10,
                      fontWeight: 'bold',
                      marginLeft: 8,
                      lineHeight: '1.2'
                    }}
                  >
                    {peopleCount}
                  </span>
                )}
              </span>
            </button>
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

      {/* Main content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
