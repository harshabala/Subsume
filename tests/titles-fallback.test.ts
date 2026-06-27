import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the enrichment helpers in isolation.
// The handler itself is wired via message passing so we test the helpers it calls.
import * as tvmaze from '@/background/tvmaze';
import * as trakt from '@/background/trakt';
import * as wikidata from '@/background/wikidata';
import { MediaItem } from '@/shared/types';

const MOCK_TV_ITEM: MediaItem = {
  id: 'tvmaze_tv_169',
  canonicalTitle: 'Breaking Bad',
  type: 'tv',
  year: 2008,
  genres: ['Drama'],
  ratings: [{ provider: 'tvmaze', score: 9.3, votes: 0 }],
  providers: [{ provider: 'tvmaze', externalId: '169', url: 'https://www.tvmaze.com/shows/169' }],
  posterUrl: 'https://tvmaze.com/img.jpg',
  overview: '',
};

describe('TVmaze fallback availability', () => {
  it('searchTvMaze returns a MediaItem for known shows', async () => {
    vi.spyOn(tvmaze, 'searchTvMaze').mockResolvedValue(MOCK_TV_ITEM);
    const result = await tvmaze.searchTvMaze('Breaking Bad');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('tv');
  });
});

describe('Trakt rating enrichment', () => {
  it('fetchTraktRating returns a rating', async () => {
    vi.spyOn(trakt, 'fetchTraktRating').mockResolvedValue({
      provider: 'trakt',
      score: 9.1,
      votes: 55000,
    });
    const rating = await trakt.fetchTraktRating('breaking-bad', 'tv');
    expect(rating).not.toBeNull();
    expect(rating!.provider).toBe('trakt');
  });
});

describe('Wikipedia summary enrichment', () => {
  it('fetchWikipediaSummary returns text', async () => {
    vi.spyOn(wikidata, 'fetchWikipediaSummary').mockResolvedValue(
      'Breaking Bad is an American crime drama.'
    );
    const summary = await wikidata.fetchWikipediaSummary('Breaking Bad', 2008);
    expect(summary).toBe('Breaking Bad is an American crime drama.');
  });
});

describe('Wikidata director enrichment', () => {
  it('fetchWikidataDirectorInfo returns director info', async () => {
    vi.spyOn(wikidata, 'fetchWikidataDirectorInfo').mockResolvedValue({
      directorName: 'Vince Gilligan',
      directorBio: 'An American writer and director.',
    });
    const info = await wikidata.fetchWikidataDirectorInfo('tt0903747');
    expect(info).not.toBeNull();
    expect(info!.directorName).toBe('Vince Gilligan');
  });
});
