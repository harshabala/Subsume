/**
 * Book catalog handlers — Open Library + optional Google Books + ISBN resolution.
 * Legacy movie/TV handlers remain elsewhere; these add multi-medium paths.
 */
import { MessageType } from '@/shared/types';
import type { MessageHandlerMap } from '@/shared/messages';
import type {
  CatalogWork,
  DetectionCandidate,
} from '@/shared/catalogTypes';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import { isValidIsbn, toIsbn13 } from '@/shared/isbn';
import {
  putMediaItem,
  getMediaItem,
  putLibraryItem,
  getLibraryItem,
  getPreferences,
} from '../storage';
import { logger } from '@/shared/logger';

async function loadOpenLibrary() {
  return import('../openLibrary');
}

async function loadGoogleBooks() {
  return import('../googleBooks');
}

/** Dedupe key: lowercased title + sorted authors. */
function bookDedupeKey(work: CatalogWork): string {
  const title = (work.canonicalTitle || '').toLowerCase().trim();
  const authors = (work.bookDetails?.authors ?? [])
    .map((a) => a.toLowerCase().trim())
    .filter(Boolean)
    .sort()
    .join('|');
  return `${title}::${authors}`;
}

export const bookHandlers: MessageHandlerMap = {
  [MessageType.SEARCH_WORKS]: async (payload) => {
    const req = payload as { query: string; medium?: 'movie' | 'tv' | 'book' | 'all'; limit?: number };
    const query = (req.query || '').trim();
    if (!query) return { works: [] as unknown[] };

    const medium = req.medium ?? 'all';
    const limit = req.limit ?? 12;
    const results: Array<{ work: ReturnType<typeof catalogWorkToMediaItem>; score: number }> = [];
    const seenKeys = new Set<string>();

    if (medium === 'book' || medium === 'all') {
      try {
        const ol = await loadOpenLibrary();
        const books = await ol.searchOpenLibrary({ query, limit });
        for (const hit of books) {
          const key = bookDedupeKey(hit.work);
          seenKeys.add(key);
          const media = catalogWorkToMediaItem(hit.work);
          media.type = 'book';
          if (hit.work.bookDetails?.authors) {
            media.authors = hit.work.bookDetails.authors;
          }
          await putMediaItem(media);
          results.push({ work: media, score: hit.matchScore });
        }
      } catch (err) {
        logger.warn('[Subsume] Open Library search failed:', err);
      }

      // Optional Google Books enrichment when the user has a key
      try {
        const prefs = await getPreferences();
        if (prefs.googleBooksApiKey?.trim()) {
          const gb = await loadGoogleBooks();
          const gbHits = await gb.searchGoogleBooks(
            query,
            prefs.googleBooksApiKey,
            limit
          );
          for (const hit of gbHits) {
            const key = bookDedupeKey(hit.work);
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            const media = catalogWorkToMediaItem(hit.work);
            media.type = 'book';
            if (hit.work.bookDetails?.authors) {
              media.authors = hit.work.bookDetails.authors;
            }
            await putMediaItem(media);
            results.push({ work: media, score: hit.matchScore * 0.95 });
          }
        }
      } catch (err) {
        logger.warn('[Subsume] Google Books search failed:', err);
      }
    }

    return { works: results.map((r) => r.work), medium };
  },

  [MessageType.RESOLVE_PAGE_CANDIDATE]: async (payload) => {
    const candidate = payload as DetectionCandidate;
    if (!candidate || candidate.medium !== 'book') {
      return { resolved: false as const, reason: 'not_a_book_candidate' };
    }

    try {
      const ol = await loadOpenLibrary();
      const isbns = [...(candidate.isbn13 ?? []), ...(candidate.isbn10 ?? [])];
      for (const raw of isbns) {
        const isbn13 = toIsbn13(raw) ?? (isValidIsbn(raw) ? raw : null);
        if (!isbn13) continue;
        const resolved = await ol.resolveOpenLibraryIsbn(isbn13);
        if (resolved) {
          const media = catalogWorkToMediaItem(resolved.work);
          media.type = 'book';
          media.authors = resolved.work.bookDetails?.authors;
          media.posterUrl = resolved.edition.coverUrl || media.posterUrl;
          media.preferredEditionId = resolved.edition.id;
          await putMediaItem(media);
          const existing = await getLibraryItem(media.id);
          return {
            resolved: true as const,
            media,
            edition: resolved.edition,
            inLibrary: Boolean(existing),
            libraryStatus: existing?.status,
          };
        }
      }

      if (candidate.title && (candidate.confidence >= 0.65 || (candidate.authorOrCreator?.length ?? 0) > 0)) {
        const q = [candidate.title, ...(candidate.authorOrCreator ?? [])].join(' ');
        const hits = await ol.searchOpenLibrary({ query: q, limit: 3 });
        if (hits[0] && hits[0].matchScore >= 0.5) {
          const media = catalogWorkToMediaItem(hits[0].work);
          media.type = 'book';
          media.authors = hits[0].work.bookDetails?.authors;
          await putMediaItem(media);
          const existing = await getLibraryItem(media.id);
          return {
            resolved: true as const,
            media,
            inLibrary: Boolean(existing),
            libraryStatus: existing?.status,
          };
        }
      }
    } catch (err) {
      logger.warn('[Subsume] RESOLVE_PAGE_CANDIDATE failed:', err);
    }

    return { resolved: false as const, reason: 'no_catalog_match' };
  },

  [MessageType.GET_WORK_DETAILS]: async (payload) => {
    const req = payload as { workId?: string; title?: string; medium?: string };
    if (req.workId) {
      const media = await getMediaItem(req.workId);
      if (media) return media;
      if (req.workId.startsWith('openlibrary_work_')) {
        try {
          const ol = await loadOpenLibrary();
          const work = await ol.getOpenLibraryWork(req.workId);
          if (work) {
            const media = catalogWorkToMediaItem(work);
            media.type = 'book';
            await putMediaItem(media);
            return media;
          }
        } catch (err) {
          logger.warn('[Subsume] GET_WORK_DETAILS OL failed:', err);
        }
      }
    }
    return null;
  },

  [MessageType.ADD_TO_ARCHIVE]: async (payload) => {
    // Alias of ADD_TO_LIST with book-friendly naming
    const req = payload as { mediaItem?: { id: string; type?: string }; workId?: string; status?: string };
    let mediaId = req.workId ?? req.mediaItem?.id;
    if (!mediaId && req.mediaItem) {
      await putMediaItem(req.mediaItem as never);
      mediaId = req.mediaItem.id;
    }
    if (!mediaId) throw new Error('ADD_TO_ARCHIVE requires workId or mediaItem');

    const existing = await getLibraryItem(mediaId);
    const now = Date.now();
    const status = (req.status as 'to-watch' | 'watching' | 'watched' | 'abandoned') || existing?.status || 'to-watch';
    await putLibraryItem({
      mediaId,
      status,
      addedAt: existing?.addedAt ?? now,
      updatedAt: now,
      sanctuaryIntent: existing?.sanctuaryIntent,
      notes: existing?.notes,
      emotionalRecall: existing?.emotionalRecall,
    });
    return { added: true, mediaId };
  },

  [MessageType.CHECK_ARCHIVE_STATUS]: async (payload) => {
    const req = payload as { workId?: string; mediaId?: string };
    const id = req.workId ?? req.mediaId;
    if (!id) return { inLibrary: false };
    const item = await getLibraryItem(id);
    return {
      inLibrary: Boolean(item),
      status: item?.status,
      userRating: item?.userRating,
    };
  },

  [MessageType.GET_ARCHIVE]: async (payload) => {
    // Same payload/response contract as GET_LIBRARY (archive = library for now).
    const { getAllLibraryItems, getAllMediaMap } = await import('../storage');
    const req = (payload || {}) as { status?: string; type?: string };
    const libraryItems = await getAllLibraryItems();
    const mediaMap = await getAllMediaMap(libraryItems.map((i) => i.mediaId));
    let joined = libraryItems
      .filter((i) => mediaMap[i.mediaId])
      .map((i) => ({ library: i, media: mediaMap[i.mediaId] }));
    if (req.type) {
      joined = joined.filter((j) => j.media.type === req.type);
    }
    if (req.status) {
      joined = joined.filter((j) => j.library.status === req.status);
    }
    return joined;
  },
};
