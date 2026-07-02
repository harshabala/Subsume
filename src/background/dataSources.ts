import { TRAKT_CLIENT_ID } from './trakt';

export type FreeDataSourceId = 'trakt' | 'tvmaze' | 'wikidata';

export interface FreeDataSourceStatus {
  id: FreeDataSourceId;
  configured: boolean;
  working: boolean;
}

const HEALTH_TIMEOUT_MS = 5000;

async function probeUrl(url: string, init?: RequestInit): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkTvMaze(): Promise<boolean> {
  return probeUrl('https://api.tvmaze.com/shows/1');
}

async function checkTrakt(): Promise<boolean> {
  return probeUrl('https://api.trakt.tv/movies/trending?limit=1', {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    },
  });
}

async function checkWikidata(): Promise<boolean> {
  const query = 'SELECT ?item WHERE { ?item wdt:P31 wd:Q11424 } LIMIT 1';
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
  return probeUrl(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'Subsume/1.0 (browser-extension) data-source-health',
    },
  });
}

export async function getFreeDataSourceStatuses(): Promise<FreeDataSourceStatus[]> {
  const [tvmazeWorking, traktWorking, wikidataWorking] = await Promise.all([
    checkTvMaze(),
    checkTrakt(),
    checkWikidata(),
  ]);

  return [
    {
      id: 'tvmaze',
      configured: true,
      working: tvmazeWorking,
    },
    {
      id: 'trakt',
      configured: true,
      working: traktWorking,
    },
    {
      id: 'wikidata',
      configured: true,
      working: wikidataWorking,
    },
  ];
}