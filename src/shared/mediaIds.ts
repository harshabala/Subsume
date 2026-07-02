/**
 * Canonical media ID patterns used across Subsume providers.
 * Slug segments allow lowercase letters, digits, and hyphens only.
 */
export const MEDIA_ID_PATTERN =
  /^(tmdb_(movie|tv)_\d+|tvmaze_tv_\d+|trakt_(movie|tv)_[a-z0-9-]+|trakt_trending_[a-z0-9-]+|discovery_trakt_(movie|tv)_[a-z0-9-]+|discovery_tvmaze_tv_\d+|seed_[a-z0-9_]+)$/;

export function isValidMediaId(id: string): boolean {
  return MEDIA_ID_PATTERN.test(id);
}

/** Safe for extension URL query params — rejects injection characters. */
export function isSafeNavMediaId(id: string): boolean {
  return isValidMediaId(id);
}