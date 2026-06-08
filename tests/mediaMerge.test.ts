import { describe, it, expect } from 'vitest';
import { MediaItem } from '@/shared/types';
import { mergeMediaItems } from '@/background/mediaMerge';

function makeMedia(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'tmdb_movie_1',
    canonicalTitle: 'Test Movie',
    type: 'movie',
    year: 2024,
    genres: ['Action'],
    ratings: [{ provider: 'tmdb', score: 7.5 }],
    providers: [{ provider: 'tmdb', externalId: '1' }],
    posterUrl: 'https://example.com/poster.jpg',
    ...overrides,
  };
}

describe('mergeMediaItems', () => {
  it('preserves enriched ratings when incoming payload is sparse', () => {
    const existing = makeMedia({
      ratings: [
        { provider: 'tmdb', score: 7.5 },
        { provider: 'imdb', score: 8.1 },
        { provider: 'rt', score: 92 },
      ],
    });
    const incoming = makeMedia({
      ratings: [{ provider: 'tmdb', score: 7.5 }],
      genres: [],
      providers: [],
    });

    const merged = mergeMediaItems(incoming, existing);

    expect(merged.ratings).toHaveLength(3);
    expect(merged.ratings.map((r) => r.provider)).toEqual(['tmdb', 'imdb', 'rt']);
  });

  it('keeps existing genres and streaming data when incoming payload is empty', () => {
    const existing = makeMedia({
      genres: ['Drama', 'Thriller'],
      streamingAvailability: [{ region: 'US', platform: 'Netflix' }],
      overview: 'Existing overview',
    });
    const incoming = makeMedia({
      genres: [],
      providers: [],
      overview: '',
      streamingAvailability: [],
    });

    const merged = mergeMediaItems(incoming, existing);

    expect(merged.genres).toEqual(['Drama', 'Thriller']);
    expect(merged.streamingAvailability).toEqual([{ region: 'US', platform: 'Netflix' }]);
    expect(merged.overview).toBe('Existing overview');
  });

  it('applies incoming fields when they contain meaningful data', () => {
    const existing = makeMedia({
      canonicalTitle: 'Old Title',
      posterUrl: 'https://example.com/old.jpg',
      genres: ['Drama'],
    });
    const incoming = makeMedia({
      canonicalTitle: 'New Title',
      posterUrl: 'https://example.com/new.jpg',
      genres: ['Action', 'Sci-Fi'],
      providers: [{ provider: 'tmdb', externalId: '99' }],
    });

    const merged = mergeMediaItems(incoming, existing);

    expect(merged.canonicalTitle).toBe('New Title');
    expect(merged.posterUrl).toBe('https://example.com/new.jpg');
    expect(merged.genres).toEqual(['Action', 'Sci-Fi']);
    expect(merged.providers).toEqual([{ provider: 'tmdb', externalId: '99' }]);
  });
});