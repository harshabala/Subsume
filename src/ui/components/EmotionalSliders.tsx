import { h } from 'preact';
import { useId } from 'preact/hooks';
import type { EmotionalSpectrum } from '@/shared/emotions';
import { EMOTION_KEYS, EMOTION_LABELS } from '@/shared/emotions';

export interface EmotionalSlidersProps {
  values: EmotionalSpectrum;
  onChange: (key: keyof EmotionalSpectrum, value: number) => void;
  variant?: 'popup' | 'sanctuary';
  idPrefix?: string;
  className?: string;
}

export function EmotionalSliders({
  values,
  onChange,
  variant = 'sanctuary',
  idPrefix,
  className = '',
}: EmotionalSlidersProps) {
  const baseId = useId();
  const prefix = idPrefix ?? baseId.replace(/:/g, '');
  const containerClass = [
    variant === 'popup' ? 'sliders-container' : 'emotional-sliders-sanctuary',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} data-testid="emotional-sliders">
      {EMOTION_KEYS.map((key) => {
        const sliderId = `${prefix}-slider-${key}`;
        const labelId = `${prefix}-label-${key}`;
        const value = values[key];

        return (
          <div
            key={key}
            className={variant === 'popup' ? 'slider-group' : 'emotional-slider-group'}
          >
            <div className={variant === 'popup' ? 'slider-header' : 'emotional-slider-header'}>
              <span id={labelId}>{EMOTION_LABELS[key]}</span>
              <span className={variant === 'popup' ? 'slider-value' : 'emotional-slider-value'}>
                {value}
              </span>
            </div>
            <div className={variant === 'popup' ? 'slider-row' : 'emotional-slider-row'}>
              <input
                type="range"
                className={variant === 'popup' ? 'slider-input' : 'emotional-slider-input'}
                id={sliderId}
                min={0}
                max={100}
                value={value}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
                aria-labelledby={labelId}
                onInput={(e) =>
                  onChange(key, parseInt((e.currentTarget as HTMLInputElement).value, 10))
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}