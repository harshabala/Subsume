/**
 * Canonical media/work ID patterns across screen and book providers.
 * Slug segments allow lowercase letters, digits, hyphens, and for OL keys alphanumerics.
 */
export const MEDIA_ID_PATTERN =
  /^(tmdb_(movie|tv)_\d+|tvmaze_tv_\d+|trakt_(movie|tv)_[a-z0-9-]+|trakt_trending_[a-z0-9-]+|discovery_trakt_(movie|tv)_[a-z0-9-]+|discovery_tvmaze_tv_\d+|seed_[a-z0-9_]+|openlibrary_work_OL\d+W|openlibrary_edition_OL\d+M|googlebooks_volume_[A-Za-z0-9_-]+|isbn13_\d{13}|isbn10_[0-9X]{10}|book_fingerprint_[a-f0-9]{8,64}|tmdb_person_\d+|openlibrary_author_OL\d+A)$/i;

export function isValidMediaId(id: string): boolean {
  return MEDIA_ID_PATTERN.test(id);
}

/** Safe for extension URL query params — rejects injection characters. */
export function isSafeNavMediaId(id: string): boolean {
  return isValidMediaId(id);
}

export function isBookWorkId(id: string): boolean {
  return (
    id.startsWith('openlibrary_work_') ||
    id.startsWith('book_fingerprint_') ||
    id.startsWith('isbn13_') ||
    id.startsWith('isbn10_') ||
    id.startsWith('googlebooks_volume_')
  );
}