import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { LLMProvider } from '@/shared/types';
import { validateTmdbKey, validateOmdbKey } from '../lib/validateKeys';
import '../styles/onboarding.css';

export interface OnboardingPatch {
  tmdbApiKey: string;
  omdbApiKey?: string;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  llmEnabled: boolean;
}

interface OnboardingProps {
  onComplete: (patch: OnboardingPatch) => void;
}

const TOTAL_STEPS = 5;
type Step = 1 | 2 | 3 | 4 | 5;

const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [omdbApiKey, setOmdbApiKey] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [includeLlm, setIncludeLlm] = useState(false);
  const [includeOmdb, setIncludeOmdb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const clearError = () => setError(null);

  const goTo = (next: Step) => {
    clearError();
    setStep(next);
  };

  const handleTmdbContinue = async () => {
    clearError();
    const trimmed = tmdbApiKey.trim();
    // Empty key: not hard-required — continue without validating
    if (!trimmed) {
      setError("Paste a TMDb token to validate, or choose \"I'll add keys later\".");
      return;
    }
    setValidating(true);
    try {
      const result = await validateTmdbKey(trimmed);
      if (!result.valid) {
        setError(result.error || 'TMDb key could not be validated.');
        return;
      }
      goTo(3);
    } finally {
      setValidating(false);
    }
  };

  const handleTmdbSkip = () => {
    setTmdbApiKey('');
    goTo(3);
  };

  const handleOmdbContinue = async () => {
    clearError();
    const trimmed = omdbApiKey.trim();
    if (!trimmed) {
      setError('Enter an OMDb key, or choose Skip.');
      return;
    }
    setValidating(true);
    try {
      const result = await validateOmdbKey(trimmed);
      if (!result.valid) {
        setError(result.error || 'OMDb key could not be validated.');
        return;
      }
      setIncludeOmdb(true);
      goTo(4);
    } finally {
      setValidating(false);
    }
  };

  const handleOmdbSkip = () => {
    setIncludeOmdb(false);
    setOmdbApiKey('');
    goTo(4);
  };

  const handleLlmContinue = () => {
    clearError();
    const trimmed = llmApiKey.trim();
    if (!trimmed) {
      setError('Enter an API key, or choose Skip.');
      return;
    }
    setIncludeLlm(true);
    goTo(5);
  };

  const handleLlmSkip = () => {
    setIncludeLlm(false);
    setLlmApiKey('');
    goTo(5);
  };

  const finish = () => {
    const patch: OnboardingPatch = {
      tmdbApiKey: tmdbApiKey.trim(),
      llmEnabled: includeLlm,
    };
    if (includeOmdb && omdbApiKey.trim()) {
      patch.omdbApiKey = omdbApiKey.trim();
    }
    if (includeLlm) {
      patch.llmProvider = llmProvider;
      patch.llmApiKey = llmApiKey.trim();
    }
    onComplete(patch);
  };

  const showSkWarning =
    llmProvider === 'openai' &&
    llmApiKey.trim().length > 0 &&
    !llmApiKey.trim().startsWith('sk-');

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
            <button
              type="button"
              className="onboarding-cta"
              onClick={() => goTo(2)}
            >
              Start setup
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="onboarding-step" aria-labelledby="onboarding-tmdb-title">
            <h1 id="onboarding-tmdb-title" className="onboarding-headline onboarding-headline--step">
              The catalogue key
            </h1>
            <div className="onboarding-divider" />
            <p className="onboarding-body onboarding-body--compact">
              TMDb powers screen discovery — posters, search, and the house
              programme. Paste your API Read Access Token (Bearer), not the short
              API Key.
            </p>
            <p className="onboarding-body onboarding-body--compact">
              Optional for now. Screen metadata (posters, search, programme) is
              richer with TMDb; you can add a token later under Settings. Books
              use Open Library by default with no key.
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
                . Optional Google Books enrichment lives later under Settings.
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
                  onClick={handleTmdbSkip}
                  disabled={validating}
                >
                  I&apos;ll add keys later
                </button>
                <button
                  type="button"
                  className="onboarding-cta"
                  onClick={handleTmdbContinue}
                  disabled={validating}
                >
                  {validating ? 'Validating…' : 'Validate & continue'}
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-step" aria-labelledby="onboarding-omdb-title">
            <h1 id="onboarding-omdb-title" className="onboarding-headline onboarding-headline--step">
              Extra ratings
            </h1>
            <div className="onboarding-divider" />
            <p className="onboarding-body onboarding-body--compact">
              OMDb is optional. It adds IMDb and Rotten Tomatoes scores beside
              TMDb. Skip if you prefer a quieter marquee.
            </p>
            <div className="onboarding-form">
              <label className="onboarding-label" htmlFor="onboarding-omdb-key">
                OMDb API key (optional)
              </label>
              <input
                id="onboarding-omdb-key"
                className="onboarding-input"
                type="password"
                autoComplete="off"
                placeholder="Paste your OMDb key"
                value={omdbApiKey}
                onInput={(e) => {
                  clearError();
                  setOmdbApiKey((e.target as HTMLInputElement).value);
                }}
              />
              <p className="onboarding-help">
                Free at{' '}
                <a
                  href="https://www.omdbapi.com/apikey.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="onboarding-link"
                >
                  omdbapi.com
                </a>
                .
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
                  onClick={handleOmdbSkip}
                  disabled={validating}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="onboarding-cta"
                  onClick={handleOmdbContinue}
                  disabled={validating}
                >
                  {validating ? 'Validating…' : 'Continue'}
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="onboarding-step" aria-labelledby="onboarding-llm-title">
            <h1 id="onboarding-llm-title" className="onboarding-headline onboarding-headline--step">
              A private curator
            </h1>
            <div className="onboarding-divider" />
            <p className="onboarding-body onboarding-body--compact">
              Optional. Point Subsume at an LLM you trust for recommendations
              shaped by your archive, not a public feed.
            </p>
            <div className="onboarding-form">
              <label className="onboarding-label" htmlFor="onboarding-llm-provider">
                Provider
              </label>
              <select
                id="onboarding-llm-provider"
                className="onboarding-input onboarding-select"
                value={llmProvider}
                onChange={(e) => {
                  clearError();
                  setLlmProvider((e.target as HTMLSelectElement).value as LLMProvider);
                }}
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>

              <label className="onboarding-label" htmlFor="onboarding-llm-key">
                API key
              </label>
              <input
                id="onboarding-llm-key"
                className="onboarding-input"
                type="password"
                autoComplete="off"
                placeholder={llmProvider === 'openai' ? 'sk-…' : 'Paste your API key'}
                value={llmApiKey}
                onInput={(e) => {
                  clearError();
                  setLlmApiKey((e.target as HTMLInputElement).value);
                }}
              />
              {showSkWarning && (
                <p className="onboarding-warn" role="status">
                  OpenAI keys usually start with sk-. Double-check the format
                  before you continue.
                </p>
              )}
              {error && (
                <p className="onboarding-error" role="alert">
                  {error}
                </p>
              )}
              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-cta onboarding-cta--ghost"
                  onClick={handleLlmSkip}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="onboarding-cta"
                  onClick={handleLlmContinue}
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="onboarding-step" aria-labelledby="onboarding-done-title">
            <h1 id="onboarding-done-title" className="onboarding-headline">
              The house is lit.
            </h1>
            <div className="onboarding-divider" />
            <p className="onboarding-body">
              Keys stay in your browser. You can revise them anytime under
              Settings. When you are ready, step into the programme.
            </p>
            <button type="button" className="onboarding-cta" onClick={finish}>
              Enter the house
            </button>
          </section>
        )}
      </div>

      <div className="onboarding-rule-bottom" />
    </div>
  );
}
