import { describe, it, expect } from 'vitest';
import { THEME_LABELS } from '@/shared/themeLabels';

describe('THEME_LABELS', () => {
  it('maps theme preferences to sanctuary display names', () => {
    expect(THEME_LABELS.dark).toBe('Gilded Night');
    expect(THEME_LABELS.light).toBe('Parchment');
    expect(THEME_LABELS.system).toBe('System');
  });
});