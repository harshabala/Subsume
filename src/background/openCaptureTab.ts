/**
 * Open the Poetic Capture Canvas in the extension UI.
 *
 * Prefer reusing an existing options/UI tab (url contains `ui/index.html`) so
 * Reflect does not pile new tabs. Falls back to chrome.tabs.create when none
 * are open. Deep link shape is always `?act=capture&mediaId=…`.
 */

/** Pure: build the capture canvas path relative to the extension root. */
export function buildCaptureCanvasPath(mediaId: string): string {
  return `ui/index.html?act=capture&mediaId=${encodeURIComponent(mediaId)}`;
}

/** Pure: full chrome-extension URL for capture (injectable getURL for tests). */
export function buildCaptureCanvasUrl(
  mediaId: string,
  getURL: (path: string) => string = (path) => chrome.runtime.getURL(path)
): string {
  return getURL(buildCaptureCanvasPath(mediaId));
}

/**
 * True when a tab URL is this extension's options/UI shell.
 * When extensionOrigin is provided (production), only match that origin + ui/index.html.
 * Without origin (unit tests): relative paths containing ui/index.html only.
 * Never match other extensions or http(s) URLs.
 */
export function isExtensionUiTabUrl(
  url: string | undefined | null,
  extensionOrigin?: string,
): boolean {
  if (!url) return false;
  if (extensionOrigin) {
    return url.startsWith(extensionOrigin) && url.includes('ui/index.html');
  }
  // Unit tests may pass relative paths (no scheme)
  if (!url.includes('://') && url.includes('ui/index.html')) {
    return true;
  }
  return false;
}

/**
 * Open capture for mediaId: update an existing extension UI tab if found,
 * otherwise create a new tab. Activates the chosen tab.
 */
export async function openCaptureCanvasTab(mediaId: string): Promise<{ success: true }> {
  const url = buildCaptureCanvasUrl(mediaId);
  // Derive own origin from getURL. Avoid URL.origin — chrome-extension: yields "null" in Node/tests.
  let extensionOrigin: string | undefined;
  try {
    const indexUrl = chrome.runtime.getURL('ui/index.html');
    const match = /^chrome-extension:\/\/[^/]+\//.exec(indexUrl);
    extensionOrigin = match?.[0];
  } catch {
    extensionOrigin = undefined;
  }

  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(
    (t) => isExtensionUiTabUrl(t.url, extensionOrigin) && typeof t.id === 'number',
  );

  if (existing?.id != null) {
    // Reuse: navigate existing options/UI tab to capture deep link and focus it.
    await chrome.tabs.update(existing.id, { url, active: true });
    if (existing.windowId != null) {
      try {
        await chrome.windows.update(existing.windowId, { focused: true });
      } catch {
        // windows API optional in some contexts
      }
    }
    return { success: true };
  }

  await chrome.tabs.create({ url, active: true });
  return { success: true };
}
