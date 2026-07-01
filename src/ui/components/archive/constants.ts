import { LibraryStatus, SanctuaryIntent, LibraryItem } from '@/shared/types';

export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Want to Watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'watched', label: 'Watched' },
  { value: 'abandoned', label: 'Abandoned' },
];

export const INTENT_CHIP_LABELS: Record<SanctuaryIntent, string> = {
  keep_memory: 'Keep This Memory',
  revisit_this_month: 'Revisit This Month',
  wishlist: 'Wishlist',
};

export function resolveSanctuaryIntent(library: LibraryItem): SanctuaryIntent {
  if (library.sanctuaryIntent) return library.sanctuaryIntent;
  if (library.status === 'watched') return 'keep_memory';
  if (library.status === 'watching') return 'revisit_this_month';
  return 'wishlist';
}

export function getReflectionExcerpt(library: LibraryItem): string | undefined {
  return library.emotionalRecall?.trim() || library.notes?.trim() || undefined;
}
