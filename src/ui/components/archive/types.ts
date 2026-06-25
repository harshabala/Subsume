import { LibraryItem, MediaItem, SanctuaryIntent } from '@/shared/types';

export interface JoinedItem {
  library: LibraryItem;
  media: MediaItem;
}

export type SortOption = 'added' | 'rating' | 'title' | 'year';
export type IntentFilterOption = 'all' | SanctuaryIntent;
