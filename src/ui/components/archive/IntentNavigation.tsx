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

      <div className="intent-filter-bar">
        {INTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            data-intent={tab.id}
            onClick={() => setIntentFilter(tab.id)}
            className={`intent-tab-btn ${intentFilter === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </Fragment>
  );
}
