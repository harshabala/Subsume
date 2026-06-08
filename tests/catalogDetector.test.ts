import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectCatalogRegions } from '@/content/catalogDetector';

function mockPosterRect(img: HTMLImageElement, width = 120, height = 180): void {
  img.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function buildPosterGrid(count: number, className = 'movie-grid'): string {
  const posters = Array.from({ length: count }, (_, i) =>
    `<img src="https://cdn.example.com/poster-${i}.jpg" width="120" height="180" alt="Title ${i}" />`
  ).join('');
  return `<div class="${className}">${posters}</div>`;
}

describe('detectCatalogRegions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('location', {
      href: 'https://example.com/',
      hostname: 'example.com',
    });
  });

  it('detects a grid with 6 poster-like images', () => {
    document.body.innerHTML = buildPosterGrid(6);
    document.querySelectorAll('img').forEach((img) => mockPosterRect(img as HTMLImageElement));

    const regions = detectCatalogRegions(document.body);

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(regions[0].posterCount).toBeGreaterThanOrEqual(4);
  });

  it('returns empty or non-high confidence for a single poster image', () => {
    document.body.innerHTML = buildPosterGrid(1);
    mockPosterRect(document.querySelector('img') as HTMLImageElement);

    const regions = detectCatalogRegions(document.body);

    expect(regions.filter((r) => r.confidence === 'high')).toHaveLength(0);
  });

  it('boosts confidence on known catalog URLs', () => {
    vi.stubGlobal('location', {
      href: 'https://www.netflix.com/browse/genre/83',
      hostname: 'www.netflix.com',
    });

    document.body.innerHTML = buildPosterGrid(4, 'row');
    document.querySelectorAll('img').forEach((img) => mockPosterRect(img as HTMLImageElement));

    const regions = detectCatalogRegions(document.body);

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(regions[0].confidence).toBe('high');
  });
});