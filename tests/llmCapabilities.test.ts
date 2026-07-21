import { describe, it, expect } from 'vitest';
import {
  getLlmProviderCapabilities,
  canClaimWebResearch,
} from '@/shared/llmCapabilities';

describe('getLlmProviderCapabilities', () => {
  it('returns chat-only for openai with web search disabled', () => {
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
});

describe('canClaimWebResearch', () => {
  it('is false when user has not opted in', () => {
    expect(canClaimWebResearch('openai', false)).toBe(false);
  });

  it('is false when provider lacks web search even if user opts in', () => {
    expect(canClaimWebResearch('openai', true)).toBe(false);
    expect(canClaimWebResearch('gemini', true)).toBe(false);
    expect(canClaimWebResearch('local', true)).toBe(false);
  });
});
