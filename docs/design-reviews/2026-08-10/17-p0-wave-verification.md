# P0 review-wave verification — 2026-08-10

**Branch:** `fix/design-p0-review-wave`  
**HEAD:** `a5471b5b2f39e09d9ae91aa8b98367c6fd342b6f`  
**main:** `e8a52877a917fb398ac9e4e55297ac2e910868fc`  
**Compare basis:** local `main...HEAD` reflog (branch created from `main` at `e8a5287`; 12 commits on branch)  
**Sources checked:**  
- Plan: `docs/superpowers/plans/2026-08-04-design-open-issues.md`  
- Prior feedback: `docs/design-reviews/2026-08-04/17-open-issues-fix-feedback.md`  
**Method:** Live code greps under `src/` (+ `dist/` anti-pattern spot-check); file reads for acceptance criteria. No typecheck/test/build re-run this session.

---

## Git range (main...HEAD)

Branch commits (oldest → newest):

| Commit | Summary |
|---|---|
| `ef80039` | P0: solid CTAs, gold purge, motion hygiene |
| `a54e27b` | Spacing ladder + softer shadows |
| `9f2e3f8` | Shadow token motion parity |
| `eec4de3` | focus-visible, tabular stats, aria-hidden |
| `b0fd261` | Dock expand/collapse motion |
| `1c9d265` | Popup PRM parity |
| `50e2a27` | Chip scarcity + danger semantics |
| `b8684bb` | Notice exit, onboarding enter, alerts form |
| `f7a8eb6` | DetailModal dossier accordion |
| `e806124` | Open-issues fix plan docs |
| `a5471b5` | Dock textarea focus ring + solid save CTA |

---

## Residual anti-pattern greps (runtime)

| Pattern | Scope | Result | Verdict |
|---|---|---|---|
| `transition: all` / `transition-all` | `src/`, `dist/` `*.{css,ts,tsx,js,jsx}` | **0 matches** | **PASS** |
| `hsla(45…)` warm gold chroma | `src/` | **0 matches** | **PASS** |
| Gold hex `#c9a84c` / `#b8962e` | `src/`, `dist/` | **0 matches** | **PASS** |
| `background: var(--border-hero)` / `background-color: var(--border-hero)` as CTA fill | `src/`, `dist/` | **0 matches** | **PASS** |
| `outline: none` without focus ring | All 19 `outline: none` sites under `src/` | Paired with `:focus-visible` (or equivalent inset ring / range thumb chrome) — see A | **PASS** |

### Notes (not fails)

- `--border-hero` remains widely used for **borders / color / outline accents** (intentional translucent red edge), never as solid CTA fill.
- Atmosphere token only: `[data-theme='light'][data-atmosphere='sunset']` sets `--border-hero: hsla(35, 70%, 42%, 0.45)` — hue 35 atmosphere tint, **not** gold `hsla(45…)`.
- Range sliders (`input[type=range]`, `.slider-input`) use `outline: none` with thumb chrome; popup groups also declare `.slider-input:focus-visible`.
- `.discovery-pulse-item:focus-visible` sets `outline: none` then **inset box-shadow** ring (equivalent focus affordance).

---

## Checklist: P0 wave

| Item | Claim (plan/feedback) | Evidence | Status |
|---|---|---|---|
| Solid CTAs | Primary fills use `--primary` / solid red, not translucent `--border-hero` | `.sanctuary-btn-gold { background: var(--primary) }`, `.popup-btn-primary`, `.btn-primary`, `.dock-save-btn` | **PASS** |
| Gold chroma purge | No live `hsla(45…)` / warm gold hex in runtime | Greps empty under `src/` | **PASS** |
| `transition: all` purge | Explicit property lists | Greps empty under `src/` + `dist/` | **PASS** |
| Hover gates | `@media (hover: hover) and (pointer: fine)` on high-touch chrome | `popup.css`, `sidebar.css`, `library.css`, `overlay.ts` | **PASS** (coverage key surfaces; not universal — known polish residual) |
| Modal exit | Curtain close shorter + ease-out family | `--duration-curtain-close: 220ms` + `--ease-focus-pull` on sanctuary + poetic enter/exit | **PASS** |
| Brand docs | Cinema Black + Rosso Corsa + monofont | `brand.md`, `PRODUCT.md` aligned | **PASS** |

---

## Checklist: Open issues A–H

### A — A11y focus + stats numerals + SVG aria

| Criterion | Evidence | Status |
|---|---|---|
| Every interactive `outline: none` has matching focus ring | 19 sites; all paired (see greps + file reads). **Prior residual closed:** `.dock-textarea:focus-visible` now has `outline: 2px solid var(--ring, var(--primary))` (`dock.ts`) | **PASS** (improved vs 2026-08-04 residual) |
| Stats tabular-nums | `.stats-meta-value`, `.stats-book-value`, `.stats-genre-count` in `sanctuary.css` | **PASS** |
| Decorative SVG `aria-hidden` | DetailModal close SVG; popup decorative SVGs/icons; stats seps; ambient layers | **PASS** |

### B — Shadow tokens motion parity

| Criterion | Evidence | Status |
|---|---|---|
| `SHADOW_TOKEN_CSS` motion + geometry tokens | `shadowTokens.ts`: `--ease-out`, `--ease-focus-pull`, curtain durations, `--duration-fast/normal/slow`, `--transition-fast`, spacing ladder, `--radius-none` | **PASS** |

### C — Dock expand/collapse

| Criterion | Evidence | Status |
|---|---|---|
| Enter/exit classes, opacity/transform ≤220ms, PRM-safe | `.dock-enter` / `.dock-enter-active` / `.dock-exit` + reduced-motion block; JS class lifecycle in `dock.ts` | **PASS** |

### D — Dossier accordion

| Criterion | Evidence | Status |
|---|---|---|
| grid-template-rows 0fr→1fr + opacity ≤220ms | `.sanctuary-detail-accordion` + `.is-expanded`; PRM disables transition; DetailModal uses classes | **PASS** |

### E — Notice exit + onboarding step + alerts form

| Criterion | Evidence | Status |
|---|---|---|
| Notice exit class + keyframe + wait | `NoticeProvider` `inline-notice--exiting`, `EXIT_MS = 180`, PRM in `inline-notice.css` | **PASS** |
| Onboarding step enter | `.onboarding-step-pane` + `onboarding-step-enter` 200ms; PRM | **PASS** |
| Alerts form enter/exit | `alerts-form-panel--enter/--exiting` + Alerts.tsx toggle; PRM | **PASS** |

### F — Token geometry

| Criterion | Evidence | Status |
|---|---|---|
| Spacing 3xl…super | `tokens.css` + `shadowTokens.ts`: 48 / 64 / 96 / 128 | **PASS** |
| `--radius-none` + primary sharp CTA | `--radius-none: 0`; `.btn-primary { border-radius: var(--radius-none, 0) }` (sanctuary gold still 2px max — allowed) | **PASS** |
| Softer shadows | `--shadow-md` ~0.45 opacity (not 0.55-era harsh) | **PASS** |

### G — Primary scarcity + semantic red

| Criterion | Evidence | Status |
|---|---|---|
| Chip active soft fill | `.tag-filter-chip.active`, `.settings-chip.active` → `--chip-active-bg` + primary text/border | **PASS** |
| Search type chips soft | `Search.tsx` active `rgba(218, 41, 28, 0.08)` | **PASS** |
| Danger uses `--danger-*` | Delete/danger buttons across sanctuary, people, hoverCard | **PASS** |

### H — Popup PRM + residual verify

| Criterion | Evidence | Status |
|---|---|---|
| Nuclear PRM in `popup.css` | `@media (prefers-reduced-motion: reduce)` zeros animation/transition + transform kill-list | **PASS** |
| typecheck / test / build | Not re-executed this verification session | **NOT RE-RUN** (does not invalidate code claims; CI gate still recommended before merge) |

---

## Diff vs 2026-08-04 feedback residual

| Residual called out 2026-08-04 | Status on HEAD 2026-08-10 |
|---|---|
| Dock textarea focus-visible ring missing | **Closed** (`a5471b5`) |
| Product activation / empty archive how-to | Still deferred (out of wave) |
| Dual-type vs monofont identity | Still deferred |
| Full DESIGN.md fidelity | Partial (ladder shipped; not full Ferrari display system) |
| Gold class/token **names** | Still present as aliases (values red) — allowed by plan |
| Hover media not universal | Still acceptable polish residual |
| Icon system | Still deferred |

---

## Ship readiness (merge to main)

| Gate | Assessment |
|---|---|
| Claimed P0 hygiene | **Ready** — greps clean; CTAs solid |
| Claimed A–H implementation | **Ready** — all acceptance criteria present in tree |
| Prior a11y residual (dock textarea) | **Closed** |
| Out-of-wave product/identity | **Do not block** this merge |
| CI (typecheck / test / build) | **Re-run before merge** — not verified this pass |

**Verdict:** **Ship / accept for merge** after standard `npm run ci` green. Wave goals met; craft ceiling still set by deferred identity/product items (as previously documented).

---

## Completeness score

**Wave completeness: 9.2 / 10**

| Band | Score | Why |
|---|---:|---|
| P0 anti-pattern closure | 10/10 | Zero residual greps for claimed bans |
| A–G implementation fidelity | 10/10 | All plan acceptance criteria live |
| H (PRM + verify) | 8/10 | PRM present; CI not re-run here |
| Residual debt closure vs 08-04 | 9.5/10 | Dock focus closed; intentional deferrals remain |

**Deductions (−0.8):** (1) H verification steps not re-executed this session; (2) wave never claimed full DESIGN.md / dual-type / product activation — those remain open but are not fail of claimed scope.

---

## Residual fails (this wave)

**None against claimed P0 + A–H criteria.**

### Non-blocking residual (deferred / hygiene)

1. Gold-era **names** (`.sanctuary-btn-gold`, `--gold` aliases) — values are red; rename optional.
2. Product activation (guided first capture, empty archive how-to).
3. Dual-type vs monofont display scale decision.
4. Hover media not on every lift surface.
5. Full DESIGN.md geometry / icon system.
6. CI green confirmation before merge.

---

## Return summary

| Field | Value |
|---|---|
| Completeness score | **9.2 / 10** |
| Residual fails (claimed scope) | **None** |
| Report path | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/17-p0-wave-verification.md` |
| Ship readiness | **Ready to merge** after `npm run ci` |
