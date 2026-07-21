import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export interface FilmGrainProps {
  variant?: 'popup' | 'app';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FilmGrain({ variant = 'app' }: FilmGrainProps) {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const filterId = variant === 'popup' ? 'film-grain-popup' : 'film-grain-app';

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Do not paint film grain when the user prefers reduced motion
  if (reducedMotion) {
    return null;
  }

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
