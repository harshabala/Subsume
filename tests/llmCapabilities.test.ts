import { describe, it, expect, afterEach } from 'vitest';
import {
  getLlmProviderCapabilities,
  canClaimWebResearch,
  isWebGroundedDispatchOptIn,
} from '@/shared/llmCapabilities';
import {
  resetActiveWebSearchAdapter,
  setActiveWebSearchAdapter,
  type WebSearchAdapter,
} from '@/shared/webSearchAdapter';

afterEach(() => {
  resetActiveWebSearchAdapter();
});

describe('getLlmProviderCapabilities', () => {
  it('returns chat-only for openai with web search disabled (default Noop adapter)', () => {
    const caps = getLlmProviderCapabilities('openai');
    expect(caps.provider).toBe('openai');
    expect(caps.capabilities).toEqual(['chat']);
    expect(caps.supportsWebSearch).toBe(false);
  });

  it('returns chat-only for anthropic, gemini, and local', () => {
    for (const provider of ['anthropic', 'gemini', 'local'] as const) {
      const caps = getLlmProviderCapabilities(provider);
      expect(caps.provider).toBe(provider);
      expect(caps.capabilities).toEqual(['chat']);
      expect(caps.supportsWebSearch).toBe(false);
    }
  });

  it('normalizes unknown providers to openai defaults', () => {
    const caps = getLlmProviderCapabilities('unknown-vendor');
    expect(caps.provider).toBe('openai');
    expect(caps.supportsWebSearch).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(getLlmProviderCapabilities('OpenAI').provider).toBe('openai');
    expect(getLlmProviderCapabilities('ANTHROPIC').provider).toBe('anthropic');
  });

  it('reports supportsWebSearch when a capable adapter is registered', () => {
    const mock: WebSearchAdapter = {
      id: 'mock',
      supportsWebSearch: true,
      search: async () => [],
    };
    setActiveWebSearchAdapter(mock);
    const caps = getLlmProviderCapabilities('openai');
    expect(caps.supportsWebSearch).toBe(true);
    expect(caps.capabilities).toEqual(['chat', 'web_search']);
  });
});

describe('canClaimWebResearch', () => {
  it('is false when user has not opted in', () => {
    expect(canClaimWebResearch('openai', false)).toBe(false);
  });

  it('is false when adapter lacks web search even if user opts in', () => {
    expect(canClaimWebResearch('openai', true)).toBe(false);
    expect(canClaimWebResearch('gemini', true)).toBe(false);
    expect(canClaimWebResearch('local', true)).toBe(false);
  });

  it('is true only when adapter supports web search and user opts in', () => {
    setActiveWebSearchAdapter({
      id: 'mock',
      supportsWebSearch: true,
      search: async () => [],
    });
    expect(canClaimWebResearch('openai', true)).toBe(true);
    expect(canClaimWebResearch('openai', false)).toBe(false);
  });
});

describe('isWebGroundedDispatchOptIn', () => {
  it('reads webGroundedDispatchEnabled primary flag', () => {
    expect(isWebGroundedDispatchOptIn({ webGroundedDispatchEnabled: true })).toBe(true);
    expect(isWebGroundedDispatchOptIn({ webGroundedDispatchEnabled: false })).toBe(false);
  });

  it('accepts legacy dispatchWebSearchEnabled alias', () => {
    expect(isWebGroundedDispatchOptIn({ dispatchWebSearchEnabled: true })).toBe(true);
  });

  it('is false when neither flag is set', () => {
    expect(isWebGroundedDispatchOptIn({})).toBe(false);
  });
});
