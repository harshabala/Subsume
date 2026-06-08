/**
 * DOM scanner that finds elements likely to reference movies or TV shows.
 *
 * Heuristics:
 *  1. <img> with alt / title that matches a "Title (Year)" pattern.
 *  2. <a> whose text or href references known platforms or title patterns.
 *  3. Text nodes in headings / paragraphs that match "Title (Year)" or
 *     appear near keywords like "movie", "series", "film", "Netflix", "Prime".
 *
 * Detected elements are tagged with `data-subsume-id` so they are not
 * re-processed on subsequent scans or by the MutationObserver.
 */

import { PosterMatch, MessageType } from '@/shared/types';
import { sendMessage } from '@/shared/messages';
import { isPosterAspectRatioImage } from './catalogDetector';

// ─── Constants ───────────────────────────────────────────────────────

const SUBSUME_ATTR = 'data-subsume-id';

const TITLE_PATTERNS = [
  { re: /^(.{3,60})\s*\((\d{4})\)$/, titleIdx: 1, yearIdx: 2 },
  { re: /^(.{3,60})\s*[-–—]\s*(\d{4})$/, titleIdx: 1, yearIdx: 2 },
  { re: /^(.{3,60})\s*:\s*(\d{4})$/, titleIdx: 1, yearIdx: 2 },
  { re: /^(.{3,60})\s*\((\d{4})\)\s*[—–-]\s*.+$/, titleIdx: 1, yearIdx: 2 },
  { re: /^(.{3,60})\s*\([^)]*(?:TV Series|TV Mini Series|TV Movie)\s*(\d{4}).*\)$/i, titleIdx: 1, yearIdx: 2 },
  { re: /^(.{3,60})\s*\((\d{4})\s+(?:TV series|TV show|Movie|Film).*\)$/i, titleIdx: 1, yearIdx: 2 },
];

const SEASON_EPISODE_RE = /\b[Ss]\d{1,2}[Ee]\d{1,2}\b/;

const PLATFORM_KEYWORDS = [
  'netflix', 'prime video', 'amazon prime', 'disney+', 'hulu',
  'hbo', 'apple tv', 'hotstar', 'paramount+', 'peacock',
];

const MEDIA_KEYWORDS = [
  'movie', 'film', 'series', 'tv show', 'television',
  'season', 'episode', 'imdb', 'rotten tomatoes',
];

/** Elements we skip entirely */
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'NAV', 'FOOTER',
  'HEADER', 'ASIDE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CODE', 'PRE',
]);

const SKIP_SELECTORS = 'nav, footer, header, aside, [role="navigation"], [role="banner"], .nav, .footer, .header, .sidebar, #nav, #footer, #header';

// ─── Helpers ─────────────────────────────────────────────────────────

let nextId = 1;
function mintId(): string {
  return `sub-${nextId++}`;
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isInsideSkipZone(el: Element): boolean {
  return el.closest(SKIP_SELECTORS) !== null;
}

function extractTitleAndYear(text: string): { title: string; yearGuess?: number } | null {
  for (const pattern of TITLE_PATTERNS) {
    const match = text.match(pattern.re);
    if (match && match[pattern.titleIdx].length >= 3) {
      return {
        title: match[pattern.titleIdx].trim(),
        yearGuess: parseInt(match[pattern.yearIdx], 10),
      };
    }
  }
  return null;
}

export interface DetectedTitle {
  element: HTMLElement;
  id: string;
  title: string;
  yearGuess?: number;
}

// ─── Scanners ────────────────────────────────────────────────────────

function scanPageImages(root: Element): DetectedTitle[] {
  const results: DetectedTitle[] = [];
  const images = root.querySelectorAll<HTMLImageElement>('img[alt], img[title]');

  for (const img of images) {
    if (img.hasAttribute(SUBSUME_ATTR)) continue;
    if (!isVisible(img) || isInsideSkipZone(img)) continue;

    const text = (img.alt || img.title || '').trim();
    const extracted = extractTitleAndYear(text);
    if (extracted) {
      const id = mintId();
      img.setAttribute(SUBSUME_ATTR, id);
      results.push({
        element: img,
        id,
        title: extracted.title,
        yearGuess: extracted.yearGuess,
      });
    }
  }
  return results;
}

function scanLinks(root: Element): DetectedTitle[] {
  const results: DetectedTitle[] = [];
  const links = root.querySelectorAll<HTMLAnchorElement>('a');

  for (const link of links) {
    if (link.hasAttribute(SUBSUME_ATTR)) continue;
    if (!isVisible(link) || isInsideSkipZone(link)) continue;

    const text = (link.textContent || '').trim();
    if (text.length < 3 || text.length > 80) continue;

    const href = link.href.toLowerCase();

    // Check for known platform links
    const hasPlatformHref = PLATFORM_KEYWORDS.some((kw) => href.includes(kw));
    // Check for IMDb-style URLs
    const isImdbLink = /imdb\.com\/title\//i.test(href);

    if (hasPlatformHref || isImdbLink) {
      const extracted = extractTitleAndYear(text);
      const id = mintId();
      link.setAttribute(SUBSUME_ATTR, id);
      results.push({
        element: link,
        id,
        title: extracted ? extracted.title : text,
        yearGuess: extracted ? extracted.yearGuess : undefined,
      });
      continue;
    }

    // Check text node for title pattern near media keywords
    const parentText = (link.parentElement?.textContent || '').toLowerCase();
    const hasMediaKeyword = MEDIA_KEYWORDS.some((kw) => parentText.includes(kw));

    if (hasMediaKeyword) {
      const extracted = extractTitleAndYear(text);
      if (extracted) {
        const id = mintId();
        link.setAttribute(SUBSUME_ATTR, id);
        results.push({
          element: link,
          id,
          title: extracted.title,
          yearGuess: extracted.yearGuess,
        });
      }
    }
  }
  return results;
}

function scanHeadings(root: Element): DetectedTitle[] {
  const results: DetectedTitle[] = [];
  const headings = root.querySelectorAll<HTMLElement>('h1, h2, h3, h4');

  for (const h of headings) {
    if (h.hasAttribute(SUBSUME_ATTR)) continue;
    if (!isVisible(h) || isInsideSkipZone(h)) continue;

    const text = (h.textContent || '').trim();
    const extracted = extractTitleAndYear(text);

    if (extracted) {
      // Also check if surrounding text has media keywords
      const sectionText = (h.parentElement?.textContent || '').toLowerCase();
      const hasMediaContext = MEDIA_KEYWORDS.some((kw) => sectionText.includes(kw));

      if (hasMediaContext) {
        const id = mintId();
        h.setAttribute(SUBSUME_ATTR, id);
        results.push({
          element: h,
          id,
          title: extracted.title,
          yearGuess: extracted.yearGuess,
        });
      }
    }
  }
  return results;
}

// ─── Main Scanner ────────────────────────────────────────────────────

export function scanPage(root: Element = document.body): DetectedTitle[] {
  const results: DetectedTitle[] = [];
  results.push(...scanPageImages(root));
  results.push(...scanLinks(root));
  results.push(...scanHeadings(root));
  return results;
}

// ─── Mutation Observer ───────────────────────────────────────────────

let observer: MutationObserver | null = null;
let pendingElements: Element[] = [];
let scanTimeout: ReturnType<typeof setTimeout> | null = null;

function filterNestedElements(elements: Element[]): Element[] {
  // Use a Set for O(1) ancestor lookups instead of O(n) Array.includes,
  // avoiding the O(n²) worst-case on large mutation batches.
  const elementSet = new Set<Element>(elements);
  return elements.filter((el) => {
    let parent = el.parentElement;
    while (parent) {
      if (elementSet.has(parent)) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  });
}

function processPendingElements(onDetected: (titles: DetectedTitle[]) => void) {
  if (pendingElements.length === 0) return;

  // 1. Filter out disconnected nodes
  let activeElements = pendingElements.filter((el) => document.body.contains(el));

  // 2. Filter out nested elements to prevent duplicate scans
  activeElements = filterNestedElements(activeElements);

  pendingElements = [];
  scanTimeout = null;

  if (activeElements.length === 0) return;

  const titles: DetectedTitle[] = [];
  for (const node of activeElements) {
    titles.push(...scanPage(node));
  }

  if (titles.length > 0) {
    onDetected(titles);
  }
}

const TMDB_IMAGE_CDN = 'image.tmdb.org/t/p/';

const POSTER_CDN_PATTERNS = [
  'image.tmdb.org',
  'm.media-amazon.com/images',
  'static.tvmaze.com/uploads',
  'artworks.thetvdb.com',
] as const;

function extractTmdbIdFromSrc(src: string, img?: HTMLImageElement): { tmdbId: string; mediaType: 'movie' | 'tv' } | null {
  if (!src.includes(TMDB_IMAGE_CDN)) return null;

  const parts = src.split('/');
  const lastPart = parts[parts.length - 1];
  if (!lastPart) return null;

  const tmdbId = lastPart.split('.')[0];
  if (!tmdbId || isNaN(parseInt(tmdbId, 10))) return null;

  let mediaType: 'movie' | 'tv' = 'movie';

  if (img) {
    const anchor = img.closest('a');
    if (anchor) {
      const href = anchor.href.toLowerCase();
      if (href.includes('/movie/')) {
        mediaType = 'movie';
      } else if (href.includes('/tv/')) {
        mediaType = 'tv';
      }
    }
  }

  return { tmdbId, mediaType };
}

export interface ScanImagesOptions {
  /** When true (catalog pages), accept poster-aspect images even without CDN match. */
  catalogMode?: boolean;
}

function looksLikePosterImage(img: HTMLImageElement, catalogMode = false): boolean {
  if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) {
    return false;
  }

  if (SKIP_TAGS.has(img.tagName) || isInsideSkipZone(img)) {
    return false;
  }

  if (img.hasAttribute('data-subsume-poster-scanned')) {
    return false;
  }

  if (catalogMode && isPosterAspectRatioImage(img)) {
    return true;
  }

  const matchesCDN = POSTER_CDN_PATTERNS.some((pattern) => img.src.includes(pattern));
  if (matchesCDN) return true;

  const altText = (img.alt || '').trim();
  const altWords = altText.split(/\s+/).filter(Boolean);
  if (altWords.length >= 3 && /^.+\(\d{4}\)$/.test(altText)) {
    return true;
  }

  if (altWords.length >= 2) {
    let parent = img.parentElement;
    let depth = 0;
    while (parent && depth < 2) {
      if (parent.textContent && parent.textContent.includes(altText)) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }
  }

  const rect = img.getBoundingClientRect();
  const width = rect.width || img.width;
  const height = rect.height || img.height;
  if (width >= 80 && height >= 100 && altText.length >= 4) {
    return true;
  }

  return false;
}

export async function scanImages(
  sensitivity: 'low' | 'medium' | 'high',
  onMatch: (img: HTMLImageElement, match: PosterMatch) => void,
  // Scope scan to a specific root element (e.g. a mutated subtree) to avoid
  // re-querying the entire document on every MutationObserver callback.
  root: Element = document.body,
  options: ScanImagesOptions = {}
): Promise<void> {
  const catalogMode = options.catalogMode ?? false;
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  // Also include the root itself if it IS an img
  if (root instanceof HTMLImageElement) images.unshift(root);
  const candidateImages = images.filter((img) => looksLikePosterImage(img, catalogMode));

  if (candidateImages.length === 0) return;

  const BATCH_SIZE = 5;
  for (let i = 0; i < candidateImages.length; i += BATCH_SIZE) {
    const batch = candidateImages.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (img) => {
        img.setAttribute('data-subsume-poster-scanned', 'pending');

        const isTmdbCdn = img.src.includes(TMDB_IMAGE_CDN);
        const altText = (img.alt || '').trim();
        const altMatchesRegex = /^.+\(\d{4}\)$/.test(altText);

        let strategy: 'tmdb-cdn' | 'alt-text' | 'ancestor-text' | null = null;

        if (isTmdbCdn) {
          strategy = 'tmdb-cdn';
        } else if (catalogMode && altText) {
          strategy = 'alt-text';
        } else if (catalogMode) {
          strategy = 'ancestor-text';
        } else if (sensitivity === 'medium' && altMatchesRegex) {
          strategy = 'alt-text';
        } else if (sensitivity === 'high') {
          if (altText) {
            strategy = 'alt-text';
          } else {
            strategy = 'ancestor-text';
          }
        }

        if (!strategy) {
          img.setAttribute('data-subsume-poster-scanned', 'skip');
          return;
        }

        try {
          let res: any = null;

          if (strategy === 'tmdb-cdn') {
            const parsed = extractTmdbIdFromSrc(img.src, img);
            if (!parsed) {
              img.setAttribute('data-subsume-poster-scanned', 'skip');
              return;
            }
            res = await sendMessage<any, { match: PosterMatch | null }>(MessageType.RESOLVE_POSTER, {
              strategy: 'tmdb-cdn',
              tmdbId: parsed.tmdbId,
              mediaType: parsed.mediaType,
            });
          } else if (strategy === 'alt-text') {
            res = await sendMessage<any, { match: PosterMatch | null }>(MessageType.RESOLVE_POSTER, {
              strategy: 'alt-text',
              query: altText,
            });
          } else if (strategy === 'ancestor-text') {
            let parent = img.parentElement;
            let depth = 0;
            let shortestText = '';
            while (parent && depth < 2) {
              const text = (parent.textContent || '').trim();
              if (text) {
                if (!shortestText || text.length < shortestText.length) {
                  shortestText = text;
                }
              }
              parent = parent.parentElement;
              depth++;
            }

            // Security: clamp to 60 chars and require ≥2 non-trivial words to
            // prevent raw page text (PII, private messages, etc.) being sent to
            // the TMDb API as a search query.
            const clampedText = shortestText.slice(0, 60).trim();
            const wordCount = clampedText.split(/\s+/).filter((w) => w.length > 1).length;
            if (!clampedText || wordCount < 2) {
              img.setAttribute('data-subsume-poster-scanned', 'skip');
              return;
            }

            res = await sendMessage<any, { match: PosterMatch | null }>(MessageType.RESOLVE_POSTER, {
              strategy: 'ancestor-text',
              query: clampedText,
            });
          }


          if (res && res.success && res.data && res.data.match) {
            img.setAttribute('data-subsume-poster-scanned', 'matched');
            img.setAttribute('data-subsume-poster-id', res.data.match.tmdbId);
            onMatch(img, res.data.match);
          } else {
            img.setAttribute('data-subsume-poster-scanned', 'skip');
          }
        } catch (err) {
          console.error('[Subsume] Failed to resolve poster image:', err);
          img.setAttribute('data-subsume-poster-scanned', 'skip');
        }
      })
    );

    if (i + BATCH_SIZE < candidateImages.length) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

let imageScanCallback: ((img: HTMLImageElement, match: PosterMatch) => void) | null = null;
let imageSensitivity: 'low' | 'medium' | 'high' = 'medium';
let imageCatalogMode = false;
let imageScanTimeout: ReturnType<typeof setTimeout> | null = null;

export function setImageScanConfig(
  sensitivity: 'low' | 'medium' | 'high',
  onMatch: (img: HTMLImageElement, match: PosterMatch) => void,
  catalogMode = false
) {
  imageSensitivity = sensitivity;
  imageScanCallback = onMatch;
  imageCatalogMode = catalogMode;
}

export function startObserving(
  onDetected: (titles: DetectedTitle[]) => void
): void {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    let hasNewElements = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element && !SKIP_TAGS.has(node.tagName)) {
          pendingElements.push(node);
          hasNewElements = true;
        }
      }
    }

    if (hasNewElements) {
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        processPendingElements(onDetected);
      }, 150);
    }

    // Debounced poster image scanning (separate 500ms timer) scoped to the
    // mutated subtree only — avoids re-querying the full document on every batch.
    const mutatedRoots: Element[] = [];
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeName === 'IMG' && n instanceof HTMLImageElement) {
          mutatedRoots.push(n);
        } else if (n instanceof Element && n.querySelector('img')) {
          mutatedRoots.push(n);
        }
      }
    }

    if (mutatedRoots.length > 0 && imageScanCallback) {
      if (imageScanTimeout) clearTimeout(imageScanTimeout);
      imageScanTimeout = setTimeout(() => {
        // Scan each mutated root independently to stay focused on new content.
        Promise.all(
          mutatedRoots.map((root) =>
            scanImages(imageSensitivity, imageScanCallback!, root, {
              catalogMode: imageCatalogMode,
            }).catch((err) => {
              console.error('[Subsume] Debounced scanImages failed:', err);
            })
          )
        );
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

export function stopObserving(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (scanTimeout) {
    clearTimeout(scanTimeout);
    scanTimeout = null;
  }
  if (imageScanTimeout) {
    clearTimeout(imageScanTimeout);
    imageScanTimeout = null;
  }
  pendingElements = [];
}
