/**
 * Bidirectional conversion between legacy cinema types and multi-medium catalog types.
 */
import type {
  MediaItem,
  LibraryItem,
  LibraryStatus,
  PersonItem,
  MediaType,
  SanctuaryIntent,
  CrewRole,
} from './types';
import type {
  CatalogWork,
  LibraryRelationship,
  WorkMedium,
  Creator,
  CreatorRole,
  Reflection,
  Experience,
  SanctuaryIntentV2,
} from './catalogTypes';
import {
  legacyStatusToRelationship,
  relationshipToLegacyStatus,
  legacyIntentToV2,
  intentV2ToLegacy,
  defaultIntentForStatus,
} from './statusLabels';

export function mediaTypeToMedium(type: MediaType | 'book'): WorkMedium {
  if (type === 'book') return 'book';
  return type;
}

export function mediumToMediaType(medium: WorkMedium): MediaType | 'book' {
  return medium;
}

export function mediaItemToCatalogWork(item: MediaItem): CatalogWork {
  const medium = mediaTypeToMedium(item.type as MediaType | 'book');
  const now = Date.now();
  return {
    id: item.id,
    medium,
    canonicalTitle: item.canonicalTitle,
    originalTitle: item.originalTitle,
    firstReleaseYear: item.year,
    description: item.overview,
    genres: item.genres ?? [],
    images: {
      primary: item.posterUrl || undefined,
      backdrop: item.backdropUrl,
    },
    externalIds: (item.providers ?? []).map((p) => ({
      provider: p.provider,
      externalId: p.externalId,
      url: p.url,
    })),
    creatorCredits: [],
    screenDetails:
      medium === 'movie' || medium === 'tv'
        ? {
            screenType: medium,
            runtimeMinutes: item.runtimeMinutes,
            streamingAvailability: item.streamingAvailability,
          }
        : undefined,
    bookDetails:
      medium === 'book'
        ? {
            authors: (item as MediaItem & { authors?: string[] }).authors ?? [],
            firstPublishedYear: item.year,
          }
        : undefined,
    publicRatings: (item.ratings ?? []).map((r) => ({
      provider: r.provider,
      score: r.score,
      votes: r.votes,
    })),
    sourceProvenance: [
      {
        provider: medium === 'book' ? 'openlibrary' : 'tmdb',
        fields: ['canonicalTitle', 'images', 'genres'],
        fetchedAt: now,
      },
    ],
    sourceConfidence: 'high',
    createdAt: now,
    updatedAt: now,
  };
}

export function catalogWorkToMediaItem(work: CatalogWork): MediaItem {
  const type = work.medium === 'book' ? ('book' as MediaType) : work.medium;
  return {
    id: work.id,
    canonicalTitle: work.canonicalTitle,
    originalTitle: work.originalTitle,
    type: type as MediaType,
    year: work.firstReleaseYear ?? 0,
    genres: work.genres ?? [],
    ratings: (work.publicRatings ?? []).map((r) => ({
      provider: (r.provider as MediaItem['ratings'][0]['provider']) || 'other',
      score: r.score,
      votes: r.votes,
    })),
    providers: work.externalIds.map((e) => ({
      provider: (e.provider as MediaItem['providers'][0]['provider']) || 'other',
      externalId: e.externalId,
      url: e.url,
    })),
    posterUrl: work.images.primary ?? '',
    backdropUrl: work.images.backdrop,
    overview: work.description,
    runtimeMinutes: work.screenDetails?.runtimeMinutes,
    streamingAvailability: work.screenDetails?.streamingAvailability,
    wikidataSummary: undefined,
    wikidataDirectorBio: undefined,
  };
}

export function libraryItemToRelationship(item: LibraryItem): LibraryRelationship {
  const status = legacyStatusToRelationship(item.status);
  return {
    workId: item.mediaId,
    status,
    addedAt: item.addedAt,
    updatedAt: item.updatedAt,
    currentRating: item.userRating,
    userTags: item.userTags,
    sanctuaryIntent: legacyIntentToV2(item.sanctuaryIntent) ?? defaultIntentForStatus(status),
    preferredEditionId: item.preferredEditionId,
    emotionalSnapshot: {
      awe: item.awe,
      melancholy: item.melancholy,
      tension: item.tension,
      warmth: item.warmth,
      atmosphere: item.atmosphere,
      lingeringThought: item.lingeringThought,
    },
    latestReflectionExcerpt:
      item.emotionalRecall?.trim() ||
      item.qualitativeNotes?.trim() ||
      item.notes?.trim() ||
      undefined,
    legacy: {
      mediaId: item.mediaId,
      notes: item.notes,
      emotionalRecall: item.emotionalRecall,
      qualitativeNotes: item.qualitativeNotes,
    },
  };
}

export function relationshipToLibraryItem(rel: LibraryRelationship): LibraryItem {
  return {
    mediaId: rel.workId,
    status: relationshipToLegacyStatus(rel.status),
    addedAt: rel.addedAt,
    updatedAt: rel.updatedAt,
    userRating: rel.currentRating,
    userTags: rel.userTags,
    notes: rel.legacy?.notes,
    sanctuaryIntent: intentV2ToLegacy(rel.sanctuaryIntent) as SanctuaryIntent | undefined,
    emotionalRecall: rel.legacy?.emotionalRecall ?? rel.latestReflectionExcerpt,
    qualitativeNotes: rel.legacy?.qualitativeNotes,
    preferredEditionId: rel.preferredEditionId,
    awe: rel.emotionalSnapshot?.awe,
    melancholy: rel.emotionalSnapshot?.melancholy,
    tension: rel.emotionalSnapshot?.tension,
    warmth: rel.emotionalSnapshot?.warmth,
    atmosphere: rel.emotionalSnapshot?.atmosphere,
    lingeringThought: rel.emotionalSnapshot?.lingeringThought,
  };
}

function mapCrewRole(role: CrewRole): CreatorRole {
  if (role === 'writer') return 'screenwriter';
  return role as CreatorRole;
}

function mapCreatorRoleToCrew(role: CreatorRole | undefined): CrewRole {
  if (!role) return 'director';
  if (role === 'screenwriter' || role === 'author') return 'writer';
  if (
    role === 'director' ||
    role === 'cinematographer' ||
    role === 'actor' ||
    role === 'composer' ||
    role === 'producer' ||
    role === 'editor'
  ) {
    return role;
  }
  return 'writer';
}

export function isOpenLibraryAuthorId(id: string): boolean {
  return id.startsWith('openlibrary_author_');
}

export function personItemToCreator(person: PersonItem): Creator {
  if (isOpenLibraryAuthorId(person.id)) {
    const olId = person.id.replace(/^openlibrary_author_/, '');
    return {
      id: person.id,
      name: person.name,
      roles: ['author'],
      biography: person.biography,
      profileImageUrl: person.profileImageUrl,
      knownForWorkIds: person.filmographyIds ?? [],
      followedAt: person.followedAt,
      lastSyncedAt: person.lastSyncedAt,
      externalIds: [
        {
          provider: 'openlibrary',
          externalId: olId,
          url: `https://openlibrary.org/authors/${olId}`,
        },
      ],
    };
  }

  const id = person.id.startsWith('tmdb_person_') ? person.id : `tmdb_person_${person.id}`;
  return {
    id,
    name: person.name,
    roles: [mapCrewRole(person.role)],
    biography: person.biography,
    profileImageUrl: person.profileImageUrl,
    knownForWorkIds: person.filmographyIds ?? [],
    followedAt: person.followedAt,
    lastSyncedAt: person.lastSyncedAt,
    externalIds: [
      {
        provider: 'tmdb',
        externalId: person.id.replace(/^tmdb_person_/, ''),
      },
    ],
  };
}

export function creatorToPersonItem(creator: Creator): PersonItem {
  if (isOpenLibraryAuthorId(creator.id) || creator.externalIds.some((e) => e.provider === 'openlibrary')) {
    const id = isOpenLibraryAuthorId(creator.id)
      ? creator.id
      : `openlibrary_author_${creator.externalIds.find((e) => e.provider === 'openlibrary')!.externalId}`;
    return {
      id,
      name: creator.name,
      role: 'writer',
      profileImageUrl: creator.profileImageUrl,
      biography: creator.biography,
      knownFor: [],
      filmographyIds: creator.knownForWorkIds,
      followedAt: creator.followedAt ?? Date.now(),
      lastSyncedAt: creator.lastSyncedAt ?? Date.now(),
    };
  }

  const tmdb = creator.externalIds.find((e) => e.provider === 'tmdb');
  const rawId = tmdb?.externalId ?? creator.id.replace(/^tmdb_person_/, '');
  return {
    id: rawId,
    name: creator.name,
    role: mapCreatorRoleToCrew(creator.roles[0]),
    profileImageUrl: creator.profileImageUrl,
    biography: creator.biography,
    knownFor: [],
    filmographyIds: creator.knownForWorkIds,
    followedAt: creator.followedAt ?? Date.now(),
    lastSyncedAt: creator.lastSyncedAt ?? Date.now(),
  };
}

/** Migrate legacy note fields into Reflection records. */
export function libraryItemToReflections(item: LibraryItem): Reflection[] {
  const now = item.updatedAt || item.addedAt || Date.now();
  const out: Reflection[] = [];
  const seen = new Set<string>();

  const push = (kind: Reflection['kind'], body: string | undefined, offset: number) => {
    const text = body?.trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push({
      id: `migrated_${item.mediaId}_${kind}_${offset}`,
      workId: item.mediaId,
      kind,
      body: text,
      createdAt: now - (out.length + 1) * 1000,
      updatedAt: now - (out.length + 1) * 1000,
    });
  };

  push('first_impression', item.emotionalRecall, 0);
  push('later_reflection', item.qualitativeNotes, 1);
  if (item.notes && item.notes.trim() !== item.emotionalRecall?.trim() && item.notes.trim() !== item.qualitativeNotes?.trim()) {
    push('later_reflection', item.notes, 2);
  }
  if (item.scriptParallels?.length) {
    push('later_reflection', `Script parallels:\n${item.scriptParallels.join('\n')}`, 3);
  }
  push('idea_spark', item.originalScreenplaySparks, 4);
  if (item.lingeringThought?.trim() && item.lingeringThought.trim().length > 40) {
    push('later_reflection', item.lingeringThought, 5);
  }

  return out;
}

export function libraryItemToExperience(item: LibraryItem, medium: WorkMedium): Experience | null {
  if (item.status === 'to-watch') return null;
  const status = legacyStatusToRelationship(item.status);
  const kind = medium === 'book' ? 'read' : 'watch';
  const id = `exp_migrated_${item.mediaId}`;
  return {
    id,
    workId: item.mediaId,
    kind,
    status,
    rating: item.userRating,
    startedAt: item.status === 'watching' || item.status === 'watched' || item.status === 'abandoned' ? item.addedAt : undefined,
    completedAt: item.status === 'watched' ? item.updatedAt : undefined,
    abandonedAt: item.status === 'abandoned' ? item.updatedAt : undefined,
    createdAt: item.addedAt,
    updatedAt: item.updatedAt,
  };
}
