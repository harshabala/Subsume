import { MediaItem, LibraryItem, PersonItem } from '../shared/types';
import { INDIAN_HIGHLIGHT_MEDIA, libraryEntryForSeed } from './seedIndianHighlights';

/** Bump when catalogue metadata changes so existing installs re-merge. */
export const SEED_CATALOGUE_VERSION = 6;
export const SEED_CATALOGUE_VERSION_KEY = 'subsume_seed_catalogue_version';

/**
 * Wrong `tmdb_person_*` ids shipped in earlier catalogue versions (name labeled X, TMDb id is Y).
 * Removed on merge so users do not keep Chiranjeevi under "Mammootty", etc.
 */
export const SEED_PEOPLE_OBSOLETE_IDS: string[] = [
  'tmdb_person_56531', // was labeled Kamal Haasan → Solomon Perel
  'tmdb_person_5655', // was labeled Satyajit Ray → Wes Anderson
  'tmdb_person_147079', // was labeled Mammootty → Chiranjeevi
];

export const SEED_MEDIA: MediaItem[] = [
  ...INDIAN_HIGHLIGHT_MEDIA,
  {
    id: 'seed_nayakan',
    canonicalTitle: 'Nayakan',
    type: 'movie',
    year: 1987,
    genres: ['Drama', 'Crime'],
    ratings: [{ score: 7.9, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '29971', url: 'https://www.themoviedb.org/movie/29971' },
      { provider: 'imdb', externalId: 'tt0093603', url: 'https://www.imdb.com/title/tt0093603/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hnCKKPG5VkUiGQV0DTniyMTEZsT.jpg',
    overview:
      'Velu Naicker, who witnesses the brutal murder of his father, kills a corrupt policeman and escapes to Mumbai, only to become a gangster.\n\n• Directed by: Mani Ratnam\n• Written by: Mani Ratnam, Balakumaran\n• Starring: Kamal Haasan, Saranya, Karthika\n• Cinematography: P. C. Sreeram\n• Music by: Ilaiyaraaja',
    wikidataDirectorBio: 'Mani Ratnam',
  },
  {
    id: 'seed_anbe_sivam',
    canonicalTitle: 'Anbe Sivam',
    type: 'movie',
    year: 2003,
    genres: ['Comedy', 'Drama'],
    ratings: [{ score: 7.7, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '26910', url: 'https://www.themoviedb.org/movie/26910' },
      { provider: 'imdb', externalId: 'tt0367495', url: 'https://www.imdb.com/title/tt0367495/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/nT556HbikCCLABe8xQ4zQ2QIb0O.jpg',
    overview:
      'Anbarasu, young and arrogant, and Nallasivam, damaged - physically but not spiritually - by life, are thrown together by circumstances, and find that they are in some ways bound together by fate.\n\n• Directed by: Sundar C.\n• Written by: Kamal Haasan\n• Starring: Kamal Haasan, Madhavan, Kiran Rathod\n• Cinematography: Arthur A. Wilson\n• Music by: Vidyasagar',
    wikidataDirectorBio: 'Sundar C.',
  },
  {
    id: 'seed_pather_panchali',
    canonicalTitle: 'Pather Panchali',
    type: 'movie',
    year: 1955,
    genres: ['Drama', 'History'],
    ratings: [{ score: 7.8, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '5801', url: 'https://www.themoviedb.org/movie/5801' },
      { provider: 'imdb', externalId: 'tt0048473', url: 'https://www.imdb.com/title/tt0048473/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/frZj5djlU9hFEjMcL21RJZVuG5O.jpg',
    overview:
      'Impoverished priest Harihar Ray, dreaming of a better life for himself and his family, leaves his rural Bengal village in search of work. Alone, his wife, Sarbojaya, looks after her rebellious daughter, Durga, and her young son, Apu, as well as Harihar\'s elderly aunt Indir. The children enjoy the small pleasures of their difficult life, while their parents suffer the daily indignities heaped upon them.\n\n• Directed by: Satyajit Ray\n• Written by: Satyajit Ray\n• Starring: Subir Banerjee, Kanu Banerjee, Karuna Banerjee, Uma Dasgupta\n• Cinematography: Subrata Mitra\n• Music by: Ravi Shankar',
    wikidataDirectorBio: 'Satyajit Ray',
  },
  {
    id: 'seed_charulata',
    canonicalTitle: 'Charulata',
    type: 'movie',
    year: 1964,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '35790', url: 'https://www.themoviedb.org/movie/35790' },
      { provider: 'imdb', externalId: 'tt0057935', url: 'https://www.imdb.com/title/tt0057935/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/4kznHLoJGN3OBZunQvZwy26it8z.jpg',
    overview:
      'In 1870s India, Charulata is an isolated, artistically inclined woman who sees little of her busy journalist husband, Bhupati. Realizing that his wife is alienated and unhappy, he convinces his cousin, Amal, to spend time with Charulata and nourish her creative impulses. Amal is a fledgling poet himself, and he and Charulata bond over their shared love of art.\n\n• Directed by: Satyajit Ray\n• Written by: Satyajit Ray\n• Starring: Madhabi Mukherjee, Soumitra Chatterjee, Sailen Mukherjee\n• Cinematography: Subrata Mitra\n• Music by: Satyajit Ray',
    wikidataDirectorBio: 'Satyajit Ray',
  },
  {
    id: 'seed_iruvar',
    canonicalTitle: 'Iruvar',
    type: 'movie',
    year: 1997,
    genres: ['History', 'Drama'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '49032', url: 'https://www.themoviedb.org/movie/49032' },
      { provider: 'imdb', externalId: 'tt0119385', url: 'https://www.imdb.com/title/tt0119385/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/6uAHFUwhKWLF9OAvMz5zQdKiM4j.jpg',
    overview:
      'A fictionalized account of the lives of 1980s Tamil Nadu political icons M. G. Ramachandran and M. Karunanidhi, continuing the tryst between Tamil cinema and Dravidian politics.\n\n• Directed by: Mani Ratnam\n• Written by: Mani Ratnam, Suhasini\n• Starring: Mohanlal, Prakash Raj, Aishwarya Rai, Tabu\n• Cinematography: Santosh Sivan\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Mani Ratnam',
  },
  {
    id: 'seed_kannathil_muthamittal',
    canonicalTitle: 'Kannathil Muthamittal',
    type: 'movie',
    year: 2002,
    genres: ['Drama', 'War'],
    ratings: [{ score: 7.6, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '40998', url: 'https://www.themoviedb.org/movie/40998' },
      { provider: 'imdb', externalId: 'tt0312859', url: 'https://www.imdb.com/title/tt0312859/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/eypuf9fEWnTH6cSx6Pm82QGqp4r.jpg',
    overview:
      'A little girl is told by her parents that she is adopted. Determined to find her birth mother, her family eventually agrees to take her to Sri Lanka, where they encounter the militant group known as the Tamil Tigers.\n\n• Directed by: Mani Ratnam\n• Written by: Mani Ratnam, Sujatha\n• Starring: Madhavan, Simran, P. S. Keerthana, Nandita Das\n• Cinematography: Ravi K. Chandran\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Mani Ratnam',
  },
  {
    id: 'seed_vaaranam_aayiram',
    canonicalTitle: 'Vaaranam Aayiram',
    type: 'movie',
    year: 2008,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 7.3, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '38637', url: 'https://www.themoviedb.org/movie/38637' },
      { provider: 'imdb', externalId: 'tt1180583', url: 'https://www.imdb.com/title/tt1180583/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/3PxkiDTObsws7pzkdUiHCjOxVA4.jpg',
    overview:
      'A son deals with the death of his father and examines how their relationship influences him through growing up, romance, tragedy and adventure.\n\n• Directed by: Gautham Vasudev Menon\n• Written by: Gautham Vasudev Menon\n• Starring: Suriya, Simran, Sameera Reddy, Divya Spandana\n• Cinematography: R. Rathnavelu\n• Music by: Harris Jayaraj',
    wikidataDirectorBio: 'Gautham Vasudev Menon',
  },
  {
    id: 'seed_vtv',
    canonicalTitle: 'Vinnaithaandi Varuvaayaa',
    type: 'movie',
    year: 2010,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 7.4, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '37941', url: 'https://www.themoviedb.org/movie/37941' },
      { provider: 'imdb', externalId: 'tt1609168', url: 'https://www.imdb.com/title/tt1609168/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/icWUNL2GxDgWmI5PQN2RYA2CEbv.jpg',
    overview:
      'A young, aspiring filmmaker falls in love with a girl who moves into the house above his, but her sophisticated nature does more harm than good to him.\n\n• Directed by: Gautham Vasudev Menon\n• Written by: Gautham Vasudev Menon\n• Starring: Silambarasan, Trisha Krishnan\n• Cinematography: Manoj Paramahamsa\n• Music by: A. R. Rahman',
    wikidataDirectorBio: 'Gautham Vasudev Menon',
  },
  {
    id: 'seed_autobiography',
    canonicalTitle: 'Autograph',
    type: 'movie',
    year: 2004,
    genres: ['Romance', 'Drama'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '140299', url: 'https://www.themoviedb.org/movie/140299' },
      { provider: 'imdb', externalId: 'tt0411131', url: 'https://www.imdb.com/title/tt0411131/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/icy3xHF6LcHSys9RxNAuI4xyAW1.jpg',
    overview:
      'Senthil, an advertising executive, decides to invite his old friends to his wedding. His past is unraveled as he sets out on a journey to meet his old friends and lovers.\n\n• Directed by: Cheran\n• Written by: Cheran\n• Starring: Cheran, Gopika, Sneha, Kaniha\n• Cinematography: Vijay Milton\n• Music by: Bharadwaj',
    wikidataDirectorBio: 'Cheran',
  },
  {
    id: 'seed_kireedam',
    canonicalTitle: 'Kireedam',
    type: 'movie',
    year: 1989,
    genres: ['Drama', 'Action'],
    ratings: [{ score: 7.8, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '191017', url: 'https://www.themoviedb.org/movie/191017' },
      { provider: 'imdb', externalId: 'tt0237376', url: 'https://www.imdb.com/title/tt0237376/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/1uH1VAGavh4Zi5Qwdhzcg9YJyh2.jpg',
    overview:
      'Sethu aspires to become a police officer to fulfil his father\'s dream. However, his life turns upside down when he intervenes in a scuffle with a criminal to save his father\'s life.\n\n• Directed by: Sibi Malayil\n• Written by: A. K. Lohithadas\n• Starring: Mohanlal, Thilakan, Parvathy, Kaviyoor Ponnamma\n• Cinematography: S. Kumar\n• Music by: Johnson',
    wikidataDirectorBio: 'Sibi Malayil',
  },
  {
    id: 'seed_manichitrathazhu',
    canonicalTitle: 'Manichitrathazhu',
    type: 'movie',
    year: 1993,
    genres: ['Horror', 'Comedy', 'Mystery'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '84368', url: 'https://www.themoviedb.org/movie/84368' },
      { provider: 'imdb', externalId: 'tt0214915', url: 'https://www.imdb.com/title/tt0214915/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/5YccrqvJFTfAVyEZp08I3fLx15y.jpg',
    overview:
      'A young couple, Ganga and Nakulan, arrives at the ancestral home called Madampalli of the latter. Hailing from a family that follows tradition and superstitions, Nakulan\'s uncle Thampi objects to the couple\'s idea of moving into the allegedly haunted mansion, which Nakulan ignores. The couple moves in anyway following which seemingly supernatural events begin to happen.\n\n• Directed by: Fazil\n• Written by: Madhu Muttam\n• Starring: Mohanlal, Shobana, Suresh Gopi, Vinaya Prasad\n• Cinematography: Venu\n• Music by: M. G. Radhakrishnan, Johnson',
    wikidataDirectorBio: 'Fazil',
  },
  {
    id: 'seed_spadikam',
    canonicalTitle: 'Spadikam',
    type: 'movie',
    year: 1995,
    genres: ['Action', 'Drama'],
    ratings: [{ score: 7.3, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '240179', url: 'https://www.themoviedb.org/movie/240179' },
      { provider: 'imdb', externalId: 'tt0292246', url: 'https://www.imdb.com/title/tt0292246/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/1bDOwCzW2cIVtRgeVQKn5ZTzcFf.jpg',
    overview:
      'Chacko master, a school headmaster, is never happy with his son, Thomas, and always degrades him. However, having had enough of him, Thomas runs away from home only to return as a gangster after long.\n\n• Directed by: Bhadran\n• Written by: Bhadran\n• Starring: Mohanlal, Thilakan, Urvashi, Spadikam George\n• Cinematography: J. Williams\n• Music by: S. P. Venkatesh',
    wikidataDirectorBio: 'Bhadran',
  },
  {
    id: 'seed_oru_vadakkan_veeragatha',
    canonicalTitle: 'Oru Vadakkan Veeragatha',
    type: 'movie',
    year: 1989,
    genres: ['Drama', 'Action'],
    ratings: [{ score: 7.0, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '151662', url: 'https://www.themoviedb.org/movie/151662' },
      { provider: 'imdb', externalId: 'tt0230597', url: 'https://www.imdb.com/title/tt0230597/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/zAHyfIpg9dLCfxCtZYTUyUjoCLb.jpg',
    overview:
      'Chanthu, a poor orphan and Aromal are cousins and belong to the Chekavar clan, a warrior clan who hire themselves out as duellers to settle disputes among the rich and powerful. Aromal, jealous of the much more talented Chanthu, makes life miserable for him and Chanthu decides to leave and live with Aringodar, a rival chekavan, as his pupil. When the two sons of a local landlord have a property dispute and decide to hire Aromal and Aringodar to duel it out, Chanthu has to decide where his loyalty lies - with the family of the uncle who brought him up or with Aringodar who provided him with sanctuary.\n\n• Directed by: Hariharan\n• Written by: M. T. Vasudevan Nair\n• Starring: Mammootty, Suresh Gopi, Madhavi, Captain Raju\n• Cinematography: Ramachandra Babu\n• Music by: Bombay Ravi',
    wikidataDirectorBio: 'Hariharan',
  },
  {
    id: 'seed_vidheyan',
    canonicalTitle: 'Vidheyan',
    type: 'movie',
    year: 1994,
    genres: ['Drama'],
    ratings: [{ score: 7.6, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '256212', url: 'https://www.themoviedb.org/movie/256212' },
      { provider: 'imdb', externalId: 'tt0108490', url: 'https://www.imdb.com/title/tt0108490/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/joWXgPgCi6y172IxcYaowO6zAIo.jpg',
    overview:
      'Thommy is the loyal servant of Bhaskara Pattelar, a ruthless tyrant. He struggles between obedience and morality.\n\n• Directed by: Adoor Gopalakrishnan\n• Written by: Adoor Gopalakrishnan\n• Starring: Mammootty, M. R. Gopakumar, Sabitha Anand\n• Cinematography: Mankada Ravi Varma\n• Music by: Vijay Bhaskar',
    wikidataDirectorBio: 'Adoor Gopalakrishnan',
  },
  {
    id: 'seed_96',
    canonicalTitle: '96',
    type: 'movie',
    year: 2018,
    genres: ['Romance'],
    ratings: [{ score: 7.6, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '441717', url: 'https://www.themoviedb.org/movie/441717' },
      { provider: 'imdb', externalId: 'tt7019842', url: 'https://www.imdb.com/title/tt7019842/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/nrVloCa2hCFOztRF1DZU2jnWIiQ.jpg',
    overview:
      'Ram is a photographer and nature lover who travels all around India capturing moments. On a chance visit to his hometown Tanjavur, he goes into his school and begins to walk down memory lane to 1994 when he was a student harboring feelings for his classmate Janu.\n\n• Directed by: C. Prem Kumar\n• Written by: C. Prem Kumar\n• Starring: Vijay Sethupathi, Trisha Krishnan\n• Cinematography: Mahendiran Jayaraju\n• Music by: Govind Vasantha',
    wikidataDirectorBio: 'C. Prem Kumar',
  },
  {
    id: 'seed_meiyazhagan',
    canonicalTitle: 'Meiyazhagan',
    type: 'movie',
    year: 2024,
    genres: ['Family', 'Drama'],
    ratings: [{ score: 8.1, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '1136423', url: 'https://www.themoviedb.org/movie/1136423' },
      { provider: 'imdb', externalId: 'tt26758372', url: 'https://www.imdb.com/title/tt26758372/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/ngDEH7YqVaMCAD4LpNxRl6ScJnw.jpg',
    overview:
      'Twenty-two years after losing his home, Arulmozhi Varman returns to his native Thanjavur to attend his cousin\'s wedding. Amidst the celebrations, Arul is reintroduced to an upbeat man whom he cannot recall. With the help of the unknown man, Arul reconnects with his past.\n\n• Directed by: C. Prem Kumar\n• Written by: C. Prem Kumar\n• Starring: Karthi, Arvind Swamy\n• Cinematography: Mahendiran Jayaraju\n• Music by: Govind Vasantha',
    wikidataDirectorBio: 'C. Prem Kumar',
  },
  {
    id: 'seed_my_octopus_teacher',
    canonicalTitle: 'My Octopus Teacher',
    type: 'movie',
    year: 2020,
    genres: ['Documentary'],
    ratings: [{ score: 7.9, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '682110', url: 'https://www.themoviedb.org/movie/682110' },
      { provider: 'imdb', externalId: 'tt12888462', url: 'https://www.imdb.com/title/tt12888462/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/hvTVZb7hBC8tZAGoEhH5eiMJu2B.jpg',
    overview:
      'After years of swimming every day in the freezing ocean at the tip of Africa, Craig Foster meets an unlikely teacher: a young octopus who displays remarkable curiosity. Visiting her den and tracking her movements for months on end he eventually wins the animal’s trust and they develop a never-before-seen bond between human and wild animal.\n\n• Directed by: Pippa Ehrlich, James Reed\n• Starring: Craig Foster\n• Cinematography: Roger Horrocks\n• Music by: Kevin Smuts',
    wikidataDirectorBio: 'Pippa Ehrlich, James Reed',
  },
  {
    id: 'seed_free_solo',
    canonicalTitle: 'Free Solo',
    type: 'movie',
    year: 2018,
    genres: ['Documentary', 'Adventure'],
    ratings: [{ score: 7.9, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '515042', url: 'https://www.themoviedb.org/movie/515042' },
      { provider: 'imdb', externalId: 'tt7775622', url: 'https://www.imdb.com/title/tt7775622/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/v4QfYZMACODlWul9doN9RxE99ag.jpg',
    overview:
      'Follow Alex Honnold as he attempts to become the first person to ever free solo climb Yosemite\'s 3,000 foot high El Capitan wall. With no ropes or safety gear, this would arguably be the greatest feat in rock climbing history.\n\n• Directed by: Elizabeth Chai Vasarhelyi, Jimmy Chin\n• Starring: Alex Honnold, Tommy Caldwell\n• Cinematography: Jimmy Chin, Clair Popkin, Mikey Schaefer\n• Music by: Marco Beltrami',
    wikidataDirectorBio: 'Elizabeth Chai Vasarhelyi, Jimmy Chin',
  },
  {
    id: 'seed_parasite',
    canonicalTitle: 'Parasite',
    type: 'movie',
    year: 2019,
    genres: ['Comedy', 'Thriller', 'Drama'],
    ratings: [{ score: 8.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '496243', url: 'https://www.themoviedb.org/movie/496243' },
      { provider: 'imdb', externalId: 'tt6751668', url: 'https://www.imdb.com/title/tt6751668/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    overview:
      'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.\n\n• Directed by: Bong Joon Ho\n• Written by: Bong Joon Ho, Han Jin-won\n• Starring: Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong, Choi Woo-shik, Park So-dam\n• Cinematography: Hong Kyung-pyo\n• Music by: Jung Jae-il',
    wikidataDirectorBio: 'Bong Joon Ho',
  },
  {
    id: 'seed_everything_everywhere',
    canonicalTitle: 'Everything Everywhere All at Once',
    type: 'movie',
    year: 2022,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    ratings: [{ score: 7.7, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '545611', url: 'https://www.themoviedb.org/movie/545611' },
      { provider: 'imdb', externalId: 'tt6710474', url: 'https://www.imdb.com/title/tt6710474/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg',
    overview:
      'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what\'s important to her by connecting with the lives she could have led in other universes.\n\n• Directed by: Daniel Kwan, Daniel Scheinert\n• Written by: Daniel Kwan, Daniel Scheinert\n• Starring: Michelle Yeoh, Ke Huy Quan, Stephanie Hsu, Jamie Lee Curtis\n• Cinematography: Larkin Seiple\n• Music by: Son Lux',
    wikidataDirectorBio: 'Daniel Kwan, Daniel Scheinert',
  },
  {
    id: 'seed_portrait_lady_fire',
    canonicalTitle: 'Portrait of a Lady on Fire',
    type: 'movie',
    year: 2019,
    genres: ['Drama', 'Romance'],
    ratings: [{ score: 8.1, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '531428', url: 'https://www.themoviedb.org/movie/531428' },
      { provider: 'imdb', externalId: 'tt8613070', url: 'https://www.imdb.com/title/tt8613070/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/rUDuOKpkKBHxx41BScqKej72iT3.jpg',
    overview:
      'On an isolated island in Brittany at the end of the eighteenth century, a female painter is obliged to paint a wedding portrait of a young woman.\n\n• Directed by: Céline Sciamma\n• Written by: Céline Sciamma\n• Starring: Noémie Merlant, Adèle Haenel, Luàna Bajrami\n• Cinematography: Claire Mathon\n• Music by: Jean-Baptiste de Laubier, Arthur Simonini',
    wikidataDirectorBio: 'Céline Sciamma',
  },
  {
    id: 'seed_get_out',
    canonicalTitle: 'Get Out',
    type: 'movie',
    year: 2017,
    genres: ['Mystery', 'Thriller', 'Horror'],
    ratings: [{ score: 7.6, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '419430', url: 'https://www.themoviedb.org/movie/419430' },
      { provider: 'imdb', externalId: 'tt5052448', url: 'https://www.imdb.com/title/tt5052448/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
    overview:
      'Chris and his girlfriend Rose go upstate to visit her parents for the weekend. At first, Chris reads the family\'s overly accommodating behavior as nervous attempts to deal with their daughter\'s interracial relationship, but as the weekend progresses, a series of increasingly disturbing discoveries lead him to a truth that he never could have imagined.\n\n• Directed by: Jordan Peele\n• Written by: Jordan Peele\n• Starring: Daniel Kaluuya, Allison Williams, Bradley Whitford, Catherine Keener\n• Cinematography: Toby Oliver\n• Music by: Michael Abels',
    wikidataDirectorBio: 'Jordan Peele',
  },
  {
    id: 'seed_top_gun_maverick',
    canonicalTitle: 'Top Gun: Maverick',
    type: 'movie',
    year: 2022,
    genres: ['Action', 'Drama'],
    ratings: [{ score: 8.2, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '361743', url: 'https://www.themoviedb.org/movie/361743' },
      { provider: 'imdb', externalId: 'tt1745960', url: 'https://www.imdb.com/title/tt1745960/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg',
    overview:
      'After more than thirty years of service as one of the Navy’s top aviators, and dodging the advancement in rank that would ground him, Pete “Maverick” Mitchell finds himself training a detachment of TOP GUN graduates for a specialized mission the likes of which no living pilot has ever seen.\n\n• Directed by: Joseph Kosinski\n• Written by: Ehren Kruger, Eric Warren Singer, Christopher McQuarrie\n• Starring: Tom Cruise, Miles Teller, Jennifer Connelly, Jon Hamm\n• Cinematography: Claudio Miranda\n• Music by: Harold Faltermeyer, Lady Gaga, Hans Zimmer, Lorne Balfe',
    wikidataDirectorBio: 'Joseph Kosinski',
  },
  {
    id: 'seed_mi_fallout',
    canonicalTitle: 'Mission: Impossible - Fallout',
    type: 'movie',
    year: 2018,
    genres: ['Action', 'Adventure'],
    ratings: [{ score: 7.5, provider: 'tmdb' }],
    providers: [
      { provider: 'tmdb', externalId: '353081', url: 'https://www.themoviedb.org/movie/353081' },
      { provider: 'imdb', externalId: 'tt4912910', url: 'https://www.imdb.com/title/tt4912910/' },
    ],
    posterUrl: 'https://image.tmdb.org/t/p/w500/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg',
    overview:
      'When an IMF mission ends badly, the world is faced with dire consequences. As Ethan Hunt takes it upon himself to fulfill his original briefing, the CIA begin to question his loyalty and his motives. The IMF team find themselves in a race against time, hunted by assassins while trying to prevent a global catastrophe.\n\n• Directed by: Christopher McQuarrie\n• Written by: Christopher McQuarrie\n• Starring: Tom Cruise, Henry Cavill, Ving Rhames, Simon Pegg, Rebecca Ferguson\n• Cinematography: Rob Hardy\n• Music by: Lorne Balfe',
    wikidataDirectorBio: 'Christopher McQuarrie',
  },
];

export const SEED_LIBRARY: LibraryItem[] = SEED_MEDIA.map((m, idx) => libraryEntryForSeed(m, idx));

/**
 * Filmmaker seed rows. `id` MUST be `tmdb_person_{real TMDb person id}`.
 * Wrong ids ship the wrong face (e.g. 147079 is Chiranjeevi, not Mammootty).
 * Validate with: `npm run validate:seed-people`
 */
export const SEED_PEOPLE: PersonItem[] = [
  {
    id: 'tmdb_person_500',
    name: 'Tom Cruise',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/3mShHjSQR7NXOVbdTu5rT2Qd0MN.jpg',
    biography: 'Thomas Cruise Mapother IV (born July 3, 1962) is a legendary American actor and producer. One of the highest-grossing box office stars of all time, he is celebrated for performing his own death-defying stunts in action classics like the Mission: Impossible series, Top Gun, and Edge of Tomorrow.',
    knownFor: ['Top Gun: Maverick', 'Mission: Impossible - Fallout', 'Jerry Maguire'],
    filmographyIds: ['seed_top_gun_maverick', 'seed_mi_fallout'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_93193',
    name: 'Kamal Haasan',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/17zscZgz4wOlGDd3Gziw4YbI3G.jpg',
    biography: 'Kamal Haasan (born November 7, 1954) is a legendary Indian actor, director, screenwriter, and producer working primarily in Tamil cinema. Widely regarded as one of the greatest actors in Indian cinema history, he is celebrated for his incredible versatility, method acting, and technical innovations.',
    knownFor: ['Nayakan', 'Anbe Sivam', 'Indian'],
    filmographyIds: ['seed_indian', 'seed_nayakan', 'seed_anbe_sivam', 'seed_vikram'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  },
  {
    id: 'tmdb_person_12160',
    name: 'Satyajit Ray',
    role: 'director',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/qP5mjuc3dL8n9c1zeY4W6L2w38L.jpg',
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
    id: 'tmdb_person_124111',
    name: 'Mammootty',
    role: 'actor',
    profileImageUrl: 'https://image.tmdb.org/t/p/w300_and_h450_bestv2/c5ewp9XtDIOwK5QWhwA7TD0GzqO.jpg',
    biography: 'Mammootty (born September 7, 1951) is a legendary Indian actor and producer working in Malayalam cinema. Over a career of 50 years, he has acted in more than 400 films, won three National Film Awards, and is celebrated as one of the greatest actors in Indian cinema history.',
    knownFor: ['Oru Vadakkan Veeragatha', 'Vidheyan', 'Mathilukal'],
    filmographyIds: ['seed_oru_vadakkan_veeragatha', 'seed_vidheyan'],
    followedAt: Date.now(),
    lastSyncedAt: Date.now()
  }
];

