import { describe, it, expect } from 'vitest';
import { THEME_LABELS } from '@/shared/themeLabels';

describe('THEME_LABELS', () => {
  it('maps theme preferences to Ferrari display names', () => {
    expect(THEME_LABELS.dark).toBe('Cinema Black');
    expect(THEME_LABELS.light).toBe('White Canvas');
    expect(THEME_LABELS.system).toBe('System');
  });
});
