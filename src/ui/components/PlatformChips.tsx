import { h } from 'preact';
import { StreamingInfo } from '@/shared/types';
import { formatPlatformName } from '@/shared/platforms';

interface PlatformChipsProps {
  availability?: StreamingInfo[];
  max?: number;
  className?: string;
  compact?: boolean;
}

export function PlatformChips({
  availability,
  max,
  className = '',
  compact = false,
}: PlatformChipsProps) {
  if (!availability || availability.length === 0) return null;

  const items = max ? availability.slice(0, max) : availability;

  return (
    <div className={`platform-chips ${compact ? 'platform-chips--compact' : ''} ${className}`.trim()}>
      {items.map((info, index) => (
        <span
          key={`${info.platform}-${index}`}
          className="platform-chip"
          title={info.url ? `Watch on ${formatPlatformName(info.platform)}` : undefined}
        >
          {formatPlatformName(info.platform)}
        </span>
      ))}
    </div>
  );
}