import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  REFLECTION_CARD_EXCERPT_MAX,
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

  return (
    <div
      className={[
        'reflection-excerpt-block',
        canTruncate ? 'reflection-excerpt-expandable' : '',
        expanded ? 'reflection-excerpt-expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="reflection-excerpt-panel">
        <div className="reflection-excerpt-panel-inner">
          <p className={className}>&ldquo;{trimmed}&rdquo;</p>
        </div>
      </div>
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
