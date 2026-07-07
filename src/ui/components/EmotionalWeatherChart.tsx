import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import type { LibraryItem } from '@/shared/types';
import {
  buildWavePath,
  computeEmotionalAverages,
  getEmotionalSpectrum,
  getRecentEmotionalLogs,
  EMOTION_KEYS,
  EMOTION_LABELS,
} from '@/shared/emotions';

export interface EmotionalWeatherChartProps {
  items: LibraryItem[];
  maxLogs?: number;
  className?: string;
}

const CHART_WIDTH = 400;
const CHART_HEIGHT = 120;

const EMOTION_COLORS: Record<string, string> = {
  awe: 'var(--color-awe)',
  melancholy: 'var(--color-melancholy)',
  tension: 'var(--color-tension)',
  warmth: 'var(--color-warmth)',
};

export function EmotionalWeatherChart({
  items,
  maxLogs = 30,
  className = '',
}: EmotionalWeatherChartProps) {
  const recentLogs = useMemo(() => getRecentEmotionalLogs(items, maxLogs), [items, maxLogs]);
  const averages = useMemo(() => computeEmotionalAverages(items), [items]);

  if (!averages || recentLogs.length === 0) {
    return (
      <div className={`emotional-weather-chart empty ${className}`.trim()} data-testid="emotional-weather-chart">
        <p className="emotional-weather-empty-text">
          Log emotional reflections to reveal your sanctuary&apos;s mood soundwave.
        </p>
      </div>
    );
  }

  const series = EMOTION_KEYS.map((key) => ({
    key,
    label: EMOTION_LABELS[key],
    color: EMOTION_COLORS[key],
    path: buildWavePath(
      recentLogs.map((item) => getEmotionalSpectrum(item)[key]),
      CHART_WIDTH,
      CHART_HEIGHT,
    ),
    average: averages[key],
  }));

  return (
    <div className={`emotional-weather-chart ${className}`.trim()} data-testid="emotional-weather-chart">
      <div className="emotional-weather-header">
        <div>
          <span className="emotional-weather-kicker">Emotional Weather</span>
          <h3 className="emotional-weather-title">Mood over time</h3>
          <p className="emotional-weather-desc">
            Average mood vectors across your last {recentLogs.length} reflection
            {recentLogs.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="emotional-weather-svg-wrap">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="emotional-weather-svg"
          role="img"
          aria-label="Emotional weather soundwave chart"
        >
          <defs>
            <linearGradient id="weather-grid-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--card-border)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--card-border)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={0}
              y1={CHART_HEIGHT * ratio}
              x2={CHART_WIDTH}
              y2={CHART_HEIGHT * ratio}
              stroke="url(#weather-grid-fade)"
              strokeWidth="1"
            />
          ))}
          {series.map((line) => (
            <path
              key={line.key}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.9"
            />
          ))}
        </svg>
      </div>

      <div className="emotional-weather-legend">
        {series.map((line) => (
          <div key={line.key} className="emotional-weather-legend-item">
            <span className="emotional-weather-legend-dot" style={{ background: line.color }} />
            <span className="emotional-weather-legend-label">{line.label}</span>
            <span className="emotional-weather-legend-value">{line.average}</span>
          </div>
        ))}
      </div>
    </div>
  );
}