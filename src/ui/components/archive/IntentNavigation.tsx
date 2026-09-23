import { h, Fragment } from 'preact';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { LibraryStatus } from '@/shared/types';
import { INTENT_LABELS_V2 } from '@/shared/statusLabels';
import { FILMS_TAB_LABEL, SERIES_TAB_LABEL } from '@/shared/productCopy';
import { IntentFilterOption } from './types';

const INTENT_TABS: { id: IntentFilterOption; label: string }[] = [
  { id: 'all', label: 'Full repertoire' },
  { id: 'keep_memory', label: INTENT_LABELS_V2.keep_memory },
  { id: 'revisit_this_month', label: INTENT_LABELS_V2.return_soon },
  { id: 'wishlist', label: INTENT_LABELS_V2.wishlist },
];

export type CollectionFilter = 'all' | LibraryStatus;

const COLLECTION_TABS_SCREEN: { id: CollectionFilter; label: string }[] = [
  { id: 'all', label: 'All screen' },
  { id: 'watched', label: 'Watched' },
  { id: 'to-watch', label: 'Want to watch' },
  { id: 'watching', label: 'Watching' },
  { id: 'abandoned', label: 'Stopped' },
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

  const handleTabListKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const target = e.target as HTMLElement;
    if (!target || target.getAttribute('role') !== 'tab') return;
    const tablist = e.currentTarget as HTMLElement;
    const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const idx = tabs.indexOf(target as HTMLButtonElement);
    if (idx === -1) return;
    e.preventDefault();
    const nextIdx =
      e.key === 'ArrowRight'
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIdx];
    nextTab?.focus();
    nextTab?.click();
  };

  return (
    <Fragment>
      <div className="tab-bar" role="tablist" aria-label="Medium" onKeyDown={handleTabListKeyDown}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          tabIndex={activeTab === 'all' ? 0 : -1}
          className={`tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isScreen}
          tabIndex={isScreen ? 0 : -1}
          className={`tab-item ${isScreen ? 'active' : ''}`}
          onClick={() => setActiveTab('screen')}
        >
          Screen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'books'}
          tabIndex={activeTab === 'books' ? 0 : -1}
          className={`tab-item ${activeTab === 'books' ? 'active' : ''}`}
          onClick={() => setActiveTab('books')}
        >
          Books
        </button>
      </div>

      {isScreen && (
        <div className="tab-bar tab-bar-secondary" role="tablist" aria-label="Screen type" onKeyDown={handleTabListKeyDown}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'screen' || activeTab === 'movies'}
            tabIndex={activeTab === 'screen' || activeTab === 'movies' ? 0 : -1}
            className={`tab-item ${activeTab === 'screen' || activeTab === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveTab('movies')}
          >
            {FILMS_TAB_LABEL}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tv'}
            tabIndex={activeTab === 'tv' ? 0 : -1}
            className={`tab-item ${activeTab === 'tv' ? 'active' : ''}`}
            onClick={() => setActiveTab('tv')}
          >
            {SERIES_TAB_LABEL}
          </button>
        </div>
      )}

      <div className="collection-filter-bar" role="tablist" aria-label="Library by status" onKeyDown={handleTabListKeyDown}>
        {collectionTabs.map((tab, idx) => {
          const isSelected = collectionFilter === tab.id;
          const hasSelected = collectionTabs.some((t) => t.id === collectionFilter);
          const tabIndex = isSelected || (!hasSelected && idx === 0) ? 0 : -1;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={tabIndex}
              data-collection={tab.id}
              onClick={() => setCollectionFilter(tab.id)}
              className={`collection-tab-btn ${isSelected ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
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
          onKeyDown={handleTabListKeyDown}
        >
          {INTENT_TABS.map((tab, idx) => {
            const isSelected = intentFilter === tab.id;
            const hasSelected = INTENT_TABS.some((t) => t.id === intentFilter);
            const tabIndex = isSelected || (!hasSelected && idx === 0) ? 0 : -1;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={tabIndex}
                data-intent={tab.id}
                onClick={() => setIntentFilter(tab.id)}
                className={`intent-tab-btn ${isSelected ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </details>
    </Fragment>
  );
}
