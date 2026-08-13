import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import '../styles/onboarding.css';
import '../styles/first-inscription-gate.css';

export const FIRST_INSCRIPTION_GATE_SESSION_KEY = 'subsume_first_inscription_gate_skipped';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Pure: Discovery first-inscription banner when incomplete and library empty. */
export function shouldShowDiscoveryFirstInscriptionBanner(
  firstInscriptionComplete: boolean | undefined,
  libraryCount: number,
  loading = false,
): boolean {
  return !loading && !firstInscriptionComplete && libraryCount === 0;
}

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryCtaRef = useRef<HTMLButtonElement>(null);

  // Focus primary CTA on mount; trap Tab; Escape soft-skips (matches drawer / capture modals)
  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      primaryCtaRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkipLater();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSkipLater]);

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
      ref={dialogRef}
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
            ref={primaryCtaRef}
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
