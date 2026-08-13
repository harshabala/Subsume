import { h } from 'preact';
import { useState } from 'preact/hooks';
import '../styles/onboarding.css';
import '../styles/first-inscription-gate.css';

export const FIRST_INSCRIPTION_GATE_SESSION_KEY = 'subsume_first_inscription_gate_skipped';

interface FirstInscriptionGateProps {
  /** Navigate primary shell (e.g. Search). */
  onNavigate: (page: 'search') => void;
  /** Soft-skip: persist firstInscriptionSkippedAt + dismiss full-screen for this session. */
  onSkipLater: () => void;
  /**
   * One-tap practice title: seed demo library if empty, then open capture/search.
   * Optional so unit tests can omit it.
   */
  onPracticeTitle?: () => void | Promise<void>;
}

/**
 * Blocking-but-skippable full-screen gate after onboarding until first archive inscription.
 * Soft skip hides only this overlay for the session; Discovery banner remains until complete.
 */
export function FirstInscriptionGate({
  onNavigate,
  onSkipLater,
  onPracticeTitle,
}: FirstInscriptionGateProps) {
  const [practiceBusy, setPracticeBusy] = useState(false);

  const handlePractice = async () => {
    if (!onPracticeTitle || practiceBusy) return;
    setPracticeBusy(true);
    try {
      await onPracticeTitle();
    } finally {
      setPracticeBusy(false);
    }
  };

  return (
    <div
      className="first-inscription-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-inscription-gate-title"
      data-testid="first-inscription-gate"
    >
      <div className="onboarding-glow-cool" />
      <div className="onboarding-glow-warm" />
      <div className="first-inscription-gate-content">
        <div className="onboarding-monogram">SUBSUME</div>
        <h1 id="first-inscription-gate-title" className="onboarding-headline first-inscription-gate-headline">
          Save your first reflection
        </h1>
        <div className="onboarding-divider" />
        <p className="onboarding-body">
          Private movie &amp; book journal. Save your first reflection — search a title you care about
          and write what stayed with you. Everything stays on this device.
        </p>
        <div className="first-inscription-gate-actions">
          <button
            type="button"
            className="onboarding-cta"
            onClick={() => onNavigate('search')}
          >
            Search for a title
          </button>
          {onPracticeTitle && (
            <button
              type="button"
              className="first-inscription-gate-practice"
              data-testid="practice-title-cta"
              disabled={practiceBusy}
              onClick={() => {
                void handlePractice();
              }}
            >
              {practiceBusy ? 'Preparing…' : 'Try with a practice title'}
            </button>
          )}
          <button
            type="button"
            className="first-inscription-gate-skip"
            onClick={onSkipLater}
          >
            I&apos;ll do this later
          </button>
        </div>
      </div>
    </div>
  );
}
