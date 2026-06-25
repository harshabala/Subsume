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
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '0 32px', flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Search your sanctuary..."
        value={searchQuery}
        onInput={(e) => setSearchQuery(e.currentTarget.value)}
        style={{
          flex: 1,
          minWidth: 200,
          padding: '8px 12px',
          background: 'var(--color-surface-hover)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          borderRadius: 8,
          fontSize: 14,
        }}
      />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value as LibraryStatus | '')}
        style={{
          padding: '8px 12px',
          background: 'var(--color-surface-hover)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          borderRadius: 8,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((opt) => (
          <option value={opt.value} key={opt.value}>{opt.label}</option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy((e.target as HTMLSelectElement).value as SortOption)}
        style={{
          padding: '8px 12px',
          background: 'var(--color-surface-hover)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white',
          borderRadius: 8,
          fontSize: 14,
          cursor: 'pointer',
        }}
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
    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', alignSelf: 'center', marginRight: '4px' }}>Filter:</span>
      <span
        onClick={() => setActiveTagFilter('')}
        style={{
          fontSize: '12px',
          padding: '4px 10px',
          background: activeTagFilter === '' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
          border: activeTagFilter === '' ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          cursor: 'pointer',
          color: activeTagFilter === '' ? 'var(--color-surface)' : 'var(--color-text-secondary)',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
      >
        All
      </span>
      {allTags.map((tag) => (
        <span
          key={tag}
          onClick={() => setActiveTagFilter(activeTagFilter === tag ? '' : tag)}
          style={{
            fontSize: '12px',
            padding: '4px 10px',
            background: activeTagFilter === tag ? 'var(--primary)' : 'rgba(201, 168, 76, 0.05)',
            border: activeTagFilter === tag ? '1px solid var(--primary)' : '1px solid rgba(201, 168, 76, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            color: activeTagFilter === tag ? 'var(--color-surface)' : 'var(--primary)',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
