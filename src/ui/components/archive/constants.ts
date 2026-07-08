import { LibraryStatus, SanctuaryIntent, LibraryItem } from '@/shared/types';

export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Anticipated' },
  { value: 'watching', label: 'Now showing' },
  { value: 'watched', label: 'Screened' },
  { value: 'abandoned', label: 'Shelved' },
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
  const combined =
    library.emotionalRecall?.trim() ||
    library.qualitativeNotes?.trim() ||
    library.lingeringThought?.trim() ||
    library.notes?.trim() ||
    '';
  return combined.length > 0 ? combined : undefined;
}

export const STATUS_CHIP_LABELS: Record<LibraryStatus, string> = {
  'to-watch': 'Anticipated',
  watching: 'Now showing',
  watched: 'Screened',
  abandoned: 'Shelved',
};
