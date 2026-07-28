import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem, UserPreferences, WeeklyDigest } from '@/shared/types';
import {
  resetActiveWebSearchAdapter,
  setActiveWebSearchAdapter,
  type WebSearchAdapter,
  type WebSearchResult,
} from '@/shared/webSearchAdapter';
import { canClaimWebResearch } from '@/shared/llmCapabilities';

vi.mock('@/background/digest', () => ({
  generateWeeklyDigest: vi.fn(),
}));

vi.mock('@/background/discoveryFeed', () => ({
  getDiscoveryFeed: vi.fn(),
  discoveryFeedToWeeklyDigest: vi.fn(),
}));

vi.mock('@/background/storage', () => ({
  getAllLibraryItems: vi.fn(),
  getAllMediaMap: vi.fn(),
  getWeeklyDigest: vi.fn(),
  saveWeeklyDigest: vi.fn(),
  putMediaItem: vi.fn(),
}));

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
}));

import { generateWeeklyDigest } from '@/background/digest';
import {
  getAllLibraryItems,
  getAllMediaMap,
  saveWeeklyDigest,
  putMediaItem,
} from '@/background/storage';
import { searchOpenLibrary } from '@/background/openLibrary';
import {
  generateSubsumeDispatch,
  buildWebGroundedCandidates,
  DISPATCH_PERIOD_STORAGE_KEY,
} from '@/background/dispatch';

const basePrefs: UserPreferences = {
  favoriteGenres: [],
  platforms: ['8'],
  region: 'US',
  llmEnabled: true,
  llmProvider: 'openai',
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  onboardingComplete: true,
  dispatchEnabled: true,
  dispatchWeekday: 4,
  dispatchLocalTime: '19:00',
  dispatchMaxSearches: 5,
  webGroundedDispatchEnabled: false,
  openLibraryEnabled: true,
  enabledMedia: { movie: true, tv: true, book: true },
};

function makeBookMedia(
  id: string,
  title: string,
  authors: string[],
  year = 2000
): MediaItem {
  return {
    id,
    canonicalTitle: title,
    type: 'book',
    year,
    genres: ['Fiction'],
    ratings: [],
    providers: [{ provider: 'openlibrary', externalId: id }],
    posterUrl: '',
    authors,
  };
}

function mockCatalogAdapterResults(): void {
  vi.mocked(generateWeeklyDigest).mockResolvedValue({
    generatedAt: Date.now(),
    llmGenerated: false,
    items: [
      {
        mediaId: 'tmdb_movie_1',
        title: 'Screen Pick',
        year: 2026,
        type: 'movie',
        reason: 'Top-rated new release',
        platforms: ['Netflix'],
      },
    ],
  });

  vi.mocked(getAllLibraryItems).mockResolvedValue([
    {
      mediaId: 'ol_book_1',
      status: 'watched',
      addedAt: 1,
      updatedAt: 1,
    },
  ]);
  vi.mocked(getAllMediaMap).mockResolvedValue({
    ol_book_1: makeBookMedia('ol_book_1', 'The Great Gatsby', ['F. Scott Fitzgerald'], 1925),
  });

  vi.mocked(searchOpenLibrary).mockImplementation(async ({ query }) => {
    // Catalog book path uses author:"..." queries; web path uses resolve titles
    if (String(query).includes('Tender') || String(query).includes('Night')) {
      return [
        {
          matchScore: 0.95,
          work: {
            id: 'openlibrary_work_OL999W',
            medium: 'book' as const,
            canonicalTitle: 'Tender Is the Night',
            firstReleaseYear: 1934,
            genres: [],
            images: {},
            externalIds: [{ provider: 'openlibrary' as const, externalId: 'OL999W' }],
            creatorCredits: [],
            bookDetails: { authors: ['F. Scott Fitzgerald'] },
            sourceProvenance: [],
            sourceConfidence: 'high' as const,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ];
    }
    // Default catalog author search hit
    return [
      {
        matchScore: 0.9,
        work: {
          id: 'openlibrary_work_OL888W',
          medium: 'book' as const,
          canonicalTitle: 'This Side of Paradise',
          firstReleaseYear: 1920,
          genres: [],
          images: {},
          externalIds: [{ provider: 'openlibrary' as const, externalId: 'OL888W' }],
          creatorCredits: [],
          bookDetails: { authors: ['F. Scott Fitzgerald'] },
          sourceProvenance: [],
          sourceConfidence: 'high' as const,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];
  });
}

function createMockWebAdapter(results: WebSearchResult[]): WebSearchAdapter {
  return {
    id: 'mock-web',
    supportsWebSearch: true,
    search: vi.fn(async () => results),
  };
}

describe('web-grounded dispatch path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetActiveWebSearchAdapter();
    vi.mocked(chrome.storage.local.get).mockResolvedValue({});
    vi.mocked(chrome.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(putMediaItem).mockResolvedValue(undefined);
    vi.mocked(saveWeeklyDigest).mockResolvedValue(undefined);
    mockCatalogAdapterResults();
  });

  afterEach(() => {
    resetActiveWebSearchAdapter();
  });

  it('does not claim web research when capability is false (opt-in alone is insufficient)', async () => {
    expect(canClaimWebResearch('openai', true)).toBe(false);

    const digest = await generateSubsumeDispatch({
      ...basePrefs,
      webGroundedDispatchEnabled: true,
    });

    expect(digest.items.length).toBeGreaterThan(0);
    for (const item of digest.items) {
      expect(item.discoveryMode).toBe('catalog');
      expect(item.citations).toBeUndefined();
    }
    // No web adapter was registered — search should not have been called via web path
  });

  it('attaches citations and web_grounded discoveryMode when mock adapter is active', async () => {
    const mockResults: WebSearchResult[] = [
      {
        url: 'https://example.com/reviews/tender-is-the-night',
        title: 'Tender Is the Night',
        snippet: 'Fitzgerald’s later novel…',
      },
    ];
    const adapter = createMockWebAdapter(mockResults);
    setActiveWebSearchAdapter(adapter);

    expect(canClaimWebResearch('openai', true)).toBe(true);

    const digest = await generateSubsumeDispatch({
      ...basePrefs,
      webGroundedDispatchEnabled: true,
    });

    expect(adapter.search).toHaveBeenCalled();
    const webItems = digest.items.filter((i) => i.discoveryMode === 'web_grounded');
    expect(webItems.length).toBeGreaterThanOrEqual(1);

    const web = webItems[0];
    expect(web.citations).toBeDefined();
    expect(web.citations!.length).toBeGreaterThanOrEqual(1);
    expect(web.citations![0].url).toBe('https://example.com/reviews/tender-is-the-night');
    expect(web.citations![0].title).toBe('Tender Is the Night');
    expect(web.title).toBe('Tender Is the Night');
    expect(web.mediaId).toContain('OL999W');

    // Catalog items still present and honestly labeled
    const catalogItems = digest.items.filter((i) => i.discoveryMode === 'catalog');
    expect(catalogItems.length).toBeGreaterThanOrEqual(1);
  });

  it('stays catalog-only when opt-in is false even if adapter supports web search', async () => {
    const adapter = createMockWebAdapter([
      {
        url: 'https://example.com/x',
        title: 'Tender Is the Night',
      },
    ]);
    setActiveWebSearchAdapter(adapter);

    const digest = await generateSubsumeDispatch({
      ...basePrefs,
      webGroundedDispatchEnabled: false,
    });

    expect(adapter.search).not.toHaveBeenCalled();
    expect(digest.items.every((i) => i.discoveryMode === 'catalog')).toBe(true);
  });

  it('buildWebGroundedCandidates resolves hits to catalog and stores citations', async () => {
    setActiveWebSearchAdapter(
      createMockWebAdapter([
        {
          url: 'https://lit.example/tender',
          title: 'Tender Is the Night',
        },
      ])
    );

    const items = await buildWebGroundedCandidates({
      ...basePrefs,
      webGroundedDispatchEnabled: true,
    });

    expect(items).toHaveLength(1);
    expect(items[0].discoveryMode).toBe('web_grounded');
    expect(items[0].citations).toEqual([
      { url: 'https://lit.example/tender', title: 'Tender Is the Night' },
    ]);
    expect(putMediaItem).toHaveBeenCalled();
  });

  it('skips web hits that cannot resolve to catalog (no invented works)', async () => {
    setActiveWebSearchAdapter(
      createMockWebAdapter([
        {
          url: 'https://spam.example/fake-book',
          title: 'Completely Unknown Invented Title XYZ',
        },
      ])
    );
    vi.mocked(searchOpenLibrary).mockResolvedValue([]);

    const items = await buildWebGroundedCandidates(basePrefs);
    expect(items).toHaveLength(0);
  });

  it('persists digest with mixed catalog and web_grounded items', async () => {
    setActiveWebSearchAdapter(
      createMockWebAdapter([
        {
          url: 'https://example.com/tender',
          title: 'Tender Is the Night',
        },
      ])
    );

    const digest = await generateSubsumeDispatch({
      ...basePrefs,
      webGroundedDispatchEnabled: true,
    });

    expect(saveWeeklyDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ discoveryMode: 'catalog' }),
          expect.objectContaining({
            discoveryMode: 'web_grounded',
            citations: expect.any(Array),
          }),
        ]),
      } satisfies Partial<WeeklyDigest>)
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [DISPATCH_PERIOD_STORAGE_KEY]: expect.stringMatching(/^\d{4}-W\d{2}$/),
      })
    );
  });
});
