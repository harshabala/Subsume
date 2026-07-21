import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import type { Experience, WorkMedium } from '@/shared/catalogTypes';
import { statusLabel } from '@/shared/statusLabels';

export interface ExperienceHistoryProps {
  workId: string;
  medium?: WorkMedium | 'movie' | 'tv' | 'book';
  /** Bump to force a reload after creating a new experience. */
  refreshKey?: number;
}

function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatProgress(exp: Experience): string {
  const p = exp.progress;
  if (!p || typeof p.value !== 'number') return '—';
  if (p.unit === 'percent') return `${Math.round(p.value)}%`;
  if (p.unit === 'page') {
    return p.total ? `p. ${p.value} / ${p.total}` : `p. ${p.value}`;
  }
  if (p.unit === 'chapter') {
    return p.total ? `ch. ${p.value} / ${p.total}` : `ch. ${p.value}`;
  }
  if (p.unit === 'episode') {
    return p.total ? `ep. ${p.value} / ${p.total}` : `ep. ${p.value}`;
  }
  return String(p.value);
}

function resolveMedium(
  medium: ExperienceHistoryProps['medium'],
  kind: Experience['kind'],
): WorkMedium {
  if (medium === 'book' || kind === 'read') return 'book';
  if (medium === 'tv') return 'tv';
  return 'movie';
}

export function ExperienceHistory({
  workId,
  medium = 'movie',
  refreshKey = 0,
}: ExperienceHistoryProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ workId: string }, Experience[]>(
        MessageType.GET_EXPERIENCES,
        { workId },
      );
      setExperiences(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load experiences');
      setExperiences([]);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Only surface the section when there is more than one pass
  if (!loading && !error && experiences.length <= 1) {
    return null;
  }

  return (
    <div className="experience-history" data-testid="experience-history">
      <span className="sanctuary-detail-control-label">Times through</span>

      {loading && (
        <p className="experience-history-empty" data-testid="experience-history-loading">
          Loading sessions…
        </p>
      )}

      {error && (
        <p className="experience-history-error" role="alert">
          {error}
        </p>
      )}

      {!loading && experiences.length > 1 && (
        <ul className="experience-history-list" data-testid="experience-history-list">
          {experiences.map((exp, index) => {
            const m = resolveMedium(medium, exp.kind);
            const date =
              exp.completedAt ?? exp.abandonedAt ?? exp.startedAt ?? exp.createdAt;
            return (
              <li
                key={exp.id}
                className="experience-history-item"
                data-status={exp.status}
              >
                <div className="experience-history-meta">
                  <span className="experience-history-pass">
                    {index === 0 ? 'Latest' : `Pass ${experiences.length - index}`}
                  </span>
                  <time
                    className="experience-history-date"
                    dateTime={date ? new Date(date).toISOString() : undefined}
                  >
                    {formatDate(date)}
                  </time>
                  <span className="experience-history-status">
                    {statusLabel(exp.status, m)}
                  </span>
                </div>
                <div className="experience-history-stats">
                  <span className="experience-history-stat">
                    Rating{' '}
                    <strong>
                      {typeof exp.rating === 'number' ? exp.rating : '—'}
                    </strong>
                  </span>
                  <span className="experience-history-stat">
                    Progress <strong>{formatProgress(exp)}</strong>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
