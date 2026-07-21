/**
 * Multi-medium catalog domain model (books expansion).
 * Target concepts per docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md
 */

import type { MediaProvider, StreamingInfo } from './types';

export type WorkMedium = 'movie' | 'tv' | 'book';

export type RelationshipStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned';

export type SanctuaryIntentV2 = 'keep_memory' | 'return_soon' | 'wishlist';

export type SourceProvider =
  | 'tmdb'
  | 'omdb'
  | 'openlibrary'
  | 'googlebooks'
  | 'wikidata'
  | 'trakt'
  | 'tvmaze'
  | 'user'
  | 'other';

export interface SourceProvenance {
  provider: SourceProvider;
  providerRecordId?: string;
  sourceUrl?: string;
  fields: string[];
  fetchedAt: number;
}

export interface WorkExternalId {
  provider: SourceProvider | MediaProvider | string;
  externalId: string;
  url?: string;
}

export interface ScreenWorkDetails {
  screenType: 'movie' | 'tv';
  runtimeMinutes?: number;
  episodeRuntimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  releaseDate?: string;
  streamingAvailability?: StreamingInfo[];
  productionCountries?: string[];
  originalLanguage?: string;
}

export interface BookWorkDetails {
  authors: string[];
  firstPublishedYear?: number;
  series?: {
    name: string;
    position?: number;
  };
  primarySubjects?: string[];
  adaptationWorkIds?: string[];
  defaultEditionId?: string;
}

export interface CatalogWork {
  id: string;
  medium: WorkMedium;
  canonicalTitle: string;
  originalTitle?: string;
  subtitle?: string;
  firstReleaseYear?: number;
  description?: string;
  genres: string[];
  subjects?: string[];
  languages?: string[];
  images: {
    primary?: string;
    backdrop?: string;
    alternates?: string[];
  };
  externalIds: WorkExternalId[];
  creatorCredits: CreatorCredit[];
  screenDetails?: ScreenWorkDetails;
  bookDetails?: BookWorkDetails;
  /** Public provider ratings (not the user's score). */
  publicRatings?: Array<{ provider: string; score: number; votes?: number }>;
  sourceProvenance: SourceProvenance[];
  sourceConfidence: 'high' | 'medium' | 'low';
  createdAt: number;
  updatedAt: number;
  lastEnrichedAt?: number;
}

export interface BookEdition {
  id: string;
  workId: string;
  title: string;
  subtitle?: string;
  authors: string[];
  contributors?: CreatorCredit[];
  isbn10?: string[];
  isbn13?: string[];
  providerIds: WorkExternalId[];
  publisher?: string;
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  format?: 'hardcover' | 'paperback' | 'ebook' | 'audiobook' | 'other';
  coverUrl?: string;
  description?: string;
  sourceProvenance: SourceProvenance[];
  sourceConfidence: 'high' | 'medium' | 'low';
}

export type CreatorRole =
  | 'director'
  | 'screenwriter'
  | 'cinematographer'
  | 'actor'
  | 'composer'
  | 'producer'
  | 'editor'
  | 'author'
  | 'translator'
  | 'illustrator'
  | 'book_editor'
  | 'narrator'
  | 'creator'
  | 'other';

export interface CreatorCredit {
  creatorId?: string;
  name: string;
  role: CreatorRole;
  order?: number;
}

export interface Creator {
  id: string;
  name: string;
  roles: CreatorRole[];
  biography?: string;
  profileImageUrl?: string;
  knownForWorkIds: string[];
  followedAt?: number;
  lastSyncedAt?: number;
  externalIds: WorkExternalId[];
}

export interface EmotionalSnapshot {
  awe?: number;
  melancholy?: number;
  tension?: number;
  warmth?: number;
  atmosphere?: string;
  lingeringThought?: string;
}

export interface LibraryRelationship {
  workId: string;
  status: RelationshipStatus;
  addedAt: number;
  updatedAt: number;
  statusChangedAt?: number;
  currentRating?: number;
  userTags?: string[];
  sanctuaryIntent?: SanctuaryIntentV2;
  preferredEditionId?: string;
  currentExperienceId?: string;
  emotionalSnapshot?: EmotionalSnapshot;
  latestReflectionExcerpt?: string;
  legacy?: {
    mediaId?: string;
    notes?: string;
    emotionalRecall?: string;
    qualitativeNotes?: string;
  };
}

export type ExperienceKind = 'watch' | 'read';

export interface Experience {
  id: string;
  workId: string;
  kind: ExperienceKind;
  startedAt?: number;
  completedAt?: number;
  abandonedAt?: number;
  status: RelationshipStatus;
  rating?: number;
  editionId?: string;
  format?: 'theatrical' | 'streaming' | 'physical' | 'ebook' | 'audiobook' | 'other';
  progress?: {
    unit: 'percent' | 'page' | 'chapter' | 'episode';
    value: number;
    total?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export type ReflectionKind =
  | 'first_impression'
  | 'progress_note'
  | 'completion_reflection'
  | 'later_reflection'
  | 'quotation'
  | 'idea_spark';

export interface Reflection {
  id: string;
  workId: string;
  experienceId?: string;
  kind: ReflectionKind;
  body: string;
  title?: string;
  spoiler?: boolean;
  progressSnapshot?: Experience['progress'];
  userEnteredQuote?: {
    text: string;
    locationLabel?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export type WorkRelationType =
  | 'adaptation_of'
  | 'adapted_as'
  | 'based_on'
  | 'inspired_by'
  | 'remake_of'
  | 'sequel_to'
  | 'prequel_to'
  | 'series_member'
  | 'companion_to'
  | 'same_universe';

export interface WorkRelation {
  id: string;
  fromWorkId: string;
  toWorkId: string;
  relation: WorkRelationType;
  sourceUrl?: string;
  sourceProvider?: string;
  confidence: 'verified' | 'high' | 'medium' | 'user_asserted';
  createdAt: number;
}

export interface CatalogIdRedirect {
  oldId: string;
  canonicalId: string;
  reason: 'provider_resolution' | 'duplicate_merge' | 'migration';
  createdAt: number;
}

export type DetectionEvidenceType =
  | 'json_ld'
  | 'microdata'
  | 'isbn'
  | 'open_graph'
  | 'domain_adapter'
  | 'title_author_text'
  | 'image_context'
  | 'url_pattern';

export interface DetectionCandidate {
  medium: WorkMedium;
  title: string;
  authorOrCreator?: string[];
  year?: number;
  isbn10?: string[];
  isbn13?: string[];
  imageUrl?: string;
  sourcePageUrl: string;
  confidence: number;
  evidence: Array<{
    type: DetectionEvidenceType;
    value?: string;
    weight: number;
  }>;
  providerHint?: string;
}

export interface ArchivePair {
  relationship: LibraryRelationship;
  work: CatalogWork;
  preferredEdition?: BookEdition;
}
