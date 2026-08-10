import { h, type JSX } from 'preact';

/**
 * Wave 3 house monoline icons — Cinema Black / Rosso system.
 * 1.5 stroke, 24 viewBox, currentColor. Prefer these over Material Symbols.
 */

export type IconName =
  | 'close'
  | 'menu'
  | 'settings'
  | 'search'
  | 'star'
  | 'external'
  | 'capture'
  | 'plus'
  | 'check'
  | 'trash'
  | 'book'
  | 'screen'
  | 'alert'
  | 'stats';

interface IconProps extends JSX.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
  /** Decorative by default; set label for standalone controls */
  label?: string;
}

const PATHS: Record<IconName, JSX.Element> = {
  close: (
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  menu: (
    <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16l4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  star: (
    <path
      d="M12 3.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.8l5-.7L12 3.5z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  external: (
    <path
      d="M10 5H5v14h14v-5M14 5h5v5M19 5l-8 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  capture: (
    <>
      <rect x="4" y="7" width="16" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7l1-2h4l1 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  plus: (
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  trash: (
    <path
      d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  book: (
    <path
      d="M5 5.5c0-.8.7-1.5 1.5-1.5H12v16H6.5A1.5 1.5 0 015 18.5v-13zM19 5.5c0-.8-.7-1.5-1.5-1.5H12v16h5.5a1.5 1.5 0 001.5-1.5v-13z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  screen: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 20h8M12 17v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3L12 4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 10v4M12 16.5h.01" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  stats: (
    <path
      d="M5 19V10M12 19V5M19 19v-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
};

export function Icon({ name, size = 20, label, className, ...rest }: IconProps) {
  const decorative = !label;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className ? `house-icon ${className}` : 'house-icon'}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={label}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Inline star for ratings (content hover cards, etc.) */
export function RatingStar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS.star}
    </svg>
  );
}
