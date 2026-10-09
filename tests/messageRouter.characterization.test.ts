import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessageRouter } from '@/shared/messages';
import { MessageType } from '@/shared/types';

type MessageListener = (
  message: { type: MessageType; payload: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void
) => boolean | void;

describe('characterization: message router always returns true after dispatch', () => {
  const extensionOrigin = 'chrome-extension://test-extension-id/';
  let listener: MessageListener;

  function install(handlers: Parameters<typeof createMessageRouter>[0], options?: Parameters<typeof createMessageRouter>[1]) {
    createMessageRouter(handlers, options);
    listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0] as MessageListener;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.getURL).mockReturnValue(extensionOrigin);
  });

  function dispatch(
    type: MessageType,
    payload: unknown,
    handlerSetup: () => void
  ): Promise<{ syncReturn: boolean | void; responses: unknown[] }> {
    handlerSetup();
    const responses: unknown[] = [];
    const sender = { url: `${extensionOrigin}ui/index.html` } as chrome.runtime.MessageSender;
    const syncReturn = listener({ type, payload }, sender, (r) => {
      responses.push(r);
    });
    return new Promise((resolve) => {
      queueMicrotask(() => resolve({ syncReturn, responses }));
    });
  }

  it('sync handler: one sendResponse, return true', async () => {
    const { syncReturn, responses } = await dispatch(MessageType.GET_LIBRARY, { x: 1 }, () => {
      install({ [MessageType.GET_LIBRARY]: () => ({ ok: true }) });
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(syncReturn).toBe(true);
    expect(responses).toEqual([{ success: true, data: { ok: true } }]);
  });

  it('async handler: one sendResponse, return true', async () => {
    install({
      [MessageType.GET_LIBRARY]: async () => {
        await Promise.resolve();
        return { async: true };
      },
    });
    const responses: unknown[] = [];
    const syncReturn = listener(
      { type: MessageType.GET_LIBRARY, payload: {} },
      { url: `${extensionOrigin}ui/index.html` } as chrome.runtime.MessageSender,
      (r) => responses.push(r)
    );
    expect(syncReturn).toBe(true);
    await vi.waitFor(() => {
      expect(responses).toEqual([{ success: true, data: { async: true } }]);
    });
  });

  it('async throwing handler: one error sendResponse, return true', async () => {
    install({
      [MessageType.GET_LIBRARY]: async () => {
        throw new Error('boom-handler');
      },
    });
    const responses: unknown[] = [];
    const syncReturn = listener(
      { type: MessageType.GET_LIBRARY, payload: {} },
      { url: `${extensionOrigin}ui/index.html` } as chrome.runtime.MessageSender,
      (r) => responses.push(r)
    );
    expect(syncReturn).toBe(true);
    await vi.waitFor(() => {
      expect(responses).toEqual([{ success: false, error: 'boom-handler' }]);
    });
  });

  it('onBeforeDispatch runs then handler payload is unchanged', async () => {
    const before = vi.fn(async () => {
      throw new Error('before-fail');
    });
    install(
      { [MessageType.GET_LIBRARY]: () => ({ after: true }) },
      { onBeforeDispatch: before }
    );
    const responses: unknown[] = [];
    const syncReturn = listener(
      { type: MessageType.GET_LIBRARY, payload: { keep: 1 } },
      { url: `${extensionOrigin}ui/index.html` } as chrome.runtime.MessageSender,
      (r) => responses.push(r)
    );
    expect(syncReturn).toBe(true);
    await vi.waitFor(() => {
      expect(before).toHaveBeenCalledOnce();
      expect(responses).toEqual([{ success: true, data: { after: true } }]);
    });
  });
});
