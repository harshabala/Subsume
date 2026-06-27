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
