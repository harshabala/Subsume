/**
 * Indian cinema highlights — merged into existing libraries via MERGE_SEED_CATALOG.
 * TMDb poster paths (w500).
 */
import type { MediaItem, LibraryItem } from '../shared/types';

export const INDIAN_HIGHLIGHT_MEDIA: MediaItem[] = [
  {
    id: 'seed_indian',
    canonicalTitle: 'Indian',
    type: 'movie',
    year: 1996,
    genres: ['Action', 'Drama', 'Thriller'],
    ratings: [{ score: 8.1, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/1nfv2e14T1YxTwRsd67XAsOnv8D.jpg',
    overview:
      'A veteran freedom fighter returns to fight corruption — Kamal Haasan in a dual role for Shankar.\n\n• Directed by: S. Shankar\n• Starring: Kamal Haasan, Manisha Koirala, Urmila Matondkar',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_mudhalvan',
    canonicalTitle: 'Mudhalvan',
    type: 'movie',
    year: 1999,
    genres: ['Drama', 'Thriller'],
    ratings: [{ score: 8.4, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/bvYjhsbxOBwpm8xLE5BhdA3a8CZ.jpg',
    overview:
      'A TV reporter is challenged to become Chief Minister for a day — political thriller classic.\n\n• Directed by: S. Shankar\n• Starring: Arjun Sarja, Manisha Koirala, Raghuvaran',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_enthiran',
    canonicalTitle: 'Enthiran',
    type: 'movie',
    year: 2010,
    genres: ['Sci-Fi', 'Action', 'Romance'],
    ratings: [{ score: 7.2, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8sMuhJ53TLmT8BC2Lyeq5B1OCuI.jpg',
    overview:
      'A scientist’s android develops a dangerous will of its own (Robot / Enthiran).\n\n• Directed by: S. Shankar\n• Starring: Rajinikanth, Aishwarya Rai Bachchan',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_padayappa',
    canonicalTitle: 'Padayappa',
    type: 'movie',
    year: 1999,
    genres: ['Drama', 'Action'],
    ratings: [{ score: 7.8, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/4Y1WNkd88JXqWAJ2o8CDv9kJp2v.jpg',
    overview:
      'An engineer rises from humble roots while facing a relentless rival.\n\n• Directed by: K. S. Ravikumar\n• Starring: Rajinikanth, Ramya Krishnan, Soundarya',
    wikidataDirectorBio: 'K. S. Ravikumar',
  },
  {
    id: 'seed_vikram',
    canonicalTitle: 'Vikram',
    type: 'movie',
    year: 2022,
    genres: ['Action', 'Thriller'],
    ratings: [{ score: 8.0, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/rpygWG88jmfDSJhTwewy9dxey4T.jpg',
    overview:
      'A black-ops agent hunts a phantom cell threatening the nation.\n\n• Directed by: Lokesh Kanagaraj\n• Starring: Kamal Haasan, Vijay Sethupathi, Fahadh Faasil',
    wikidataDirectorBio: 'Lokesh Kanagaraj',
  },
  {
    id: 'seed_drishyam_ml',
    canonicalTitle: 'Drishyam',
    type: 'movie',
    year: 2013,
    genres: ['Drama', 'Thriller'],
    ratings: [{ score: 8.7, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/7d8GLneJkF81q1POdK7VUrjWafX.jpg',
    overview:
      'A father shields his family after an unthinkable accident — Malayalam original.\n\n• Directed by: Jeethu Joseph\n• Starring: Mohanlal, Meena, Ansiba Hassan',
    wikidataDirectorBio: 'Jeethu Joseph',
  },
];

export const HIGHLIGHT_LIBRARY: Record<
  string,
  Pick<LibraryItem, 'status' | 'userRating' | 'notes' | 'sanctuaryIntent'>
> = {
  seed_indian: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes:
      'Shankar + Kamal at peak — the makeup, the moral fury, AR Rahman’s score. Still the template for big Tamil vigilante cinema.',
  },
  seed_mudhalvan: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes:
      'One of the sharpest “what if media held power accountable” films. Arjun and Manisha, Rahman again — endlessly rewatchable.',
  },
  seed_nayakan: {
    status: 'watched',
    userRating: 10,
    sanctuaryIntent: 'keep_memory',
    notes: 'Kamal and Mani Ratnam at their peak — the Mumbai don myth made human.',
  },
  seed_anbe_sivam: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'revisit_this_month',
    notes: 'Humanist road movie; Kamal and Madhavan chemistry is gold.',
  },
  seed_enthiran: {
    status: 'watched',
    userRating: 8,
    sanctuaryIntent: 'keep_memory',
    notes: 'Rajini sci-fi spectacle — silly and sincere in equal measure.',
  },
  seed_padayappa: {
    status: 'watched',
    userRating: 8,
    sanctuaryIntent: 'keep_memory',
    notes: 'Peak mass Rajini; Ramya Krishnan’s Neelambari is iconic.',
  },
  seed_kireedam: {
    status: 'watched',
    userRating: 10,
    sanctuaryIntent: 'keep_memory',
    notes: 'Mohanlal’s shattered son — Malayalam drama that still hurts.',
  },
  seed_manichitrathazhu: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes: 'Shobana + Mohanlal + Suresh Gopi — haunted house done right.',
  },
  seed_oru_vadakkan_veeragatha: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes: 'Mammootty reframes Chandu; folk myth turned tragedy.',
  },
  seed_vikram: {
    status: 'watched',
    userRating: 8,
    sanctuaryIntent: 'revisit_this_month',
    notes: 'Lokesh + Kamal universe kickoff — propulsive and loud in the best way.',
  },
  seed_drishyam_ml: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes: 'The Mohanlal original before the remakes — quiet panic, perfect plotting.',
  },
  seed_spadikam: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'revisit_this_month',
    notes: 'Mohanlal rage and redemption — mass cinema with a soul.',
  },
  seed_iruvar: {
    status: 'watched',
    userRating: 9,
    sanctuaryIntent: 'keep_memory',
    notes: 'Mani Ratnam’s political myth — Mohanlal and Prakash Raj.',
  },
};

export function libraryEntryForSeed(media: MediaItem, index: number): LibraryItem {
  const now = Date.now();
  const h = HIGHLIGHT_LIBRARY[media.id];
  const isHighlight = Boolean(h);
  const t = now - (isHighlight ? index * 3_600_000 : (index + 80) * 86_400_000);
  return {
    mediaId: media.id,
    status: h?.status ?? 'to-watch',
    addedAt: t,
    updatedAt: t,
    userRating: h?.userRating,
    notes: h?.notes,
    sanctuaryIntent: h?.sanctuaryIntent,
  };
}