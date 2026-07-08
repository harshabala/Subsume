import { MediaItem, LibraryItem, PersonItem } from '../shared/types';
import { INDIAN_HIGHLIGHT_MEDIA, libraryEntryForSeed } from './seedIndianHighlights';

export const SEED_CATALOGUE_VERSION = 3;
export const SEED_CATALOGUE_VERSION_KEY = 'subsume_seed_catalogue_version';

export const SEED_MEDIA: MediaItem[] = [
  ...INDIAN_HIGHLIGHT_MEDIA,
  {
    id: 'seed_nayakan',
    canonicalTitle: 'Nayakan',
    type: 'movie',
    year: 1987,
    genres: ['Crime', 'Drama'],
    ratings: [{ score: 9.0, provider: 'tmdb' }, { score: 10.0, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/i2QOxh6pwgy1MUF4bBYDVdPwbWa.jpg',
    overview: 'A common man\'s struggle leads him to become a powerful don in Mumbai\'s slums.\n\n• Directed by: Mani Ratnam\n• Starring: Kamal Haasan, Saranya, Karthika\n• Cinematography: P. C. Sreeram\n• Music by: Ilaiyaraaja',
    wikidataDirectorBio: 'Mani Ratnam'
  },
  {
    id: 'seed_anbe_sivam',
    canonicalTitle: 'Anbe Sivam',
    type: 'movie',
    year: 2003,
    genres: ['Drama', 'Comedy'],
    ratings: [{ score: 9.2, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/nT556HbikCCLABe8xQ4zQ2QIb0O.jpg',
    overview: 'Two men of contrasting personalities embark on a journey, finding unexpected bonds.\n\n• Directed by: Sundar C.\n• Starring: Kamal Haasan, Madhavan, Kiran Rathod\n• Cinematography: Arthur A. Wilson\n• Music by: Vidyasagar',
    wikidataDirectorBio: 'Sundar C.'
  },
  {
    id: 'seed_pather_panchali',
    canonicalTitle: 'Pather Panchali',
    type: 'movie',
    year: 1955,
    genres: ['Drama'],
    ratings: [{ score: 9.5, provider: 'tmdb' }, { score: 9.8, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/2wqMKLJEMjenT7U8UqnuI070cUC.jpg',
    overview: 'A depiction of rural life in a Bengali village, focusing on young Apu and Durga.\n\n• Directed by: Satyajit Ray\n• Starring: Subir Banerjee, Kanu Banerjee, Karuna Banerjee\n• Cinematography: Subrata Mitra\n• Music by: Ravi Shankar',
    wikidataDirectorBio: 'Satyajit Ray'
  },
  {
    id: 'seed_charulata',
    canonicalTitle: 'Charulata',
    type: 'movie',
    year: 1964,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 9.1, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/iKcMiUVOdSrGzkNTSCJN3Fl3yl3.jpg',
    overview: 'A lonely young wife finds her intellectual and romantic awakening in late 19th-century Bengal.\n\n• Directed by: Satyajit Ray\n• Starring: Madhabi Mukherjee, Soumitra Chatterjee\n• Cinematography: Subrata Mitra\n• Music by: Satyajit Ray',
    wikidataDirectorBio: 'Satyajit Ray'
  },
  {
    id: 'seed_iruvar',
    canonicalTitle: 'Iruvar',
    type: 'movie',
    year: 1997,
    genres: ['Drama', 'Biography'],
    ratings: [{ score: 9.2, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/6uAHFUwhKWLF9OAvMz5zQdKiM4j.jpg',
    overview: 'An epic tale tracking the friendship and rivalry between a charismatic actor and a writer.\n\n• Directed by: Mani Ratnam\n• Starring: Mohanlal, Aishwarya Rai, Prakash Raj\n• Cinematography: Santosh Sivan\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Mani Ratnam'
  },
  {
    id: 'seed_kannathil_muthamittal',
    canonicalTitle: 'Kannathil Muthamittal',
    type: 'movie',
    year: 2002,
    genres: ['Drama', 'War'],
    ratings: [{ score: 8.8, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/c8YsqeGweX9ZTRgvQNPJ9dTePX0.jpg',
    overview: 'A young adopted girl journeys to war-torn Sri Lanka to find her biological mother.\n\n• Directed by: Mani Ratnam\n• Starring: Madhavan, Simran, P. S. Keerthana\n• Cinematography: Ravi K. Chandran\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Mani Ratnam'
  },
  {
    id: 'seed_vaaranam_aayiram',
    canonicalTitle: 'Vaaranam Aayiram',
    type: 'movie',
    year: 2008,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 8.7, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/qhgNQoByYSkkXJY4Zea3Ils5qUA.jpg',
    overview: 'An officer reflects on his father\'s profound influence on his life.\n\n• Directed by: Gautham Vasudev Menon\n• Starring: Suriya, Simran, Sameera Reddy, Divya Spandana\n• Cinematography: R. Rathnavelu\n• Music by: Harris Jayaraj',
    wikidataDirectorBio: 'Gautham Vasudev Menon'
  },
  {
    id: 'seed_vtv',
    canonicalTitle: 'Vinnaithaandi Varuvaayaa',
    type: 'movie',
    year: 2010,
    genres: ['Romance', 'Drama'],
    ratings: [{ score: 8.5, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/yDHwo3eWcMiy5LnnEnlGV9iLu9k.jpg',
    overview: 'An aspiring filmmaker falls deeply in love with a Christian girl from a conservative family.\n\n• Directed by: Gautham Vasudev Menon\n• Starring: Silambarasan, Trisha Krishnan\n• Cinematography: Manoj Paramahamsa\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Gautham Vasudev Menon'
  },
  {
    id: 'seed_autobiography',
    canonicalTitle: 'Autograph',
    type: 'movie',
    year: 2004,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 8.9, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/r2vGFRTYRcZjKph6pYoUectHpJY.jpg',
    overview: 'A man journeys back to his native village to invite past friends and loves to his wedding.\n\n• Directed by: Cheran\n• Starring: Cheran, Gopika, Mallika, Kaniha\n• Cinematography: Vijay Milton\n• Music by: Bharadwaj',
    wikidataDirectorBio: 'Cheran'
  },
  {
    id: 'seed_kireedam',
    canonicalTitle: 'Kireedam',
    type: 'movie',
    year: 1989,
    genres: ['Drama'],
    ratings: [{ score: 9.4, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/jwXWPm7Q8LVWYLycx95wZPbNGHJ.jpg',
    overview: 'Sethumadhavan\'s dreams of joining the police are ruined when he saves his father from a gangster.\n\n• Directed by: Sibi Malayil\n• Starring: Mohanlal, Thilakan, Parvathy\n• Cinematography: S. Kumar\n• Music by: Johnson',
    wikidataDirectorBio: 'Sibi Malayil'
  },
  {
    id: 'seed_manichitrathazhu',
    canonicalTitle: 'Manichitrathazhu',
    type: 'movie',
    year: 1993,
    genres: ['Horror', 'Thriller', 'Mystery'],
    ratings: [{ score: 9.5, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/mi8HpVPBUeYus28iaDuXzBasXRG.jpg',
    overview: 'Uncanny events in a haunted mansion trigger an investigation by a psychiatrist.\n\n• Directed by: Fazil\n• Starring: Mohanlal, Shobana, Suresh Gopi\n• Cinematography: Venu\n• Music by: Johnson, M. G. Radhakrishnan',
    wikidataDirectorBio: 'Fazil'
  },
  {
    id: 'seed_spadikam',
    canonicalTitle: 'Spadikam',
    type: 'movie',
    year: 1995,
    genres: ['Action', 'Drama'],
    ratings: [{ score: 9.0, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/vrpoSUOjRzLRpFGPtkBonEqaM1l.jpg',
    overview: 'A youth rebels against his authoritarian father, growing up to become a local rowdy.\n\n• Directed by: Bhadran\n• Starring: Mohanlal, Thilakan, Urvashi\n• Cinematography: J. Williams\n• Music by: S. P. Venkatesh',
    wikidataDirectorBio: 'Bhadran'
  },
  {
    id: 'seed_oru_vadakkan_veeragatha',
    canonicalTitle: 'Oru Vadakkan Veeragatha',
    type: 'movie',
    year: 1989,
    genres: ['Drama', 'History'],
    ratings: [{ score: 9.3, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/44YZYLc9zjrzWSbho7Wi47lW04u.jpg',
    overview: 'A revisionist view of the legendary warrior Chandu, framing him as a victim of tragic honor.\n\n• Directed by: Hariharan\n• Starring: Mammootty, Balan K. Nair, Madhavi\n• Cinematography: Ramachandra Babu\n• Music by: Bombay Ravi',
    wikidataDirectorBio: 'Hariharan'
  },
  {
    id: 'seed_vidheyan',
    canonicalTitle: 'Vidheyan',
    type: 'movie',
    year: 1994,
    genres: ['Drama'],
    ratings: [{ score: 8.8, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/joWXgPgCi6y172IxcYaowO6zAIo.jpg',
    overview: 'Explores the master-slave dynamic between a migrant laborer and a tyrannical landlord.\n\n• Directed by: Adoor Gopalakrishnan\n• Starring: Mammootty, Tanvi Azmi, M. R. Gopakumar\n• Cinematography: Mankada Ravi Varma\n• Music by: Vijay Bhaskar',
    wikidataDirectorBio: 'Adoor Gopalakrishnan'
  },
  {
    id: 'seed_96',
    canonicalTitle: '96',
    type: 'movie',
    year: 2018,
    genres: ['Romance', 'Drama'],
    ratings: [{ score: 8.9, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/nrVloCa2hCFOztRF1DZU2jnWIiQ.jpg',
    overview: 'Two high school sweethearts meet at a reunion after twenty-two years.\n\n• Directed by: C. Prem Kumar\n• Starring: Vijay Sethupathi, Trisha Krishnan\n• Cinematography: Mahendiran Jayaraju\n• Music by: Govind Vasantha',
    wikidataDirectorBio: 'C. Prem Kumar'
  },
  {
    id: 'seed_meiyazhagan',
    canonicalTitle: 'Meiyazhagan',
    type: 'movie',
    year: 2024,
    genres: ['Drama'],
    ratings: [{ score: 9.0, provider: 'tmdb' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/rpygWG88jmfDSJhTwewy9dxey4T.jpg',
    overview: 'A man returning to his hometown forms a deep bond with a warm-hearted relative.\n\n• Directed by: C. Prem Kumar\n• Starring: Karthi, Arvind Swamy\n• Cinematography: Mahendiran Jayaraju\n• Music by: Govind Vasantha',
    wikidataDirectorBio: 'C. Prem Kumar'
  },
  {
    id: 'seed_my_octopus_teacher',
    canonicalTitle: 'My Octopus Teacher',
    type: 'movie',
    year: 2020,
    genres: ['Documentary'],
    ratings: [{ score: 8.7, provider: 'tmdb' }, { score: 9.5, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hvTVZb7hBC8tZAGoEhH5eiMJu2B.jpg',
    overview: 'A filmmaker forges an unusual friendship with an octopus living in a kelp forest.\n\n• Directed by: Pippa Ehrlich, James Reed\n• Starring: Craig Foster\n• Cinematography: Roger Horrocks\n• Music by: Kevin Smuts',
    wikidataDirectorBio: 'Pippa Ehrlich, James Reed'
  },
  {
    id: 'seed_free_solo',
    canonicalTitle: 'Free Solo',
    type: 'movie',
    year: 2018,
    genres: ['Documentary'],
    ratings: [{ score: 8.6, provider: 'tmdb' }, { score: 9.7, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/kreTuJBkUjVWePRfhHZuYfhNE1T.jpg',
    overview: 'Alex Honnold attempts to free solo climb the vertical face of El Capitan.\n\n• Directed by: Elizabeth Chai Vasarhelyi, Jimmy Chin\n• Starring: Alex Honnold, Tommy Caldwell\n• Cinematography: Jimmy Chin, Clair Popkin\n• Music by: Marco Beltrami',
    wikidataDirectorBio: 'Elizabeth Chai Vasarhelyi, Jimmy Chin'
  },
  {
    id: 'seed_parasite',
    canonicalTitle: 'Parasite',
    type: 'movie',
    year: 2019,
    genres: ['Thriller', 'Drama', 'Comedy'],
    ratings: [{ score: 9.6, provider: 'tmdb' }, { score: 9.9, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/igICOruFgiqdY1HXwTNRuXJute.jpg',
    overview: 'Greed and class discrimination threaten the relationship between two Korean families.\n\n• Directed by: Bong Joon Ho\n• Starring: Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong\n• Cinematography: Hong Kyung-pyo\n• Music by: Jung Jae-il',
    wikidataDirectorBio: 'Bong Joon Ho'
  },
  {
    id: 'seed_everything_everywhere',
    canonicalTitle: 'Everything Everywhere All at Once',
    type: 'movie',
    year: 2022,
    genres: ['Sci-Fi', 'Adventure', 'Comedy'],
    ratings: [{ score: 9.3, provider: 'tmdb' }, { score: 9.4, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg',
    overview: 'A Chinese immigrant explores other universes to save existence.\n\n• Directed by: Daniel Kwan, Daniel Scheinert\n• Starring: Michelle Yeoh, Ke Huy Quan, Stephanie Hsu, Jamie Lee Curtis\n• Cinematography: Larkin Seiple\n• Music by: Son Lux',
    wikidataDirectorBio: 'Daniel Kwan, Daniel Scheinert'
  },
  {
    id: 'seed_portrait_lady_fire',
    canonicalTitle: 'Portrait of a Lady on Fire',
    type: 'movie',
    year: 2019,
    genres: ['Romance', 'Drama'],
    ratings: [{ score: 9.4, provider: 'tmdb' }, { score: 9.7, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/kuV6TtaUwDEqxsMhJZPEWPcgHJM.jpg',
    overview: 'On an isolated island in Brittany, a female painter falls in love with her subject.\n\n• Directed by: Céline Sciamma\n• Starring: Noémie Merlant, Adèle Haenel\n• Cinematography: Claire Mathon\n• Music by: Jean-Baptiste de Laubier, Arthur Simonini',
    wikidataDirectorBio: 'Céline Sciamma'
  },
  {
    id: 'seed_get_out',
    canonicalTitle: 'Get Out',
    type: 'movie',
    year: 2017,
    genres: ['Horror', 'Mystery', 'Thriller'],
    ratings: [{ score: 9.0, provider: 'tmdb' }, { score: 9.8, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
    overview: 'A young man visits his white girlfriend\'s family estate, uncovering dark secrets.\n\n• Directed by: Jordan Peele\n• Starring: Daniel Kaluuya, Allison Williams, Bradley Whitford\n• Cinematography: Toby Oliver\n• Music by: Michael Abels',
    wikidataDirectorBio: 'Jordan Peele'
  },
  {
    id: 'seed_top_gun_maverick',
    canonicalTitle: 'Top Gun: Maverick',
    type: 'movie',
    year: 2022,
    genres: ['Action', 'Drama'],
    ratings: [{ score: 8.3, provider: 'tmdb' }, { score: 9.6, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg',
    overview: 'After thirty years, Maverick pushes the envelope as a Navy test pilot.\n\n• Directed by: Joseph Kosinski\n• Starring: Tom Cruise, Miles Teller, Jennifer Connelly',
    wikidataDirectorBio: 'Joseph Kosinski'
  },
  {
    id: 'seed_mi_fallout',
    canonicalTitle: 'Mission: Impossible - Fallout',
    type: 'movie',
    year: 2018,
    genres: ['Action', 'Adventure', 'Thriller'],
    ratings: [{ score: 8.5, provider: 'tmdb' }, { score: 9.7, provider: 'rt' }],
    providers: [],
    posterUrl: 'https://image.tmdb.org/t/p/w500/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg',
    overview: 'Ethan Hunt and his IMF team race against time after a mission gone wrong.\n\n• Directed by: Christopher McQuarrie\n• Starring: Tom Cruise, Henry Cavill',
    wikidataDirectorBio: 'Christopher McQuarrie'
  }
];

export const SEED_LIBRARY: LibraryItem[] = SEED_MEDIA.map((m, idx) => libraryEntryForSeed(m, idx));

export const SEED_PEOPLE: PersonItem[] = [
  {
    id: 'tmdb_person_500',
    name: 'Tom Cruise',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/p17SLq4wabXwIYyjXF1Wf5cNnAm.jpg',
    biography: 'Thomas Cruise Mapother IV (born July 3, 1962) is a legendary American actor and producer. One of the highest-grossing box office stars of all time, he is celebrated for performing his own death-defying stunts in action classics like the Mission: Impossible series, Top Gun, and Edge of Tomorrow.',
    knownFor: ['Top Gun: Maverick', 'Mission: Impossible - Fallout', 'Jerry Maguire'],
    filmographyIds: ['seed_top_gun_maverick', 'seed_mi_fallout'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_56531',
    name: 'Kamal Haasan',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/jzS2umMVOZ73IFEH6X0M7Os02Ji.jpg',
    biography: 'Kamal Haasan (born November 7, 1954) is a legendary Indian actor, director, screenwriter, and producer working primarily in Tamil cinema. Widely regarded as one of the greatest actors in Indian cinema history, he is celebrated for his incredible versatility, method acting, and technical innovations.',
    knownFor: ['Nayakan', 'Anbe Sivam', 'Indian'],
    filmographyIds: ['seed_indian', 'seed_mudhalvan', 'seed_nayakan', 'seed_anbe_sivam', 'seed_vikram'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_5655',
    name: 'Satyajit Ray',
    role: 'director',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/s03CeUeC5yAXyB1acqP0zGNo2SC.jpg',
    biography: 'Satyajit Ray (May 2, 1921 – April 23, 1992) was a legendary Indian filmmaker, screenwriter, author, and composer. Regarded as one of the greatest auteurs of world cinema, he directed masterpieces such as Pather Panchali and Charulata, introducing Indian realism to the global stage.',
    knownFor: ['Pather Panchali', 'Charulata', 'The Apu Trilogy'],
    filmographyIds: ['seed_pather_panchali', 'seed_charulata'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_78747',
    name: 'Mani Ratnam',
    role: 'director',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/iXRdku91Hp8nHSL3uWxnInxN6TH.jpg',
    biography: 'Mani Ratnam (born June 2, 1956) is a legendary Indian filmmaker, screenwriter, and producer who works primarily in Tamil cinema. He is credited with revolutionizing the aesthetic and technical standards of Indian cinema through masterpieces like Nayakan, Iruvar, and Kannathil Muthamittal.',
    knownFor: ['Nayakan', 'Iruvar', 'Kannathil Muthamittal'],
    filmographyIds: ['seed_nayakan', 'seed_iruvar', 'seed_kannathil_muthamittal'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_120953',
    name: 'Gautham Vasudev Menon',
    role: 'director',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/qOFycWPpr3Hi4kVXKWnTTKCAnGk.jpg',
    biography: 'Gautham Vasudev Menon (born February 25, 1973) is a prominent Indian filmmaker, screenwriter, and actor working in Tamil cinema. He is famous for his signature style of urban romance and gritty police dramas, such as Vaaranam Aayiram, Vinnaithaandi Varuvaayaa, and Kaakha Kaakha.',
    knownFor: ['Vaaranam Aayiram', 'Vinnaithaandi Varuvaayaa', 'Kaakha Kaakha'],
    filmographyIds: ['seed_vaaranam_aayiram', 'seed_vtv'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_240439',
    name: 'Cheran',
    role: 'director',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/nCZmkDoFuBqKs3IbkXJ7qmRcHTW.jpg',
    biography: 'Cheran is an acclaimed Indian film director, screenwriter, and actor in Tamil cinema. He is a four-time National Film Award winner, celebrated for directing highly emotional, socially conscious dramas, most notably the semi-autobiographical romantic hit Autograph (2004).',
    knownFor: ['Autograph', 'Thavamai Thavamirundhu', 'Pandavar Bhoomi'],
    filmographyIds: ['seed_autobiography'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_82732',
    name: 'Mohanlal',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/qQLZgSwskFW7VxSVfyZMV933jUU.jpg',
    biography: 'Mohanlal Vishwanathan (born May 21, 1960) is a legendary Indian actor, producer, and singer who works primarily in Malayalam cinema. Spanning over four decades, he is widely regarded as one of the finest natural actors in the history of cinema, famous for Kireedam, Manichitrathazhu, and Spadikam.',
    knownFor: ['Kireedam', 'Manichitrathazhu', 'Spadikam'],
    filmographyIds: ['seed_iruvar', 'seed_kireedam', 'seed_manichitrathazhu', 'seed_spadikam', 'seed_drishyam_ml'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_147079',
    name: 'Mammootty',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/jRCxnhftb7NprH92cdfah8KoAHg.jpg',
    biography: 'Mammootty (born September 7, 1951) is a legendary Indian actor and producer working in Malayalam cinema. Over a career of 50 years, he has acted in more than 400 films, won three National Film Awards, and is celebrated as one of the greatest actors in Indian cinema history.',
    knownFor: ['Oru Vadakkan Veeragatha', 'Vidheyan', 'Mathilukal'],
    filmographyIds: ['seed_oru_vadakkan_veeragatha', 'seed_vidheyan'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  }
];
