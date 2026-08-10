import { h } from 'preact';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  /** Primary fills with brand CTA styling; secondary is quieter. */
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProjectionProps {
  title?: string;
  message?: string;
  hint?: string;
  className?: string;
  /** Optional primary action (e.g. clear filters) — kept for single-CTA call sites */
  actionLabel?: string;
  onAction?: () => void;
  /** Multiple CTAs (Wave 1 empty Archive). Overrides single actionLabel when provided. */
  actions?: EmptyStateAction[];
}

export function EmptyStateProjection({
  title = 'Nothing inscribed yet',
  message = 'When a title stays with you, open its page and leave the first inscription.',
  hint,
  className = '',
  actionLabel,
  onAction,
  actions,
}: EmptyStateProjectionProps) {
  const resolvedActions: EmptyStateAction[] =
    actions && actions.length > 0
      ? actions
      : actionLabel && onAction
        ? [{ label: actionLabel, onClick: onAction, variant: 'primary' }]
        : [];

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
      {resolvedActions.length > 0 && (
        <div className="empty-state-projection-actions" role="group" aria-label="Next steps">
          {resolvedActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.variant === 'secondary'
                  ? 'optical-button sm library-retry-btn'
                  : 'optical-button library-retry-btn'
              }
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
