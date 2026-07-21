/**
 * Stage C — Domain adapter registry for high-value book pages.
 * Prefer structured metadata over brittle CSS selectors.
 */

import type { DetectionCandidate } from '@/shared/catalogTypes';
import {
  extractIsbnCandidates,
  isValidIsbn10,
  isValidIsbn13,
  normalizeIsbn,
  toIsbn13,
} from '@/shared/isbn';
import { detectJsonLdBooks } from './jsonLdBooks';
import { extractIsbnsFromDocument } from './isbnContext';

export interface BookDomainAdapter {
  id: string;
  hostPatterns: string[];
  detect(document: Document, url: URL): DetectionCandidate[];
}

function hostMatches(hostname: string, patterns: string[]): boolean {
  const host = hostname.toLowerCase();
  return patterns.some((p) => {
    const pat = p.toLowerCase();
    if (pat.endsWith('.')) {
      // prefix match e.g. "books.google." → books.google.com, books.google.co.uk
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

function ogBookSignals(doc: Document): boolean {
  const type = (metaContent(doc, 'og:type', 'og:type') || '').toLowerCase();
  if (type.includes('book')) return true;
  const booksAuthors = metaContent(doc, 'books:author', 'book:author');
  const booksIsbn = metaContent(doc, 'books:isbn', 'book:isbn');
  return Boolean(booksAuthors || booksIsbn);
}

function firstHeading(doc: Document): string {
  const h = doc.querySelector('h1');
  return (h?.textContent || '').replace(/\s+/g, ' ').trim();
}

function collectPageIsbns(doc: Document, requireContext: boolean): {
  isbn10: string[];
  isbn13: string[];
} {
  return extractIsbnsFromDocument(doc, { requireContext });
}

function splitIsbns(raws: string[]): { isbn10: string[]; isbn13: string[] } {
  const isbn10: string[] = [];
  const isbn13: string[] = [];
  const s10 = new Set<string>();
  const s13 = new Set<string>();
  for (const raw of raws) {
    const n = normalizeIsbn(raw);
    if (n.length === 10 && isValidIsbn10(n) && !s10.has(n)) {
      s10.add(n);
      isbn10.push(n);
      const c = toIsbn13(n);
      if (c && !s13.has(c)) {
        s13.add(c);
        isbn13.push(c);
      }
    } else if (n.length === 13 && isValidIsbn13(n) && !s13.has(n)) {
      s13.add(n);
      isbn13.push(n);
    }
  }
  return { isbn10, isbn13 };
}

function baseFromStructured(
  doc: Document,
  url: URL,
  providerHint: string
): DetectionCandidate[] {
  const fromLd = detectJsonLdBooks(doc, url.href).map((c) => ({
    ...c,
    confidence: Math.max(c.confidence, 0.9),
    providerHint: c.providerHint || providerHint,
    evidence: [
      ...c.evidence,
      { type: 'domain_adapter' as const, value: providerHint, weight: 0.85 },
      { type: 'url_pattern' as const, value: url.hostname, weight: 0.7 },
    ],
  }));
  if (fromLd.length) return fromLd;

  const title =
    metaContent(doc, 'og:title', 'twitter:title') || firstHeading(doc) || doc.title || '';
  const cleanTitle = title.replace(/\s*[|\-–—].*$/, '').trim();
  if (!cleanTitle) return [];

  const authorMeta =
    metaContent(doc, 'books:author', 'book:author', 'author', 'citation_author') || '';
  const authors = authorMeta
    ? authorMeta
        .split(/,|;|\band\b/i)
        .map((a) => a.trim())
        .filter(Boolean)
    : undefined;

  const isbnMeta = metaContent(doc, 'books:isbn', 'book:isbn', 'citation_isbn');
  const fromMeta = isbnMeta ? splitIsbns([isbnMeta]) : { isbn10: [], isbn13: [] };
  const fromPage = collectPageIsbns(doc, false);
  const isbn10 = [...new Set([...fromMeta.isbn10, ...fromPage.isbn10])];
  const isbn13 = [...new Set([...fromMeta.isbn13, ...fromPage.isbn13])];
  const imageUrl = metaContent(doc, 'og:image', 'twitter:image');

  const hasIsbn = isbn10.length > 0 || isbn13.length > 0;
  const confidence = hasIsbn ? 0.92 : authors?.length ? 0.88 : 0.86;

  return [
    {
      medium: 'book',
      title: cleanTitle,
      authorOrCreator: authors,
      isbn10: isbn10.length ? isbn10 : undefined,
      isbn13: isbn13.length ? isbn13 : undefined,
      imageUrl,
      sourcePageUrl: url.href,
      confidence,
      evidence: [
        { type: 'domain_adapter', value: providerHint, weight: 0.85 },
        { type: 'url_pattern', value: url.hostname, weight: 0.7 },
        ...(hasIsbn
          ? [{ type: 'isbn' as const, value: isbn13[0] || isbn10[0], weight: 0.85 }]
          : []),
        ...(ogBookSignals(doc)
          ? [{ type: 'open_graph' as const, value: 'book', weight: 0.7 }]
          : []),
      ],
      providerHint,
    },
  ];
}

const openLibraryAdapter: BookDomainAdapter = {
  id: 'openlibrary',
  hostPatterns: ['openlibrary.org'],
  detect(doc, url) {
    // Work/edition pages only for precision
    if (!/\/(works|books|isbn)\//i.test(url.pathname)) {
      // Still try JSON-LD if present
      const ld = detectJsonLdBooks(doc, url.href);
      return ld.map((c) => ({
        ...c,
        providerHint: 'openlibrary',
        confidence: Math.max(c.confidence, 0.88),
        evidence: [
          ...c.evidence,
          { type: 'domain_adapter' as const, value: 'openlibrary', weight: 0.8 },
        ],
      }));
    }
    return baseFromStructured(doc, url, 'openlibrary');
  },
};

const googleBooksAdapter: BookDomainAdapter = {
  id: 'google_books',
  hostPatterns: ['books.google.'],
  detect(doc, url) {
    return baseFromStructured(doc, url, 'googlebooks');
  },
};

const goodreadsAdapter: BookDomainAdapter = {
  id: 'goodreads',
  hostPatterns: ['goodreads.com'],
  detect(doc, url) {
    // Public book pages: /book/show/...
    if (!/\/book\//i.test(url.pathname)) return [];

    const candidates = baseFromStructured(doc, url, 'goodreads');
    if (candidates.length) return candidates;

    // Goodreads often exposes title in #bookTitle and author in .authorName
    const titleEl =
      doc.querySelector('#bookTitle, h1.Text__title1, [data-testid="bookTitle"]') ||
      doc.querySelector('h1');
    const title = (titleEl?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!title) return [];

    const authorEls = doc.querySelectorAll(
      '.authorName, a.ContributorLink, [data-testid="name"], .ContributorLink__name'
    );
    const authors = Array.from(authorEls)
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 5);

    const { isbn10, isbn13 } = collectPageIsbns(doc, false);
    const imageUrl =
      metaContent(doc, 'og:image') ||
      (doc.querySelector('.BookCover__image img, #coverImage') as HTMLImageElement | null)?.src;

    return [
      {
        medium: 'book',
        title,
        authorOrCreator: authors.length ? authors : undefined,
        isbn10: isbn10.length ? isbn10 : undefined,
        isbn13: isbn13.length ? isbn13 : undefined,
        imageUrl: imageUrl || undefined,
        sourcePageUrl: url.href,
        confidence: isbn13.length || isbn10.length ? 0.93 : 0.88,
        evidence: [
          { type: 'domain_adapter', value: 'goodreads', weight: 0.9 },
          { type: 'url_pattern', value: '/book/', weight: 0.8 },
        ],
        providerHint: 'goodreads',
      },
    ];
  },
};

const amazonAdapter: BookDomainAdapter = {
  id: 'amazon',
  hostPatterns: ['amazon.'],
  detect(doc, url) {
    // Product pages with /dp/ or /gp/product/
    if (!/\/(dp|gp\/product)\//i.test(url.pathname)) return [];

    // Prefer book signals: product group, breadcrumb, or book-ish meta
    const bodyText = (doc.body?.innerText || '').slice(0, 8000);
    const isBookish =
      ogBookSignals(doc) ||
      /(?:books|literature|fiction|nonfiction|kindle|paperback|hardcover)/i.test(bodyText) ||
      Boolean(doc.querySelector('#add-to-ebooks-cart, #booksTitle, #titleSpanId, #bylineInfo'));

    if (!isBookish) {
      // Still accept if valid ISBN present on page
      const isbns = collectPageIsbns(doc, true);
      if (!isbns.isbn10.length && !isbns.isbn13.length) return [];
    }

    const title =
      metaContent(doc, 'og:title') ||
      (doc.querySelector('#productTitle, #title, #ebooksProductTitle')?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim() ||
      firstHeading(doc);

    if (!title) return [];

    const byline = (doc.querySelector('#bylineInfo, .author')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
    const authors = byline
      ? byline
          .replace(/^(by|author[s]?)\s*:?\s*/i, '')
          .split(/,|;|\band\b|\(/i)
          .map((a) => a.replace(/\s*\(.*$/, '').trim())
          .filter((a) => a && !/^(visit|follow|see all)/i.test(a))
          .slice(0, 5)
      : undefined;

    const { isbn10, isbn13 } = collectPageIsbns(doc, false);
    // ASIN is not ISBN — only keep validated ISBNs
    const imageUrl = metaContent(doc, 'og:image');

    return [
      {
        medium: 'book',
        title: title.replace(/\s*[|\-–—].*$/, '').trim(),
        authorOrCreator: authors?.length ? authors : undefined,
        isbn10: isbn10.length ? isbn10 : undefined,
        isbn13: isbn13.length ? isbn13 : undefined,
        imageUrl,
        sourcePageUrl: url.href,
        confidence: isbn13.length || isbn10.length ? 0.9 : 0.86,
        evidence: [
          { type: 'domain_adapter', value: 'amazon', weight: 0.85 },
          { type: 'url_pattern', value: '/dp/', weight: 0.75 },
        ],
        providerHint: 'amazon',
      },
    ];
  },
};

const WIKI_BOOK_HINTS =
  /\b(novel|novella|book by|written by|author|isbn|publisher|publication|first published|literary|fiction|non-fiction|nonfiction|memoir|essay collection)\b/i;

const wikipediaAdapter: BookDomainAdapter = {
  id: 'wikipedia',
  hostPatterns: ['wikipedia.org'],
  detect(doc, url) {
    if (!/\/wiki\//i.test(url.pathname)) return [];
    // Skip non-article namespaces
    if (/\/wiki\/(File|Category|Help|Wikipedia|Template|Special|Talk|User):/i.test(url.pathname)) {
      return [];
    }

    const infobox = doc.querySelector('.infobox, .infobox-book, table.infobox');
    const infoboxText = infobox?.textContent || '';
    const lead = (doc.querySelector('#mw-content-text p')?.textContent || '').slice(0, 600);
    const pageText = `${infoboxText}\n${lead}`;

    const looksLikeBook =
      WIKI_BOOK_HINTS.test(pageText) ||
      /infobox.*book|book infobox/i.test(infobox?.className || '') ||
      Boolean(infobox?.querySelector('th') && /author|publisher|isbn|publication/i.test(infoboxText));

    if (!looksLikeBook) return [];

    const title =
      (doc.querySelector('#firstHeading, h1')?.textContent || '').replace(/\s+/g, ' ').trim() ||
      decodeURIComponent(url.pathname.replace(/^\/wiki\//, '')).replace(/_/g, ' ');

    if (!title) return [];

    // Author from infobox row
    let authors: string[] | undefined;
    if (infobox) {
      for (const row of infobox.querySelectorAll('tr')) {
        const th = (row.querySelector('th')?.textContent || '').toLowerCase();
        if (/^author/.test(th) || th.includes('author')) {
          const td = (row.querySelector('td')?.textContent || '')
            .replace(/\s+/g, ' ')
            .replace(/\[.*?\]/g, '')
            .trim();
          if (td) {
            authors = td
              .split(/,|;|\band\b/i)
              .map((a) => a.trim())
              .filter(Boolean)
              .slice(0, 5);
          }
          break;
        }
      }
    }

    const rawIsbns = extractIsbnCandidates(infoboxText || pageText);
    const { isbn10, isbn13 } = splitIsbns(rawIsbns);
    const imageUrl =
      (doc.querySelector('.infobox img') as HTMLImageElement | null)?.src ||
      metaContent(doc, 'og:image');

    return [
      {
        medium: 'book',
        title,
        authorOrCreator: authors,
        isbn10: isbn10.length ? isbn10 : undefined,
        isbn13: isbn13.length ? isbn13 : undefined,
        imageUrl: imageUrl || undefined,
        sourcePageUrl: url.href,
        confidence: isbn13.length || isbn10.length ? 0.9 : authors?.length ? 0.86 : 0.8,
        evidence: [
          { type: 'domain_adapter', value: 'wikipedia', weight: 0.8 },
          { type: 'url_pattern', value: 'wikipedia', weight: 0.65 },
        ],
        providerHint: 'wikipedia',
      },
    ];
  },
};

export const BOOK_DOMAIN_ADAPTERS: BookDomainAdapter[] = [
  openLibraryAdapter,
  googleBooksAdapter,
  goodreadsAdapter,
  amazonAdapter,
  wikipediaAdapter,
];

/** Run all adapters whose hostPatterns match the URL host. */
export function detectViaDomainAdapters(doc: Document, url: URL): DetectionCandidate[] {
  const results: DetectionCandidate[] = [];
  for (const adapter of BOOK_DOMAIN_ADAPTERS) {
    if (!hostMatches(url.hostname, adapter.hostPatterns)) continue;
    try {
      const found = adapter.detect(doc, url);
      results.push(...found);
    } catch {
      // Adapter failures must not break the pipeline
    }
  }
  return results;
}
