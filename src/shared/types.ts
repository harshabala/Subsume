// ─── Media & Library Types ───────────────────────────────────────────

export type MediaType = 'movie' | 'tv';

export type MediaProvider = 'imdb' | 'tmdb' | 'rt' | 'other';

export interface MediaRating {
  provider: MediaProvider;
  score: number;
  votes?: number;
}

export interface MediaExternalId {
  provider: MediaProvider;
  externalId: string;
  url?: string;
}

export interface StreamingInfo {
  region: string;
  platform: string;
  url?: string;
}

export interface MediaItem {
  id: string;
  canonicalTitle: string;
  originalTitle?: string;
  type: MediaType;
  year: number;
  genres: string[];
  ratings: MediaRating[];
  providers: MediaExternalId[];
  posterUrl: string;
  backdropUrl?: string;
  overview?: string;
  runtimeMinutes?: number;
  streamingAvailability?: StreamingInfo[];
}

export type LibraryStatus = 'to-watch' | 'watching' | 'watched' | 'abandoned';

export interface LibraryItem {
  mediaId: string;
  status: LibraryStatus;
  addedAt: number;  // timestamp
  updatedAt: number;
  userRating?: number;  // 1–10
  userTags?: string[];
  notes?: string;
}

export interface LibraryMediaPair {
  library: LibraryItem;
  media: MediaItem;
}

export type CrewRole = 
  'director' | 'writer' | 'cinematographer' | 'actor' | 
  'composer' | 'producer' | 'editor';

export interface PersonItem {
  id: string;               // TMDb person ID as string
  name: string;
  role: CrewRole;
  profileImageUrl?: string;
  biography?: string;
  knownFor: string[];       // top 3 canonical title strings
  filmographyIds: string[]; // MediaItem IDs
  followedAt: number;
  lastSyncedAt: number;
}

// ─── User Preferences ────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;  // for local providers
}

export interface UserPreferences {
  favoriteGenres: string[];
  platforms: string[];
  region: string;
  llmEnabled: boolean;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmSecondaryApiKey?: string;
  tmdbApiKey?: string;
  omdbApiKey?: string;
  hoverCardsEnabled: boolean;
  posterOverlaysEnabled: boolean;
  disabledDomains: string[];
  detectionSensitivity: 'low' | 'medium' | 'high';
  onboardingComplete: boolean;
}

// ─── Message Types ───────────────────────────────────────────────────

export enum MessageType {
  // Metadata
  GET_TITLE_DETAILS = 'GET_TITLE_DETAILS',

  // Library
  ADD_TO_LIST = 'ADD_TO_LIST',
  UPDATE_STATUS = 'UPDATE_STATUS',
  SET_USER_RATING = 'SET_USER_RATING',
  SET_USER_TAGS = 'SET_USER_TAGS',
  SET_USER_NOTES = 'SET_USER_NOTES',
  REMOVE_FROM_LIBRARY = 'REMOVE_FROM_LIBRARY',
  GET_LIBRARY = 'GET_LIBRARY',
  GET_LIBRARY_PAGE = 'GET_LIBRARY_PAGE',
  EXPORT_LIBRARY = 'EXPORT_LIBRARY',
  IMPORT_LIBRARY = 'IMPORT_LIBRARY',

  // Media
  GET_MEDIA_ITEMS = 'GET_MEDIA_ITEMS',
  SEARCH_TITLES = 'SEARCH_TITLES',

  // Recommendations
  GET_RECOMMENDATIONS = 'GET_RECOMMENDATIONS',

  // Releases
  GET_LATEST_RELEASES = 'GET_LATEST_RELEASES',

  // Preferences
  GET_PREFERENCES = 'GET_PREFERENCES',
  GET_FULL_PREFERENCES = 'GET_FULL_PREFERENCES',
  SET_PREFERENCES = 'SET_PREFERENCES',

  // Filmmakers & Crew
  SEARCH_PERSON = 'SEARCH_PERSON',
  FOLLOW_PERSON = 'FOLLOW_PERSON',
  UNFOLLOW_PERSON = 'UNFOLLOW_PERSON',
  GET_FILMOGRAPHY = 'GET_FILMOGRAPHY',
  SYNC_FILMOGRAPHY = 'SYNC_FILMOGRAPHY',
  GET_ALL_PEOPLE = 'GET_ALL_PEOPLE',

  // Poster Overlay
  RESOLVE_POSTER = 'RESOLVE_POSTER',
  GET_POSTER_PREFS = 'GET_POSTER_PREFS',
  GET_CONTENT_PREFS = 'GET_CONTENT_PREFS',
  OPEN_DETAIL = 'OPEN_DETAIL',

  // Personalized Discovery (Phase 4)
  BUILD_WATCH_PROFILE = 'BUILD_WATCH_PROFILE',
  GET_PERSONALIZED_RECS = 'GET_PERSONALIZED_RECS',

  // Weekly Digest
  GET_WEEKLY_DIGEST = 'GET_WEEKLY_DIGEST',
  REGENERATE_WEEKLY_DIGEST = 'REGENERATE_WEEKLY_DIGEST',

  // Watch Alerts
  CREATE_WATCH_ALERT = 'CREATE_WATCH_ALERT',
  GET_WATCH_ALERTS = 'GET_WATCH_ALERTS',
  DELETE_WATCH_ALERT = 'DELETE_WATCH_ALERT',
  UPDATE_WATCH_ALERT = 'UPDATE_WATCH_ALERT',
}

// ─── Message Payloads ────────────────────────────────────────────────

export interface GetTitleDetailsRequest {
  title: string;
  yearGuess?: number;
  typeGuess?: MediaType;
}

export interface AddToListRequest {
  mediaItem: MediaItem;
  type: MediaType;
}

export interface UpdateStatusRequest {
  mediaId: string;
  status: LibraryStatus;
}

export interface SetUserRatingRequest {
  mediaId: string;
  rating: number;
}

export interface SetUserTagsRequest {
  mediaId: string;
  tags: string[];
}

export interface SetUserNotesRequest {
  mediaId: string;
  notes: string;
}

export interface GetLibraryRequest {
  status?: LibraryStatus;
  type?: MediaType;
  sortBy?: 'addedAt' | 'year' | 'rating' | 'userRating';
  genre?: string;
  yearRange?: { min: number; max: number };
}

export interface GetLibraryPageRequest {
  limit: number;
  offset: number;
  type?: MediaType;
}

export interface RemoveFromLibraryRequest {
  mediaId: string;
}

export interface GetMediaItemsRequest {
  mediaIds: string[];
}

export interface SearchTitlesRequest {
  query: string;
  type?: MediaType;
  year?: number;
}

export interface GetRecommendationsRequest {
  basedOnMediaId?: string;
}

export interface GetLatestReleasesRequest {
  type?: 'movie' | 'tv';
}

export interface GetContentPrefsRequest {
  hostname: string;
}

/** Preferences exposed to the content script — no API keys or LLM secrets. */
export interface ContentPrefs {
  hoverCardsEnabled: boolean;
  posterOverlaysEnabled: boolean;
  detectionSensitivity: 'low' | 'medium' | 'high';
  disabledDomains: string[];
  domainDisabled: boolean;
}

export interface ImportLibraryData {
  library?: LibraryItem[];
  media?: MediaItem[];
  people?: PersonItem[];
  alerts?: WatchAlert[];
  weeklyDigest?: WeeklyDigest;
}

export interface Recommendation {
  mediaId: string;
  explanation: string;
}

export interface GroupedRecommendation {
  seedTitle: string;
  recommendations: Recommendation[];
}

export interface CreateWatchAlertRequest {
  name: string;
  type?: 'movie' | 'tv' | 'both';
  genres?: string[];
  platforms?: string[];
  keyword?: string;
  enabled?: boolean;
}

export interface DeleteWatchAlertRequest {
  id: string;
}

export interface UpdateWatchAlertRequest {
  alert: WatchAlert;
}

// ─── Phase 4 — Personalized Discovery Types ──────────────────────────

export interface WatchProfileEntry {
  title: string;
  year: number;
  genres: string[];
  userRating: number;
  noteExcerpt?: string;  // first 100 chars of notes if set
}

export interface WatchProfile {
  topRated: WatchProfileEntry[];   // userRating >= 8
  liked: WatchProfileEntry[];      // userRating 6–7
  disliked: WatchProfileEntry[];   // userRating <= 4
  unrated: WatchProfileEntry[];    // watched but no rating, capped at 10
  followedCreators: Array<{ name: string; role: CrewRole }>;
  favoriteGenres: string[];
  totalWatched: number;
}

export interface PersonalizedRecommendation {
  tmdbId: string;
  title: string;
  year: number;
  type: 'movie' | 'tv';
  posterUrl?: string;
  ratings: MediaItem['ratings'];
  reason: string;           // LLM-generated explanation
  seedTitle?: string;       // which watched title connects to this
  confidenceSignal: 'high' | 'medium' | 'low';
}

export interface RecommendationGroup {
  seedTitle: string;
  recommendations: PersonalizedRecommendation[];
}

// ─── Weekly Digest Types ─────────────────────────────────────────────

export interface WeeklyDigestItem {
  mediaId: string;
  title: string;
  year: number;
  type: 'movie' | 'tv';
  reason: string;
  platforms: string[];
}

export interface WeeklyDigest {
  generatedAt: number;
  items: WeeklyDigestItem[];
  llmGenerated: boolean;
}

// ─── Watch Alert Types ─────────────────────────────────────────────────

export interface WatchAlert {
  id: string;
  name: string;
  type?: 'movie' | 'tv' | 'both';
  genres?: string[];  // TMDb genre IDs
  platforms?: string[]; // TMDb provider IDs
  keyword?: string;  // title must contain
  createdAt: number;
  lastCheckedAt?: number;
  lastMatchAt?: number;
  lastNotifiedMediaIds?: string[];
  enabled: boolean;
}

export interface WatchAlertMatch {
  alert: WatchAlert;
  media: MediaItem;
}

// ─── Generic Message Envelope ────────────────────────────────────────

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PosterMatch {
  tmdbId: string;
  title: string;
  year: number;
  type: 'movie' | 'tv';
  posterPath: string | null;
  ratings: MediaItem['ratings'];
  inLibrary: boolean;
  libraryStatus?: LibraryItem['status'];
  userRating?: number;
}

export interface SystemLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
}

