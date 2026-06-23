# Subsume Shippable Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the functional→portfolio-shippable gap for the Subsume Chrome extension: a guided onboarding wizard that validates API keys, a pragmatic UI smoke-test layer, and a CI pipeline.

**Architecture:** The onboarding wizard rebuilds `Onboarding.tsx` into a 5-step flow and validates TMDb/OMDb keys directly from the options page (extension origin, covered by `host_permissions`) via a new self-contained `src/ui/lib/validateKeys.ts`. A UI test layer is added on `@testing-library/preact` + jsdom. A GitHub Actions workflow runs type-check, tests, and build.

**Tech Stack:** TypeScript, Preact, Vite, vitest, jsdom, `@testing-library/preact`, GitHub Actions.

## Global Constraints

- TypeScript strict; `npx tsc --noEmit` must stay green (root tsconfig type-checks `src/**` only).
- New UI tests run under vitest + jsdom; **no real network** — mock `fetch`, `@/shared/messages`, and `@/ui/lib/validateKeys`.
- API-key validation runs **only on the options page**, never in a content script. The options page may `fetch` TMDb/OMDb directly because both hosts are already in `manifest.json` `host_permissions`.
- No new runtime dependencies; only the two dev/test libraries named in Task 1.
- `App.tsx` onboarding gate stays keyed on `prefs.onboardingComplete`. The wizard populates keys before that flag flips.
- `SET_PREFERENCES` overwrites the full prefs object; `GET_PREFERENCES` returns key-sanitized prefs. New users start from `DEFAULT_PREFS` (no keys), so building the wizard's payload from the base prefs + collected keys loses nothing.
- LLM key: **format check only, no live network validation.**

## File Map

- Create `src/ui/lib/validateKeys.ts` — TMDb/OMDb key validation helpers (Task 2).
- Rewrite `src/ui/pages/Onboarding.tsx` — stepped wizard (Task 3).
- Modify `src/ui/App.tsx` — `completeOnboarding` accepts a patch (Task 3).
- Modify `vitest.config.ts`, `tests/setup.ts`, `tests/tsconfig.json`, `package.json` — test infra (Task 1).
- Create `tests/infra.test.tsx`, `tests/validateKeys.test.ts`, `tests/onboarding.test.tsx`, `tests/settings.test.tsx`, `tests/library.test.tsx`, `tests/detailModal.test.tsx`, `tests/posterBadge.test.tsx`, `tests/hoverCard.test.tsx`.
- Create `.github/workflows/ci.yml`; modify `README.md` — CI (Task 6).

---

### Task 1: Test infrastructure for UI components

**Files:**
- Modify: `package.json` (devDependencies, via npm install)
- Modify: `vitest.config.ts`
- Modify: `tests/setup.ts`
- Modify: `tests/tsconfig.json`
- Create/Test: `tests/infra.test.tsx`

**Interfaces:**
- Produces: a vitest setup that transforms and renders `.test.tsx` files with `@testing-library/preact` and `jest-dom` matchers. All later test tasks consume this.

- [ ] **Step 1: Install the test libraries**

Run:
```bash
npm install -D @testing-library/preact @testing-library/jest-dom
```
Expected: both packages added to `devDependencies`, `package-lock.json` updated, exit 0.

- [ ] **Step 2: Add the Preact JSX plugin and `.tsx` include to vitest config**

Replace the entire contents of `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/background/storage.ts',
        'src/background/llm.ts',
        'src/background/context.ts',
        'src/background/recommendations.ts',
        'src/content/scanner.ts',
      ],
      exclude: [
        'src/ui/**',
        'src/content/hoverCard.tsx',
        'src/content/posterBadge.tsx',
        'src/content/index.ts',
        'src/background/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Register jest-dom matchers in the test setup**

Add this line to the **top** of `tests/setup.ts` (above the existing `import 'fake-indexeddb/auto';`):

```ts
import '@testing-library/jest-dom/vitest';
```
Leave the rest of `tests/setup.ts` unchanged.

- [ ] **Step 4: Allow `.tsx` test files in the test tsconfig**

Replace the entire contents of `tests/tsconfig.json` with:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 5: Write the infrastructure proof test**

Create `tests/infra.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';

describe('test infrastructure', () => {
  it('renders a Preact element and exposes jest-dom matchers', () => {
    render(<div>hello-subsume</div>);
    expect(screen.getByText('hello-subsume')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — all 66 existing tests plus the new `infra.test.tsx` (67 total), no transform errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/setup.ts tests/tsconfig.json tests/infra.test.tsx
git commit -m "test: add Preact UI testing infrastructure (testing-library + jest-dom)"
```

---

### Task 2: API-key validation helper

**Files:**
- Create: `src/ui/lib/validateKeys.ts`
- Test: `tests/validateKeys.test.ts`

**Interfaces:**
- Produces:
  - `interface KeyValidationResult { valid: boolean; error?: string }`
  - `validateTmdbKey(key: string): Promise<KeyValidationResult>`
  - `validateOmdbKey(key: string): Promise<KeyValidationResult>`
- Consumed by the Onboarding wizard (Task 3).

- [ ] **Step 1: Write the failing test**

Create `tests/validateKeys.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTmdbKey, validateOmdbKey } from '@/ui/lib/validateKeys';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('validateTmdbKey', () => {
  it('returns invalid without a network call when key is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await validateTmdbKey('');
    expect(result.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns valid on HTTP 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    );
    const result = await validateTmdbKey('good-token');
    expect(result.valid).toBe(true);
  });

  it('returns invalid with a message on HTTP 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 })
    );
    const result = await validateTmdbKey('bad-token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/401/);
  });

  it('returns invalid with a connection message on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const result = await validateTmdbKey('any-token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/connection/i);
  });
});

describe('validateOmdbKey', () => {
  it('returns valid when OMDb responds with Response: "True"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Response: 'True' }), { status: 200 })
    );
    const result = await validateOmdbKey('good');
    expect(result.valid).toBe(true);
  });

  it('returns invalid and surfaces the OMDb Error field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Response: 'False', Error: 'Invalid API key!' }), { status: 200 })
    );
    const result = await validateOmdbKey('bad');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid API key!');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/validateKeys.test.ts`
Expected: FAIL — cannot resolve `@/ui/lib/validateKeys`.

- [ ] **Step 3: Implement the helper**

Create `src/ui/lib/validateKeys.ts`:

```ts
/**
 * UI-side API key validation. Runs only on the options page (extension origin),
 * where host_permissions for TMDb/OMDb make these cross-origin fetches CORS-exempt.
 * Self-contained — does NOT import the background tmdb client (which holds module state).
 */

export interface KeyValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateTmdbKey(key: string): Promise<KeyValidationResult> {
  if (!key) return { valid: false, error: 'Enter your TMDb API key.' };
  try {
    const res = await fetch('https://api.themoviedb.org/3/authentication', {
      headers: { Authorization: `Bearer ${key}`, accept: 'application/json' },
    });
    if (res.ok) return { valid: true };
    if (res.status === 401) {
      return {
        valid: false,
        error: 'TMDb rejected that key (401). Use your API Read Access Token, not the legacy v3 key.',
      };
    }
    return { valid: false, error: `TMDb returned status ${res.status}. Try again.` };
  } catch {
    return { valid: false, error: 'Couldn’t reach TMDb — check your connection and try again.' };
  }
}

export async function validateOmdbKey(key: string): Promise<KeyValidationResult> {
  if (!key) return { valid: false, error: 'Enter your OMDb API key.' };
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=tt3896198`);
    const data = await res.json();
    if (data?.Response === 'True') return { valid: true };
    return { valid: false, error: data?.Error || 'OMDb rejected that key.' };
  } catch {
    return { valid: false, error: 'Couldn’t reach OMDb — check your connection and try again.' };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/validateKeys.test.ts`
Expected: PASS — all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add src/ui/lib/validateKeys.ts tests/validateKeys.test.ts
git commit -m "feat: add UI-side TMDb/OMDb key validation helper"
```

---

### Task 3: Onboarding wizard + App wiring

**Files:**
- Rewrite: `src/ui/pages/Onboarding.tsx`
- Modify: `src/ui/App.tsx:154-159` (`completeOnboarding`) and `src/ui/App.tsx:191-193` (render call)
- Test: `tests/onboarding.test.tsx`

**Interfaces:**
- Consumes: `validateTmdbKey`, `validateOmdbKey` from `@/ui/lib/validateKeys` (Task 2); `LLMProvider` from `@/shared/types`.
- Produces:
  - `interface OnboardingPatch { tmdbApiKey: string; omdbApiKey?: string; llmProvider?: LLMProvider; llmApiKey?: string; llmEnabled: boolean }`
  - `Onboarding` props: `{ onComplete: (patch: OnboardingPatch) => void }`

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';

vi.mock('@/ui/lib/validateKeys', () => ({
  validateTmdbKey: vi.fn(),
  validateOmdbKey: vi.fn(),
}));

import { Onboarding } from '@/ui/pages/Onboarding';
import { validateTmdbKey } from '@/ui/lib/validateKeys';

const mockedValidateTmdb = vi.mocked(validateTmdbKey);

beforeEach(() => {
  vi.clearAllMocks();
});

function advanceFromWelcome() {
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
}

describe('Onboarding wizard', () => {
  it('shows the welcome step first', () => {
    render(<Onboarding onComplete={vi.fn()} />);
    expect(screen.getByText(/Welcome to Subsume/i)).toBeInTheDocument();
  });

  it('blocks advancing past the TMDb step when the key is invalid', async () => {
    mockedValidateTmdb.mockResolvedValue({ valid: false, error: 'TMDb rejected that key (401).' });
    render(<Onboarding onComplete={vi.fn()} />);
    advanceFromWelcome();

    fireEvent.input(screen.getByLabelText(/TMDb API key/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /validate & continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/TMDb rejected that key/i)).toBeInTheDocument();
    });
  });

  it('completes with a patch carrying the validated TMDb key', async () => {
    mockedValidateTmdb.mockResolvedValue({ valid: true });
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} />);
    advanceFromWelcome();

    fireEvent.input(screen.getByLabelText(/TMDb API key/i), { target: { value: 'good-token' } });
    fireEvent.click(screen.getByRole('button', { name: /validate & continue/i }));

    // Step 3 (OMDb) — skip
    await waitFor(() => screen.getByRole('button', { name: /skip/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    // Step 4 (LLM) — skip
    await waitFor(() => screen.getByRole('button', { name: /skip/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    // Step 5 (Done) — finish
    await waitFor(() => screen.getByRole('button', { name: /start discovering/i }));
    fireEvent.click(screen.getByRole('button', { name: /start discovering/i }));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbApiKey: 'good-token',
        llmEnabled: false,
      })
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/onboarding.test.tsx`
Expected: FAIL — current `Onboarding` has no TMDb step / `onComplete` takes no args.

- [ ] **Step 3: Rewrite the Onboarding component**

Replace the entire contents of `src/ui/pages/Onboarding.tsx` with:

```tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { LLMProvider } from '@/shared/types';
import { validateTmdbKey, validateOmdbKey } from '@/ui/lib/validateKeys';

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

type Step = 1 | 2 | 3 | 4 | 5;

const CARD: h.JSX.CSSProperties = {
  background: 'var(--color-surface-hover)',
  padding: 24,
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [tmdbKey, setTmdbKey] = useState('');
  const [omdbKey, setOmdbKey] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');
  const [llmKey, setLlmKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (s: Step) => {
    setError(null);
    setStep(s);
  };

  const handleTmdbContinue = async () => {
    setValidating(true);
    setError(null);
    const result = await validateTmdbKey(tmdbKey.trim());
    setValidating(false);
    if (!result.valid) {
      setError(result.error || 'That TMDb key didn’t work. Double-check and try again.');
      return;
    }
    goTo(3);
  };

  const handleOmdbContinue = async () => {
    const key = omdbKey.trim();
    if (!key) {
      goTo(4);
      return;
    }
    setValidating(true);
    setError(null);
    const result = await validateOmdbKey(key);
    setValidating(false);
    if (!result.valid) {
      setError(result.error || 'That OMDb key didn’t work. You can fix it or skip this step.');
      return;
    }
    goTo(4);
  };

  const llmFormatWarning = (): string | null => {
    const key = llmKey.trim();
    if (!key) return null;
    if (llmProvider === 'openai' && !key.startsWith('sk-')) {
      return 'OpenAI keys usually start with “sk-”. Double-check this looks right.';
    }
    return null;
  };

  const finish = () => {
    const key = llmKey.trim();
    onComplete({
      tmdbApiKey: tmdbKey.trim(),
      omdbApiKey: omdbKey.trim() || undefined,
      llmProvider: key ? llmProvider : undefined,
      llmApiKey: key || undefined,
      llmEnabled: Boolean(key),
    });
  };

  const wrap = (children: h.JSX.Element) => (
    <div
      className="page-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        padding: 40,
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: s === step ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
      {children}
      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 14, marginTop: 16 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );

  if (step === 1) {
    return wrap(
      <div style={{ maxWidth: 640 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✨</div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 16,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome to Subsume
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 40 }}>
          Subsume detects movies and TV shows on whatever page you’re scrolling, bringing ratings and
          quick-saves straight to your cursor. Let’s get your API keys set up so it can fetch data.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => goTo(2)}
          style={{ padding: '12px 32px', fontSize: 16, fontWeight: 600 }}
        >
          Start setup
        </button>
      </div>
    );
  }

  if (step === 2) {
    return wrap(
      <div style={{ ...CARD, maxWidth: 520, width: '100%' }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Connect TMDb</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Subsume needs a free TMDb API Read Access Token to fetch movie and TV data. Get one at{' '}
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noopener"
            style={{ color: 'var(--primary)' }}
          >
            themoviedb.org/settings/api
          </a>
          .
        </p>
        <label htmlFor="onboard-tmdb" style={{ display: 'block', textAlign: 'left', fontSize: 13, marginBottom: 6 }}>
          TMDb API key
        </label>
        <input
          id="onboard-tmdb"
          type="password"
          value={tmdbKey}
          onInput={(e) => setTmdbKey(e.currentTarget.value)}
          placeholder="Paste your API Read Access Token"
          className="settings-input"
          style={{ width: '100%', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => goTo(1)} disabled={validating}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleTmdbContinue} disabled={validating || !tmdbKey.trim()}>
            {validating ? 'Validating…' : 'Validate & continue'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return wrap(
      <div style={{ ...CARD, maxWidth: 520, width: '100%' }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Add OMDb ratings (optional)</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          An OMDb key adds IMDb and Rotten Tomatoes ratings. Get one free at{' '}
          <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>
            omdbapi.com
          </a>
          . You can skip this and add it later in Settings.
        </p>
        <label htmlFor="onboard-omdb" style={{ display: 'block', textAlign: 'left', fontSize: 13, marginBottom: 6 }}>
          OMDb API key
        </label>
        <input
          id="onboard-omdb"
          type="password"
          value={omdbKey}
          onInput={(e) => setOmdbKey(e.currentTarget.value)}
          placeholder="Optional"
          className="settings-input"
          style={{ width: '100%', marginBottom: 20 }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => goTo(2)} disabled={validating}>
            Back
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => goTo(4)} disabled={validating}>
              Skip
            </button>
            <button className="btn btn-primary" onClick={handleOmdbContinue} disabled={validating}>
              {validating ? 'Validating…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    const warning = llmFormatWarning();
    return wrap(
      <div style={{ ...CARD, maxWidth: 520, width: '100%' }}>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Enable AI recommendations (optional)</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Add an LLM provider key for personalized recommendations. Skip to use rule-based picks; you can
          enable this anytime in Settings.
        </p>
        <label htmlFor="onboard-llm-provider" style={{ display: 'block', textAlign: 'left', fontSize: 13, marginBottom: 6 }}>
          AI provider
        </label>
        <select
          id="onboard-llm-provider"
          value={llmProvider}
          onChange={(e) => setLlmProvider(e.currentTarget.value as LLMProvider)}
          className="settings-input"
          style={{ width: '100%', marginBottom: 16 }}
        >
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="gemini">Google (Gemini)</option>
        </select>
        <label htmlFor="onboard-llm-key" style={{ display: 'block', textAlign: 'left', fontSize: 13, marginBottom: 6 }}>
          API key
        </label>
        <input
          id="onboard-llm-key"
          type="password"
          value={llmKey}
          onInput={(e) => setLlmKey(e.currentTarget.value)}
          placeholder="Optional"
          className="settings-input"
          style={{ width: '100%', marginBottom: warning ? 8 : 20 }}
        />
        {warning && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, textAlign: 'left', marginBottom: 16 }}>
            {warning}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => goTo(3)}>
            Back
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => goTo(5)}>
              Skip
            </button>
            <button className="btn btn-primary" onClick={() => goTo(5)}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // step === 5
  return wrap(
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>You’re all set</h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 32 }}>
        Subsume is ready. Browse the web and hover over any title, or search your library to get started.
      </p>
      <button
        className="btn btn-primary"
        onClick={finish}
        style={{ padding: '12px 32px', fontSize: 16, fontWeight: 600 }}
      >
        Start discovering
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Wire the patch through App.tsx**

In `src/ui/App.tsx`, update the import on line 8 region to also pull the patch type:

Change:
```tsx
import { Onboarding } from './pages/Onboarding';
```
to:
```tsx
import { Onboarding, OnboardingPatch } from './pages/Onboarding';
```

Replace the `completeOnboarding` function (currently `src/ui/App.tsx:154-159`):

```tsx
  const completeOnboarding = async () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, onboardingComplete: true };
    await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
    setPrefs(newPrefs);
  };
```
with:
```tsx
  const completeOnboarding = async (patch: OnboardingPatch) => {
    if (!prefs) return;
    const newPrefs: UserPreferences = { ...prefs, ...patch, onboardingComplete: true };
    await sendMessage(MessageType.SET_PREFERENCES, newPrefs);
    setPrefs(newPrefs);
  };
```

The render call at `src/ui/App.tsx:191-193` stays as-is:
```tsx
  if (!prefs.onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }
```

- [ ] **Step 5: Run the onboarding test to verify it passes**

Run: `npx vitest run tests/onboarding.test.tsx`
Expected: PASS — all 3 cases.

- [ ] **Step 6: Verify type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exits 0; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/ui/pages/Onboarding.tsx src/ui/App.tsx tests/onboarding.test.tsx
git commit -m "feat: stepped onboarding wizard with API-key validation"
```

---

### Task 4: Smoke tests for Settings, Library, and DetailModal

**Files:**
- Create: `tests/settings.test.tsx`
- Create: `tests/library.test.tsx`
- Create: `tests/detailModal.test.tsx`

**Interfaces:**
- Consumes: the test infra from Task 1; mocks `@/shared/messages`.
- These are characterization/smoke tests over existing components — no source changes expected. If a test surfaces a genuine bug, fix the component and note it in the report.

- [ ] **Step 1: Write the Settings smoke test**

Create `tests/settings.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { MessageType, UserPreferences } from '@/shared/types';

vi.mock('@/shared/messages', () => ({ sendMessage: vi.fn() }));
import { sendMessage } from '@/shared/messages';
import { Settings } from '@/ui/pages/Settings';

const mockedSend = vi.mocked(sendMessage);

const PREFS: UserPreferences = {
  favoriteGenres: [],
  platforms: [],
  region: 'US',
  llmEnabled: false,
  hoverCardsEnabled: true,
  posterOverlaysEnabled: true,
  disabledDomains: [],
  detectionSensitivity: 'medium',
  onboardingComplete: true,
  tmdbApiKey: 'existing-key',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedSend.mockResolvedValue({ success: true, data: PREFS } as any);
});

describe('Settings page', () => {
  it('loads full preferences and renders the API key section', async () => {
    render(<Settings />);
    await waitFor(() => expect(screen.getByText('API Configuration')).toBeInTheDocument());
    expect(mockedSend).toHaveBeenCalledWith(MessageType.GET_FULL_PREFERENCES, {});
  });

  it('dispatches SET_PREFERENCES when Save is clicked', async () => {
    render(<Settings />);
    await waitFor(() => screen.getByText('Save Settings'));
    fireEvent.click(screen.getByText('Save Settings'));
    await waitFor(() =>
      expect(mockedSend).toHaveBeenCalledWith(MessageType.SET_PREFERENCES, expect.any(Object))
    );
  });
});
```

- [ ] **Step 2: Write the Library smoke test**

Create `tests/library.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { MessageType, LibraryItem, MediaItem } from '@/shared/types';

vi.mock('@/shared/messages', () => ({ sendMessage: vi.fn() }));
import { sendMessage } from '@/shared/messages';
import { Library } from '@/ui/pages/Library';

const mockedSend = vi.mocked(sendMessage);

const ITEM = {
  library: { mediaId: 'tmdb_movie_603', status: 'to-watch', addedAt: 1, userTags: [] } as unknown as LibraryItem,
  media: { canonicalTitle: 'The Matrix', year: 1999, type: 'movie', ratings: [] } as unknown as MediaItem,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedSend.mockImplementation((type: MessageType) => {
    if (type === MessageType.GET_LIBRARY_PAGE) {
      return Promise.resolve({ success: true, data: [ITEM] } as any);
    }
    return Promise.resolve({ success: true, data: [] } as any);
  });
});

describe('Library page', () => {
  it('renders library items from GET_LIBRARY_PAGE', async () => {
    render(<Library />);
    await waitFor(() => expect(screen.getByText('The Matrix')).toBeInTheDocument());
  });

  it('filters the rendered list by the search query', async () => {
    render(<Library />);
    await waitFor(() => screen.getByText('The Matrix'));
    fireEvent.input(screen.getByPlaceholderText('Search your library...'), {
      target: { value: 'nonexistent' },
    });
    await waitFor(() => expect(screen.queryByText('The Matrix')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Write the DetailModal smoke test**

Create `tests/detailModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { MediaItem, LibraryItem } from '@/shared/types';
import { DetailModal } from '@/ui/components/DetailModal';

const MEDIA = {
  canonicalTitle: 'Mulholland Drive',
  year: 2001,
  type: 'movie',
  ratings: [],
  genres: [],
} as unknown as MediaItem;

const LIBRARY = {
  mediaId: 'tmdb_movie_1018',
  status: 'watched',
  addedAt: 1,
  userRating: 8,
  userTags: [],
} as unknown as LibraryItem;

describe('DetailModal', () => {
  it('renders the title', () => {
    render(<DetailModal media={MEDIA} libraryItem={LIBRARY} onClose={vi.fn()} />);
    expect(screen.getByText('Mulholland Drive')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<DetailModal media={MEDIA} libraryItem={LIBRARY} onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

Note: the close button renders the `×` glyph (`src/ui/components/DetailModal.tsx:90`). If the exact glyph differs, query by its rendered text; do not change the component to satisfy the test.

- [ ] **Step 4: Run the three smoke tests**

Run: `npx vitest run tests/settings.test.tsx tests/library.test.tsx tests/detailModal.test.tsx`
Expected: PASS. If any assertion fails because the test's assumption about rendered text is wrong, correct the **test** to match the component's real output (these are characterization tests). Only change a component if a real defect is found, and report it.

- [ ] **Step 5: Commit**

```bash
git add tests/settings.test.tsx tests/library.test.tsx tests/detailModal.test.tsx
git commit -m "test: add smoke tests for Settings, Library, and DetailModal"
```

---

### Task 5: Smoke tests for content-script renderers

**Files:**
- Create: `tests/posterBadge.test.tsx`
- Create: `tests/hoverCard.test.tsx`

**Interfaces:**
- Consumes: `PosterBadgeManager` from `@/content/posterBadge`, `HoverCardManager` from `@/content/hoverCard`; `PosterMatch` from `@/shared/types`; mocks `@/shared/messages`.
- These verify the Shadow-DOM managers construct and render without throwing in jsdom.

- [ ] **Step 1: Write the poster badge smoke test**

Create `tests/posterBadge.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosterMatch } from '@/shared/types';

vi.mock('@/shared/messages', () => ({
  sendMessage: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));
import { PosterBadgeManager } from '@/content/posterBadge';

const MATCH: PosterMatch = {
  tmdbId: '603',
  title: 'The Matrix',
  year: 1999,
  type: 'movie',
  posterPath: null,
  ratings: [],
  inLibrary: false,
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('PosterBadgeManager', () => {
  it('constructs without throwing', () => {
    expect(() => new PosterBadgeManager()).not.toThrow();
  });

  it('attaches a Shadow-DOM badge host onto an image', () => {
    const mgr = new PosterBadgeManager();
    const img = document.createElement('img');
    document.body.appendChild(img);

    mgr.attachBadge(img, MATCH);

    const host = document.querySelector('[data-subsume-badge]') as HTMLElement | null;
    expect(host).not.toBeNull();
    expect(host!.shadowRoot).not.toBeNull();
  });
});
```

- [ ] **Step 2: Write the hover card smoke test**

Create `tests/hoverCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/messages', () => ({
  sendMessage: vi.fn().mockResolvedValue({ success: true, data: { library: [], media: [] } }),
}));
import { HoverCardManager } from '@/content/hoverCard';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('HoverCardManager', () => {
  it('constructs a shadow container without throwing', () => {
    expect(() => new HoverCardManager()).not.toThrow();
  });

  it('attaches to an element without throwing', () => {
    const mgr = new HoverCardManager();
    const el = document.createElement('span');
    el.textContent = 'The Matrix';
    document.body.appendChild(el);
    expect(() => mgr.attachToElement(el, 'The Matrix', 1999)).not.toThrow();
  });
});
```

- [ ] **Step 3: Run the content-script smoke tests**

Run: `npx vitest run tests/posterBadge.test.tsx tests/hoverCard.test.tsx`
Expected: PASS. If `attachBadge` requires the image to have an offset parent or a specific wrapper the test omits, adjust the **test** setup (e.g. append into a positioned container) to match `ensureWrapper`'s expectations; do not weaken the component.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — all prior tests plus the new UI/content smoke tests.

- [ ] **Step 5: Commit**

```bash
git add tests/posterBadge.test.tsx tests/hoverCard.test.tsx
git commit -m "test: add smoke tests for poster badge and hover card renderers"
```

---

### Task 6: CI pipeline + README badge

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (add status badge near the top)

**Interfaces:**
- Consumes: `package.json` scripts (`test`, `build`) and `npx tsc --noEmit`.

- [ ] **Step 1: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Verify the pipeline commands pass locally**

Run: `npm ci && npx tsc --noEmit && npm test && npm run build`
Expected: every step exits 0 (this mirrors exactly what CI runs).

- [ ] **Step 3: Add the CI status badge to the README**

In `README.md`, immediately under the title line `# Subsume` (line 1), insert a blank line then the badge. Replace the repo owner/name to match the actual remote if it differs from `harshabalakrishnan/subsume`:

```markdown
# Subsume

![CI](https://github.com/harshabalakrishnan/subsume/actions/workflows/ci.yml/badge.svg)
```

Then update the "Current limitations" bullet in the Project Status section (`README.md:138`) that reads `- No CI/CD automated release pipeline` to:

```markdown
- No automated release/publishing pipeline (CI runs type-check, tests, and build on every push/PR)
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: add GitHub Actions pipeline (tsc, test, build) and README badge"
```

---

## Self-Review

**Spec coverage:**
- §1 Onboarding wizard → Task 3 (5 steps, validated TMDb/OMDb, format-only LLM, single `SET_PREFERENCES` at Done). ✓
- §1 `validateKeys.ts` (UI-side, no tmdb.ts import) → Task 2. ✓
- §2 Test infra (deps, `.tsx` include, jest-dom) → Task 1. ✓
- §2 Smoke targets (Onboarding, Settings, Library, DetailModal, posterBadge, hoverCard) → Tasks 3, 4, 5. ✓
- §3 CI (push/PR, Node 20, ci→tsc→test→build) + README badge → Task 6. ✓
- Build order wizard→tests→CI preserved (test infra precedes as a TDD enabler; rationale noted). ✓

**Placeholder scan:** No TBD/TODO/"add error handling"/"similar to Task N". Every code step shows complete code. ✓

**Type consistency:** `OnboardingPatch` defined in Task 3 and consumed in the same task's App wiring; `KeyValidationResult`/`validateTmdbKey`/`validateOmdbKey` defined in Task 2 and consumed in Task 3; `PosterMatch` fields match `src/shared/types.ts:368`; `GET_LIBRARY_PAGE` return shape (`{library, media}[]`) matches `Library.tsx`. ✓

**Out of scope (unchanged):** screenshot, Web Store packaging, live LLM validation, background `VALIDATE_API_KEY` message, `pnpm-lock.yaml` cleanup.
