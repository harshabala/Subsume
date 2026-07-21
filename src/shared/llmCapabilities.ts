/**
 * LLM provider capability registry.
 * Catalog-only recommendation dispatch: providers report chat only unless
 * tool/web-search call paths are explicitly implemented.
 */

export type LlmCapability = 'chat' | 'web_search';

export interface LlmProviderCapabilities {
  provider: 'openai' | 'anthropic' | 'gemini' | 'local';
  capabilities: LlmCapability[];
  supportsWebSearch: boolean;
}

const KNOWN_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'local']);

/**
 * Capability map for configured LLM providers.
 * supportsWebSearch defaults to false for all — honest catalog-only dispatch
 * unless tool-call web research is implemented end-to-end.
 */
export function getLlmProviderCapabilities(provider: string): LlmProviderCapabilities {
  const normalized = (provider || 'openai').toLowerCase().trim();
  const known = (
    KNOWN_PROVIDERS.has(normalized) ? normalized : 'openai'
  ) as LlmProviderCapabilities['provider'];

  // Optional tools (web_search) exist on some APIs but Subsume does not wire them yet.
  return {
    provider: known,
    capabilities: ['chat'],
    supportsWebSearch: false,
  };
}

/**
 * Whether the app may claim web research for this provider + user opt-in.
 * Requires both provider capability and explicit user preference.
 */
export function canClaimWebResearch(provider: string, userOptIn: boolean): boolean {
  if (!userOptIn) return false;
  return getLlmProviderCapabilities(provider).supportsWebSearch;
}
