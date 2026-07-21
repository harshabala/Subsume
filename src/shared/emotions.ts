import type { LibraryItem } from './types';

export interface EmotionalSpectrum {
  awe: number;
  melancholy: number;
  tension: number;
  warmth: number;
}

export const DEFAULT_EMOTIONS: EmotionalSpectrum = {
  awe: 50,
  melancholy: 50,
  tension: 50,
  warmth: 50,
};

export const EMOTION_KEYS: (keyof EmotionalSpectrum)[] = [
  'awe',
  'melancholy',
  'tension',
  'warmth',
];

/** Default (screen) labels. Prefer emotionLabel(key, medium) from statusLabels for medium-aware UI. */
export const EMOTION_LABELS: Record<keyof EmotionalSpectrum, string> = {
  awe: 'Awe · the sublime frame',
  melancholy: 'Melancholy · sorrow in the cut',
  tension: 'Tension · the held breath',
  warmth: 'Warmth · afterglow and return',
};

export const EMOTION_LABELS_BOOK: Record<keyof EmotionalSpectrum, string> = {
  awe: 'Awe · the world it opened',
  melancholy: 'Melancholy · what lingered between the lines',
  tension: 'Tension · the pull to turn the page',
  warmth: 'Warmth · the company it kept',
};

export function emotionLabelsForMedium(
  medium: 'movie' | 'tv' | 'book'
): Record<keyof EmotionalSpectrum, string> {
  return medium === 'book' ? EMOTION_LABELS_BOOK : EMOTION_LABELS;
}

export function hasEmotionalData(item: LibraryItem): boolean {
  return (
    item.awe !== undefined ||
    item.melancholy !== undefined ||
    item.tension !== undefined ||
    item.warmth !== undefined
  );
}

export function getEmotionalSpectrum(item: LibraryItem): EmotionalSpectrum {
  return {
    awe: item.awe ?? DEFAULT_EMOTIONS.awe,
    melancholy: item.melancholy ?? DEFAULT_EMOTIONS.melancholy,
    tension: item.tension ?? DEFAULT_EMOTIONS.tension,
    warmth: item.warmth ?? DEFAULT_EMOTIONS.warmth,
  };
}

export function computeEmotionalAverages(items: LibraryItem[]): EmotionalSpectrum | null {
  const withData = items.filter(hasEmotionalData);
  if (withData.length === 0) return null;

  const sum = { awe: 0, melancholy: 0, tension: 0, warmth: 0 };
  for (const item of withData) {
    const spectrum = getEmotionalSpectrum(item);
    sum.awe += spectrum.awe;
    sum.melancholy += spectrum.melancholy;
    sum.tension += spectrum.tension;
    sum.warmth += spectrum.warmth;
  }

  const count = withData.length;
  return {
    awe: Math.round(sum.awe / count),
    melancholy: Math.round(sum.melancholy / count),
    tension: Math.round(sum.tension / count),
    warmth: Math.round(sum.warmth / count),
  };
}

export function getRecentEmotionalLogs(items: LibraryItem[], limit = 30): LibraryItem[] {
  return items
    .filter(hasEmotionalData)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit)
    .reverse();
}

export function buildWavePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height - (values[0] / 100) * (height * 0.85) - height * 0.075;
    return `M 0,${y} L ${width},${y}`;
  }

  const step = width / (values.length - 1);
  const points = values.map((value, index) => ({
    x: index * step,
    y: height - (value / 100) * (height * 0.85) - height * 0.075,
  }));

  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    path += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }
  return path;
}