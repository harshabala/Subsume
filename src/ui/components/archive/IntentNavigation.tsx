import { h, Fragment } from 'preact';
import { LibraryStatus } from '@/shared/types';
import { IntentFilterOption } from './types';

const INTENT_TABS: { id: IntentFilterOption; label: string }[] = [
  { id: 'all', label: 'Full repertoire' },
  { id: 'keep_memory', label: 'Keep This Memory' },
  { id: 'revisit_this_month', label: 'Revisit This Month' },
  { id: 'wishlist', label: 'Wishlist' },
];

export type CollectionFilter = 'all' | LibraryStatus;

const COLLECTION_TABS: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'Full programme' },
  { id: 'watched', label: 'Screened' },
  { id: 'to-watch', label: 'Anticipated' },
  { id: 'watching', label: 'Now showing' },
  { id: 'abandoned', label: 'Shelved' },
];

export interface IntentNavigationProps {
  activeTab: 'movies' | 'tv';
  setActiveTab: (tab: 'movies' | 'tv') => void;
  intentFilter: IntentFilterOption;
  setIntentFilter: (intent: IntentFilterOption) => void;
  collectionFilter: CollectionFilter;
  setCollectionFilter: (filter: CollectionFilter) => void;
}

export function IntentNavigation({
  activeTab,
  setActiveTab,
  intentFilter,
  setIntentFilter,
  collectionFilter,
  setCollectionFilter,
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

      <div className="collection-filter-bar" role="tablist" aria-label="Library by status">
        {COLLECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-collection={tab.id}
            onClick={() => setCollectionFilter(tab.id)}
            className={`collection-tab-btn ${collectionFilter === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="intent-filter-hint">Optional: refine screened titles by how you want to remember them.</p>
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
