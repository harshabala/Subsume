import { fetchWithRetry } from './tmdb';

const CACHE = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 86400000; // 24 hours

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const WIKIPEDIA_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const USER_AGENT = 'Subsume/1.0 (browser-extension; https://github.com/harshabalakrishnan/subsume) wikidata-integration';

function cacheGet<T>(key: string): T | undefined {
  const entry = CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    CACHE.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown): void {
  CACHE.set(key, { data, timestamp: Date.now() });
}

export async function fetchWikipediaSummary(
  title: string,
  year: number
): Promise<string | null> {
  const cacheKey = `wiki_summary_${title}_${year}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const tryFetch = async (pageTitle: string): Promise<string | null> => {
    try {
      const encoded = encodeURIComponent(pageTitle.replace(/ /g, '_'));
      const url = `${WIKIPEDIA_SUMMARY_URL}/${encoded}`;
      const res = await fetchWithRetry(url, 2, 500, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) return null;
      const data: { extract?: string } = await res.json();
      return data.extract || null;
    } catch {
      return null;
    }
  };

  // Try plain title first, then year-disambiguated
  let extract = await tryFetch(title);
  if (!extract) {
    extract = await tryFetch(`${title} (${year} film)`);
  }
  if (!extract) {
    extract = await tryFetch(`${title} (TV series)`);
  }

  cacheSet(cacheKey, extract);
  return extract;
}

/** Structured adaptation hint from Wikidata (not yet a permanent catalog link). */
export type WikidataAdaptationHint = {
  title: string;
  year?: number;
  imdbId?: string;
  /** 'source' = literary/source work this film is based on; 'adaptation' = film of a work. */
  kind: 'source' | 'adaptation';
  wikidataUrl?: string;
};

/**
 * Light SPARQL lookup for adaptation links.
 * Prefers IMDb id (P345); falls back to English title match for films.
 * Returns titles only — callers must match/store with medium confidence.
 */
export async function fetchWikidataAdaptations(opts: {
  imdbId?: string;
  title?: string;
  year?: number;
  medium?: string;
}): Promise<WikidataAdaptationHint[]> {
  const imdbId = opts.imdbId?.trim();
  const title = opts.title?.trim();
  if (!imdbId && !title) return [];

  const cacheKey = `wikidata_adapt_${imdbId || ''}_${title || ''}_${opts.year || ''}`;
  const cached = cacheGet<WikidataAdaptationHint[]>(cacheKey);
  if (cached) return cached;

  try {
    let sparqlQuery: string;
    if (imdbId) {
      // Film with this IMDb id → works it is based on (P144).
      sparqlQuery = `
        SELECT DISTINCT ?sourceLabel ?sourceYear ?sourceImdb WHERE {
          ?item wdt:P345 "${imdbId.replace(/"/g, '')}" .
          ?item wdt:P144 ?source .
          ?source rdfs:label ?sourceLabel FILTER(LANG(?sourceLabel) = "en") .
          OPTIONAL { ?source wdt:P577 ?date . BIND(YEAR(?date) AS ?sourceYear) }
          OPTIONAL { ?source wdt:P345 ?sourceImdb }
        } LIMIT 10
      `;
    } else {
      // Title match for films: find items labeled title that have based-on (P144).
      const safeTitle = title!.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      sparqlQuery = `
        SELECT DISTINCT ?sourceLabel ?sourceYear ?sourceImdb WHERE {
          ?item rdfs:label "${safeTitle}"@en .
          ?item wdt:P31/wdt:P279* wd:Q11424 .
          ?item wdt:P144 ?source .
          ?source rdfs:label ?sourceLabel FILTER(LANG(?sourceLabel) = "en") .
          OPTIONAL { ?source wdt:P577 ?date . BIND(YEAR(?date) AS ?sourceYear) }
          OPTIONAL { ?source wdt:P345 ?sourceImdb }
        } LIMIT 10
      `;
    }

    const sparqlUrl = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    const sparqlRes = await fetchWithRetry(sparqlUrl, 2, 1000, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!sparqlRes.ok) {
      cacheSet(cacheKey, []);
      return [];
    }

    const sparqlData: {
      results: {
        bindings: Array<{
          sourceLabel?: { value: string };
          sourceYear?: { value: string };
          sourceImdb?: { value: string };
        }>;
      };
    } = await sparqlRes.json();

    const hints: WikidataAdaptationHint[] = [];
    for (const b of sparqlData.results.bindings) {
      const label = b.sourceLabel?.value?.trim();
      if (!label) continue;
      hints.push({
        title: label,
        year: b.sourceYear?.value ? parseInt(b.sourceYear.value, 10) : undefined,
        imdbId: b.sourceImdb?.value,
        kind: 'source',
        wikidataUrl: 'https://www.wikidata.org/',
      });
    }

    cacheSet(cacheKey, hints);
    return hints;
  } catch {
    cacheSet(cacheKey, []);
    return [];
  }
}

/**
 * Match Wikidata adaptation hints against local catalog / Open Library and store
 * medium-confidence relations with sourceProvider 'wikidata'. No LLM involvement.
 */
export async function matchAndStoreWikidataAdaptations(
  workId: string,
  media: { type: string; canonicalTitle: string },
  hints: WikidataAdaptationHint[],
): Promise<number> {
  if (hints.length === 0) return 0;
  if (media.type === 'book') {
    // Film adaptations of books need screen search; skip auto-store for books in light path.
    return 0;
  }

  const { searchOpenLibrary } = await import('./openLibrary');
  const { putWorkRelation, getWorkRelationsForWork, putMediaItem, putWork, getMediaItem } =
    await import('./storage');
  const { catalogWorkToMediaItem, mediaItemToCatalogWork } = await import('@/shared/compatibility');
  const { v4: uuidv4 } = await import('uuid');

  let stored = 0;
  const existing = await getWorkRelationsForWork(workId);

  for (const hint of hints.slice(0, 5)) {
    try {
      const results = await searchOpenLibrary({ query: hint.title, limit: 3 });
      const best = results[0];
      if (!best || best.matchScore < 0.5) continue;

      const bookWork = best.work;
      const titleMatch =
        bookWork.canonicalTitle.toLowerCase().trim() === hint.title.toLowerCase().trim() ||
        bookWork.canonicalTitle.toLowerCase().includes(hint.title.toLowerCase().slice(0, 20));
      if (!titleMatch && best.matchScore < 0.85) continue;

      const toId = bookWork.id;
      const already = existing.some(
        (r) =>
          (r.fromWorkId === workId && r.toWorkId === toId && r.relation === 'adaptation_of') ||
          (r.fromWorkId === workId && r.toWorkId === toId && r.relation === 'based_on'),
      );
      if (already) continue;

      // Catalog the book lightly so GET_RELATED_WORKS can resolve a title.
      const bookMedia = catalogWorkToMediaItem(bookWork);
      bookMedia.type = 'book';
      if (bookWork.bookDetails?.authors) bookMedia.authors = bookWork.bookDetails.authors;
      if (!(await getMediaItem(toId))) {
        await putMediaItem(bookMedia);
        await putWork(mediaItemToCatalogWork(bookMedia));
      }

      const now = Date.now();
      await putWorkRelation({
        id: uuidv4(),
        fromWorkId: workId,
        toWorkId: toId,
        relation: 'adaptation_of',
        confidence: 'medium',
        sourceProvider: 'wikidata',
        sourceUrl: hint.wikidataUrl,
        createdAt: now,
      });
      await putWorkRelation({
        id: uuidv4(),
        fromWorkId: toId,
        toWorkId: workId,
        relation: 'adapted_as',
        confidence: 'medium',
        sourceProvider: 'wikidata',
        sourceUrl: hint.wikidataUrl,
        createdAt: now,
      });
      stored += 1;
      existing.push({
        id: 'temp',
        fromWorkId: workId,
        toWorkId: toId,
        relation: 'adaptation_of',
        confidence: 'medium',
        createdAt: now,
      });
    } catch {
      // per-hint failure is fine
    }
  }

  return stored;
}

export async function fetchWikidataDirectorInfo(
  imdbId: string
): Promise<{ directorName: string; directorBio: string } | null> {
  const cacheKey = `wikidata_director_${imdbId}`;
  const cached = cacheGet<{ directorName: string; directorBio: string } | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const sparqlQuery = `
      SELECT ?directorLabel ?directorWikipediaTitle WHERE {
        ?item wdt:P345 "${imdbId}" .
        ?item wdt:P57 ?director .
        ?director rdfs:label ?directorLabel FILTER(LANG(?directorLabel) = "en") .
        OPTIONAL {
          ?article schema:about ?director ;
                   schema:isPartOf <https://en.wikipedia.org/> .
          BIND(REPLACE(STR(?article), "https://en.wikipedia.org/wiki/", "") AS ?directorWikipediaTitle)
        }
      } LIMIT 1
    `;

    const sparqlUrl = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    const sparqlRes = await fetchWithRetry(sparqlUrl, 2, 1000, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
    });

    if (!sparqlRes.ok) {
      cacheSet(cacheKey, null);
      return null;
    }

    const sparqlData: {
      results: {
        bindings: Array<{
          directorLabel?: { value: string };
          directorWikipediaTitle?: { value: string };
        }>;
      };
    } = await sparqlRes.json();

    const binding = sparqlData.results.bindings[0];
    if (!binding?.directorLabel?.value) {
      cacheSet(cacheKey, null);
      return null;
    }

    const directorName = binding.directorLabel.value;
    let directorBio = '';

    if (binding.directorWikipediaTitle?.value) {
      try {
        const encoded = encodeURIComponent(binding.directorWikipediaTitle.value);
        const wikiRes = await fetchWithRetry(`${WIKIPEDIA_SUMMARY_URL}/${encoded}`, 2, 500, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (wikiRes.ok) {
          const wikiData: { extract?: string } = await wikiRes.json();
          directorBio = wikiData.extract || '';
        }
      } catch {
        // bio is optional — proceed without it
      }
    }

    const result = { directorName, directorBio };
    cacheSet(cacheKey, result);
    return result;
  } catch {
    cacheSet(cacheKey, null);
    return null;
  }
}
