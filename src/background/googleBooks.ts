/**
 * Optional Google Books catalog provider.
 * Enrichment/fallback when the user supplies a Google Books API key.
 * Spec: docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md §5.1
 */

import type {
  BookEdition,
  CatalogWork,
  CreatorCredit,
  SourceProvenance,
} from '@/shared/catalogTypes';
import { isValidIsbn, normalizeIsbn, toIsbn13 } from '@/shared/isbn';
import type { BookSearchResult } from './openLibrary';

const GB_BASE = 'https://www.googleapis.com/books/v1/volumes';
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const CACHE = new Map<string, { data: unknown; timestamp: number }>();

// ─── Google Books raw API shapes (subset) ────────────────────────────

interface GbIndustryIdentifier {
  type?: string;
  identifier?: string;
}

interface GbImageLinks {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

interface GbVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: GbIndustryIdentifier[];
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: GbImageLinks;
  printType?: string;
  averageRating?: number;
  ratingsCount?: number;
  infoLink?: string;
  canonicalVolumeLink?: string;
  previewLink?: string;
}

interface GbVolume {
  kind?: string;
  id?: string;
  selfLink?: string;
  volumeInfo?: GbVolumeInfo;
}

interface GbVolumesResponse {
  kind?: string;
  totalItems?: number;
  items?: GbVolume[];
}

// ─── Cache ───────────────────────────────────────────────────────────

function cacheGet<T>(key: string): T | undefined {
  const entry = CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    CACHE.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown): void {
  CACHE.set(key, { data, timestamp: Date.now() });
}

/** Test helper — clears in-memory cache. */
export function clearGoogleBooksCache(): void {
  CACHE.clear();
}

// ─── ID helpers ──────────────────────────────────────────────────────

export function toGoogleBooksVolumeId(volumeId: string): string {
  const id = volumeId.trim();
  if (!id) throw new Error('Empty Google Books volume id');
  if (id.startsWith('googlebooks_volume_')) return id;
  return `googlebooks_volume_${id}`;
}

export function extractGoogleBooksVolumeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const namespaced = trimmed.match(/^googlebooks_volume_(.+)$/i);
  if (namespaced) return namespaced[1];
  // Bare volume ids are alphanumeric with optional hyphens/underscores
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}

function volumeSourceUrl(volumeId: string): string {
  return `https://books.google.com/books?id=${encodeURIComponent(volumeId)}`;
}

// ─── Fetch with timeout ──────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    // Unauthenticated quota / forbidden — fail gracefully
    if (res.status === 403 || res.status === 401) return null;
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildVolumesUrl(params: Record<string, string | number>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  return `${GB_BASE}?${qs.toString()}`;
}

// ─── Mapping helpers ─────────────────────────────────────────────────

function parseYear(value?: string): number | undefined {
  if (!value) return undefined;
  const m = value.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  if (m) return Number(m[1]);
  return undefined;
}

function pickCover(links?: GbImageLinks): string | undefined {
  if (!links) return undefined;
  // Prefer higher-res; Google often serves http — normalize to https
  const raw =
    links.extraLarge ||
    links.large ||
    links.medium ||
    links.small ||
    links.thumbnail ||
    links.smallThumbnail;
  if (!raw) return undefined;
  return raw.replace(/^http:\/\//i, 'https://');
}

function authorsFromVolume(info: GbVolumeInfo): string[] {
  return (info.authors ?? []).map((a) => a.trim()).filter(Boolean);
}

function authorsCredits(names: string[]): CreatorCredit[] {
  return names.map((name, order) => ({
    name,
    role: 'author' as const,
    order,
  }));
}

function extractIsbns(info: GbVolumeInfo): { isbn10: string[]; isbn13: string[] } {
  const isbn10: string[] = [];
  const isbn13: string[] = [];
  for (const id of info.industryIdentifiers ?? []) {
    if (!id.identifier) continue;
    const n = normalizeIsbn(id.identifier);
    if (id.type === 'ISBN_13' || n.length === 13) {
      if (n.length === 13 && !isbn13.includes(n)) isbn13.push(n);
    } else if (id.type === 'ISBN_10' || n.length === 10) {
      if ((n.length === 10 || n.length === 9) && !isbn10.includes(n)) isbn10.push(n);
      const as13 = toIsbn13(n);
      if (as13 && !isbn13.includes(as13)) isbn13.push(as13);
    }
  }
  return { isbn10, isbn13 };
}

function provenance(
  providerRecordId: string,
  sourceUrl: string,
  fields: string[],
  fetchedAt: number
): SourceProvenance {
  return {
    provider: 'googlebooks',
    providerRecordId,
    sourceUrl,
    fields,
    fetchedAt,
  };
}

function mapVolumeToWorkAndEdition(
  volume: GbVolume,
  fetchedAt: number
): { work: CatalogWork; edition: BookEdition } | null {
  const info = volume.volumeInfo;
  const title = info?.title?.trim();
  if (!volume.id || !info || !title) return null;

  const volumeId = volume.id;
  const workId = toGoogleBooksVolumeId(volumeId);
  const editionId = workId; // GB volume ≈ edition; keep single stable id
  const authors = authorsFromVolume(info);
  const year = parseYear(info.publishedDate);
  const cover = pickCover(info.imageLinks);
  const subjects = info.categories?.slice(0, 20);
  const language = info.language?.toLowerCase();
  const description = info.description?.trim() || undefined;
  const { isbn10, isbn13 } = extractIsbns(info);
  const sourceUrl = info.infoLink || info.canonicalVolumeLink || volumeSourceUrl(volumeId);

  const workFields: string[] = ['canonicalTitle', 'medium', 'externalIds'];
  if (authors.length) workFields.push('creatorCredits', 'bookDetails.authors');
  if (year) workFields.push('firstReleaseYear', 'bookDetails.firstPublishedYear');
  if (subjects?.length) workFields.push('subjects', 'bookDetails.primarySubjects');
  if (language) workFields.push('languages');
  if (cover) workFields.push('images.primary');
  if (description) workFields.push('description');
  if (info.subtitle) workFields.push('subtitle');

  const work: CatalogWork = {
    id: workId,
    medium: 'book',
    canonicalTitle: title,
    subtitle: info.subtitle,
    firstReleaseYear: year,
    description,
    genres: [],
    subjects,
    languages: language ? [language] : undefined,
    images: { primary: cover },
    externalIds: [
      {
        provider: 'googlebooks',
        externalId: volumeId,
        url: sourceUrl,
      },
    ],
    creatorCredits: authorsCredits(authors),
    bookDetails: {
      authors,
      firstPublishedYear: year,
      primarySubjects: subjects?.slice(0, 10),
      defaultEditionId: editionId,
    },
    publicRatings:
      typeof info.averageRating === 'number'
        ? [
            {
              provider: 'googlebooks',
              score: info.averageRating,
              votes: info.ratingsCount,
            },
          ]
        : undefined,
    sourceProvenance: [provenance(volumeId, sourceUrl, workFields, fetchedAt)],
    sourceConfidence: 'medium',
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
    lastEnrichedAt: fetchedAt,
  };

  const editionFields: string[] = ['title', 'workId', 'providerIds'];
  if (authors.length) editionFields.push('authors');
  if (isbn10.length) editionFields.push('isbn10');
  if (isbn13.length) editionFields.push('isbn13');
  if (info.publisher) editionFields.push('publisher');
  if (info.publishedDate) editionFields.push('publishedDate');
  if (language) editionFields.push('language');
  if (info.pageCount) editionFields.push('pageCount');
  if (cover) editionFields.push('coverUrl');
  if (description) editionFields.push('description');
  if (info.subtitle) editionFields.push('subtitle');

  const edition: BookEdition = {
    id: editionId,
    workId,
    title,
    subtitle: info.subtitle,
    authors,
    isbn10: isbn10.length ? isbn10 : undefined,
    isbn13: isbn13.length ? isbn13 : undefined,
    providerIds: [
      {
        provider: 'googlebooks',
        externalId: volumeId,
        url: sourceUrl,
      },
    ],
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    language,
    pageCount: info.pageCount,
    coverUrl: cover,
    description,
    sourceProvenance: [provenance(volumeId, sourceUrl, editionFields, fetchedAt)],
    sourceConfidence: 'medium',
  };

  return { work, edition };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Search Google Books volumes.
 * Works without an API key (restricted unauthenticated quota); returns [] on 403 / errors.
 */
export async function searchGoogleBooks(
  query: string,
  apiKey?: string,
  limit?: number
): Promise<BookSearchResult[]> {
  const q = query?.trim();
  if (!q) return [];

  const maxResults = Math.min(Math.max(limit ?? 10, 1), 40);
  const cacheKey = `gb_search_${q.toLowerCase()}_${maxResults}_${apiKey ? 'k' : 'anon'}`;
  const cached = cacheGet<BookSearchResult[]>(cacheKey);
  if (cached) return cached;

  const params: Record<string, string | number> = {
    q,
    maxResults,
    printType: 'books',
  };
  if (apiKey?.trim()) {
    params.key = apiKey.trim();
  }

  const data = await fetchJson<GbVolumesResponse>(buildVolumesUrl(params));
  if (!data?.items?.length) {
    cacheSet(cacheKey, []);
    return [];
  }

  const fetchedAt = Date.now();
  const results: BookSearchResult[] = [];

  for (let i = 0; i < data.items.length; i++) {
    const mapped = mapVolumeToWorkAndEdition(data.items[i], fetchedAt);
    if (!mapped) continue;
    const matchScore = Math.max(0.1, 0.9 - i * 0.05);
    results.push({
      work: mapped.work,
      editions: [mapped.edition],
      matchScore,
    });
  }

  cacheSet(cacheKey, results);
  return results;
}

/**
 * Resolve an ISBN via Google Books `isbn:` query.
 * Returns linked CatalogWork + BookEdition, or null.
 */
export async function resolveGoogleBooksIsbn(
  isbn: string,
  apiKey?: string
): Promise<{ work: CatalogWork; edition: BookEdition } | null> {
  const normalized = normalizeIsbn(isbn);
  if (!isValidIsbn(normalized)) return null;

  const lookup = toIsbn13(normalized) ?? normalized;
  const cacheKey = `gb_isbn_${lookup}_${apiKey ? 'k' : 'anon'}`;
  const cached = cacheGet<{ work: CatalogWork; edition: BookEdition } | null>(cacheKey);
  if (cached !== undefined) return cached;

  const params: Record<string, string | number> = {
    q: `isbn:${lookup}`,
    maxResults: 1,
    printType: 'books',
  };
  if (apiKey?.trim()) {
    params.key = apiKey.trim();
  }

  const data = await fetchJson<GbVolumesResponse>(buildVolumesUrl(params));
  const volume = data?.items?.[0];
  if (!volume) {
    cacheSet(cacheKey, null);
    return null;
  }

  const mapped = mapVolumeToWorkAndEdition(volume, Date.now());
  if (!mapped) {
    cacheSet(cacheKey, null);
    return null;
  }

  // Ensure the queried ISBN is present on the edition
  const edition = { ...mapped.edition };
  if (lookup.length === 13) {
    const list = [...(edition.isbn13 ?? [])];
    if (!list.includes(lookup)) list.push(lookup);
    edition.isbn13 = list;
  }

  const result = { work: mapped.work, edition };
  cacheSet(cacheKey, result);
  return result;
}
