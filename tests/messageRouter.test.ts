import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessageRouter } from '@/shared/messages';
import { MessageType } from '@/shared/types';

type MessageListener = (
  message: { type: MessageType; payload: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: unknown; error?: string }) => void
) => boolean | void;

describe('createMessageRouter content-script allowlist', () => {
  const extensionOrigin = 'chrome-extension://test-extension-id/';
  const contentScriptUrl = 'https://evil.example.com/movie';

  let listener: MessageListener;

  function installRouter() {
    const handlers = {
      [MessageType.CHECK_LIBRARY_STATUS]: async () => ({ inLibrary: false }),
      [MessageType.GET_LIBRARY]: async () => [{ library: { mediaId: 'tmdb_movie_1' }, media: {} }],
      [MessageType.GET_FULL_PREFERENCES]: async () => ({ region: 'US' }),
      [MessageType.EXPORT_LIBRARY]: async () => ({ library: [], media: [] }),
      [MessageType.SET_PREFERENCES]: async () => ({ updated: true }),
      [MessageType.GET_CONTENT_PREFS]: async () => ({ hoverCardsEnabled: true }),
    };

    createMessageRouter(handlers);
    listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0] as MessageListener;
  }

  function dispatchMessage(
    type: MessageType,
    sender: Partial<chrome.runtime.MessageSender>,
    payload: unknown = {}
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return new Promise((resolve) => {
      listener({ type, payload }, sender as chrome.runtime.MessageSender, resolve);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chrome.runtime.getURL).mockReturnValue(extensionOrigin);
    installRouter();
  });

  it('allows messages from extension origin', async () => {
    const response = await dispatchMessage(MessageType.GET_LIBRARY, {
      url: `${extensionOrigin}ui/index.html`,
    });

    expect(response).toEqual({
      success: true,
      data: [{ library: { mediaId: 'tmdb_movie_1' }, media: {} }],
    });
  });

  it.each([
    MessageType.GET_FULL_PREFERENCES,
    MessageType.EXPORT_LIBRARY,
    MessageType.SET_PREFERENCES,
  ])('blocks %s from non-extension content-script origin', async (type) => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await dispatchMessage(type, { url: contentScriptUrl });

    expect(response).toEqual({
      success: false,
      error: `Unauthorized message type for this origin: ${type}`,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Blocked unauthorized message type ${type}`)
    );

    warnSpy.mockRestore();
  });

  it('allows CHECK_LIBRARY_STATUS from content-script origin', async () => {
    const response = await dispatchMessage(MessageType.CHECK_LIBRARY_STATUS, {
      url: contentScriptUrl,
    });

    expect(response).toEqual({ success: true, data: { inLibrary: false } });
  });

  it('blocks GET_LIBRARY from content-script origin', async () => {
    const response = await dispatchMessage(MessageType.GET_LIBRARY, {
      url: contentScriptUrl,
    });

    expect(response).toEqual({
      success: false,
      error: `Unauthorized message type for this origin: ${MessageType.GET_LIBRARY}`,
    });
  });
});