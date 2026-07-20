# Linting

Subsume uses a lightweight ESLint baseline aimed at Chrome Web Store production readiness: catch obvious bugs without forcing a full rewrite.

## Commands

| Script | Purpose |
|--------|---------|
| `npm run lint:eslint` | Run ESLint on `src/` (flat config) |
| `npm run lint` / `typecheck` | TypeScript (`tsc --noEmit`) — separate from ESLint |

```bash
npm run lint:eslint
```

## Configuration

- **Config:** `eslint.config.js` (ESLint flat config)
- **Scope:** `src/**/*.{ts,tsx}`
- **Ignored:** `dist/`, `node_modules/`, `coverage/`, `tests/`, `scripts/`, Vite/Vitest configs
- **Stack:** `eslint`, `typescript-eslint`, `@eslint/js` — recommended JS + TS rules, **not** type-aware (`projectService`) rules

### Softened rules

| Rule | Level | Notes |
|------|-------|--------|
| `@typescript-eslint/no-explicit-any` | warn | Existing `any` usage is advisory |
| `@typescript-eslint/no-empty-object-type` | warn | `{}` props patterns in UI |
| `no-unused-vars` | off | Prefer the TS variant |
| `@typescript-eslint/no-unused-vars` | warn | `argsIgnorePattern` / `varsIgnorePattern`: `^_` |
| `no-undef` | off | TypeScript + browser/extension types cover this |
| `preserve-caught-error` / `no-useless-assignment` | warn | Useful, but not hard errors for baseline |

`--max-warnings 200` keeps the script useful without failing on a large historical warning backlog (currently well under that budget).

## CI policy (advisory)

ESLint is **non-blocking / advisory** for now:

- Do **not** gate merges or Chrome Web Store packaging on a clean ESLint run until the warning count is intentionally driven down.
- Prefer keeping `lint:eslint` as a local check and optional CI step that reports without failing the job.
- `npm run build` and existing tests remain the production gate.

When warnings are consistently under the max budget and noise is acceptable, CI can start enforcing `npm run lint:eslint`.

## Safe autofix

```bash
npx eslint src --fix
```

Only apply auto-fixes that are clearly safe (formatting-style / unambiguous). Do not mass-rewrite the codebase solely to clear warnings.
