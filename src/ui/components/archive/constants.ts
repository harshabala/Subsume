import { LibraryStatus, SanctuaryIntent, LibraryItem, MediaType } from '@/shared/types';
import { legacyStatusLabel } from '@/shared/statusLabels';

/** Literary screen status options (Archive collection voice for film/TV) */
export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = [
  { value: 'to-watch', label: 'Anticipated' },
  { value: 'watching', label: 'Now showing' },
  { value: 'watched', label: 'Screened' },
  { value: 'abandoned', label: 'Shelved' },
];

/** Medium-aware status options for chips, dossier, and detail UI */
export function statusOptionsForMedium(medium: MediaType | 'movie' | 'tv' | 'book'): {
  value: LibraryStatus;
  label: string;
}[] {
  if (medium === 'book') {
    return (['to-watch', 'watching', 'watched', 'abandoned'] as LibraryStatus[]).map((value) => ({
      value,
      label: legacyStatusLabel(value, 'book'),
    }));
  }
  return STATUS_OPTIONS;
}

/** Chip label for a library status given the work's medium */
export function statusChipLabel(
  status: LibraryStatus,
  medium: MediaType | 'movie' | 'tv' | 'book' | undefined,
): string {
  if (medium === 'book') return legacyStatusLabel(status, 'book');
  return STATUS_CHIP_LABELS[status];
}

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

/** Default literary chip labels for screen works */
export const STATUS_CHIP_LABELS: Record<LibraryStatus, string> = {
  'to-watch': 'Anticipated',
  watching: 'Now showing',
  watched: 'Screened',
  abandoned: 'Shelved',
};
