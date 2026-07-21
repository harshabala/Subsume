import { h } from 'preact';

export interface EmptyStateProjectionProps {
  title?: string;
  message?: string;
  hint?: string;
  className?: string;
  /** Optional primary action (e.g. clear filters) */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateProjection({
  title = 'Nothing inscribed yet',
  message = 'When a title stays with you, open its page and leave the first inscription.',
  hint,
  className = '',
  actionLabel,
  onAction,
}: EmptyStateProjectionProps) {
  return (
    <div className={`empty-state-projection ${className}`.trim()} data-testid="empty-state-projection">
      <div className="empty-state-projection-beam" aria-hidden="true" />
      <svg
        className="empty-state-projection-frame"
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="12"
          width="56"
          height="48"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <path
          d="M8 20h56M8 52h56M20 12v48M52 12v48"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.35"
        />
        <circle cx="36" cy="36" r="10" stroke="currentColor" strokeWidth="1.25" opacity="0.7" />
        <path
          d="M32 36l3 3 6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </svg>
      <h3 className="empty-state-projection-title">{title}</h3>
      <p className="empty-state-projection-message">{message}</p>
      {hint && <p className="empty-state-projection-hint">{hint}</p>}
      {actionLabel && onAction && (
        <button type="button" className="optical-button library-retry-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
