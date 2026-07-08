import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  REFLECTION_CARD_EXCERPT_MAX,
  truncateForExcerpt,
  needsExcerptTruncation,
} from '@/shared/textTruncate';

export interface ExpandableReflectionProps {
  text: string;
  className?: string;
  maxLength?: number;
  /** When true, clicking expand opens full text inline; card click still handled by parent if needed */
  onToggleExpand?: (expanded: boolean) => void;
}

export function ExpandableReflection({
  text,
  className = 'hardcover-snippet hardcover-snippet-lead',
  maxLength = REFLECTION_CARD_EXCERPT_MAX,
  onToggleExpand,
}: ExpandableReflectionProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const canTruncate = needsExcerptTruncation(trimmed, maxLength);
  const display = expanded || !canTruncate ? trimmed : truncateForExcerpt(trimmed, maxLength);

  return (
    <div className={`reflection-excerpt-block ${expanded ? 'reflection-excerpt-expanded' : ''}`}>
      <p className={`${className} ${!expanded && canTruncate ? 'reflection-excerpt-clamped' : ''}`}>
        &ldquo;{display}&rdquo;
      </p>
      {canTruncate && (
        <button
          type="button"
          className="reflection-excerpt-toggle"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            const next = !expanded;
            setExpanded(next);
            onToggleExpand?.(next);
          }}
        >
          {expanded ? 'Show less' : 'Read full inscription'}
        </button>
      )}
    </div>
  );
}