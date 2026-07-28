/**
 * Pluggable web-search adapter for honest web-grounded dispatch.
 *
 * Production ships with NoopWebSearchAdapter (supportsWebSearch: false).
 * A real provider adapter (e.g. OpenAI Responses web_search) may be registered
 * when implemented end-to-end. Tests may inject a mock adapter.
 */

export interface WebSearchResult {
  url: string;
  title?: string;
  snippet?: string;
  /** ISO date or year string when known */
  publishedAt?: string;
}

export interface WebSearchOptions {
  maxResults?: number;
}

export interface WebSearchAdapter {
  /** Stable id for logging / diagnostics */
  id: string;
  /**
   * Whether this adapter can perform real web search.
   * When false, getLlmProviderCapabilities.supportsWebSearch stays false.
   */
  supportsWebSearch: boolean;
  search(query: string, options?: WebSearchOptions): Promise<WebSearchResult[]>;
}

/** Default production adapter — never claims web research. */
export class NoopWebSearchAdapter implements WebSearchAdapter {
  readonly id = 'noop';
  readonly supportsWebSearch = false;

  async search(_query: string, _options?: WebSearchOptions): Promise<WebSearchResult[]> {
    return [];
  }
}

const noop = new NoopWebSearchAdapter();
let activeAdapter: WebSearchAdapter = noop;

/** Active adapter used by capability registry and dispatch web path. */
export function getActiveWebSearchAdapter(): WebSearchAdapter {
  return activeAdapter;
}

/**
 * Register a web-search adapter (production real adapter or test mock).
 * Pass NoopWebSearchAdapter / call resetActiveWebSearchAdapter to clear.
 */
export function setActiveWebSearchAdapter(adapter: WebSearchAdapter): void {
  activeAdapter = adapter;
}

/** Restore Noop adapter (tests / teardown). */
export function resetActiveWebSearchAdapter(): void {
  activeAdapter = noop;
}

/**
 * Whether the active adapter is capable of web search.
 * Used by getLlmProviderCapabilities for honest supportsWebSearch.
 */
export function activeAdapterSupportsWebSearch(): boolean {
  return activeAdapter.supportsWebSearch === true;
}
