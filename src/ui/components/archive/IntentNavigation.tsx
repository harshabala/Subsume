import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { LibraryStatus } from '@/shared/types';
import { IntentFilterOption } from './types';

const INTENT_TABS: { id: IntentFilterOption; label: string }[] = [
  { id: 'all', label: 'Full repertoire' },
  { id: 'keep_memory', label: 'Keep This Memory' },
  { id: 'revisit_this_month', label: 'Revisit This Month' },
  { id: 'wishlist', label: 'Wishlist' },
];

export type CollectionFilter = 'all' | LibraryStatus;

const COLLECTION_TABS_SCREEN: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'Full programme' },
  { id: 'watched', label: 'Screened' },
  { id: 'to-watch', label: 'Anticipated' },
  { id: 'watching', label: 'Now showing' },
  { id: 'abandoned', label: 'Shelved' },
];

const COLLECTION_TABS_BOOKS: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'All books' },
  { id: 'watched', label: 'Read' },
  { id: 'to-watch', label: 'Want to read' },
  { id: 'watching', label: 'Reading' },
  { id: 'abandoned', label: 'Did not finish' },
];

const COLLECTION_TABS_ALL: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'watched', label: 'Completed' },
  { id: 'to-watch', label: 'Planned' },
  { id: 'watching', label: 'In progress' },
  { id: 'abandoned', label: 'Stopped' },
];

/** Primary medium filter: All | Screen | Books (spec §8.2) */
export type MediumFilter = 'all' | 'screen' | 'books' | 'movies' | 'tv';

export interface IntentNavigationProps {
  activeTab: MediumFilter;
  setActiveTab: (tab: MediumFilter) => void;
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
  const [intentOpen, setIntentOpen] = useState(intentFilter !== 'all');
  const collectionTabs =
    activeTab === 'books'
      ? COLLECTION_TABS_BOOKS
      : activeTab === 'all'
        ? COLLECTION_TABS_ALL
        : COLLECTION_TABS_SCREEN;

  const isScreen =
    activeTab === 'screen' || activeTab === 'movies' || activeTab === 'tv';

  return (
    <Fragment>
      <div className="tab-bar" role="tablist" aria-label="Medium">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isScreen}
          className={`tab-item ${isScreen ? 'active' : ''}`}
          onClick={() => setActiveTab('screen')}
        >
          Screen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'books'}
          className={`tab-item ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          Books
        </button>
      </div>

      {isScreen && (
        <div className="tab-bar tab-bar-secondary" role="tablist" aria-label="Screen type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'screen' || activeTab === 'movies'}
            className={`tab-item ${activeTab === 'screen' || activeTab === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveTab('movies')}
          >
            Movies
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tv'}
            className={`tab-item ${activeTab === 'tv' ? 'active' : ''}`}
            onClick={() => setActiveTab('tv')}
          >
            TV Shows
          </button>
        </div>
      )}

      <div className="collection-filter-bar" role="tablist" aria-label="Library by status">
        {collectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={collectionFilter === tab.id}
            data-collection={tab.id}
            onClick={() => setCollectionFilter(tab.id)}
            className={`collection-tab-btn ${collectionFilter === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <details
        className="intent-filter-details"
        open={intentOpen}
        onToggle={(e) => {
          const open = (e.target as HTMLDetailsElement).open;
          setIntentOpen(open);
          if (!open && intentFilter !== 'all') {
            setIntentFilter('all');
          }
        }}
      >
        <summary className="intent-filter-summary">
          Refine by memory
          {intentFilter !== 'all' && (
            <span className="intent-filter-active-badge">
              {INTENT_TABS.find((t) => t.id === intentFilter)?.label ?? 'Active'}
            </span>
          )}
        </summary>
        <p className="intent-filter-hint">
          Optional: how you want each inscription to live in the archive.
        </p>
        <div
          className="intent-filter-bar"
          role="tablist"
          aria-label="Sanctuary intent"
        >
          {INTENT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={intentFilter === tab.id}
              data-intent={tab.id}
              onClick={() => setIntentFilter(tab.id)}
              className={`intent-tab-btn ${intentFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </details>
    </Fragment>
  );
}
