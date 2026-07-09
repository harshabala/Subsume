/**
 * Indian cinema highlights — merged into existing libraries via MERGE_SEED_CATALOG.
 * TMDb poster paths (w500). Metadata verified 2026-07-09 via TMDb + Wikidata (no API key).
 */
import type { MediaItem, LibraryItem } from '../shared/types';

export const INDIAN_HIGHLIGHT_MEDIA: MediaItem[] = [
  {
    id: 'seed_indian',
    canonicalTitle: 'Indian',
    type: 'movie',
    year: 1996,
    genres: ['Drama', 'Action', 'Thriller'],
    ratings: [{ score: 6.9, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '31521', url: 'https://www.themoviedb.org/movie/31521' },
      { provider: 'imdb', externalId: 'tt0116630', url: 'https://www.imdb.com/title/tt0116630/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/zhGayNbH2ZHWaJkhSv3qEhs5fy6.jpg',
    overview:
      'Senapathy, an ex-freedom fighter, is angry. He is angry against the rampant corruption at every level of the bureaucracy. He will clean it up at any cost.\n\n• Directed by: S. Shankar\n• Written by: S. Shankar, Sujatha\n• Starring: Kamal Haasan, Manisha Koirala, Urmila Matondkar\n• Cinematography: Jeeva\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_mudhalvan',
    canonicalTitle: 'Mudhalvan',
    type: 'movie',
    year: 1999,
    genres: ['Thriller'],
    ratings: [{ score: 6.9, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '66526', url: 'https://www.themoviedb.org/movie/66526' },
      { provider: 'imdb', externalId: 'tt0220656', url: 'https://www.imdb.com/title/tt0220656/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/k69lNVmDJcLLJb4LBCk3L2yv4Vw.jpg',
    overview:
      'A man accepts a challenge to act as the Chief Minister for one day only, and makes such a success of it that soon he is embroiled in political intrigue.\n\n• Directed by: S. Shankar\n• Written by: S. Shankar, Sujatha\n• Starring: Arjun Sarja, Manisha Koirala, Raghuvaran\n• Cinematography: K. V. Anand\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_enthiran',
    canonicalTitle: 'Enthiran',
    type: 'movie',
    year: 2010,
    genres: ['Action', 'Sci-Fi', 'Adventure'],
    ratings: [{ score: 6.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '148284', url: 'https://www.themoviedb.org/movie/148284' },
      { provider: 'imdb', externalId: 'tt1305797', url: 'https://www.imdb.com/title/tt1305797/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hai6CSCLxULO1RThjDP3lWAqOtQ.jpg',
    overview:
      'Dr. Vaseegaran creates Chitti, a powerful robot in his own image, but it is rejected by the scientific body AIRD due to its lack of human behaviour and emotions. After a lightning strike triggers emotions in Chitti, he begins to develop human-like feelings. However, Chitti falls in love with Dr. Vaseegaran\'s fiancée, Sana, and turns against his creator, leading to dangerous consequences.\n\n• Directed by: S. Shankar\n• Written by: S. Shankar, Madhan Karky\n• Starring: Rajinikanth, Aishwarya Rai Bachchan\n• Cinematography: R. Rathnavelu\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'S. Shankar',
  },
  {
    id: 'seed_padayappa',
    canonicalTitle: 'Padayappa',
    type: 'movie',
    year: 1999,
    genres: ['Drama', 'Action'],
    ratings: [{ score: 7.4, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '47940', url: 'https://www.themoviedb.org/movie/47940' },
      { provider: 'imdb', externalId: 'tt0213969', url: 'https://www.imdb.com/title/tt0213969/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/8PSYF0AtpLbSlTDneCUo7zP4qL1.jpg',
    overview:
      'Padayappa, a mechanical engineer whose father gives up his property to his foster brother, and then dies of shock soon after. Neelambari initially loves Padayappa, but plans to humiliate him after his family humiliates her father. The rest of the plot deals with Padayappa overcoming all the obstacles placed by Neelambari.\n\n• Directed by: K. S. Ravikumar\n• Written by: K. S. Ravikumar\n• Starring: Rajinikanth, Ramya Krishnan, Soundarya\n• Cinematography: Tirru\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'K. S. Ravikumar',
  },
  {
    id: 'seed_vikram',
    canonicalTitle: 'Vikram',
    type: 'movie',
    year: 2022,
    genres: ['Action', 'Crime', 'Thriller'],
    ratings: [{ score: 7.6, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '743563', url: 'https://www.themoviedb.org/movie/743563' },
      { provider: 'imdb', externalId: 'tt9179430', url: 'https://www.imdb.com/title/tt9179430/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/774UV1aCURb4s4JfEFg3IEMu5Zj.jpg',
    overview:
      'Amar is assigned to investigate a case of serial killings. When Amar investigates the case, he realizes it is not what it seems to be and following down this path will lead to nothing but war between everyone involved.\n\n• Directed by: Lokesh Kanagaraj\n• Written by: Lokesh Kanagaraj, Rathna Kumar\n• Starring: Kamal Haasan, Vijay Sethupathi, Fahadh Faasil\n• Cinematography: Girish Gangadharan\n• Music by: Anirudh Ravichander',
    wikidataDirectorBio: 'Lokesh Kanagaraj',
  },
  {
    id: 'seed_drishyam_ml',
    canonicalTitle: 'Drishyam',
    type: 'movie',
    year: 2013,
    genres: ['Thriller', 'Crime', 'Drama'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '244049', url: 'https://www.themoviedb.org/movie/244049' },
      { provider: 'imdb', externalId: 'tt3417422', url: 'https://www.imdb.com/title/tt3417422/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/7d8GLneJkF81q1POdK7VUrjWafX.jpg',
    overview:
      'Georgekutty lives a happy life with his wife and daughters. Things take a turn when his daughter gets indecently filmed using a hidden camera, by the son of a police inspector.\n\n• Directed by: Jeethu Joseph\n• Written by: Jeethu Joseph\n• Starring: Mohanlal, Meena, Ansiba Hassan, Asha Sarath\n• Cinematography: Sujith Vaassudev\n• Music by: Anil Johnson, Vinu Thomas',
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
