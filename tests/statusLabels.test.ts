import { describe, it, expect } from 'vitest';
import {
  legacyStatusToRelationship,
  relationshipToLegacyStatus,
  statusLabel,
  defaultIntentForStatus,
  legacyIntentToV2,
} from '@/shared/statusLabels';
import { mediaItemToCatalogWork, libraryItemToRelationship, libraryItemToReflections } from '@/shared/compatibility';
import { statusChipLabel, statusOptionsForMedium } from '@/ui/components/archive/constants';
import type { MediaItem, LibraryItem } from '@/shared/types';

describe('status mapping', () => {
  it('maps legacy statuses to relationship statuses bidirectionally', () => {
    const pairs = [
      ['to-watch', 'planned'],
      ['watching', 'in_progress'],
      ['watched', 'completed'],
      ['abandoned', 'abandoned'],
    ] as const;
    for (const [legacy, rel] of pairs) {
      expect(legacyStatusToRelationship(legacy)).toBe(rel);
      expect(relationshipToLegacyStatus(rel)).toBe(legacy);
    }
  });

  it('returns medium-specific operational labels', () => {
    expect(statusLabel('completed', 'movie')).toBe('Watched');
    expect(statusLabel('completed', 'book')).toBe('Read');
    expect(statusLabel('abandoned', 'book')).toBe('Did not finish');
    expect(statusLabel('planned', 'tv')).toBe('Want to watch');
  });

  it('archive chips use book-aware labels and literary screen labels', () => {
    expect(statusChipLabel('watched', 'book')).toBe('Read');
    expect(statusChipLabel('to-watch', 'book')).toBe('Want to read');
    expect(statusChipLabel('watched', 'movie')).toBe('Screened');
    expect(statusChipLabel('to-watch', 'tv')).toBe('Anticipated');
    expect(statusOptionsForMedium('book').find((o) => o.value === 'watched')?.label).toBe('Read');
    expect(statusOptionsForMedium('movie').find((o) => o.value === 'watched')?.label).toBe('Screened');
  });

  it('defaults abandoned to keep_memory intent', () => {
    expect(defaultIntentForStatus('abandoned')).toBe('keep_memory');
    expect(defaultIntentForStatus('planned')).toBe('wishlist');
  });

  it('maps revisit_this_month to return_soon', () => {
    expect(legacyIntentToV2('revisit_this_month')).toBe('return_soon');
  });
});

describe('compatibility converters', () => {
  const media: MediaItem = {
    id: 'tmdb_movie_1',
    canonicalTitle: 'Test Film',
    type: 'movie',
    year: 2020,
    genres: ['Drama'],
    ratings: [],
    providers: [{ provider: 'tmdb', externalId: '1' }],
    posterUrl: 'https://example.com/p.jpg',
  };

  it('converts MediaItem to CatalogWork with screenDetails', () => {
    const work = mediaItemToCatalogWork(media);
    expect(work.medium).toBe('movie');
    expect(work.images.primary).toContain('p.jpg');
    expect(work.screenDetails?.screenType).toBe('movie');
  });

  it('converts book MediaItem with authors', () => {
    const book: MediaItem = {
      ...media,
      id: 'openlibrary_work_OL1W',
      type: 'book',
      authors: ['Ada Lovelace'],
    };
    const work = mediaItemToCatalogWork(book);
    expect(work.medium).toBe('book');
    expect(work.bookDetails?.authors).toEqual(['Ada Lovelace']);
  });

  it('migrates emotionalRecall into first_impression reflection', () => {
    const lib: LibraryItem = {
      mediaId: 'tmdb_movie_1',
      status: 'watched',
      addedAt: 1,
      updatedAt: 2,
      emotionalRecall: 'The ending stayed with me.',
      notes: 'The ending stayed with me.',
    };
    const reflections = libraryItemToReflections(lib);
    expect(reflections.some((r) => r.kind === 'first_impression')).toBe(true);
    expect(reflections.filter((r) => r.body.includes('ending')).length).toBe(1);
  });

  it('maps library status via relationship converter', () => {
    const lib: LibraryItem = {
      mediaId: 'tmdb_movie_1',
      status: 'watching',
      addedAt: 1,
      updatedAt: 2,
    };
    expect(libraryItemToRelationship(lib).status).toBe('in_progress');
  });
});
