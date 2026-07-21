// ─── Media & Library Types ───────────────────────────────────────────

/** Screen media only (TMDb-shaped paths). */
export type ScreenMediaType = 'movie' | 'tv';

/** Screen + books. Prefer WorkMedium from catalogTypes for new code. */
export type MediaType = ScreenMediaType | 'book';

export function isScreenMediaType(type: MediaType): type is ScreenMediaType {
  return type === 'movie' || type === 'tv';
}

export type MediaProvider =
  | 'imdb'
  | 'tmdb'
  | 'rt'
  | 'trakt'
  | 'tvmaze'
  | 'openlibrary'
  | 'googlebooks'
  | 'other';

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
  wikidataSummary?: string;
  wikidataDirectorBio?: string;
  /** Book-only convenience fields (also stored on CatalogWork.bookDetails). */
  authors?: string[];
  subtitle?: string;
  pageCount?: number;
  preferredEditionId?: string;
}

export type LibraryStatus = 'to-watch' | 'watching' | 'watched' | 'abandoned';

export type SanctuaryIntent = 'keep_memory' | 'revisit_this_month' | 'wishlist';

export interface LibraryItem {
  mediaId: string;
  status: LibraryStatus;
  addedAt: number;  // timestamp
  updatedAt: number;
  userRating?: number;  // 1–10
  userTags?: string[];
  notes?: string;

  // Compatibility properties
  id?: string;
  tmdbId?: number;
  mediaType?: 'movie' | 'tv';
  title?: string;
  posterPath?: string | null;
  releaseYear?: number;
  directorNames?: string[];

  // Upgraded Sanctuary architecture (v2.1)
  sanctuaryIntent?: SanctuaryIntent;
  emotionalRecall?: string; // "What stayed with you?" hero prompt
  qualitativeNotes?: string; // Extended prose
  scriptParallels?: string[]; // Screenplay dialogue echoes
  originalScreenplaySparks?: string; // Story ideas
  contemplatedAt?: number;
  atmosphere?: string;
  lingeringThought?: string;

  // Emotional spectrum metrics (0-100)
  awe?: number;
  melancholy?: number;
  tension?: number;
  warmth?: number;

  /** Book-only: preferred physical/digital edition for this relationship. */
  preferredEditionId?: string;
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
export type ThemePreference = 'dark' | 'light' | 'system';
export type CinemaAtmosphere = 'default' | 'sunset' | 'emerald' | 'french';

export type { EmotionalSpectrum } from './emotions';

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
  screenplayDockEnabled?: boolean;
  disabledDomains: string[];
  detectionSensitivity: 'low' | 'medium' | 'high';
  theme?: ThemePreference;
  cinemaAtmosphere?: CinemaAtmosphere;
  onboardingComplete: boolean;
  /** Persona sent before taste profile on every LLM curator call. */
  llmCuratorSystemPrompt?: string;
  /** Task block after TASTE PROFILE on Recommendations. Empty = built-in default. */
  llmPromptRecommendation?: string;
  /** Task block for weekly digest LLM curation. Empty = built-in default. */
  llmPromptDigest?: string;
  /** Second-pass grouping instructions (Because you experienced…). */
  llmPromptGrouping?: string;

  // ─── Multi-medium / books expansion ─────────────────────────────
  enabledMedia?: { movie: boolean; tv: boolean; book: boolean };
  googleBooksApiKey?: string;
  openLibraryEnabled?: boolean;
  detectScreenWorks?: boolean;
  detectBooks?: boolean;
  coverOverlaysEnabled?: boolean;
  crossMediumRecommendationsEnabled?: boolean;
  recommendationPrivacyMode?: 'ratings_only' | 'summarized_reflections' | 'full_selected_reflections';
  dispatchEnabled?: boolean;
  dispatchWeekday?: number;
  dispatchLocalTime?: string;
  dispatchTimezone?: string;
  dispatchWebSearchEnabled?: boolean;
  dispatchMaxSearches?: number;
}

// ─── Message Types ───────────────────────────────────────────────────

export enum MessageType {
  // Metadata
  GET_TITLE_DETAILS = 'GET_TITLE_DETAILS',

  // Multi-medium catalog (books expansion) — aliases for legacy types where noted
  GET_WORK_DETAILS = 'GET_WORK_DETAILS',
  SEARCH_WORKS = 'SEARCH_WORKS',
  RESOLVE_PAGE_CANDIDATE = 'RESOLVE_PAGE_CANDIDATE',
  GET_BOOK_EDITIONS = 'GET_BOOK_EDITIONS',
  SET_PREFERRED_EDITION = 'SET_PREFERRED_EDITION',
  ADD_TO_ARCHIVE = 'ADD_TO_ARCHIVE',
  CHECK_ARCHIVE_STATUS = 'CHECK_ARCHIVE_STATUS',
  GET_ARCHIVE = 'GET_ARCHIVE',
  ADD_REFLECTION = 'ADD_REFLECTION',
  GET_REFLECTIONS = 'GET_REFLECTIONS',
  UPDATE_EXPERIENCE = 'UPDATE_EXPERIENCE',
  CREATE_EXPERIENCE = 'CREATE_EXPERIENCE',
  GET_EXPERIENCES = 'GET_EXPERIENCES',

  // Work relations (adaptations)
  GET_RELATED_WORKS = 'GET_RELATED_WORKS',
  ASSERT_WORK_RELATION = 'ASSERT_WORK_RELATION',
  SEARCH_ADAPTATION_CANDIDATES = 'SEARCH_ADAPTATION_CANDIDATES',

  // Dispatch / capabilities / feedback (Phase 2)
  GET_SUBSUME_DISPATCH = 'GET_SUBSUME_DISPATCH',
  REGENERATE_SUBSUME_DISPATCH = 'REGENERATE_SUBSUME_DISPATCH',
  GET_LLM_PROVIDER_CAPABILITIES = 'GET_LLM_PROVIDER_CAPABILITIES',
  SUBMIT_RECOMMENDATION_FEEDBACK = 'SUBMIT_RECOMMENDATION_FEEDBACK',

  // Library
  ADD_TO_LIST = 'ADD_TO_LIST',
  UPDATE_STATUS = 'UPDATE_STATUS',
  SET_USER_RATING = 'SET_USER_RATING',
  SET_USER_TAGS = 'SET_USER_TAGS',
  SET_USER_NOTES = 'SET_USER_NOTES',
  REMOVE_FROM_LIBRARY = 'REMOVE_FROM_LIBRARY',
  GET_LIBRARY = 'GET_LIBRARY',
  GET_LIBRARY_PAGE = 'GET_LIBRARY_PAGE',
  CHECK_LIBRARY_STATUS = 'CHECK_LIBRARY_STATUS',
  EXPORT_LIBRARY = 'EXPORT_LIBRARY',
  IMPORT_LIBRARY = 'IMPORT_LIBRARY',
  CONNECT_GOOGLE_DRIVE = 'CONNECT_GOOGLE_DRIVE',
  BACKUP_TO_DRIVE = 'BACKUP_TO_DRIVE',
  RESTORE_FROM_DRIVE = 'RESTORE_FROM_DRIVE',
  RESTORE_DEMO_LIBRARY = 'RESTORE_DEMO_LIBRARY',
  CLEAR_NOTIFICATION_BADGE = 'CLEAR_NOTIFICATION_BADGE',

  // Media
  GET_MEDIA_ITEMS = 'GET_MEDIA_ITEMS',
  SEARCH_TITLES = 'SEARCH_TITLES',
  DISCOVERY_SEARCH = 'DISCOVERY_SEARCH',

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
  OPEN_CAPTURE_CANVAS = 'OPEN_CAPTURE_CANVAS',

  // Personalized Discovery (Phase 4)
  BUILD_WATCH_PROFILE = 'BUILD_WATCH_PROFILE',
  /** Alias semantic for multi-medium taste profiles (same handler as BUILD_WATCH_PROFILE). */
  BUILD_TASTE_PROFILE = 'BUILD_TASTE_PROFILE',
  GET_PERSONALIZED_RECS = 'GET_PERSONALIZED_RECS',
  GET_CURATOR_PROMPT_PREVIEW = 'GET_CURATOR_PROMPT_PREVIEW',

  // Weekly Digest (aliases GET/REGENERATE_SUBSUME_DISPATCH declared above)
  GET_WEEKLY_DIGEST = 'GET_WEEKLY_DIGEST',
  REGENERATE_WEEKLY_DIGEST = 'REGENERATE_WEEKLY_DIGEST',

  // Discovery Feed (free APIs)
  GET_DISCOVERY_FEED = 'GET_DISCOVERY_FEED',

  // Watch Alerts
  CREATE_WATCH_ALERT = 'CREATE_WATCH_ALERT',
  GET_WATCH_ALERTS = 'GET_WATCH_ALERTS',
  DELETE_WATCH_ALERT = 'DELETE_WATCH_ALERT',
  UPDATE_WATCH_ALERT = 'UPDATE_WATCH_ALERT',

  // Data Sources
  GET_FREE_DATA_SOURCE_STATUS = 'GET_FREE_DATA_SOURCE_STATUS',
}

export type FreeDataSourceId = 'trakt' | 'tvmaze' | 'wikidata';

export interface FreeDataSourceStatus {
  id: FreeDataSourceId;
  configured: boolean;
  working: boolean;
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
  emotionalRecall?: string;
  atmosphere?: string;
  lingeringThought?: string;
  awe?: number;
  melancholy?: number;
  tension?: number;
  warmth?: number;
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

export interface CheckLibraryStatusRequest {
  mediaId: string;
}

export interface CheckLibraryStatusResponse {
  inLibrary: boolean;
  status?: LibraryStatus;
  userRating?: number;
}

export interface GetMediaItemsRequest {
  mediaIds: string[];
}

export interface SearchTitlesRequest {
  query: string;
  type?: MediaType;
  year?: number;
}

export interface DiscoverySearchRequest {
  query: string;
  type?: MediaType;
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
  screenplayDockEnabled: boolean;
  detectionSensitivity: 'low' | 'medium' | 'high';
  disabledDomains: string[];
  domainDisabled: boolean;
  detectScreenWorks: boolean;
  detectBooks: boolean;
  coverOverlaysEnabled: boolean;
}

/**
 * Library backup payload.
 * - v1 (legacy): no schemaVersion; library/media/people arrays
 * - v2: multi-medium export with works/relationships/reflections + legacy arrays
 * Never includes API keys.
 */
export interface ImportLibraryData {
  /** 2 = multi-medium SubsumeExportV2 shape. Omitted = legacy v1. */
  schemaVersion?: number;
  exportedAt?: number;

  // Legacy cinema stores (always preferred for round-trip of movies/TV)
  library?: LibraryItem[];
  media?: MediaItem[];
  people?: PersonItem[];
  alerts?: WatchAlert[];
  weeklyDigest?: WeeklyDigest;

  // Multi-medium catalog (v2+)
  works?: import('./catalogTypes').CatalogWork[];
  bookEditions?: import('./catalogTypes').BookEdition[];
  relationships?: import('./catalogTypes').LibraryRelationship[];
  experiences?: import('./catalogTypes').Experience[];
  reflections?: import('./catalogTypes').Reflection[];
  creators?: import('./catalogTypes').Creator[];
}

/** Explicit v2 export shape (schemaVersion always 2). */
export type SubsumeExportV2 = ImportLibraryData & {
  schemaVersion: 2;
  exportedAt: number;
};

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
  type?: 'movie' | 'tv' | 'both' | 'book';
  genres?: string[];
  platforms?: string[];
  keyword?: string;
  /** Book alerts: match author name substring */
  authorKeyword?: string;
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
  emotionalRecall?: string;
  qualitativeExcerpt?: string;
}

export interface WatchProfile {
  topRated: WatchProfileEntry[];   // userRating >= 8
  liked: WatchProfileEntry[];      // userRating 6–7
  disliked: WatchProfileEntry[];   // userRating <= 4
  unrated: WatchProfileEntry[];    // watched but no rating, capped at 10
  followedCreators: Array<{ name: string; role: CrewRole }>;
  favoriteGenres: string[];
  totalWatched: number;
  /** Titles marked to-watch / wishlist — signals intent without implying taste yet. */
  wishlist?: WatchProfileEntry[];
}

export interface PersonalizedRecommendation {
  /** Catalog work id (TMDb / Open Library / other) — historical field name. */
  tmdbId: string;
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'book';
  posterUrl?: string;
  ratings: MediaItem['ratings'];
  reason: string;           // LLM-generated explanation
  seedTitle?: string;       // which watched title connects to this
  confidenceSignal: 'high' | 'medium' | 'low';
}

export type RecommendationFeedbackAction = 'save' | 'dismiss' | 'not_interested';

export interface RecommendationFeedbackEntry {
  workId: string;
  action: RecommendationFeedbackAction;
  at: number;
}

export interface SubmitRecommendationFeedbackRequest {
  workId: string;
  action: RecommendationFeedbackAction;
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
  type: MediaType;
  reason: string;
  platforms: string[];
}

export interface WeeklyDigest {
  generatedAt: number;
  items: WeeklyDigestItem[];
  llmGenerated: boolean;
}

// ─── Discovery Feed Types ────────────────────────────────────────────

export type DiscoveryFeedSource = 'trakt' | 'tvmaze' | 'wikidata';

export interface DiscoveryFeedItem {
  id: string;
  title: string;
  year: number;
  type: MediaType;
  source: DiscoveryFeedSource;
  reason: string;
  posterUrl?: string;
  rating?: number;
  url?: string;
}

export interface DiscoveryFeed {
  generatedAt: number;
  items: DiscoveryFeedItem[];
  trendingCount: number;
  premiereCount: number;
}

export interface GetDiscoveryFeedRequest {
  force?: boolean;
}

// ─── Watch Alert Types ─────────────────────────────────────────────────

export interface WatchAlert {
  id: string;
  name: string;
  /** Screen: movie|tv|both. Books: book. */
  type?: 'movie' | 'tv' | 'both' | 'book';
  genres?: string[];  // TMDb genre IDs (screen)
  platforms?: string[]; // TMDb provider IDs (screen)
  keyword?: string;  // title must contain
  /** Book alerts: match author name substring */
  authorKeyword?: string;
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

/** Tab broadcast payloads sent from the background service worker to content scripts / UI. */
export type BroadcastMessage =
  | {
      type: 'LIBRARY_UPDATED';
      action: 'add' | 'update' | 'remove';
      mediaId: string;
      libraryItem?: LibraryItem;
    }
  | {
      type: 'FILMMAKERS_UPDATED';
      action: 'sync' | 'follow' | 'unfollow';
      personId: string;
    };

export interface PosterMatch {
  tmdbId: string;
  title: string;
  year: number;
  type: MediaType;
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
  details?: unknown;
}

