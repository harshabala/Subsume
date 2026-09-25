import { h } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReflectionTimeline } from '@/ui/components/ReflectionTimeline';
import { IntentNavigation } from '@/ui/components/archive/IntentNavigation';
import { PoeticCaptureCanvas } from '@/ui/components/PoeticCaptureCanvas';
import { DetailModal } from '@/ui/components/DetailModal';
import { MessageType } from '@/shared/types';
import type { MediaItem, LibraryItem } from '@/shared/types';

const TEST_MEDIA: MediaItem = {
  id: 'test_media_1',
  canonicalTitle: 'In the Mood for Love',
  type: 'movie',
  year: 2000,
  genres: ['Drama', 'Romance'],
  ratings: [],
  providers: [],
};

const TEST_LIBRARY_ITEM: LibraryItem = {
  mediaId: TEST_MEDIA.id,
  status: 'watched',
  addedAt: 1000,
  updatedAt: 1000,
  userRating: 5,
};

describe('Task 2: Accessibility, UX & Motion Audits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
      if (message.type === MessageType.GET_MEDIA_ITEMS) {
        callback({ success: true, data: [TEST_MEDIA] });
      } else if (message.type === MessageType.GET_REFLECTIONS) {
        callback({ success: true, data: [] });
      } else {
        callback({ success: true, data: null });
      }
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('P0-DX2: ReflectionTimeline Form Controls Accessibility', () => {
    it('has explicit aria-label and id on reflection input', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      await act(async () => {
        render(
          <ReflectionTimeline
            workId="media_1"
            medium="movie"
          />,
          container,
        );
      });

      const input = container.querySelector(
        '#reflection-timeline-input',
      ) as HTMLTextAreaElement;
      expect(input).toBeTruthy();
      expect(input.getAttribute('aria-label')).toBe('Reflection text');
      expect(input.getAttribute('data-testid')).toBe('reflection-timeline-input');
    });

    it('has explicit aria-label and id on quotation inputs for books', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      await act(async () => {
        render(
          <ReflectionTimeline
            workId="book_1"
            medium="book"
          />,
          container,
        );
      });

      // Click "Add quotation" button to disclose the quote form
      const toggleBtn = container.querySelector(
        '.reflection-timeline-quote-toggle',
      ) as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();

      await act(async () => {
        toggleBtn.click();
      });

      const quoteText = container.querySelector(
        '#reflection-quote-text',
      ) as HTMLTextAreaElement;
      const quoteLocation = container.querySelector(
        '#reflection-quote-location',
      ) as HTMLInputElement;

      expect(quoteText).toBeTruthy();
      expect(quoteText.getAttribute('aria-label')).toBe('Quotation text');
      expect(quoteText.getAttribute('data-testid')).toBe('reflection-quote-text');

      expect(quoteLocation).toBeTruthy();
      expect(quoteLocation.getAttribute('aria-label')).toBe('Quotation location');
      expect(quoteLocation.getAttribute('data-testid')).toBe('reflection-quote-location');
    });
  });

  describe('P0-DX3: Modal Background inert Isolation', () => {
    it('applies inert and aria-hidden to app-nav-shell and main-content siblings on open, restores on close', async () => {
      // Setup DOM tree resembling Subsume App layout
      const appNavShell = document.createElement('nav');
      appNavShell.className = 'app-nav-shell';
      document.body.appendChild(appNavShell);

      const mainContent = document.createElement('main');
      mainContent.className = 'main-content';
      document.body.appendChild(mainContent);

      const siblingContent = document.createElement('section');
      siblingContent.className = 'sibling-content';
      mainContent.appendChild(siblingContent);

      const modalHost = document.createElement('div');
      mainContent.appendChild(modalHost);

      expect(appNavShell.hasAttribute('inert')).toBe(false);
      expect(siblingContent.hasAttribute('inert')).toBe(false);

      await act(async () => {
        render(
          <DetailModal
            media={TEST_MEDIA}
            libraryItem={TEST_LIBRARY_ITEM}
            onClose={vi.fn()}
          />,
          modalHost,
        );
      });

      // While modal is mounted:
      expect(appNavShell.hasAttribute('inert')).toBe(true);
      expect(appNavShell.getAttribute('aria-hidden')).toBe('true');
      expect(siblingContent.hasAttribute('inert')).toBe(true);
      expect(siblingContent.getAttribute('aria-hidden')).toBe('true');

      // Unmount modal:
      await act(async () => {
        render(null, modalHost);
      });

      expect(appNavShell.hasAttribute('inert')).toBe(false);
      expect(appNavShell.getAttribute('aria-hidden')).toBeNull();
      expect(siblingContent.hasAttribute('inert')).toBe(false);
      expect(siblingContent.getAttribute('aria-hidden')).toBeNull();
    });
  });

  describe('P1-DX3: DetailModal Close Flush Commits Draft Rating', () => {
    it('commits draft rating changes on unmount even if pointerup did not fire', async () => {
      const onUpdateRating = vi.fn();
      const container = document.createElement('div');
      document.body.appendChild(container);

      await act(async () => {
        render(
          <DetailModal
            media={TEST_MEDIA}
            libraryItem={TEST_LIBRARY_ITEM}
            onClose={vi.fn()}
            onUpdateRating={onUpdateRating}
          />,
          container,
        );
      });

      const rangeInput = container.querySelector(
        `#detail-rating-${TEST_MEDIA.id}`,
      ) as HTMLInputElement;
      expect(rangeInput).toBeTruthy();

      // User changes range input to 9
      await act(async () => {
        rangeInput.value = '9';
        rangeInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // No pointerup has fired yet
      expect(onUpdateRating).not.toHaveBeenCalled();

      // Modal unmounts (e.g. Escape pressed or closed)
      await act(async () => {
        render(null, container);
      });

      // flushPendingSaves must commit the draft rating
      expect(onUpdateRating).toHaveBeenCalledTimes(1);
      expect(onUpdateRating).toHaveBeenCalledWith(9);
    });
  });

  describe('P1-DX5: PoeticCaptureCanvas Rating Buttons Accessibility', () => {
    it('includes role="group", accessible scale label, and per-button aria attributes', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      render(
        <PoeticCaptureCanvas
          mediaId="test_media_1"
          onClose={vi.fn()}
        />,
        container,
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea).toBeTruthy();

      // Disclose progressive controls with >= 40 chars
      await act(async () => {
        textarea.value = 'The haunting waltz theme of this masterpiece stays with me forever.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const ratingControl = container.querySelector(
        '[data-testid="rating-control"]',
      );
      expect(ratingControl).toBeTruthy();
      expect(ratingControl?.getAttribute('role')).toBe('group');
      expect(ratingControl?.getAttribute('aria-label')).toBe(
        'Rating scale (1 to 10)',
      );

      const buttons = container.querySelectorAll(
        '[data-testid="rating-control"] button',
      );
      expect(buttons.length).toBe(10);

      const firstBtn = buttons[0];
      expect(firstBtn.getAttribute('aria-label')).toBe('Rate 1 of 10');
      expect(firstBtn.getAttribute('aria-pressed')).toBe('false');

      // Click button 7
      const seventhBtn = buttons[6];
      expect(seventhBtn.getAttribute('aria-label')).toBe('Rate 7 of 10');
      await act(async () => {
        (seventhBtn as HTMLButtonElement).click();
      });

      expect(seventhBtn.getAttribute('aria-pressed')).toBe('true');
      expect(firstBtn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('P1-DX8: IntentNavigation Keyboard & Tab Semantics', () => {
    it('manages roving tabIndex on medium tabs', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const setActiveTab = vi.fn();

      await act(async () => {
        render(
          <IntentNavigation
            activeTab="screen"
            setActiveTab={setActiveTab}
            intentFilter="all"
            setIntentFilter={vi.fn()}
            collectionFilter="all"
            setCollectionFilter={vi.fn()}
          />,
          container,
        );
      });

      const mediumTabs = container.querySelectorAll(
        '.tab-bar[aria-label="Medium"] [role="tab"]',
      );
      expect(mediumTabs.length).toBe(3);

      const [allTab, screenTab, booksTab] = Array.from(mediumTabs) as HTMLButtonElement[];
      expect(allTab.getAttribute('tabindex')).toBe('-1');
      expect(screenTab.getAttribute('tabindex')).toBe('0');
      expect(booksTab.getAttribute('tabindex')).toBe('-1');
    });

    it('navigates across tabs using ArrowRight and ArrowLeft', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      let currentTab: any = 'all';
      const setActiveTab = vi.fn().mockImplementation((t) => {
        currentTab = t;
      });

      const { rerender } = {
        rerender: () => {
          render(
            <IntentNavigation
              activeTab={currentTab}
              setActiveTab={setActiveTab}
              intentFilter="all"
              setIntentFilter={vi.fn()}
              collectionFilter="all"
              setCollectionFilter={vi.fn()}
            />,
            container,
          );
        },
      };

      await act(async () => {
        rerender();
      });

      const allTab = container.querySelector(
        '.tab-bar[aria-label="Medium"] [role="tab"]',
      ) as HTMLButtonElement;

      // Press ArrowRight on "All" tab
      await act(async () => {
        allTab.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        );
      });

      expect(setActiveTab).toHaveBeenCalledWith('screen');

      // Press ArrowLeft on "All" tab (should wrap to "books")
      await act(async () => {
        allTab.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
        );
      });

      expect(setActiveTab).toHaveBeenCalledWith('books');
    });
  });
});
