import { h } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DetailModal } from '@/ui/components/DetailModal';
import type { MediaItem } from '@/shared/types';

const MEDIA: MediaItem = {
  id: 'media_exit_1',
  canonicalTitle: 'In the Mood for Love',
  type: 'movie',
  year: 2000,
  genres: ['Romance', 'Drama'],
  ratings: [],
  providers: [],
  posterUrl: 'https://example.com/poster.jpg',
};

/** jsdom often lacks AnimationEvent; synthesize animationend with animationName. */
function dispatchAnimationEnd(el: EventTarget, animationName: string) {
  const event = new Event('animationend', { bubbles: true }) as Event & {
    animationName: string;
  };
  Object.defineProperty(event, 'animationName', { value: animationName });
  el.dispatchEvent(event);
}

function renderModal(onClose = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DetailModal media={MEDIA} onClose={onClose} />, container);
  });
  return { container, onClose };
}

describe('DetailModal exit lifecycle', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('does not call onClose immediately; applies closing class first', () => {
    const { container, onClose } = renderModal();

    const closeBtn = container.querySelector('.sanctuary-modal-close') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    act(() => {
      closeBtn.click();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.sanctuary-modal-content.closing')).toBeTruthy();
    expect(container.querySelector('.sanctuary-modal-backdrop.closing')).toBeTruthy();
  });

  it('calls onClose after content animationend (exit)', () => {
    const { container, onClose } = renderModal();

    const closeBtn = container.querySelector('.sanctuary-modal-close') as HTMLButtonElement;
    act(() => {
      closeBtn.click();
    });

    const content = container.querySelector('.sanctuary-modal-content') as HTMLElement;
    expect(content.classList.contains('closing')).toBe(true);

    act(() => {
      dispatchAnimationEnd(content, 'sanctuary-modal-exit');
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose via fallback timeout if animationend never fires', () => {
    const { container, onClose } = renderModal();

    act(() => {
      (container.querySelector('.sanctuary-modal-close') as HTMLButtonElement).click();
    });

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores enter animationend while not closing', () => {
    const { container, onClose } = renderModal();

    const content = container.querySelector('.sanctuary-modal-content') as HTMLElement;
    act(() => {
      dispatchAnimationEnd(content, 'sanctuary-modal-enter');
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes immediately when prefers-reduced-motion is set', () => {
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container, onClose } = renderModal();

    act(() => {
      (container.querySelector('.sanctuary-modal-close') as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.sanctuary-modal-content.closing')).toBeNull();
  });

  it('Escape triggers exit lifecycle (not immediate close without PRM)', () => {
    const { container, onClose } = renderModal();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.sanctuary-modal-content.closing')).toBeTruthy();
  });

  it('second Escape during exit finishes close immediately (interruptible)', () => {
    const { container, onClose } = renderModal();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.sanctuary-modal-content.closing')).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click triggers exit lifecycle', () => {
    const { container, onClose } = renderModal();

    const backdrop = container.querySelector('.sanctuary-modal-backdrop') as HTMLElement;
    act(() => {
      // Native click: target === backdrop (currentTarget in handler)
      backdrop.click();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.sanctuary-modal-backdrop.closing')).toBeTruthy();
  });
});
