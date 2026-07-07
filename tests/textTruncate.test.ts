import { describe, it, expect } from 'vitest';
import { truncateForExcerpt, needsExcerptTruncation, REFLECTION_CARD_EXCERPT_MAX } from '@/shared/textTruncate';

describe('textTruncate', () => {
  it('truncates long reflection text', () => {
    const long = 'A'.repeat(200);
    const out = truncateForExcerpt(long);
    expect(out.length).toBeLessThanOrEqual(REFLECTION_CARD_EXCERPT_MAX + 4);
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves short text unchanged', () => {
    const short = 'Brief note.';
    expect(truncateForExcerpt(short)).toBe(short);
    expect(needsExcerptTruncation(short)).toBe(false);
  });
});