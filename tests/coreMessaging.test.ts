import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageType } from '@/shared/types';
import { sendMessage, createMessageRouter } from '@/shared/messages';
import { parseUpdateStatusRequest, parseSetUserNotesRequest, broadcastMessage } from '@/background/handlers/utils';

type Listener = (
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (r: unknown) => void,
) => boolean;

const EXT = 'chrome-extension://test-extension-id/';

function router(handlers: Parameters<typeof createMessageRouter>[0], options?: Parameters<typeof createMessageRouter>[1]) {
  createMessageRouter(handlers, options);
  const calls = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls;
  return calls[calls.length - 1][0] as unknown as Listener;
}

function dispatch(listener: Listener, type: string, url?: string) {
  return new Promise<{ ret: boolean; response: unknown }>((resolve) => {
    let ret = false;
    const sendResponse = (response: unknown) => queueMicrotask(() => resolve({ ret, response }));
    ret = listener({ type, payload: { p: 1 } }, { url } as chrome.runtime.MessageSender, sendResponse);
  });
}

beforeEach(() => vi.clearAllMocks());

describe('createMessageRouter', () => {
  it('blocks privileged messages from web origins, with sanitized or missing origins', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const l = router({ [MessageType.EXPORT_LIBRARY]: vi.fn() });
    await expect(dispatch(l, MessageType.EXPORT_LIBRARY, 'https://evil.test/path?q=1')).resolves.toMatchObject({
      ret: false,
      response: { success: false, error: expect.stringContaining('Unauthorized') },
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('from origin https://evil.test'));
    await dispatch(l, MessageType.EXPORT_LIBRARY, 'not a url');
    expect(warn).toHaveBeenLastCalledWith(expect.stringContaining('[invalid-url]'));
    await dispatch(l, MessageType.EXPORT_LIBRARY, undefined);
    expect(warn).toHaveBeenLastCalledWith(expect.stringMatching(/from origin $/));
    warn.mockRestore();
  });

  it('rejects unknown message types', async () => {
    const l = router({});
    await expect(dispatch(l, 'NOPE', `${EXT}ui/index.html`)).resolves.toEqual({
      ret: false,
      response: { success: false, error: 'Unknown message type: NOPE' },
    });
  });

  it('answers synchronous handlers directly and async ones via the channel', async () => {
    const l = router({
      [MessageType.GET_CONTENT_PREFS]: () => 'sync',
      [MessageType.RESOLVE_POSTER]: async () => 'async',
      [MessageType.OPEN_DETAIL]: async () => {
        throw new Error('boom');
      },
      [MessageType.OPEN_CAPTURE_CANVAS]: () => Promise.reject('plain'),
    });
    await expect(dispatch(l, MessageType.GET_CONTENT_PREFS, 'https://site.test/')).resolves.toEqual({
      ret: false,
      response: { success: true, data: 'sync' },
    });
    await expect(dispatch(l, MessageType.RESOLVE_POSTER, 'https://site.test/')).resolves.toEqual({
      ret: true,
      response: { success: true, data: 'async' },
    });
    await expect(dispatch(l, MessageType.OPEN_DETAIL, 'https://site.test/')).resolves.toEqual({
      ret: true,
      response: { success: false, error: 'boom' },
    });
    await expect(dispatch(l, MessageType.OPEN_CAPTURE_CANVAS, 'https://site.test/')).resolves.toMatchObject({
      response: { success: false, error: 'plain' },
    });
  });

  it('runs onBeforeDispatch first, tolerating its failure, and reports handler errors', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const order: string[] = [];
    const l = router(
      {
        [MessageType.GET_CONTENT_PREFS]: () => {
          order.push('handler');
          return 'ok';
        },
        [MessageType.RESOLVE_POSTER]: () => {
          throw new Error('bad');
        },
        [MessageType.OPEN_DETAIL]: () => {
          throw 'str';
        },
      },
      {
        onBeforeDispatch: async () => {
          order.push('before');
          throw new Error('hydrate failed');
        },
      },
    );
    await expect(dispatch(l, MessageType.GET_CONTENT_PREFS, `${EXT}x`)).resolves.toEqual({
      ret: true,
      response: { success: true, data: 'ok' },
    });
    expect(order).toEqual(['before', 'handler']);
    expect(err).toHaveBeenCalledWith('[Subsume] Error in onBeforeDispatch:', expect.any(Error));
    await expect(dispatch(l, MessageType.RESOLVE_POSTER, `${EXT}x`)).resolves.toMatchObject({ response: { success: false, error: 'bad' } });
    await expect(dispatch(l, MessageType.OPEN_DETAIL, `${EXT}x`)).resolves.toMatchObject({ response: { success: false, error: 'str' } });
    err.mockRestore();
  });
});

describe('sendMessage', () => {
  afterEach(() => {
    vi.useRealTimers();
    (chrome.runtime as { lastError?: unknown }).lastError = undefined;
  });

  it('times out when no response arrives', async () => {
    vi.useFakeTimers();
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((() => undefined) as never);
    const p = sendMessage(MessageType.GET_PREFERENCES, {}, 50);
    vi.advanceTimersByTime(51);
    await expect(p).rejects.toThrow('Message GET_PREFERENCES timed out after 50ms');
  });

  it('uses a generic message when lastError has none', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(((_m: unknown, cb: (r: unknown) => void) => {
      (chrome.runtime as { lastError?: unknown }).lastError = {};
      cb(undefined);
    }) as never);
    await expect(sendMessage(MessageType.GET_PREFERENCES, {})).rejects.toThrow('Unknown chrome.runtime error');
  });
});

describe('request parsers', () => {
  it('parseUpdateStatusRequest validates shape and status', () => {
    expect(parseUpdateStatusRequest(null)).toBeNull();
    expect(parseUpdateStatusRequest('x')).toBeNull();
    expect(parseUpdateStatusRequest({ mediaId: '' , status: 'watched' })).toBeNull();
    expect(parseUpdateStatusRequest({ mediaId: 'm', status: 'lost' })).toBeNull();
    expect(parseUpdateStatusRequest({ mediaId: 'm', status: 3 })).toBeNull();
    expect(parseUpdateStatusRequest({ mediaId: 'm', status: 'watched' })).toEqual({ mediaId: 'm', status: 'watched' });
  });

  it('parseSetUserNotesRequest requires an id and at least one note field', () => {
    expect(parseSetUserNotesRequest(undefined)).toBeNull();
    expect(parseSetUserNotesRequest(5)).toBeNull();
    expect(parseSetUserNotesRequest({ mediaId: 7, notes: 'x' })).toBeNull();
    expect(parseSetUserNotesRequest({ mediaId: 'm' })).toBeNull();
    expect(parseSetUserNotesRequest({ mediaId: 'm', notes: 'n' })).toEqual({ mediaId: 'm', notes: 'n' });
    for (const field of ['emotionalRecall', 'atmosphere', 'lingeringThought']) {
      expect(parseSetUserNotesRequest({ mediaId: 'm', [field]: 'v' })).toEqual({ mediaId: 'm', notes: '', [field]: 'v' });
      expect(parseSetUserNotesRequest({ mediaId: 'm', notes: 'n', [field]: 1 })).toBeNull();
    }
    for (const field of ['awe', 'melancholy', 'tension', 'warmth']) {
      expect(parseSetUserNotesRequest({ mediaId: 'm', [field]: 42.4 })).toEqual({ mediaId: 'm', notes: '', [field]: 42 });
      expect(parseSetUserNotesRequest({ mediaId: 'm', notes: 'n', [field]: 'high' })).toBeNull();
      expect(parseSetUserNotesRequest({ mediaId: 'm', [field]: Number.NaN })).toBeNull();
      expect(parseSetUserNotesRequest({ mediaId: 'm', [field]: 101 })).toBeNull();
      expect(parseSetUserNotesRequest({ mediaId: 'm', [field]: -1 })).toBeNull();
    }
  });
});

describe('broadcastMessage', () => {
  it('sends to every tab with an id and swallows per-tab failures', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }, {}, { id: 2 }] as never);
    vi.mocked(chrome.tabs.sendMessage).mockReturnValueOnce(Promise.reject(new Error('no receiver')) as never);
    await broadcastMessage({ type: 'LIBRARY_UPDATED' } as never);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, { type: 'LIBRARY_UPDATED' });
  });

  it('logs when tabs cannot be queried', async () => {
    vi.mocked(chrome.tabs.query).mockRejectedValue(new Error('no tabs'));
    const logger = (await import('@/shared/logger')).logger;
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    await broadcastMessage({ type: 'LIBRARY_UPDATED' } as never);
    expect(spy).toHaveBeenCalledWith('[Subsume] Failed to query tabs for broadcast:', expect.any(Error));
  });
});
