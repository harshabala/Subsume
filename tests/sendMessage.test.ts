import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage } from '@/shared/messages';
import { MessageType } from '@/shared/types';

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects when response has success: false', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      callback?.({ success: false, error: 'Unauthorized message type for this origin: GET_LIBRARY' });
    });

    await expect(sendMessage(MessageType.GET_LIBRARY, {})).rejects.toThrow(
      'Unauthorized message type for this origin: GET_LIBRARY'
    );
  });

  it('rejects when response is undefined', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      callback?.(undefined);
    });

    await expect(sendMessage(MessageType.GET_LIBRARY, {})).rejects.toThrow(
      'Message GET_LIBRARY received no response'
    );
  });

  it('rejects with fallback message when success:false and error is missing', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      callback?.({ success: false });
    });

    await expect(sendMessage(MessageType.GET_LIBRARY, {})).rejects.toThrow('Message GET_LIBRARY failed');
  });

  it('resolves when response has success: true', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      callback?.({ success: true, data: { inLibrary: true } });
    });

    const response = await sendMessage<{ mediaId: string }, { inLibrary: boolean }>(
      MessageType.CHECK_LIBRARY_STATUS,
      { mediaId: 'tmdb_movie_42' }
    );

    expect(response).toEqual({ success: true, data: { inLibrary: true } });
  });

  it('rejects when chrome.runtime.lastError is set', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      (chrome.runtime as { lastError?: { message: string } }).lastError = {
        message: 'Could not establish connection',
      };
      callback?.({ success: true, data: {} });
    });

    await expect(sendMessage(MessageType.GET_LIBRARY, {})).rejects.toThrow(
      'Could not establish connection'
    );

    delete (chrome.runtime as { lastError?: { message: string } }).lastError;
  });
});