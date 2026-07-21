/**
 * Open Library book catalog provider.
 * Default book backbone — no user API key required.
 * Work vs edition separation with field-level SourceProvenance.
 *
 * Spec: docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md §5, §19.3
 */

import type {
  BookEdition,
  CatalogWork,
  CreatorCredit,
  SourceProvenance,
} from '@/shared/catalogTypes';
import { isValidIsbn, normalizeIsbn, toIsbn13 } from '@/shared/isbn';

const OL_BASE = 'https://openlibrary.org';
const COVERS_BASE = 'https://covers.openlibrary.org';
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const CACHE = new Map<string, { data: unknown; timestamp: number }>();

export interface BookSearchQuery {
  query: string;
  limit?: number;
}

export interface BookSearchResult {
  work: CatalogWork;
  editions?: BookEdition[];
  matchScore: number;
}

// ─── Open Library raw API shapes (subset) ───────────────────────────────────

interface OlSearchDoc {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  cover_edition_key?: string;
  isbn?: string[];
  edition_count?: number;
  subject?: string[];
  language?: string[];
  number_of_pages_median?: number;
  publisher?: string[];
}

interface OlSearchResponse {
  numFound?: number;
  docs?: OlSearchDoc[];
}

interface OlAuthorRef {
  key?: string;
  name?: string;
}

interface OlWorkAuthor {
  author?: OlAuthorRef;
  type?: { key?: string };
}

interface OlDescription {
  type?: string;
  value?: string;
}

interface OlWorkResponse {
  key?: string;
  title?: string;
  subtitle?: string;
  description?: string | OlDescription;
  authors?: OlWorkAuthor[];
  covers?: number[];
  subjects?: string[];
  subject_places?: string[];
  first_publish_date?: string;
}

interface OlEditionResponse {
  key?: string;
  title?: string;
  subtitle?: string;
  authors?: OlAuthorRef[];
  by_statement?: string;
  works?: Array<{ key?: string }>;
  isbn_10?: string[];
  isbn_13?: string[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
  languages?: Array<{ key?: string }>;
  physical_format?: string;
  description?: string | OlDescription;
  subjects?: string[];
}

// ─── Cache ──────────────────────────────────────────────────────────────────

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
export function clearOpenLibraryCache(): void {
  CACHE.clear();
}

// ─── ID helpers ─────────────────────────────────────────────────────────────

/** Canonical bare OL id casing: OL45804W / OL7353617M. */
function formatOlBareId(id: string): string | null {
  const m = id.match(/^OL(\d+)([WM])$/i);
  if (!m) return null;
  return `OL${m[1]}${m[2].toUpperCase()}`;
}

/** Normalize OL key/id to bare OL id (e.g. OL45804W). */
export function extractOlId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const workNs = trimmed.match(/^openlibrary_work_(OL\d+W)$/i);
  if (workNs) return formatOlBareId(workNs[1]);

  const edNs = trimmed.match(/^openlibrary_edition_(OL\d+M)$/i);
  if (edNs) return formatOlBareId(edNs[1]);

  // Path forms: /works/OL45804W, /books/OL7353617M, /editions/...
  const path = trimmed.match(/\/(?:works|books|editions)\/(OL\d+[WM])(?:\.json)?$/i);
  if (path) return formatOlBareId(path[1]);

  // Bare id
  if (/^OL\d+[WM]$/i.test(trimmed)) return formatOlBareId(trimmed);

  return null;
}

export function toOpenLibraryWorkId(olWorkId: string): string {
  const id = extractOlId(olWorkId);
  if (!id || !id.endsWith('W')) {
    throw new Error(`Invalid Open Library work id: ${olWorkId}`);
  }
  return `openlibrary_work_${id}`;
}

export function toOpenLibraryEditionId(olEditionId: string): string {
  const id = extractOlId(olEditionId);
  if (!id || !id.endsWith('M')) {
    throw new Error(`Invalid Open Library edition id: ${olEditionId}`);
  }
  return `openlibrary_edition_${id}`;
}

function workSourceUrl(olWorkId: string): string {
  return `${OL_BASE}/works/${olWorkId}`;
}

function editionSourceUrl(olEditionId: string): string {
  return `${OL_BASE}/books/${olEditionId}`;
}

export function coverUrlFromId(coverId: number, size: 'S' | 'M' | 'L' = 'L'): string {
  return `${COVERS_BASE}/b/id/${coverId}-${size}.jpg`;
}

export function coverUrlFromIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'L'): string {
  return `${COVERS_BASE}/b/isbn/${normalizeIsbn(isbn)}-${size}.jpg`;
}

// ─── Fetch with timeout ─────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // AbortError, network failure, parse error — graceful empty
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function extractDescription(desc: string | OlDescription | undefined): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === 'string') return desc.trim() || undefined;
  if (typeof desc.value === 'string') return desc.value.trim() || undefined;
  return undefined;
}

function languageFromKey(key?: string): string | undefined {
  if (!key) return undefined;
  const m = key.match(/\/languages\/([a-z0-9-]+)$/i);
  return m ? m[1].toLowerCase() : key;
}

function parseYear(value?: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const m = value.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function mapPhysicalFormat(raw?: string): BookEdition['format'] | undefined {
  if (!raw) return undefined;
  const f = raw.toLowerCase();
  if (f.includes('hard')) return 'hardcover';
  if (f.includes('paper') || f.includes('soft')) return 'paperback';
  if (f.includes('audio')) return 'audiobook';
  if (f.includes('ebook') || f.includes('electronic') || f.includes('kindle')) return 'ebook';
  return 'other';
}

function authorsFromNames(names: string[] | undefined): CreatorCredit[] {
  if (!names?.length) return [];
  return names.map((name, order) => ({
    name,
    role: 'author' as const,
    order,
  }));
}

function authorsFromEdition(edition: OlEditionResponse): string[] {
  if (edition.authors?.length) {
    const named = edition.authors.map((a) => a.name).filter((n): n is string => Boolean(n));
    if (named.length) return named;
  }
  if (edition.by_statement) {
    return [edition.by_statement.replace(/^by\s+/i, '').trim()].filter(Boolean);
  }
  return [];
}

function authorsFromWork(work: OlWorkResponse): string[] {
  if (!work.authors?.length) return [];
  return work.authors
    .map((a) => a.author?.name)
    .filter((n): n is string => Boolean(n));
}

function provenance(
  providerRecordId: string,
  sourceUrl: string,
  fields: string[],
  fetchedAt: number
): SourceProvenance {
  return {
    provider: 'openlibrary',
    providerRecordId,
    sourceUrl,
    fields,
    fetchedAt,
  };
}

function safeEditionId(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    return toOpenLibraryEditionId(raw);
  } catch {
    return undefined;
  }
}

function mapSearchDocToWork(doc: OlSearchDoc, fetchedAt: number): CatalogWork | null {
  if (!doc.key || !doc.title) return null;
  const olId = extractOlId(doc.key);
  if (!olId || !olId.endsWith('W')) return null;

  const workId = `openlibrary_work_${olId}`;
  const fields: string[] = ['canonicalTitle', 'medium', 'externalIds'];
  const authors = doc.author_name ?? [];
  const year = doc.first_publish_year;
  const subjects = doc.subject?.slice(0, 20);
  const languages = doc.language?.map((l) => l.toLowerCase());
  const cover =
    typeof doc.cover_i === 'number' ? coverUrlFromId(doc.cover_i) : undefined;

  if (authors.length) fields.push('creatorCredits', 'bookDetails.authors');
  if (year) fields.push('firstReleaseYear', 'bookDetails.firstPublishedYear');
  if (subjects?.length) fields.push('subjects', 'bookDetails.primarySubjects');
  if (languages?.length) fields.push('languages');
  if (cover) fields.push('images.primary');
  if (doc.subtitle) fields.push('subtitle');

  return {
    id: workId,
    medium: 'book',
    canonicalTitle: doc.title,
    subtitle: doc.subtitle,
    firstReleaseYear: year,
    genres: [],
    subjects,
    languages,
    images: { primary: cover },
    externalIds: [
      {
        provider: 'openlibrary',
        externalId: olId,
        url: workSourceUrl(olId),
      },
    ],
    creatorCredits: authorsFromNames(authors),
    bookDetails: {
      authors,
      firstPublishedYear: year,
      primarySubjects: subjects?.slice(0, 10),
      defaultEditionId: safeEditionId(doc.cover_edition_key),
    },
    sourceProvenance: [provenance(olId, workSourceUrl(olId), fields, fetchedAt)],
    sourceConfidence: 'high',
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
    lastEnrichedAt: fetchedAt,
  };
}

function mapWorkResponse(data: OlWorkResponse, fetchedAt: number): CatalogWork | null {
  if (!data.key || !data.title) return null;
  const olId = extractOlId(data.key);
  if (!olId || !olId.endsWith('W')) return null;

  const workId = `openlibrary_work_${olId}`;
  const fields: string[] = ['canonicalTitle', 'medium', 'externalIds'];
  const description = extractDescription(data.description);
  const authors = authorsFromWork(data);
  const year = parseYear(data.first_publish_date);
  const subjects = data.subjects?.slice(0, 20);
  const cover =
    Array.isArray(data.covers) && typeof data.covers[0] === 'number'
      ? coverUrlFromId(data.covers[0])
      : undefined;

  if (description) fields.push('description');
  if (authors.length) fields.push('creatorCredits', 'bookDetails.authors');
  if (year) fields.push('firstReleaseYear', 'bookDetails.firstPublishedYear');
  if (subjects?.length) fields.push('subjects', 'bookDetails.primarySubjects');
  if (cover) fields.push('images.primary');
  if (data.subtitle) fields.push('subtitle');

  return {
    id: workId,
    medium: 'book',
    canonicalTitle: data.title,
    subtitle: data.subtitle,
    firstReleaseYear: year,
    description,
    genres: [],
    subjects,
    images: { primary: cover },
    externalIds: [
      {
        provider: 'openlibrary',
        externalId: olId,
        url: workSourceUrl(olId),
      },
    ],
    creatorCredits: authorsFromNames(authors),
    bookDetails: {
      authors,
      firstPublishedYear: year,
      primarySubjects: subjects?.slice(0, 10),
    },
    sourceProvenance: [provenance(olId, workSourceUrl(olId), fields, fetchedAt)],
    sourceConfidence: 'high',
    createdAt: fetchedAt,
    updatedAt: fetchedAt,
    lastEnrichedAt: fetchedAt,
  };
}

function mapEditionResponse(
  data: OlEditionResponse,
  workId: string,
  fetchedAt: number
): BookEdition | null {
  if (!data.key || !data.title) return null;
  const olId = extractOlId(data.key);
  if (!olId || !olId.endsWith('M')) return null;

  const editionId = `openlibrary_edition_${olId}`;
  const fields: string[] = ['title', 'workId', 'providerIds'];
  const authors = authorsFromEdition(data);
  const isbn10 = (data.isbn_10 ?? []).map(normalizeIsbn).filter(Boolean);
  const isbn13 = (data.isbn_13 ?? [])
    .map(normalizeIsbn)
    .filter((i) => i.length === 13);
  for (const i10 of isbn10) {
    const c = toIsbn13(i10);
    if (c && !isbn13.includes(c)) isbn13.push(c);
  }

  const cover =
    Array.isArray(data.covers) && typeof data.covers[0] === 'number'
      ? coverUrlFromId(data.covers[0])
      : isbn13[0]
        ? coverUrlFromIsbn(isbn13[0])
        : isbn10[0]
          ? coverUrlFromIsbn(isbn10[0])
          : undefined;

  const language = languageFromKey(data.languages?.[0]?.key);
  const description = extractDescription(data.description);
  const format = mapPhysicalFormat(data.physical_format);
  const publisher = data.publishers?.[0];

  if (authors.length) fields.push('authors');
  if (isbn10.length) fields.push('isbn10');
  if (isbn13.length) fields.push('isbn13');
  if (publisher) fields.push('publisher');
  if (data.publish_date) fields.push('publishedDate');
  if (language) fields.push('language');
  if (data.number_of_pages) fields.push('pageCount');
  if (format) fields.push('format');
  if (cover) fields.push('coverUrl');
  if (description) fields.push('description');
  if (data.subtitle) fields.push('subtitle');

  return {
    id: editionId,
    workId,
    title: data.title,
    subtitle: data.subtitle,
    authors,
    isbn10: isbn10.length ? isbn10 : undefined,
    isbn13: isbn13.length ? isbn13 : undefined,
    providerIds: [
      {
        provider: 'openlibrary',
        externalId: olId,
        url: editionSourceUrl(olId),
      },
    ],
    publisher,
    publishedDate: data.publish_date,
    language,
    pageCount: data.number_of_pages,
    format,
    coverUrl: cover,
    description,
    sourceProvenance: [provenance(olId, editionSourceUrl(olId), fields, fetchedAt)],
    sourceConfidence: 'high',
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function searchOpenLibrary(
  query: BookSearchQuery
): Promise<BookSearchResult[]> {
  const q = query.query?.trim();
  if (!q) return [];

  const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);
  const cacheKey = `ol_search_${q.toLowerCase()}_${limit}`;
  const cached = cacheGet<BookSearchResult[]>(cacheKey);
  if (cached) return cached;

  const url = `${OL_BASE}/search.json?q=${encodeURIComponent(q)}&limit=${limit}`;
  const data = await fetchJson<OlSearchResponse>(url);
  if (!data?.docs?.length) {
    cacheSet(cacheKey, []);
    return [];
  }

  const fetchedAt = Date.now();
  const results: BookSearchResult[] = [];

  for (let i = 0; i < data.docs.length; i++) {
    const work = mapSearchDocToWork(data.docs[i], fetchedAt);
    if (!work) continue;
    const matchScore = Math.max(0.15, 1 - i * 0.05);
    results.push({ work, matchScore });
  }

  cacheSet(cacheKey, results);
  return results;
}

export async function resolveOpenLibraryIsbn(
  isbn: string
): Promise<{ work: CatalogWork; edition: BookEdition } | null> {
  const normalized = normalizeIsbn(isbn);
  if (!isValidIsbn(normalized)) return null;

  const cacheKey = `ol_isbn_${normalized}`;
  const cached = cacheGet<{ work: CatalogWork; edition: BookEdition } | null>(cacheKey);
  if (cached !== undefined) return cached;

  // Prefer ISBN-13 path when we have one
  const lookup = toIsbn13(normalized) ?? normalized;
  const editionData = await fetchJson<OlEditionResponse>(
    `${OL_BASE}/isbn/${lookup}.json`
  );
  if (!editionData) {
    cacheSet(cacheKey, null);
    return null;
  }

  const fetchedAt = Date.now();
  const workKey = editionData.works?.[0]?.key;
  if (!workKey) {
    cacheSet(cacheKey, null);
    return null;
  }

  const workOlId = extractOlId(workKey);
  if (!workOlId) {
    cacheSet(cacheKey, null);
    return null;
  }

  let work = await getOpenLibraryWork(`openlibrary_work_${workOlId}`);
  if (!work) {
    const minimalFetched = Date.now();
    const authors = authorsFromEdition(editionData);
    work = {
      id: `openlibrary_work_${workOlId}`,
      medium: 'book',
      canonicalTitle: editionData.title || 'Unknown',
      firstReleaseYear: parseYear(editionData.publish_date),
      genres: [],
      images: {},
      externalIds: [
        {
          provider: 'openlibrary',
          externalId: workOlId,
          url: workSourceUrl(workOlId),
        },
      ],
      creatorCredits: authorsFromNames(authors),
      bookDetails: {
        authors,
        firstPublishedYear: parseYear(editionData.publish_date),
      },
      sourceProvenance: [
        provenance(
          workOlId,
          workSourceUrl(workOlId),
          ['canonicalTitle', 'medium', 'externalIds'],
          minimalFetched
        ),
      ],
      sourceConfidence: 'medium',
      createdAt: minimalFetched,
      updatedAt: minimalFetched,
    };
  }

  const edition = mapEditionResponse(editionData, work.id, fetchedAt);
  if (!edition) {
    cacheSet(cacheKey, null);
    return null;
  }

  if (work.bookDetails) {
    work = {
      ...work,
      bookDetails: {
        ...work.bookDetails,
        defaultEditionId: edition.id,
      },
      updatedAt: fetchedAt,
    };
  }

  const result = { work, edition };
  cacheSet(cacheKey, result);
  return result;
}

export async function getOpenLibraryWork(workId: string): Promise<CatalogWork | null> {
  const olId = extractOlId(workId);
  if (!olId || !olId.endsWith('W')) return null;

  const cacheKey = `ol_work_${olId}`;
  const cached = cacheGet<CatalogWork | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await fetchJson<OlWorkResponse>(`${OL_BASE}/works/${olId}.json`);
  if (!data) {
    cacheSet(cacheKey, null);
    return null;
  }

  const work = mapWorkResponse(data, Date.now());
  cacheSet(cacheKey, work);
  return work;
}

export async function getOpenLibraryEdition(
  editionId: string
): Promise<BookEdition | null> {
  const olId = extractOlId(editionId);
  if (!olId || !olId.endsWith('M')) return null;

  const cacheKey = `ol_edition_${olId}`;
  const cached = cacheGet<BookEdition | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await fetchJson<OlEditionResponse>(`${OL_BASE}/books/${olId}.json`);
  if (!data) {
    cacheSet(cacheKey, null);
    return null;
  }

  const workKey = data.works?.[0]?.key;
  const workOlId = workKey ? extractOlId(workKey) : null;
  const linkedWorkId = workOlId
    ? `openlibrary_work_${workOlId}`
    : `openlibrary_work_unknown`;

  const edition = mapEditionResponse(data, linkedWorkId, Date.now());
  cacheSet(cacheKey, edition);
  return edition;
}
