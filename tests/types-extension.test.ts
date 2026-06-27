import { MediaProvider, MediaItem } from '@/shared/types';

describe('MediaProvider type', () => {
  it('accepts trakt as a valid MediaProvider', () => {
    const p: MediaProvider = 'trakt';
    expect(p).toBe('trakt');
  });

  it('accepts tvmaze as a valid MediaProvider', () => {
    const p: MediaProvider = 'tvmaze';
    expect(p).toBe('tvmaze');
  });
});

describe('MediaItem enrichment fields', () => {
  it('accepts wikidataSummary on MediaItem', () => {
    const item: MediaItem = {
      id: 'test_1',
      canonicalTitle: 'Test',
      type: 'tv',
      year: 2020,
      genres: [],
      ratings: [],
      providers: [],
      posterUrl: '',
      wikidataSummary: 'A summary from Wikidata.',
      wikidataDirectorBio: 'A bio from Wikidata.',
    };
    expect(item.wikidataSummary).toBe('A summary from Wikidata.');
    expect(item.wikidataDirectorBio).toBe('A bio from Wikidata.');
  });
});
