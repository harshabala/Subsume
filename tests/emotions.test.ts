import { describe, it, expect } from 'vitest';
import type { LibraryItem } from '@/shared/types';
import {
  hasEmotionalData,
  getEmotionalSpectrum,
  computeEmotionalAverages,
  getRecentEmotionalLogs,
  buildWavePath,
  DEFAULT_EMOTIONS,
} from '@/shared/emotions';

function makeLibraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    mediaId: 'media_1',
    status: 'watched',
    addedAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('emotions utilities', () => {
  it('detects emotional data on library items', () => {
    expect(hasEmotionalData(makeLibraryItem())).toBe(false);
    expect(hasEmotionalData(makeLibraryItem({ awe: 40 }))).toBe(true);
  });

  it('fills missing spectrum values with defaults', () => {
    expect(getEmotionalSpectrum(makeLibraryItem({ awe: 80 }))).toEqual({
      awe: 80,
      melancholy: DEFAULT_EMOTIONS.melancholy,
      tension: DEFAULT_EMOTIONS.tension,
      warmth: DEFAULT_EMOTIONS.warmth,
    });
  });

  it('computes averages across logged items', () => {
    const averages = computeEmotionalAverages([
      makeLibraryItem({ awe: 80, melancholy: 60, tension: 40, warmth: 70 }),
      makeLibraryItem({ awe: 60, melancholy: 40, tension: 60, warmth: 50 }),
    ]);

    expect(averages).toEqual({
      awe: 70,
      melancholy: 50,
      tension: 50,
      warmth: 60,
    });
  });

  it('returns recent emotional logs in chronological order', () => {
    const logs = getRecentEmotionalLogs([
      makeLibraryItem({ mediaId: 'a', updatedAt: 100, awe: 10 }),
      makeLibraryItem({ mediaId: 'b', updatedAt: 300, awe: 30 }),
      makeLibraryItem({ mediaId: 'c', updatedAt: 200, awe: 20 }),
      makeLibraryItem({ mediaId: 'd', updatedAt: 400 }),
    ], 2);

    expect(logs.map((item) => item.mediaId)).toEqual(['c', 'b']);
  });

  it('builds a wave path for chart rendering', () => {
    const path = buildWavePath([20, 80, 50], 300, 100);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.includes('C ')).toBe(true);
  });
});