import { h } from 'preact';
import { SortOption } from './types';

export interface ArchiveControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
}

export function ArchiveControls({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
}: ArchiveControlsProps) {
  return (
    <div className="archive-controls-row">
      <label className="sr-only" htmlFor="archive-search">
        Search the archive
      </label>
      <input
        id="archive-search"
        type="search"
        placeholder="Search inscriptions…"
        value={searchQuery}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        className="sanctuary-input archive-filter-search"
        autoComplete="off"
      />
      <label className="sr-only" htmlFor="archive-sort">
        Sort archive
      </label>
      <select
        id="archive-sort"
        value={sortBy}
        onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortOption)}
        className="sanctuary-input archive-filter-select"
        aria-label="Sort archive"
      >
        <option value="added">Date added</option>
        <option value="rating">Your rating</option>
        <option value="title">Title</option>
        <option value="year">Year</option>
      </select>
    </div>
  );
}

export interface TagFilterBarProps {
  allTags: string[];
  activeTagFilter: string;
  setActiveTagFilter: (tag: string) => void;
}

export function TagFilterBar({
  allTags,
  activeTagFilter,
  setActiveTagFilter,
}: TagFilterBarProps) {
  if (allTags.length === 0) return null;

  return (
    <div className="tag-filter-bar" role="group" aria-label="Filter by tag">
      <span className="tag-filter-label" id="tag-filter-label">
        Tags
      </span>
      <button
        type="button"
        onClick={() => setActiveTagFilter('')}
        className={`tag-filter-chip ${activeTagFilter === '' ? 'active' : ''}`}
        aria-pressed={activeTagFilter === ''}
      >
        All
      </button>
      {allTags.map((tag) => {
        const active = activeTagFilter === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTagFilter(active ? '' : tag)}
            className={`tag-filter-chip ${active ? 'active' : ''}`}
            aria-pressed={active}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
