import { h } from 'preact';

export interface FilmGrainProps {
  variant?: 'popup' | 'app';
}

export function FilmGrain({ variant = 'app' }: FilmGrainProps) {
  const filterId = variant === 'popup' ? 'film-grain-popup' : 'film-grain-app';

  return (
    <svg className={`film-grain film-grain-${variant}`} aria-hidden="true">
      <filter id={filterId}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}