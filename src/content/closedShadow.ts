/**
 * Closed Shadow DOM + trusted-gesture helpers for content-script plaques.
 *
 * Closed roots are not readable via host.shadowRoot from the page; we keep a
 * private WeakMap for our own rendering and for unit tests.
 */

const closedShadows = new WeakMap<HTMLElement, ShadowRoot>();

/** Module-private mark used only by dispatchTrustedClick under Vitest (jsdom). */
const TEST_TRUSTED = Symbol('subsume.testTrusted');

function vitestActive(): boolean {
  try {
    // Vite/Vitest injects import.meta.env.VITEST (false/undefined in production builds)
    const meta = import.meta as ImportMeta & { env?: { VITEST?: boolean | string } };
    if (meta.env?.VITEST) return true;
    // Fallback for runners that set process.env.VITEST without Vite env
    const g = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return Boolean(g.process?.env?.VITEST);
  } catch {
    return false;
  }
}

/** Attach a closed shadow root and remember it privately. */
export function attachClosedShadow(host: HTMLElement): ShadowRoot {
  const root = host.attachShadow({ mode: 'closed' });
  closedShadows.set(host, root);
  return root;
}

/** Look up a previously attached closed shadow root (not via host.shadowRoot). */
export function getClosedShadowRoot(host: HTMLElement): ShadowRoot | undefined {
  return closedShadows.get(host);
}

/**
 * True only for user-initiated browser gestures.
 * Synthetic page scripts (and jsdom `.click()`) set isTrusted=false.
 *
 * Under Vitest, also accepts events marked by {@link dispatchTrustedClick}
 * because jsdom cannot forge real isTrusted=true events.
 */
export function isTrustedGesture(event: Event | null | undefined): boolean {
  if (!event) return false;
  if (event.isTrusted === true) return true;
  if (vitestActive() && (event as unknown as Record<symbol, boolean>)[TEST_TRUSTED] === true) {
    return true;
  }
  return false;
}

/**
 * Unit-test helper: dispatch a click accepted by {@link isTrustedGesture}.
 * In production builds (no VITEST) this only fires an untrusted event — do not
 * rely on it outside tests. Real browsers cannot forge trusted user gestures.
 */
export function dispatchTrustedClick(target: EventTarget): boolean {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  });
  if (vitestActive()) {
    (event as unknown as Record<symbol, boolean>)[TEST_TRUSTED] = true;
  }
  return target.dispatchEvent(event);
}
