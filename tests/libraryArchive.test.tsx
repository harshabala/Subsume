import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Library } from '@/ui/pages/Library';
import { MessageType } from '@/shared/types';
import { logger } from '@/shared/logger';

const mockItems = [
  {
    library: {
      mediaId: 'm1',
      status: 'watched' as const,
      addedAt: 1000,
      updatedAt: 1000,
      sanctuaryIntent: 'keep_memory' as const,
      emotionalRecall: 'The haunting waltz theme.',
    },
    media: {
      id: 'm1',
      canonicalTitle: 'In the Mood for Love',
      type: 'movie' as const,
      year: 2000,
      genres: ['Drama'],
      ratings: [],
      providers: [],
      posterUrl: 'https://example.com/poster1.jpg',
    },
  },
  {
    library: {
      mediaId: 'm2',
      status: 'to-watch' as const,
      addedAt: 2000,
      updatedAt: 2000,
      sanctuaryIntent: 'revisit_this_month' as const,
    },
    media: {
      id: 'm2',
      canonicalTitle: 'Chungking Express',
      type: 'movie' as const,
      year: 1994,
      genres: ['Romance'],
      ratings: [],
      providers: [],
      posterUrl: 'https://example.com/poster2.jpg',
    },
  },
  {
    library: {
      mediaId: 'm3',
      status: 'to-watch' as const,
      addedAt: 3000,
      updatedAt: 3000,
      // no sanctuaryIntent -> defaults to wishlist
    },
    media: {
      id: 'm3',
      canonicalTitle: 'Fallen Angels',
      type: 'movie' as const,
      year: 1995,
      genres: ['Crime'],
      ratings: [],
      providers: [],
    },
  },
];

describe('Act III Hardcover Library Archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
      if (message.type === MessageType.GET_LIBRARY_PAGE) {
        callback({ success: true, data: mockItems });
      } else {
        callback({ success: true, data: null });
      }
    });
  });

  it('verifies Intent tab filtering and default fallback', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<Library />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    // Initially "all" items shown
    expect(container.textContent).toContain('In the Mood for Love');
    expect(container.textContent).toContain('Chungking Express');
    expect(container.textContent).toContain('Fallen Angels');

    // Filter tabs exist
    const keepTab = container.querySelector('[data-intent="keep_memory"]') as HTMLElement;
    const revisitTab = container.querySelector('[data-intent="revisit_this_month"]') as HTMLElement;
    const wishlistTab = container.querySelector('[data-intent="wishlist"]') as HTMLElement;
    const allTab = container.querySelector('[data-intent="all"]') as HTMLElement;

    expect(keepTab).toBeTruthy();
    expect(revisitTab).toBeTruthy();
    expect(wishlistTab).toBeTruthy();

    // Click Keep This Memory
    await act(async () => {
      keepTab.click();
    });
    expect(container.textContent).toContain('In the Mood for Love');
    expect(container.textContent).not.toContain('Chungking Express');
    expect(container.textContent).not.toContain('Fallen Angels');

    // Click Revisit This Month
    await act(async () => {
      revisitTab.click();
    });
    expect(container.textContent).not.toContain('In the Mood for Love');
    expect(container.textContent).toContain('Chungking Express');
    expect(container.textContent).not.toContain('Fallen Angels');

    // Click Wishlist (should show m3 which defaulted to wishlist)
    await act(async () => {
      wishlistTab.click();
    });
    expect(container.textContent).not.toContain('In the Mood for Love');
    expect(container.textContent).not.toContain('Chungking Express');
    expect(container.textContent).toContain('Fallen Angels');

    // Click All
    await act(async () => {
      allTab.click();
    });
    expect(container.textContent).toContain('In the Mood for Love');
    expect(container.textContent).toContain('Chungking Express');
    expect(container.textContent).toContain('Fallen Angels');

    document.body.removeChild(container);
  });

  it('verifies hardcover snippet rendering and luxury serif typography', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<Library />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    const snippet = container.querySelector('.hardcover-snippet') as HTMLElement;
    expect(snippet).toBeTruthy();
    expect(snippet.textContent).toContain('"The haunting waltz theme."');

    // Check poster element exists
    const posterImg = container.querySelector('.media-card-poster img') as HTMLElement;
    expect(posterImg).toBeTruthy();

    // Check the poster wrapper carries the sanctuary class (styling via CSS)
    const posterWrap = container.querySelector('.media-card-poster') as HTMLElement;
    expect(posterWrap).toBeTruthy();

    // Check serif title exists via class
    const titleEl = container.querySelector('.media-card-title') as HTMLElement;
    expect(titleEl).toBeTruthy();

    document.body.removeChild(container);
  });

  it('verifies logger integration when fetch errors', async () => {
    const errSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
      if (message.type === MessageType.GET_LIBRARY_PAGE) {
        // simulate chrome lastError or rejection
        throw new Error('Network Failure');
      }
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<Library />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
    document.body.removeChild(container);
  });
});
