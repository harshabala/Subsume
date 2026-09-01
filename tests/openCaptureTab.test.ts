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

  it('isExtensionUiTabUrl matches own origin or relative paths only', () => {
    const ourOrigin = 'chrome-extension://test-extension-id/';

    // Own origin + ui/index.html
    expect(isExtensionUiTabUrl(`${ourOrigin}ui/index.html`, ourOrigin)).toBe(true);
    expect(
      isExtensionUiTabUrl(
        `${ourOrigin}ui/index.html?act=capture&mediaId=x`,
        ourOrigin,
      ),
    ).toBe(true);

    // Other extension must not match when our origin is provided
    expect(
      isExtensionUiTabUrl(
        'chrome-extension://other-extension-id/ui/index.html',
        ourOrigin,
      ),
    ).toBe(false);

    // Relative path for unit tests without origin
    expect(isExtensionUiTabUrl('ui/index.html')).toBe(true);
    expect(isExtensionUiTabUrl('ui/index.html?act=capture&mediaId=x')).toBe(true);

    // Without origin: absolute chrome-extension URLs are rejected
    expect(isExtensionUiTabUrl('chrome-extension://id/ui/index.html')).toBe(false);

    // Random web URLs must not match even if path string appears
    expect(isExtensionUiTabUrl('https://example.com/ui/index.html', ourOrigin)).toBe(false);
    expect(isExtensionUiTabUrl('https://example.com/ui/index.html')).toBe(false);
    expect(isExtensionUiTabUrl('https://evil.example/path/ui/index.html?q=1')).toBe(false);
    expect(isExtensionUiTabUrl('http://localhost:5173/ui/index.html')).toBe(false);
    expect(isExtensionUiTabUrl('chrome-extension://id/popup.html', ourOrigin)).toBe(false);
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

  it('ignores other-extension UI tabs and creates a new tab', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      {
        id: 99,
        windowId: 1,
        url: 'chrome-extension://other-extension-id/ui/index.html',
      } as chrome.tabs.Tab,
    ]);

    await openCaptureCanvasTab('tmdb_movie_1');

    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(chrome.tabs.create).toHaveBeenCalled();
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
