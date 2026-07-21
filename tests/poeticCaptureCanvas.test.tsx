import { h } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoeticCaptureCanvas } from '@/ui/components/PoeticCaptureCanvas';
import { MessageType, MediaItem } from '@/shared/types';

const mockMedia: MediaItem = {
  id: 'media_123',
  canonicalTitle: 'In the Mood for Love',
  type: 'movie',
  year: 2000,
  genres: ['Romance', 'Drama'],
  ratings: [],
  providers: [],
  posterUrl: 'https://example.com/poster.jpg',
};

describe('PoeticCaptureCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message: any, callback: any) => {
      if (message.type === MessageType.GET_MEDIA_ITEMS) {
        callback({ success: true, data: [mockMedia] });
      } else if (message.type === MessageType.ADD_TO_LIST) {
        callback({ success: true, data: { mediaId: 'media_123', status: 'to-watch' } });
      } else if (message.type === MessageType.UPDATE_STATUS || message.type === MessageType.SET_USER_NOTES || message.type === MessageType.SET_USER_RATING) {
        callback({ success: true, data: { updated: true } });
      } else {
        callback({ success: true, data: null });
      }
    });
  });

  it('verifies initial render', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<PoeticCaptureCanvas mediaId="media_123" onClose={vi.fn()} />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    expect(container.textContent).toContain('What stayed with you?');
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(mockMedia.posterUrl);
    expect(container.querySelector('[data-testid="intent-selectors"]')).toBeNull();
  });

  it('verifies focus pull state change on focus', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<PoeticCaptureCanvas mediaId="media_123" onClose={vi.fn()} />, container);
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });

    const textarea = container.querySelector('textarea');
    const poster = container.querySelector('.poetic-poster') as HTMLElement;
    expect(textarea).toBeTruthy();
    expect(poster).toBeTruthy();

    // Dialog auto-focuses the textarea on open
    textarea?.focus();
    await act(async () => {});
    expect(poster.classList.contains('writing')).toBe(true);

    await act(async () => {
      textarea?.dispatchEvent(new Event('blur'));
    });

    expect(poster.classList.contains('writing')).toBe(false);

    await act(async () => {
      textarea?.dispatchEvent(new Event('focus'));
    });

    expect(poster.classList.contains('writing')).toBe(true);
  });

  it('verifies progressive disclosure on input', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<PoeticCaptureCanvas mediaId="media_123" onClose={vi.fn()} />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(container.querySelector('[data-testid="intent-selectors"]')).toBeNull();

    // Short text (< 40 chars) - should NOT disclose controls
    await act(async () => {
      textarea.value = 'The haunting waltz.';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="intent-selectors"]')).toBeNull();

    // Long enough (>= 40 chars) - SHOULD disclose controls
    await act(async () => {
      textarea.value = 'The haunting waltz theme of this masterpiece stays with me.';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const intentSelectors = container.querySelector('[data-testid="intent-selectors"]');
    const ratingControl = container.querySelector('[data-testid="rating-control"]');
    expect(intentSelectors).toBeTruthy();
    expect(ratingControl).toBeTruthy();
    expect(container.textContent).toContain('Keep This Memory');
    expect(container.textContent).toContain('Revisit This Month');
    expect(container.textContent).toContain('Wishlist');
  });

  it('verifies save dispatch', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    render(<PoeticCaptureCanvas mediaId="media_123" onClose={onClose} onSave={onSave} />, container);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
    const longProse = 'Unforgettable cinematography that captures the essence of longing. Every single frame feels like a painting, drenched in neon and warm amber tones. The performances are subtle yet carry a profound weight.';
    await act(async () => {
      textarea.value = longProse;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Populate Atmosphere and Lingering Thought inputs
    const atmosphereInput = container.querySelector('[data-testid="atmosphere-input"]') as HTMLInputElement;
    const lingeringInput = container.querySelector('[data-testid="lingering-thought-input"]') as HTMLInputElement;
    expect(atmosphereInput).toBeTruthy();
    expect(lingeringInput).toBeTruthy();

    await act(async () => {
      atmosphereInput.value = 'Melancholic, Warm Amber';
      atmosphereInput.dispatchEvent(new Event('input', { bubbles: true }));
      lingeringInput.value = 'The beauty of fleeting moments.';
      lingeringInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const keepBtn = container.querySelector('[data-intent="keep_memory"]') as HTMLButtonElement;
    await act(async () => {
      keepBtn?.click();
    });

    const ratingBtn = container.querySelector('[data-rating="9"]') as HTMLButtonElement;
    await act(async () => {
      ratingBtn?.click();
    });

    const saveBtn = container.querySelector('[data-testid="save-btn"]') as HTMLButtonElement;
    await act(async () => {
      saveBtn?.click();
      // Persist messages immediately; ceremony delays onSave/onClose ~280ms
      await new Promise((r) => setTimeout(r, 120));
    });

    const sendMessageCalls = vi.mocked(chrome.runtime.sendMessage).mock.calls;
    const typesCalled = sendMessageCalls.map(c => (c[0] as any).type);
    expect(typesCalled).toContain(MessageType.ADD_TO_LIST);
    expect(typesCalled).toContain(MessageType.UPDATE_STATUS);
    expect(typesCalled).toContain(MessageType.SET_USER_NOTES);
    expect(typesCalled).toContain(MessageType.SET_USER_RATING);

    const noteCall = sendMessageCalls.find(c => (c[0] as any).type === MessageType.SET_USER_NOTES);
    expect((noteCall?.[0] as any).payload).toEqual({
      mediaId: 'media_123',
      notes: '',
      emotionalRecall: longProse,
      atmosphere: 'Melancholic, Warm Amber',
      lingeringThought: 'The beauty of fleeting moments.',
      awe: 50,
      melancholy: 50,
      tension: 50,
      warmth: 50,
    });

    const statusCall = sendMessageCalls.find(c => (c[0] as any).type === MessageType.UPDATE_STATUS);
    expect((statusCall?.[0] as any).payload).toEqual({ mediaId: 'media_123', status: 'watched' });

    const ratingCall = sendMessageCalls.find(c => (c[0] as any).type === MessageType.SET_USER_RATING);
    expect((ratingCall?.[0] as any).payload).toEqual({ mediaId: 'media_123', rating: 9 });

    // Ceremony holds dismiss for ~280ms when PRM is off; exit curtain adds ~350ms fallback
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('.save-ceremony')).toBeTruthy();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 320));
    });

    expect(onSave).toHaveBeenCalled();
    // Curtain close runs after ceremony before onClose
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(onClose).toHaveBeenCalled();
  });
});
