# Find Animation Opportunities — Subsume

**Date:** 2026-08-04  
**Skill:** find-animation-opportunities (read-only; propose only)  
**Repo:** `/Users/harshabalakrishnan/Subsume`  
**Stack:** Preact + CSS tokens (no Framer Motion)  
**Personality:** Private cinematic sanctuary — restrained Slow Dolly / Focus Pull, no bounce, UI ≤300ms

## Recon (motion vocabulary)

Shared tokens in `src/shared/tokens.css`:

| Token | Value |
| --- | --- |
| `--duration-instant` | `100ms` |
| `--duration-fast` | `130ms` |
| `--duration-normal` | `220ms` |
| `--duration-slow` | `260ms` |
| `--duration-soft-settle` | `280ms` |
| `--duration-curtain` | `280ms` |
| `--duration-curtain-close` | `300ms` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-focus-pull` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| `--ease-soft-settle` | `linear(...)` soft settle |
| `--transition-fast` | `var(--duration-fast) var(--ease-out)` |

**Already animated (do not re-propose):** DetailModal / PoeticCapture enter+exit (Slow Dolly / Curtain Close), nav drawer enter/exit, empty-state projector, library + discovery card stagger, inline-notice **enter**, expandable reflection max-height, recommendations crossfade, popup view slide + suggestion stagger, save ceremony + aura `@property`, hover cards, museum plaque hover reveal, broad `:active { scale(0.97–0.98) }` on sanctuary chrome.

**Frequency map (rough):**

| Surface | Frequency |
| --- | --- |
| Primary nav / archive filters / popup search typing | Tens+/day |
| Modal open/close, notices, settings sections, alerts form, dock | Occasional |
| Onboarding, empty projector, log-success celebration | Rare / first-time |

---

## Part 1 — Opportunities table

| # | Location | Today | Purpose | Frequency | Suggested motion |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/ui/pages/Onboarding.tsx` (~L41–44 `goTo`, L161–432 `step === n` sections); `src/ui/styles/onboarding.css` `.onboarding-step` | Step content hard-swaps via conditional render; dots animate, body teleports | Preventing a jarring change + Explanation (first-run) | Rare / first-time | Keep one step mounted with exit then enter: leave `opacity: 1; transform: translateY(0) scale(1)` → `opacity: 0; transform: translateY(-6px) scale(0.98)` in `--duration-fast` (`130ms`) `var(--ease-out)`; enter via `@starting-style` or class: from `opacity: 0; transform: translateY(8px) scale(0.97)` → settled, `transition: opacity, transform` over `var(--duration-curtain)` (`280ms`) `var(--ease-focus-pull)`. Direction: forward steps enter slightly from below; back from above. PRM: opacity-only `var(--duration-instant)` (`100ms`), no scale/Y. Do not block Continue. |
| 2 | `src/ui/components/DetailModal.tsx` L727–738 (`detailsExpanded &&`); `src/ui/components/archive/HardcoverSpineCard.tsx` L163–183; CSS `.sanctuary-detail-details-panel` / `.hardcover-details-panel` (no height transition today) | Dossier panels mount/unmount instantly | State indication | Occasional | Match reflection excerpt pattern: always-mounted panel with `grid-template-rows: 0fr` → `1fr` (or `max-height` + `overflow: hidden`) + `opacity` `0` → `1`; `transition: grid-template-rows var(--duration-soft-settle) var(--ease-focus-pull), opacity var(--duration-normal) ease`; chevron `transform: rotate(0deg)` → `180deg` over `var(--duration-fast)` `var(--ease-out)`. Animate transform/opacity (and grid-rows for height bridge). PRM: instant open/close, no transition. |
| 3 | `src/ui/components/NoticeProvider.tsx` L42–45, L49–55 (unmount on clear/timeout); `src/ui/components/inline-notice.css` (enter only) | Enter: `inline-notice-enter` 220ms ease-out + `translateY(-6px)`. Exit: instant unmount — asymmetric | Preventing a jarring change + Spatial consistency | Occasional | Exit lifecycle: `dismissing` class before unmount — `opacity: 1; transform: translateY(0)` → `opacity: 0; transform: translateY(-6px)` (same edge as enter), `transition: opacity, transform` over `var(--duration-normal)` (`220ms`) `var(--ease-out)`; `onTransitionEnd` then `setNotice(null)`. Timeout path same. PRM: `var(--duration-instant)` opacity only. |
| 4 | `src/ui/pages/Alerts.tsx` L261–273 (`showForm &&`); `src/ui/styles/settings.css` `.alerts-form-panel` | Create-alert panel pops in/out with no enter/exit | State indication + Preventing a jarring change | Occasional | Enter: `@starting-style` or class — `opacity: 0; transform: scale(0.97) translateY(-4px)` → settled; `transform-origin: top left` (near Create alert trigger); `transition: opacity, transform` `var(--duration-normal)` (`220ms`) `var(--ease-focus-pull)`. Exit: reverse to `scale(0.98) translateY(-2px)` + `opacity: 0` in `var(--duration-fast)` then unmount (closing flag). PRM: opacity crossfade `180ms` only. |
| 5 | `src/content/dock.ts` L315–328 `toggle`/`render` (innerHTML swap); styles for `.dock-toggle-btn` / `.dock-card` | Collapsed pill ↔ expanded card hard-replaced; hover lift only | Spatial consistency | Occasional | Prefer single shell: pill morphs or card enters from trigger — enter card `opacity: 0; transform: scale(0.96) translateY(8px)` → `scale(1) translateY(0)`, `transform-origin: bottom right` (dock corner), `var(--duration-curtain)` `var(--ease-focus-pull)`; exit same origin reverse `var(--duration-curtain-close)` ease-in; keep pill/card in DOM during transition (don’t `innerHTML = ''` until `transitionend`). Add `:active { transform: scale(0.97) }` on toggle/save with `transition: transform var(--duration-fast) var(--ease-out)`. PRM: opacity only `var(--duration-fast)`. |
| 6 | `src/ui/pages/Settings.tsx` L493–495+ (`activeSection === …` panels) | Settings category content swaps with hard cut | Preventing a jarring change | Occasional | Soft content bridge only (not page chrome): panel enter `opacity: 0; transform: translateY(4px)` → settled, `var(--duration-normal)` (`220ms`) `var(--ease-out)`; skip exit animation if user is rapidly clicking sections (interruptible CSS, no exit delay that stacks). PRM: no motion. Cap: never animate the section nav chips beyond existing color/border (already tens/day). |

### Gate answers (surviving)

| # | Frequency | Purpose | Speed | Function |
| --- | --- | --- | --- | --- |
| 1 | Rare ✓ | Jarring + explanation ✓ | ≤280ms ✓ | First-run narrative; not data-dense ✓ |
| 2 | Occasional ✓ | State indication ✓ | ≤280ms ✓ | Accordion bridge, not decoration ✓ |
| 3 | Occasional ✓ | Spatial + jarring ✓ | 220ms ✓ | Symmetric toast path ✓ |
| 4 | Occasional ✓ | State + jarring ✓ | 220ms ✓ | Form reveal, not chart chrome ✓ |
| 5 | Occasional ✓ | Spatial ✓ | ≤300ms ✓ | Panel from corner, not continuous pulse ✓ |
| 6 | Occasional ✓ | Jarring ✓ | 220ms, interruptible ✓ | Subtle; nav chips stay static ✓ |

---

## Part 2 — Rejected candidates (required)

- **`src/ui/App.tsx` ~L311–478 `renderPage()` / primary + subnav** — Full-page route remounts with no transition. **Rejected: Frequency.** Primary destinations (Archive / Discovery / Settings / Search…) are tens of times/day; animating route shells would make the house feel delayed. Near-zero or no animation is correct (Emil: high-freq never).

- **`src/ui/components/archive/IntentNavigation.tsx` + Library grid filter changes** — Medium / collection / intent tabs refilter the archive. **Rejected: Frequency.** Filter thrashing is core archive navigation; list restagger on every chip click would feel sluggish. Existing first-paint stagger is enough.

- **`src/ui/popup.tsx` suggestions dropdown (`showSuggestions &&`)** — List items already stagger-enter. **Rejected: Frequency (and partial coverage).** Typing/search is high-frequency in the extension popup; container open/close animation would fight keyboard cadence. Leave item stagger; do not add list-shell drama.

- **`src/ui/components/EmotionalWeatherChart.tsx`** — Static SVG paths for afterglow series. **Rejected: Function.** This is data the user reads on Stats/Home; path-draw or continuous pulse would decorate functional information. Spec already bans constant pulse on main chrome.

- **Hold-to-confirm fill on Unfollow / Delete alert / Remove from archive** — Explicit confirm UIs already exist (`people-unfollow-confirm`, `alerts-delete-confirm`, `removeConfirmId`). **Rejected: Function / product fit.** Hold-to-confirm adds gesture complexity and a11y cost without fixing a slip that confirm UI doesn’t already address; not a missing spatial story.

- **`src/ui/components/FilmGrain.tsx` animated grain** — Static turbulence overlay (already gated by PRM). **Rejected: Purpose.** Continuous motion on every surface is decoration, not feedback/state; contradicts sanctuary restraint.

---

## Part 3 — Verdict

**Alive score: 7 / 10**

Subsume already feels intentionally kinetic where it matters: ceremonial modals, drawer, empty projector, card stagger, save ceremony, hover plaques, and widespread press scale. That is the right baseline for a cinematic journal — not a motion-design portfolio.

What still reads “dead” is a small set of **teleports**: onboarding step cuts, dossier accordions, notice exits, the alerts form, and the content reflection dock. Fix those with the shared curtain/focus-pull vocabulary and the UI will feel more continuous without adding weight to daily navigation.

**Highest leverage single row:** **#1 Onboarding step choreography** — rare, first impression, and the only place the delight budget is fully justified. Closest daily-use fix after that is **#2 Dossier expand** (Detail + spine cards).

**Handoff:** `improve-animations plan <row description>` (e.g. `improve-animations plan onboarding step enter/exit with curtain tokens`) to turn any row into an implementation plan. Do not implement from this document.

---

## Sweep checklist

| Seam class | Result |
| --- | --- |
| Feedback gaps (`:active`) | Mostly covered on sanctuary chrome; dock toggle/save + onboarding CTA still flat on press (folded into #5; onboarding CTA can share press scale with step work) |
| Teleporting state | Onboarding steps, dossier panels, alerts form, settings sections, notice exit |
| Missing spatial story | Dock expand; alerts form origin; notice exit asymmetry |
| Group entrances | Library/discovery/popup already stagger — cleared |
| Gesture / drag | No draggable UI seams found — cleared |
| Delight budget | Onboarding steps (#1); empty projector already done — cleared for empty states |
| Keyboard-first chrome | Not animated (correct) — cleared |
