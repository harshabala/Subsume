import { h } from 'preact';
import type { EmotionalSpectrum } from '@/shared/emotions';

export interface AuraVisualizerProps {
  values: EmotionalSpectrum;
  label?: string;
  variant?: 'popup' | 'sanctuary';
  className?: string;
  /** One-shot settle ceremony class (e.g. after notes save). */
  ceremony?: boolean;
}

export function AuraVisualizer({
  values,
  label = 'Generated Aura Spectrum',
  variant = 'sanctuary',
  className = '',
  ceremony = false,
}: AuraVisualizerProps) {
  // CSS custom properties enable @property-based interpolation of gradient stops.
  const auraVars = {
    '--aura-awe': `${values.awe}%`,
    '--aura-melancholy': `${values.melancholy}%`,
    '--aura-tension': `${values.tension}%`,
    '--aura-warmth': `${values.warmth}%`,
  } as h.JSX.CSSProperties;

  if (variant === 'popup') {
    return (
      <div className={`vibe-visualizer ${className}`.trim()} data-testid="aura-visualizer">
        <div className="vibe-glow-layer" style={auraVars} />
        <span className="vibe-label">{label}</span>
      </div>
    );
  }

  const sanctuaryClass = [
    'aura-visualizer-sanctuary',
    ceremony ? 'save-ceremony' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sanctuaryClass} data-testid="aura-visualizer">
      <div className="aura-visualizer-glow" style={auraVars} />
      <span className="aura-visualizer-label">{label}</span>
    </div>
  );
}
