/**
 * LLM provider capability registry.
 * Catalog-only recommendation dispatch: providers report chat only unless
 * a functional WebSearchAdapter is registered (supportsWebSearch true).
 */

import { activeAdapterSupportsWebSearch } from './webSearchAdapter';

export type LlmCapability = 'chat' | 'web_search';

export interface LlmProviderCapabilities {
  provider: 'openai' | 'anthropic' | 'gemini' | 'local';
  capabilities: LlmCapability[];
  supportsWebSearch: boolean;
}

const KNOWN_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'local']);

/**
 * Capability map for configured LLM providers.
 * supportsWebSearch is true only when an active WebSearchAdapter reports
 * supportsWebSearch — production default is Noop (false). Honest catalog-only
 * until a real tool path is registered and functional.
 */
export function getLlmProviderCapabilities(provider: string): LlmProviderCapabilities {
  const normalized = (provider || 'openai').toLowerCase().trim();
  const known = (
    KNOWN_PROVIDERS.has(normalized) ? normalized : 'openai'
  ) as LlmProviderCapabilities['provider'];

  const supportsWebSearch = activeAdapterSupportsWebSearch();

  return {
    provider: known,
    capabilities: supportsWebSearch ? ['chat', 'web_search'] : ['chat'],
    supportsWebSearch,
  };
}

/**
 * Whether the app may claim web research for this provider + user opt-in.
 * Requires both active adapter capability and explicit user preference.
 */
export function canClaimWebResearch(provider: string, userOptIn: boolean): boolean {
  if (!userOptIn) return false;
  return getLlmProviderCapabilities(provider).supportsWebSearch;
}

/**
 * Resolve dispatch web-search opt-in from prefs.
 * Primary: webGroundedDispatchEnabled; legacy alias: dispatchWebSearchEnabled.
 */
export function isWebGroundedDispatchOptIn(prefs: {
  webGroundedDispatchEnabled?: boolean;
  dispatchWebSearchEnabled?: boolean;
}): boolean {
  return prefs.webGroundedDispatchEnabled === true || prefs.dispatchWebSearchEnabled === true;
}
