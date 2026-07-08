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
      <input
        type="text"
        placeholder="Search the vault..."
        value={searchQuery}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        className="sanctuary-input archive-filter-search"
      />
      <select
        value={sortBy}
        onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortOption)}
        className="sanctuary-input archive-filter-select"
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
    <div className="tag-filter-bar">
      <span className="tag-filter-label">Tags:</span>
      <span
        onClick={() => setActiveTagFilter('')}
        className={`tag-filter-chip ${activeTagFilter === '' ? 'active' : ''}`}
      >
        All
      </span>
      {allTags.map((tag) => (
        <span
          key={tag}
          onClick={() => setActiveTagFilter(activeTagFilter === tag ? '' : tag)}
          className={`tag-filter-chip ${activeTagFilter === tag ? 'active' : ''}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
