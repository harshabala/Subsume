import { h, ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Page, LibraryStats, NavSection } from '../types';
import { PoeticCaptureCanvas } from './PoeticCaptureCanvas';

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

interface AppLayoutProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  prefetchPage: (page: Page) => void;
  stats: LibraryStats;
  peopleCount: number;
  captureMediaId: string | null;
  setCaptureMediaId: (id: string | null) => void;
  children: ComponentChildren;
}

export function AppLayout({
  currentPage,
  setCurrentPage,
  prefetchPage,
  stats,
  peopleCount,
  captureMediaId,
  setCaptureMediaId,
  children
}: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        {children}
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
