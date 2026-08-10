import { h } from 'preact';
import { useState } from 'preact/hooks';
import { validateTmdbKey } from '../lib/validateKeys';
import '../styles/onboarding.css';

/**
 * Wave 1 activation: onboarding is 2 steps only.
 * OMDb + LLM keys are deferred to Settings so first inscription can happen in <90s.
 */
export interface OnboardingPatch {
  tmdbApiKey: string;
  llmEnabled: boolean;
}

interface OnboardingProps {
  onComplete: (patch: OnboardingPatch) => void;
}

const TOTAL_STEPS = 2;
type Step = 1 | 2;

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const clearError = () => setError(null);

  const goTo = (next: Step) => {
    clearError();
    setStep(next);
  };

  const finish = (key: string) => {
    onComplete({
      tmdbApiKey: key.trim(),
      llmEnabled: false,
    });
  };

  const handleTmdbContinue = async () => {
    clearError();
    const trimmed = tmdbApiKey.trim();
    if (!trimmed) {
      setError("Paste a TMDb token to validate, or choose \"Enter without keys\".");
      return;
    }
    setValidating(true);
    try {
      const result = await validateTmdbKey(trimmed);
      if (!result.valid) {
        setError(result.error || 'TMDb key could not be validated.');
        return;
      }
      finish(trimmed);
    } finally {
      setValidating(false);
    }
  };

  const handleEnterWithoutKeys = () => {
    finish('');
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-glow-cool" />
      <div className="onboarding-glow-warm" />
      <div className="onboarding-rule-top" />

      <div className="onboarding-content">
        <div className="onboarding-monogram">SUBSUME</div>

        <nav className="onboarding-steps" aria-label="Setup progress">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = (i + 1) as Step;
            const state =
              n === step ? 'current' : n < step ? 'done' : 'upcoming';
            return (
              <span
                key={n}
                className={`onboarding-step-dot onboarding-step-dot--${state}`}
                aria-current={n === step ? 'step' : undefined}
                aria-label={`Step ${n} of ${TOTAL_STEPS}`}
              />
            );
          })}
        </nav>

        <div key={step} className="onboarding-step-pane">
          {step === 1 && (
            <section className="onboarding-step" aria-labelledby="onboarding-welcome-title">
              <h1 id="onboarding-welcome-title" className="onboarding-headline">
                Your private<br />picture palace.
              </h1>
              <div className="onboarding-divider" />
              <p className="onboarding-body">
                Not a tracker. Not a spreadsheet. A place to hold films, shows, and
                books that take hold of you — where afterglow and memory matter more
                than any algorithm&apos;s tally.
              </p>
              <div className="onboarding-pillars">
                {[
                  {
                    label: 'Discover',
                    description:
                      'Quiet plaques on the pages you browse — screen and page — without breaking your flow.',
                  },
                  {
                    label: 'Capture',
                    description:
                      'A quiet canvas asks what stayed with you. Resonance before metadata, always.',
                  },
                  {
                    label: 'Archive',
                    description:
                      'An editorial ledger of screen and books, arranged by intent, not date filed.',
                  },
                ].map((item) => (
                  <div key={item.label} className="onboarding-pillar">
                    <span className="onboarding-pillar-label">{item.label}</span>
                    <span className="onboarding-pillar-desc">{item.description}</span>
                  </div>
                ))}
              </div>
              <p className="onboarding-body onboarding-body--compact">
                You can inscribe a title in under a minute. Optional catalogue keys
                (TMDb) can wait until you want richer posters and search.
              </p>
              <button
                type="button"
                className="onboarding-cta"
                onClick={() => goTo(2)}
              >
                Begin
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-step" aria-labelledby="onboarding-tmdb-title">
              <h1 id="onboarding-tmdb-title" className="onboarding-headline onboarding-headline--step">
                Optional catalogue key
              </h1>
              <div className="onboarding-divider" />
              <p className="onboarding-body onboarding-body--compact">
                TMDb improves screen posters and search. Skip for now — free sources
                still work, and books use Open Library with no key. Add OMDb ratings
                or an AI curator later under Settings.
              </p>
              <div className="onboarding-form">
                <label className="onboarding-label" htmlFor="onboarding-tmdb-key">
                  TMDb API Read Access Token
                </label>
                <input
                  id="onboarding-tmdb-key"
                  className="onboarding-input"
                  type="password"
                  autoComplete="off"
                  placeholder="eyJ…"
                  value={tmdbApiKey}
                  onInput={(e) => {
                    clearError();
                    setTmdbApiKey((e.target as HTMLInputElement).value);
                  }}
                />
                <p className="onboarding-help">
                  Free at{' '}
                  <a
                    href="https://www.themoviedb.org/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="onboarding-link"
                  >
                    themoviedb.org/settings/api
                  </a>
                  . Use the API Read Access Token (Bearer), not the short API Key.
                </p>
                {error && (
                  <p className="onboarding-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="onboarding-actions">
                  <button
                    type="button"
                    className="onboarding-cta onboarding-cta--ghost"
                    onClick={handleEnterWithoutKeys}
                    disabled={validating}
                  >
                    Enter without keys
                  </button>
                  <button
                    type="button"
                    className="onboarding-cta"
                    onClick={handleTmdbContinue}
                    disabled={validating}
                  >
                    {validating ? 'Validating…' : 'Validate & enter'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="onboarding-rule-bottom" />
    </div>
  );
}
