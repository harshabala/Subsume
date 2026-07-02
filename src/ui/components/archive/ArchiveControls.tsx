import { h } from 'preact';
import { LibraryStatus } from '@/shared/types';
import { STATUS_OPTIONS } from './constants';
import { SortOption } from './types';

export interface ArchiveControlsProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: LibraryStatus | '';
  setStatusFilter: (status: LibraryStatus | '') => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
}

export function ArchiveControls({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
}: ArchiveControlsProps) {
  return (
    <div className="archive-controls-row">
      <input
        type="text"
        placeholder="Search your sanctuary..."
        value={searchQuery}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        className="sanctuary-input archive-filter-search"
      />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value as LibraryStatus | '')}
        className="sanctuary-input archive-filter-select"
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((opt) => (
          <option value={opt.value} key={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortOption)}
        className="sanctuary-input archive-filter-select"
      >
        <option value="added">Date Added</option>
        <option value="rating">Your Rating</option>
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
      <span className="tag-filter-label">Filter:</span>
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
