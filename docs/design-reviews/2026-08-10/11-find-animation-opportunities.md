# Find Animation Opportunities — Subsume

**Date:** 2026-08-10  
**Skill:** find-animation-opportunities (read-only; propose only)  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Stack:** Preact + CSS tokens (no Framer Motion)  
**Personality:** Private cinematic sanctuary — restrained Slow Dolly / Focus Pull, no bounce, UI ≤300ms

## Recon (motion vocabulary)

Shared tokens in `src/shared/tokens.css` / `src/shared/shadowTokens.ts`:

| Token | Value |
| --- | --- |
| `--duration-instant` | `100ms` |
| `--duration-fast` | `130ms` |
| `--duration-normal` | `220ms` |
| `--duration-slow` | `260ms` |
| `--duration-soft-settle` | `280ms` |
| `--duration-curtain` | `280ms` |
| `--duration-curtain-close` | `220ms` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-focus-pull` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `--ease-soft-settle` | `linear(...)` soft settle (no bounce) |
| `--transition-fast` | `var(--duration-fast) var(--ease-out)` |

**Already animated (do not re-propose):**

| Surface | Evidence |
| --- | --- |
| DetailModal enter/exit | `sanctuary.css` Slow Dolly / Curtain Close |
| PoeticCapture enter/exit + save ceremony | `poetic-sanctuary.css`, aura `@property` |
| Nav drawer open/close | `sidebar.css` + `App.tsx` closing lifecycle |
| Empty-state projector | `emotional-components.css` `empty-projector-*` |
| Library + discovery card stagger | `--feed-index` on spine / feed cards |
| Inline notice **enter + exit** | `NoticeProvider.tsx` `exiting` + `inline-notice-exit` 180ms |
| Detail dossier accordion | `.sanctuary-detail-accordion` `0fr`→`1fr` + opacity 220ms |
| Alerts create-form enter/exit | `alerts-form-panel--enter/exiting` 180ms |
| Reflection dock pill↔card | `dock.ts` `dock-enter` 200ms / `dock-exit` 180ms |
| Expandable reflection | `max-height` + opacity 280ms / 220ms |
| Recommendations load↔content | `.recommendations-phase` crossfade 180ms |
| Popup view slide + suggestion stagger | `popup.css` |
| Hover cards, museum plaque hover reveal | `hoverCard.tsx`, `overlay.ts` |
| Broad press scale | `global.css` `button:active { scale(0.97) }` + sanctuary chrome |

**Delta since 2026-08-04 review:** notice exit, alerts form, dock expand, DetailModal accordion, and onboarding **enter** are shipped. Remaining work is narrower.

**Frequency map (rough):**

| Surface | Frequency |
| --- | --- |
| Primary nav / archive filters / popup search typing | Tens+/day |
| Modal open/close, notices, settings sections, alerts, dock, inline confirms | Occasional |
| Onboarding, empty projector, log-success / save ceremony | Rare / first-time |

---

## Part 1 — Opportunities table

| # | Location | Today | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/ui/components/archive/HardcoverSpineCard.tsx` L177–183 (`detailsExpanded &&` mounts panel); `src/styles/sanctuary.css` `.hardcover-details-panel` (static layout only; no accordion) | Dossier panel mounts/unmounts with hard cut; DetailModal already uses grid accordion | State indication + Preventing a jarring change | Occasional | Mirror DetailModal: always-mounted shell `className={`hardcover-details-accordion${detailsExpanded ? ' is-expanded' : ''}`}` with `display: grid; grid-template-rows: 0fr` → `1fr`, `opacity: 0` → `1`, `visibility` delayed on close; `transition: grid-template-rows var(--duration-normal) var(--ease-out), opacity var(--duration-normal) var(--ease-out)` (220ms / `cubic-bezier(0.16, 1, 0.3, 1)`). Inner `overflow: hidden; min-height: 0`. Chevron: `transform: rotate(0deg)` → `180deg` over `var(--duration-fast)` (`130ms`) `var(--ease-out)`. PRM: `transition: none`. Animate transform/opacity (+ grid-rows for height bridge). |
| 2 | `src/ui/pages/Onboarding.tsx` L161–162 (`key={step}` pane); `src/ui/styles/onboarding.css` `.onboarding-step-pane` enter-only 200ms `translateY(6px)` | Enter fades in; previous step still hard-cuts (no leave beat). Dots already animate | Preventing a jarring change + Explanation (first-run) | Rare / first-time | Optional leave then enter (do not block Continue): leave current pane `opacity: 1; transform: translateY(0)` → `opacity: 0; transform: translateY(-6px) scale(0.98)` in `var(--duration-fast)` (`130ms`) `var(--ease-out)`; enter (existing key restart or `@starting-style`) from `opacity: 0; transform: translateY(8px) scale(0.97)` → settled over `var(--duration-curtain)` (`280ms`) `var(--ease-focus-pull)` (`cubic-bezier(0.25, 1, 0.5, 1)`). Forward: enter from below; back: enter from above (`translateY(-8px)`). Cap enter ≤280ms. PRM: opacity-only `var(--duration-instant)` (`100ms`), no scale/Y. |
| 3 | Inline confirms: `People.tsx` L269–296 (`isConfirming ?`); `Alerts.tsx` L582+ (`deleteConfirmId`); `HardcoverSpineCard.tsx` L241–267 (`removeConfirmId`); `FilmographyView.tsx` L222+ (`confirmUnfollow`) — CSS is layout-only (e.g. `.people-unfollow-confirm`, `.alerts-delete-confirm`) | Action row ↔ confirm row hard ternary swap | State indication + Preventing a jarring change | Occasional | Shared micro-pattern: confirm group enters via `@starting-style` or class — `opacity: 0; transform: scale(0.97) translateY(-2px)` → settled; `transform-origin: top right` (or near trigger); `transition: opacity, transform` over `var(--duration-fast)` (`130ms`) `var(--ease-out)`. Exit reverse `100–130ms` then unmount (closing flag). No bounce. PRM: opacity only `100ms`. One CSS class reused across four call sites. |
| 4 | `src/ui/pages/Settings.tsx` L493–1197 (`activeSection === …` hard conditional panels); `settings.css` `.settings-panel` has no enter | Category body teleports on chip click | Preventing a jarring change | Occasional | Soft content bridge only: panel enter `opacity: 0; transform: translateY(4px)` → settled, `var(--duration-normal)` (`220ms`) `var(--ease-out)`; interruptible (CSS transitions retarget; no stacked exit delay). Skip exit animation when user thrash-clicks sections. PRM: no motion. **Do not** animate section nav chips beyond existing color/border (`settings-nav.css` already 150ms color — correct for tens/day). |
| 5 | `src/content/dock.ts` `.dock-toggle-btn` / `.dock-save-btn` (shadow styles ~L54–210): hover lift on toggle; save color transition only; **no `:active` scale** | Expand/collapse is animated; press feels dead in shadow tree (no `global.css` button:active) | Feedback | Occasional (dock use) | `:active { transform: scale(0.97) }` on toggle + save; `transition: transform var(--duration-fast) var(--ease-out)` (130ms / `cubic-bezier(0.16, 1, 0.3, 1)`), composed with existing border/shadow transitions. Toggle hover already uses `translateY(-1px)` — on active prefer `scale(0.97)` without fighting hover (active wins while pressed). PRM: no transform change. Optional: same 0.97 press on `.museum-plaque` in `overlay.ts` (browsing is tens/day → keep 100–130ms, no lift stack). |

### Gate answers (surviving)

| # | Frequency | Purpose | Speed | Function |
| --- | --- | --- | --- | --- |
| 1 | Occasional ✓ | State + jarring ✓ | 220ms ✓ | Accordion bridge; matches DetailModal ✓ |
| 2 | Rare ✓ | Jarring + explanation ✓ | ≤280ms ✓ | First-run narrative; not data-dense ✓ |
| 3 | Occasional ✓ | State + jarring ✓ | ≤130ms ✓ | Confirm affordance legibility ✓ |
| 4 | Occasional ✓ | Jarring ✓ | 220ms interruptible ✓ | Subtle; nav chips stay static ✓ |
| 5 | Occasional ✓ | Feedback ✓ | 130ms ✓ | Press only; no continuous motion ✓ |

---

## Part 2 — Rejected candidates (required)

- **`src/ui/App.tsx` `renderPage()` / primary + subnav** — Full-page route remounts with no transition. **Rejected: Frequency.** Archive / Discovery / Settings / Search are tens of times/day; animating route shells delays the house. Near-zero is correct.

- **`src/ui/components/archive/IntentNavigation.tsx` + Library filter grid** — Medium / collection / intent refilter. **Rejected: Frequency.** Filter thrashing is core archive navigation; restagger on every chip click would feel sluggish. First-paint stagger is enough.

- **`src/ui/popup.tsx` suggestions (`showSuggestions &&`)** — Items already stagger-enter. **Rejected: Frequency.** Typing cadence is high; list-shell open/close drama fights keyboard use.

- **`src/ui/pages/People.tsx` `activeView` following ↔ search** — Full view hard-swap. **Rejected: Frequency (borderline tens/day on People).** Tab content can soft-fade if ever revisited, but not high leverage; chip color change is enough.

- **`src/ui/components/EmotionalWeatherChart.tsx`** — Static SVG afterglow series. **Rejected: Function.** Data the user reads; path-draw or pulse would decorate functional information.

- **Hold-to-confirm fill on Unfollow / Delete / Remove** — Explicit confirm UIs already exist. **Rejected: Function / product fit.** Hold-to-confirm adds gesture + a11y cost without fixing a slip the confirm row already addresses. Prefer #3 micro-enter over hold-fill.

- **`src/ui/components/FilmGrain.tsx` / continuous grain or beam loops on main chrome** — **Rejected: Purpose.** Continuous motion on every surface is decoration; sanctuary restraint forbids constant pulse on primary UI.

- **Notice exit, alerts form, dock expand, DetailModal accordion** — **Rejected: Already shipped** (see recon). Do not re-propose.

---

## Part 3 — Verdict

**Alive score: 8 / 10**

Subsume is already intentionally kinetic where ceremony matters: modals, drawer, empty projector, card stagger, save ceremony, hover plaques, notice enter/exit, dock expand, DetailModal dossier, and widespread press scale. Since the 2026-08-04 pass, the loudest daily teleports (notice exit, alerts form, dock, detail accordion) are gone. The interface does not need more motion volume — it needs a few remaining **bridges**.

What still reads slightly “dead”:

1. Archive **spine dossier** still pops while the detail modal dossier eases open (inconsistency).
2. **Onboarding** enters but never leaves (asymmetric first impression).
3. **Inline confirms** and **settings panels** hard-cut.
4. **Content-script** dock/plaque presses lack the app’s 0.97 scale (shadow DOM isolation).

**Highest leverage single row:** **#1 Hardcover spine dossier accordion** — same pattern as DetailModal, occasional use, removes the last archive-level teleport and makes the two dossier surfaces feel like one system.

**Handoff:** `improve-animations plan <row description>` (e.g. `improve-animations plan hardcover spine dossier grid accordion matching DetailModal`) to turn any row into an implementation plan. Do not implement from this document.

---

## Sweep checklist

| Seam class | Result |
| --- | --- |
| Feedback gaps (`:active`) | App chrome covered via `global.css` + sanctuary; dock + museum plaque in shadow roots still flat on press → #5 |
| Teleporting state | Spine dossier (#1), onboarding leave (#2), inline confirms (#3), settings panels (#4); DetailModal / notices / alerts form / dock cleared |
| Missing spatial story | Dock expand shipped; confirm chips lack origin micro-scale → folded into #3 |
| Group entrances | Library / discovery / popup stagger — cleared |
| Gesture / drag | No draggable UI seams — cleared |
| Delight budget | Onboarding leave/enter polish (#2); empty projector + save ceremony already done |
| Keyboard-first chrome | Not animated (correct) — cleared |

---

## Top 3 (summary)

1. **Spine dossier accordion** — match DetailModal `0fr`→`1fr` + opacity 220ms `--ease-out`
2. **Onboarding leave/enter** — 130ms exit + 280ms `--ease-focus-pull` enter, directional
3. **Inline confirm micro-enter** — 130ms `scale(0.97)` + opacity on people/alerts/remove/filmography confirms
