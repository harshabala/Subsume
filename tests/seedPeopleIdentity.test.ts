import { describe, it, expect } from 'vitest';
import {
  SEED_PEOPLE,
  SEED_PEOPLE_OBSOLETE_IDS,
} from '@/background/seedData';

/** Known-good TMDb person ids (verified against themoviedb.org person pages). */
const EXPECTED_TMDB_IDS: Record<string, string> = {
  'Tom Cruise': '500',
  'Kamal Haasan': '93193',
  'Satyajit Ray': '12160',
  'Mani Ratnam': '78747',
  'Gautham Vasudev Menon': '120953',
  Cheran: '240439',
  Mohanlal: '82732',
  Mammootty: '124111',
};

/** Historically wrong mappings that must never reappear. */
const FORBIDDEN_IDS = new Set([
  '56531', // Solomon Perel (was mislabeled Kamal)
  '5655', // Wes Anderson (was mislabeled Satyajit Ray)
  '147079', // Chiranjeevi (was mislabeled Mammootty)
]);

describe('SEED_PEOPLE identity', () => {
  it('uses tmdb_person_{numericId} ids that match known-good map', () => {
    for (const person of SEED_PEOPLE) {
      const m = person.id.match(/^tmdb_person_(\d+)$/);
      expect(m, `${person.name} has invalid id ${person.id}`).toBeTruthy();
      const tmdbId = m![1];
      expect(FORBIDDEN_IDS.has(tmdbId), `${person.name} must not use forbidden id ${tmdbId}`).toBe(
        false,
      );
      const expected = EXPECTED_TMDB_IDS[person.name];
      if (expected) {
        expect(tmdbId).toBe(expected);
      }
    }
  });

  it('lists obsolete wrong ids for merge cleanup', () => {
    expect(SEED_PEOPLE_OBSOLETE_IDS).toEqual(
      expect.arrayContaining([
        'tmdb_person_56531',
        'tmdb_person_5655',
        'tmdb_person_147079',
      ]),
    );
    const liveIds = new Set(SEED_PEOPLE.map((p) => p.id));
    for (const obsolete of SEED_PEOPLE_OBSOLETE_IDS) {
      expect(liveIds.has(obsolete), `obsolete id ${obsolete} still in SEED_PEOPLE`).toBe(false);
    }
  });

  it('has profile image URLs on TMDb image CDN', () => {
    for (const person of SEED_PEOPLE) {
      expect(person.profileImageUrl).toMatch(
        /^https:\/\/image\.tmdb\.org\/t\/p\/w300_and_h450_bestv2\/[A-Za-z0-9]+\.jpg$/,
      );
    }
  });
});
