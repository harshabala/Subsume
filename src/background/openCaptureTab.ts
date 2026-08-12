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
 * True when a tab URL is this extension's options/UI shell
 * (path contains ui/index.html). Used to find a tab to reuse.
 */
export function isExtensionUiTabUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('ui/index.html');
}

/**
 * Open capture for mediaId: update an existing extension UI tab if found,
 * otherwise create a new tab. Activates the chosen tab.
 */
export async function openCaptureCanvasTab(mediaId: string): Promise<{ success: true }> {
  const url = buildCaptureCanvasUrl(mediaId);

  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((t) => isExtensionUiTabUrl(t.url) && typeof t.id === 'number');

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
