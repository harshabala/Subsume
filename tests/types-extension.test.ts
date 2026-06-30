import { MediaProvider, MediaItem, LibraryItem, SetUserNotesRequest } from '@/shared/types';

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

describe('LibraryItem and SetUserNotesRequest extension fields', () => {
  it('accepts optional atmosphere and lingeringThought on LibraryItem', () => {
    const item: LibraryItem = {
      mediaId: 'test_1',
      status: 'watched',
      addedAt: 1719720000,
      updatedAt: 1719720000,
      atmosphere: 'dreamy, melancholic',
      lingeringThought: 'What if they never meet again?',
    };
    expect(item.atmosphere).toBe('dreamy, melancholic');
    expect(item.lingeringThought).toBe('What if they never meet again?');
  });

  it('accepts optional atmosphere and lingeringThought on SetUserNotesRequest', () => {
    const req: SetUserNotesRequest = {
      mediaId: 'test_1',
      notes: 'Some notes',
      atmosphere: 'noir, rainy',
      lingeringThought: 'The ending was ambiguous.',
    };
    expect(req.atmosphere).toBe('noir, rainy');
    expect(req.lingeringThought).toBe('The ending was ambiguous.');
  });
});

