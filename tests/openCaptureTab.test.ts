import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCaptureCanvasPath,
  buildCaptureCanvasUrl,
  isExtensionUiTabUrl,
  openCaptureCanvasTab,
} from '@/background/openCaptureTab';

describe('openCaptureTab pure helpers', () => {
  it('buildCaptureCanvasPath uses act=capture and encodes mediaId', () => {
    expect(buildCaptureCanvasPath('tmdb_movie_123')).toBe(
      'ui/index.html?act=capture&mediaId=tmdb_movie_123'
    );
    expect(buildCaptureCanvasPath('a/b c')).toBe(
      'ui/index.html?act=capture&mediaId=a%2Fb%20c'
    );
  });

  it('buildCaptureCanvasUrl joins getURL with path', () => {
    const url = buildCaptureCanvasUrl('media_1', (p) => `chrome-extension://ext/${p}`);
    expect(url).toBe(
      'chrome-extension://ext/ui/index.html?act=capture&mediaId=media_1'
    );
  });

  it('isExtensionUiTabUrl matches options UI pages only', () => {
    expect(isExtensionUiTabUrl('chrome-extension://id/ui/index.html')).toBe(true);
    expect(
      isExtensionUiTabUrl('chrome-extension://id/ui/index.html?act=capture&mediaId=x')
    ).toBe(true);
    expect(isExtensionUiTabUrl('https://example.com/ui/index.html')).toBe(true);
    expect(isExtensionUiTabUrl('chrome-extension://id/popup.html')).toBe(false);
    expect(isExtensionUiTabUrl(undefined)).toBe(false);
    expect(isExtensionUiTabUrl(null)).toBe(false);
  });
});

describe('openCaptureCanvasTab reuse', () => {
  beforeEach(() => {
    vi.mocked(chrome.tabs.query).mockReset().mockResolvedValue([]);
    vi.mocked(chrome.tabs.create).mockReset().mockResolvedValue({} as chrome.tabs.Tab);
    vi.mocked(chrome.tabs.update).mockReset().mockResolvedValue({} as chrome.tabs.Tab);
    vi.mocked(chrome.windows.update).mockReset().mockResolvedValue({} as chrome.windows.Window);
  });

  it('reuses an existing extension UI tab', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      {
        id: 42,
        windowId: 1,
        url: 'chrome-extension://test-extension-id/ui/index.html?page=home',
      } as chrome.tabs.Tab,
    ]);

    await openCaptureCanvasTab('tmdb_movie_99');

    expect(chrome.tabs.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        active: true,
        url: expect.stringContaining('act=capture'),
      })
    );
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('creates a tab when no extension UI tab exists', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 7, url: 'https://netflix.com/' } as chrome.tabs.Tab,
    ]);

    await openCaptureCanvasTab('openlibrary_work_OL1W');

    expect(chrome.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        url: expect.stringContaining('act=capture'),
      })
    );
  });
});
