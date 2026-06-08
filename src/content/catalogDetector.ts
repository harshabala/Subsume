/**
 * Detects catalog/grid regions on pages that list movies or TV shows
 * (Netflix browse, Letterboxd lists, IMDb charts, Prime Video, etc.).
 */

export interface CatalogRegion {
  element: HTMLElement;
  confidence: 'high' | 'medium';
  posterCount: number;
}

const CATALOG_CONTAINER_SELECTORS = [
  '[class*="grid"]',
  '[class*="list"]',
  '[class*="row"]',
  '[data-testid*="card"]',
] as const;

const CATALOG_URL_PATTERNS: Array<{ pattern: RegExp; hint: 'high' | 'medium' }> = [
  { pattern: /netflix\.com\/browse/i, hint: 'high' },
  { pattern: /letterboxd\.com/i, hint: 'medium' },
  { pattern: /imdb\.com\/chart/i, hint: 'high' },
  { pattern: /primevideo\.com/i, hint: 'medium' },
];

const MIN_POSTER_WIDTH = 60;
const MIN_POSTER_COUNT = 4;
const POSTER_RATIO_MIN = 0.55;
const POSTER_RATIO_MAX = 0.78;

function getImageDimensions(img: HTMLImageElement): { width: number; height: number } {
  const rect = img.getBoundingClientRect();
  const width =
    rect.width ||
    img.width ||
    parseInt(img.getAttribute('width') || '0', 10) ||
    0;
  const height =
    rect.height ||
    img.height ||
    parseInt(img.getAttribute('height') || '0', 10) ||
    0;
  return { width, height };
}

/** Poster-like image: ~2:3 aspect ratio, at least 60px wide. */
export function isPosterAspectRatioImage(img: HTMLImageElement): boolean {
  if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) {
    return false;
  }

  const { width, height } = getImageDimensions(img);
  if (width < MIN_POSTER_WIDTH || height <= 0) {
    return false;
  }

  const ratio = width / height;
  return ratio >= POSTER_RATIO_MIN && ratio <= POSTER_RATIO_MAX;
}

function countPosterLikeImages(container: Element): number {
  let count = 0;
  for (const img of container.querySelectorAll<HTMLImageElement>('img')) {
    if (isPosterAspectRatioImage(img)) {
      count++;
    }
  }
  return count;
}

function getUrlCatalogHint(): 'high' | 'medium' | null {
  const href = typeof window !== 'undefined' ? window.location.href : '';
  for (const { pattern, hint } of CATALOG_URL_PATTERNS) {
    if (pattern.test(href)) {
      return hint;
    }
  }
  return null;
}

function scoreConfidence(posterCount: number, urlHint: 'high' | 'medium' | null): 'high' | 'medium' | null {
  if (posterCount < MIN_POSTER_COUNT) {
    return null;
  }

  if (urlHint === 'high' && posterCount >= MIN_POSTER_COUNT) {
    return 'high';
  }

  if (posterCount >= 6) {
    return 'high';
  }

  if (posterCount >= MIN_POSTER_COUNT && (urlHint === 'medium' || urlHint === 'high')) {
    return 'medium';
  }

  if (posterCount >= MIN_POSTER_COUNT) {
    return 'medium';
  }

  return null;
}

function collectSelectorContainers(root: Element): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const containers: HTMLElement[] = [];

  for (const selector of CATALOG_CONTAINER_SELECTORS) {
    for (const el of root.querySelectorAll<HTMLElement>(selector)) {
      if (!seen.has(el)) {
        seen.add(el);
        containers.push(el);
      }
    }
  }

  return containers;
}

function collectPosterClusterContainers(root: Element): HTMLElement[] {
  const containers = new Set<HTMLElement>();
  const posterImages = Array.from(root.querySelectorAll<HTMLImageElement>('img')).filter(
    isPosterAspectRatioImage
  );

  for (const img of posterImages) {
    let ancestor: HTMLElement | null = img.parentElement;
    let depth = 0;

    while (ancestor && ancestor !== root && depth < 12) {
      const count = countPosterLikeImages(ancestor);
      if (count >= MIN_POSTER_COUNT) {
        containers.add(ancestor);
      }
      ancestor = ancestor.parentElement;
      depth++;
    }
  }

  return Array.from(containers);
}

function filterNestedRegions(regions: CatalogRegion[]): CatalogRegion[] {
  return regions.filter((region) => {
    const hasMoreSpecificChild = regions.some(
      (other) =>
        other.element !== region.element &&
        region.element.contains(other.element) &&
        other.posterCount >= region.posterCount * 0.75
    );
    return !hasMoreSpecificChild;
  });
}

export function detectCatalogRegions(root: Element): CatalogRegion[] {
  const urlHint = getUrlCatalogHint();
  const candidateElements = new Set<HTMLElement>([
    ...collectSelectorContainers(root),
    ...collectPosterClusterContainers(root),
  ]);

  const regions: CatalogRegion[] = [];

  for (const element of candidateElements) {
    const posterCount = countPosterLikeImages(element);
    const confidence = scoreConfidence(posterCount, urlHint);
    if (!confidence) {
      continue;
    }

    regions.push({ element, confidence, posterCount });
  }

  return filterNestedRegions(regions).sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1;
    }
    return b.posterCount - a.posterCount;
  });
}