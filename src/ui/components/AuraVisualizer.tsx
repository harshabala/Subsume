import { h } from 'preact';
import type { EmotionalSpectrum } from '@/shared/emotions';

export interface AuraVisualizerProps {
  values: EmotionalSpectrum;
  label?: string;
  variant?: 'popup' | 'sanctuary';
  className?: string;
}

export function AuraVisualizer({
  values,
  label = 'Generated Aura Spectrum',
  variant = 'sanctuary',
  className = '',
}: AuraVisualizerProps) {
  const auraStyle = {
    background: `
      radial-gradient(circle at 10% 20%, var(--color-awe) 0%, transparent ${values.awe}%),
      radial-gradient(circle at 90% 10%, var(--color-melancholy) 0%, transparent ${values.melancholy}%),
      radial-gradient(circle at 20% 90%, var(--color-tension) 0%, transparent ${values.tension}%),
      radial-gradient(circle at 80% 80%, var(--color-warmth) 0%, transparent ${values.warmth}%)
    `,
  };

  if (variant === 'popup') {
    return (
      <div className={`vibe-visualizer ${className}`.trim()} data-testid="aura-visualizer">
        <div className="vibe-glow-layer" style={auraStyle} />
        <span className="vibe-label">{label}</span>
      </div>
    );
  }

  return (
    <div className={`aura-visualizer-sanctuary ${className}`.trim()} data-testid="aura-visualizer">
      <div className="aura-visualizer-glow" style={auraStyle} />
      <span className="aura-visualizer-label">{label}</span>
    </div>
  );
}