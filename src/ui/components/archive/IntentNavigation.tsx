import { h, Fragment } from 'preact';
import { IntentFilterOption } from './types';

const INTENT_TABS: { id: IntentFilterOption; label: string }[] = [
  { id: 'all', label: 'All Sanctuary' },
  { id: 'keep_memory', label: 'Keep This Memory' },
  { id: 'revisit_this_month', label: 'Revisit This Month' },
  { id: 'wishlist', label: 'Wishlist' },
];

export interface IntentNavigationProps {
  activeTab: 'movies' | 'tv';
  setActiveTab: (tab: 'movies' | 'tv') => void;
  intentFilter: IntentFilterOption;
  setIntentFilter: (intent: IntentFilterOption) => void;
}

export function IntentNavigation({
  activeTab,
  setActiveTab,
  intentFilter,
  setIntentFilter,
}: IntentNavigationProps) {
  return (
    <Fragment>
      <div className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          Movies
        </button>
        <button
          className={`tab-item ${activeTab === 'tv' ? 'active' : ''}`}
          onClick={() => setActiveTab('tv')}
        >
          TV Shows
        </button>
      </div>

      <div
        className="intent-filter-bar"
        style={{
          display: 'flex',
          gap: 20,
          marginBottom: 24,
          padding: '0 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {INTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            data-intent={tab.id}
            onClick={() => setIntentFilter(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 4px',
              fontFamily: 'var(--font-serif, "Newsreader", Georgia, serif)',
              fontSize: 16,
              color: intentFilter === tab.id ? 'var(--primary)' : 'var(--color-text-secondary)',
              borderBottom: intentFilter === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </Fragment>
  );
}
