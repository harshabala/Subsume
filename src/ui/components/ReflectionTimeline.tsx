import { h } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { sendMessage } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import type { Reflection, ReflectionKind } from '@/shared/catalogTypes';

export interface ReflectionTimelineProps {
  workId: string;
  medium?: 'movie' | 'tv' | 'book';
  /** When true, show abandonment prompt chips that prefill the textarea. */
  showAbandonPrompts?: boolean;
}

const KIND_LABELS: Record<ReflectionKind, string> = {
  first_impression: 'First impression',
  progress_note: 'Progress',
  completion_reflection: 'Completion',
  later_reflection: 'Later',
  quotation: 'Quotation',
  idea_spark: 'Idea spark',
};

const ABANDON_CHIPS = [
  'What made you stop?',
  'Would you try it again in another mood?',
  'Was it pacing, voice, subject, or length?',
];

function formatReflectionDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function ReflectionTimeline({
  workId,
  medium = 'movie',
  showAbandonPrompts = false,
}: ReflectionTimelineProps) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [locationLabel, setLocationLabel] = useState('');

  const load = useCallback(async () => {
    if (!workId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sendMessage<{ workId: string }, Reflection[]>(
        MessageType.GET_REFLECTIONS,
        { workId },
      );
      setReflections(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reflections');
      setReflections([]);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendMessage(MessageType.ADD_REFLECTION, {
        workId,
        kind: 'later_reflection' as ReflectionKind,
        body: trimmed,
      });
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reflection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddQuote = async () => {
    const text = quoteText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendMessage(MessageType.ADD_REFLECTION, {
        workId,
        kind: 'quotation' as ReflectionKind,
        body: text,
        userEnteredQuote: {
          text,
          locationLabel: locationLabel.trim() || undefined,
        },
      });
      setQuoteText('');
      setLocationLabel('');
      setShowQuoteForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const promptPlaceholder =
    medium === 'book'
      ? 'What has changed since you first wrote about it?'
      : 'What has changed since you first wrote about it?';

  return (
    <div className="reflection-timeline" data-testid="reflection-timeline">
      <span className="sanctuary-detail-control-label">Reflection timeline</span>

      {loading && (
        <p className="reflection-timeline-empty" data-testid="reflection-timeline-loading">
          Loading inscriptions…
        </p>
      )}

      {!loading && reflections.length === 0 && (
        <p className="reflection-timeline-empty">No later reflections yet.</p>
      )}

      {!loading && reflections.length > 0 && (
        <ul className="reflection-timeline-list" data-testid="reflection-timeline-list">
          {reflections.map((r) => (
            <li key={r.id} className="reflection-timeline-item" data-kind={r.kind}>
              <div className="reflection-timeline-meta">
                <span className={`reflection-timeline-badge kind-${r.kind}`}>
                  {KIND_LABELS[r.kind] ?? r.kind}
                </span>
                <time className="reflection-timeline-date" dateTime={new Date(r.createdAt).toISOString()}>
                  {formatReflectionDate(r.createdAt)}
                </time>
                {r.spoiler && <span className="reflection-timeline-spoiler">Spoiler</span>}
              </div>
              {r.title && <div className="reflection-timeline-title">{r.title}</div>}
              <p className="reflection-timeline-body">
                {r.kind === 'quotation' && r.userEnteredQuote
                  ? `“${r.userEnteredQuote.text}”`
                  : r.body}
              </p>
              {r.kind === 'quotation' && r.userEnteredQuote?.locationLabel && (
                <div className="reflection-timeline-location">
                  — {r.userEnteredQuote.locationLabel}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showAbandonPrompts && (
        <div className="reflection-timeline-abandon" data-testid="reflection-abandon-prompts">
          <span className="sanctuary-detail-control-label sanctuary-detail-control-label-sm">
            Did not finish
          </span>
          <div className="reflection-timeline-chips">
            {ABANDON_CHIPS.map((chip) => (
              <button
                type="button"
                key={chip}
                className="reflection-timeline-chip"
                onClick={() => setBody((prev) => (prev.trim() ? `${prev.trim()}\n${chip} ` : `${chip} `))}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="reflection-timeline-form">
        <textarea
          className="sanctuary-detail-input sanctuary-detail-textarea"
          rows={3}
          value={body}
          placeholder={promptPlaceholder}
          onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          data-testid="reflection-timeline-input"
        />
        <button
          type="button"
          className="sanctuary-btn-restraint"
          disabled={!body.trim() || submitting}
          onClick={() => void handleAdd()}
          data-testid="reflection-timeline-add"
        >
          {submitting ? 'Saving…' : 'Add reflection'}
        </button>
      </div>

      {medium === 'book' && (
        <div className="reflection-timeline-quote" data-testid="reflection-quote-section">
          {!showQuoteForm ? (
            <button
              type="button"
              className="reflection-timeline-quote-toggle"
              onClick={() => setShowQuoteForm(true)}
            >
              Add quotation
            </button>
          ) : (
            <div className="reflection-timeline-quote-form">
              <span className="sanctuary-detail-control-label sanctuary-detail-control-label-sm">
                Quotation (user-entered only)
              </span>
              <textarea
                className="sanctuary-detail-input sanctuary-detail-textarea"
                rows={2}
                value={quoteText}
                placeholder="A passage you want to carry with you…"
                onInput={(e) => setQuoteText((e.target as HTMLTextAreaElement).value)}
                data-testid="reflection-quote-text"
              />
              <input
                type="text"
                className="sanctuary-detail-input"
                value={locationLabel}
                placeholder="Location (e.g. ch. 4, p. 112)"
                onInput={(e) => setLocationLabel((e.target as HTMLInputElement).value)}
                data-testid="reflection-quote-location"
              />
              <p className="reflection-timeline-privacy-note">
                Only text you type is saved. Subsume does not scrape ebooks.
              </p>
              <div className="reflection-timeline-quote-actions">
                <button
                  type="button"
                  className="sanctuary-btn-restraint"
                  disabled={!quoteText.trim() || submitting}
                  onClick={() => void handleAddQuote()}
                  data-testid="reflection-quote-save"
                >
                  Save quotation
                </button>
                <button
                  type="button"
                  className="reflection-timeline-quote-cancel"
                  onClick={() => {
                    setShowQuoteForm(false);
                    setQuoteText('');
                    setLocationLabel('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="reflection-timeline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
