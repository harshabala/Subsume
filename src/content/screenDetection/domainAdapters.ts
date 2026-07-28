/**
 * Domain adapters for high-value film/TV/documentary title pages.
 * Precision-oriented — path patterns gate activation.
 */

import {
  detectJsonLdScreenWorks,
  type ScreenDetectionCandidate,
  type ScreenKind,
} from './jsonLdScreen';

export interface ScreenDomainAdapter {
  id: string;
  hostPatterns: string[];
  detect(document: Document, url: URL): ScreenDetectionCandidate[];
}

function hostMatches(hostname: string, patterns: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return patterns.some((p) => {
    const pat = p.toLowerCase().replace(/^www\./, '');
    if (pat.endsWith('.')) {
      // prefix match e.g. "amazon." → amazon.com, amazon.co.uk
      return host === pat.slice(0, -1) || host.startsWith(pat) || host.includes(`.${pat}`);
    }
    return host === pat || host.endsWith(`.${pat}`);
  });
}

function metaContent(doc: Document, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const meta of doc.querySelectorAll('meta')) {
      const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
      if (name === lower) {
        const c = meta.getAttribute('content')?.trim();
        if (c) return c;
      }
    }
  }
  return undefined;
}

function firstHeading(doc: Document): string {
  const h = doc.querySelector('h1');
  return (h?.textContent || '').replace(/\s+/g, ' ').trim();
}

function yearFromText(text: string): number | undefined {
  const m = text.match(/\b(19|20)\d{2}\b/);
  if (!m) return undefined;
  return Number(m[0]);
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[|\-–—•].*$/, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function withAdapterEvidence(
  c: ScreenDetectionCandidate,
  adapterId: string,
  pathHint: string
): ScreenDetectionCandidate {
  return {
    ...c,
    confidence: Math.min(0.98, Math.max(c.confidence, 0.9)),
    providerHint: c.providerHint || adapterId,
    evidence: [
      ...c.evidence,
      { type: 'domain_adapter', value: adapterId, weight: 0.9 },
      { type: 'url_pattern', value: pathHint, weight: 0.8 },
    ],
  };
}

function pageTitleCandidate(
  doc: Document,
  url: URL,
  adapterId: string,
  pathHint: string,
  forceKind?: ScreenKind
): ScreenDetectionCandidate | null {
  const ogTitle = metaContent(doc, 'og:title', 'twitter:title') || '';
  const h1 = firstHeading(doc);
  const docTitle = doc.title || '';
  const raw = ogTitle || h1 || docTitle;
  if (!raw || raw.length < 2) return null;

  const title = cleanTitle(raw);
  if (!title || title.length < 2 || title.length > 120) return null;

  const blob = `${raw} ${docTitle} ${metaContent(doc, 'og:description') || ''}`.toLowerCase();
  let screenKind: ScreenKind = forceKind || 'movie';
  if (!forceKind) {
    if (/\btv series\b|\btv mini\b|\btelevision series\b|\bseason \d|\bepisodes?\b/.test(blob)) {
      screenKind = 'tv';
    } else if (/\bdocumentary\b|\bdocuseries\b/.test(blob)) {
      screenKind = 'documentary';
    }
  }

  const year = yearFromText(raw) ?? yearFromText(docTitle);
  const imageUrl = metaContent(doc, 'og:image', 'twitter:image');

  return {
    medium: screenKind === 'tv' ? 'tv' : 'movie',
    screenKind,
    title,
    year,
    imageUrl,
    sourcePageUrl: url.href,
    confidence: 0.9,
    evidence: [
      { type: 'domain_adapter', value: adapterId, weight: 0.9 },
      { type: 'url_pattern', value: pathHint, weight: 0.85 },
      { type: 'open_graph', value: ogTitle ? 'og:title' : 'h1', weight: 0.7 },
    ],
    providerHint: adapterId,
  };
}

const imdbAdapter: ScreenDomainAdapter = {
  id: 'imdb',
  hostPatterns: ['imdb.com'],
  detect(doc, url) {
    if (!/\/title\/tt\d+/i.test(url.pathname)) return [];

    // IMDb hero subnav is authoritative for title type (TV Series / Documentary)
    const subtext = (
      doc.querySelector('[data-testid="hero-subnav-bar"]')?.textContent ||
      doc.querySelector('.ipc-inline-list')?.textContent ||
      ''
    ).toLowerCase();
    let force: ScreenKind | undefined;
    if (/tv (mini )?series|tv episode/.test(subtext)) force = 'tv';
    else if (/documentary/.test(subtext)) force = 'documentary';

    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) => {
      const upgraded =
        force && force !== c.screenKind
          ? {
              ...c,
              screenKind: force,
              medium: (force === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv',
              confidence: Math.min(0.97, c.confidence + 0.02),
              evidence: [
                ...c.evidence,
                { type: 'domain_adapter', value: `imdb:${force}`, weight: 0.92 },
              ],
            }
          : c;
      return withAdapterEvidence(upgraded, 'imdb', '/title/tt');
    });
    if (fromLd.length) return fromLd;

    const c = pageTitleCandidate(doc, url, 'imdb', '/title/tt', force);
    return c ? [c] : [];
  },
};

const letterboxdAdapter: ScreenDomainAdapter = {
  id: 'letterboxd',
  hostPatterns: ['letterboxd.com'],
  detect(doc, url) {
    if (!/\/film\//i.test(url.pathname)) return [];
    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) =>
      withAdapterEvidence(c, 'letterboxd', '/film/')
    );
    if (fromLd.length) return fromLd;
    const c = pageTitleCandidate(doc, url, 'letterboxd', '/film/');
    // Letterboxd is film-first; only mark documentary via text signals inside pageTitleCandidate
    return c ? [c] : [];
  },
};

const rottenTomatoesAdapter: ScreenDomainAdapter = {
  id: 'rottentomatoes',
  hostPatterns: ['rottentomatoes.com'],
  detect(doc, url) {
    const isTv = /\/tv\//i.test(url.pathname);
    const isMovie = /\/m\//i.test(url.pathname);
    if (!isTv && !isMovie) return [];

    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) =>
      withAdapterEvidence(c, 'rottentomatoes', isTv ? '/tv/' : '/m/')
    );
    if (fromLd.length) {
      return fromLd.map((c) =>
        isTv
          ? { ...c, medium: 'tv' as const, screenKind: 'tv' as const }
          : c
      );
    }
    const c = pageTitleCandidate(
      doc,
      url,
      'rottentomatoes',
      isTv ? '/tv/' : '/m/',
      isTv ? 'tv' : undefined
    );
    return c ? [c] : [];
  },
};

const wikipediaScreenAdapter: ScreenDomainAdapter = {
  id: 'wikipedia_screen',
  hostPatterns: ['wikipedia.org'],
  detect(doc, url) {
    if (!/\/wiki\//i.test(url.pathname)) return [];
    if (/\/wiki\/(File|Category|Help|Wikipedia|Template|Special|Talk|User):/i.test(url.pathname)) {
      return [];
    }

    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) =>
      withAdapterEvidence(c, 'wikipedia', '/wiki/')
    );
    if (fromLd.length) return fromLd;

    const title = doc.title || firstHeading(doc);
    const filmMatch = title.match(/^(.*?)\s*\((?:\d{4} )?(?:film|movie|documentary)/i);
    const tvMatch = title.match(/^(.*?)\s*\((?:\d{4} )?(?:TV series|television series)/i);
    if (!filmMatch && !tvMatch) return [];

    // textContent often concatenates cells ("GenreDocumentary") — don't rely on \b alone
    const infobox = (doc.querySelector('.infobox')?.textContent || '').replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    );
    const lead = (doc.querySelector('#mw-content-text p')?.textContent || '').slice(0, 600);
    const wikiBlob = `${title}\n${infobox}\n${lead}`;
    let kind: ScreenKind = tvMatch ? 'tv' : 'movie';
    if (/documentary/i.test(wikiBlob)) {
      kind = 'documentary';
    }

    const name = cleanTitle((tvMatch || filmMatch)![1]);
    if (!name) return [];

    return [
      {
        medium: kind === 'tv' ? 'tv' : 'movie',
        screenKind: kind,
        title: name,
        year: yearFromText(title),
        imageUrl: metaContent(doc, 'og:image'),
        sourcePageUrl: url.href,
        confidence: 0.87,
        evidence: [
          { type: 'domain_adapter', value: 'wikipedia', weight: 0.85 },
          { type: 'url_pattern', value: '/wiki/', weight: 0.7 },
          { type: 'page_title', value: title.slice(0, 80), weight: 0.75 },
        ],
        providerHint: 'wikipedia',
      },
    ];
  },
};

const netflixAdapter: ScreenDomainAdapter = {
  id: 'netflix',
  hostPatterns: ['netflix.com'],
  detect(doc, url) {
    const ogType = (metaContent(doc, 'og:type') || '').toLowerCase();
    const bodyHint = (doc.body?.textContent || '').slice(0, 2000).toLowerCase();
    let force: ScreenKind | undefined;
    if (
      ogType.includes('tv') ||
      /tv series|seasons?|episodes?/.test(bodyHint) ||
      /tv_show|tvseries/.test(ogType)
    ) {
      force = 'tv';
    } else if (/documentary|docuseries/.test(bodyHint)) {
      force = 'documentary';
    }

    // Title pages vary; accept /title/ or watch pages
    if (!/\/(title|watch)\//i.test(url.pathname) && !ogType.includes('video')) {
      const ld = detectJsonLdScreenWorks(doc, url.href);
      return ld.map((c) => withAdapterEvidence(c, 'netflix', url.pathname));
    }
    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) =>
      withAdapterEvidence(c, 'netflix', '/title/')
    );
    if (fromLd.length) return fromLd;
    const c = pageTitleCandidate(doc, url, 'netflix', url.pathname, force);
    return c ? [c] : [];
  },
};

/** Amazon Prime Video / freevee title pages (not /dp/ book ASINs). */
const primeVideoAdapter: ScreenDomainAdapter = {
  id: 'primevideo',
  hostPatterns: ['amazon.', 'primevideo.com'],
  detect(doc, url) {
    const path = url.pathname;
    const isVideoPath =
      /\/(gp\/video|video\/detail|detail)\//i.test(path) ||
      hostMatches(url.hostname, ['primevideo.com']);
    if (!isVideoPath) return [];

    const fromLd = detectJsonLdScreenWorks(doc, url.href).map((c) =>
      withAdapterEvidence(c, 'primevideo', path)
    );
    if (fromLd.length) return fromLd;

    const ogType = (metaContent(doc, 'og:type') || '').toLowerCase();
    let force: ScreenKind | undefined;
    if (ogType.includes('tv')) force = 'tv';
    const c = pageTitleCandidate(doc, url, 'primevideo', path, force);
    return c ? [c] : [];
  },
};

export const SCREEN_DOMAIN_ADAPTERS: ScreenDomainAdapter[] = [
  imdbAdapter,
  letterboxdAdapter,
  rottenTomatoesAdapter,
  wikipediaScreenAdapter,
  netflixAdapter,
  primeVideoAdapter,
];

export function detectViaScreenDomainAdapters(
  doc: Document,
  url: URL
): ScreenDetectionCandidate[] {
  const host = url.hostname;
  const out: ScreenDetectionCandidate[] = [];
  for (const adapter of SCREEN_DOMAIN_ADAPTERS) {
    if (!hostMatches(host, adapter.hostPatterns)) continue;
    try {
      out.push(...adapter.detect(doc, url));
    } catch {
      /* adapter isolation */
    }
  }
  return out;
}
