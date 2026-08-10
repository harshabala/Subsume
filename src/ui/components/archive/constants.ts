import { LibraryStatus, SanctuaryIntent, LibraryItem, MediaType } from '@/shared/types';
import { legacyStatusLabel } from '@/shared/statusLabels';

/**
 * Wave 3: one status lexicon everywhere — medium-aware operational labels
 * from statusLabels.ts (Want to watch / Watched / … · Want to read / Read / …).
 * Literary-only Anticipated/Screened/Shelved retired from user-facing UI.
 */
export const STATUS_OPTIONS: { value: LibraryStatus; label: string }[] = (
  ['to-watch', 'watching', 'watched', 'abandoned'] as LibraryStatus[]
).map((value) => ({
  value,
  label: legacyStatusLabel(value, 'movie'),
}));

/** Medium-aware status options for chips, dossier, and detail UI */
export function statusOptionsForMedium(medium: MediaType | 'movie' | 'tv' | 'book'): {
  value: LibraryStatus;
  label: string;
}[] {
  const m = medium === 'book' ? 'book' : medium === 'tv' ? 'tv' : 'movie';
  return (['to-watch', 'watching', 'watched', 'abandoned'] as LibraryStatus[]).map((value) => ({
    value,
    label: legacyStatusLabel(value, m),
  }));
}

/** Chip label for a library status given the work's medium */
export function statusChipLabel(
  status: LibraryStatus,
  medium: MediaType | 'movie' | 'tv' | 'book' | undefined,
): string {
  const m = medium === 'book' ? 'book' : medium === 'tv' ? 'tv' : 'movie';
  return legacyStatusLabel(status, m);
}

/** Intent chips — aligned with INTENT_LABELS_V2 (Return Soon, not Revisit This Month) */
export const INTENT_CHIP_LABELS: Record<SanctuaryIntent, string> = {
  keep_memory: 'Keep This Memory',
  revisit_this_month: 'Return Soon',
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

/** Default screen chip labels (same as statusLabels / Want to watch path) */
export const STATUS_CHIP_LABELS: Record<LibraryStatus, string> = {
  'to-watch': 'Want to watch',
  watching: 'Watching',
  watched: 'Watched',
  abandoned: 'Stopped',
};
