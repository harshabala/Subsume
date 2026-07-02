import { describe, it, expect } from 'vitest';
import { isValidMediaId, isSafeNavMediaId } from '@/shared/mediaIds';

describe('media ID validation', () => {
  it('accepts canonical provider prefixes', () => {
    expect(isValidMediaId('tmdb_movie_550')).toBe(true);
    expect(isValidMediaId('tvmaze_tv_501')).toBe(true);
    expect(isValidMediaId('trakt_movie_avatar')).toBe(true);
    expect(isValidMediaId('trakt_trending_the-bear')).toBe(true);
    expect(isValidMediaId('discovery_trakt_movie_oppenheimer-2023')).toBe(true);
    expect(isValidMediaId('discovery_tvmaze_tv_77')).toBe(true);
    expect(isValidMediaId('seed_inception')).toBe(true);
  });

  it('rejects injection-prone or unknown formats', () => {
    expect(isValidMediaId('')).toBe(false);
    expect(isValidMediaId('javascript:alert(1)')).toBe(false);
    expect(isValidMediaId('tmdb_movie_550?x=1')).toBe(false);
    expect(isValidMediaId('random_id')).toBe(false);
  });

  it('uses the same rules for navigation safety', () => {
    expect(isSafeNavMediaId('trakt_tv_breaking-bad')).toBe(true);
    expect(isSafeNavMediaId('../etc/passwd')).toBe(false);
  });
});