import { h } from 'preact';
import { useState } from 'preact/hooks';
import { validateTmdbKey } from '../lib/validateKeys';
import {
  FIRST_SESSION_HEADLINE,
  FIRST_SESSION_PITCH,
  FIRST_SESSION_POETRY_SUBTEXT,
  FIRST_SESSION_PILLARS,
  FIRST_SESSION_MINUTE_NOTE,
  ONBOARDING_BEGIN_LABEL,
  ONBOARDING_STEP2_HEADLINE,
  ONBOARDING_STEP2_SKIP_LABEL,
  ONBOARDING_STEP2_VALIDATE_LABEL,
} from '@/shared/productCopy';
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
                {FIRST_SESSION_HEADLINE}
              </h1>
              <div className="onboarding-divider" />
              <p className="onboarding-body">
                {FIRST_SESSION_PITCH}
              </p>
              <p className="onboarding-body onboarding-body--compact onboarding-body--poetry">
                {FIRST_SESSION_POETRY_SUBTEXT}
              </p>
              <div className="onboarding-pillars">
                {FIRST_SESSION_PILLARS.map((item) => (
                  <div key={item.label} className="onboarding-pillar">
                    <span className="onboarding-pillar-label">{item.label}</span>
                    <span className="onboarding-pillar-desc">{item.description}</span>
                  </div>
                ))}
              </div>
              <p className="onboarding-body onboarding-body--compact">
                {FIRST_SESSION_MINUTE_NOTE}
              </p>
              <button
                type="button"
                className="onboarding-cta"
                onClick={() => goTo(2)}
              >
                {ONBOARDING_BEGIN_LABEL}
              </button>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-step" aria-labelledby="onboarding-tmdb-title">
              <h1 id="onboarding-tmdb-title" className="onboarding-headline onboarding-headline--step">
                {ONBOARDING_STEP2_HEADLINE}
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
                    {ONBOARDING_STEP2_SKIP_LABEL}
                  </button>
                  <button
                    type="button"
                    className="onboarding-cta"
                    onClick={handleTmdbContinue}
                    disabled={validating}
                  >
                    {validating ? 'Validating…' : ONBOARDING_STEP2_VALIDATE_LABEL}
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
