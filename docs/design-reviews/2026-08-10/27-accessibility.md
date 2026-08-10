# Accessibility Review — Subsume

**Date:** 2026-08-10  
**Repo:** Subsume @ `a5471b5`  
**Lens:** Apple Design a11y foundations (focus, hit targets, reduced motion/transparency, keyboard) + frontend-design-guidelines interactions/a11y non-negotiables  
**WCAG orientation:** 2.2 AA primary; AAA/2.5.5 called out where relevant  
**Scope (read-only):** focus-visible, keyboard nav, ARIA, reduced-motion, Rosso Corsa CTA contrast, hit targets, screen-reader labels, modal focus traps  
**Key surfaces:** `dock.ts`, popup, sanctuary / DetailModal, onboarding, `global.css`, drawer (`App.tsx`), hover/overlay content  

**Delta vs 2026-08-04 craft reviews:** Focus rings largely closed on settings/onboarding/people/optical/sanctuary inputs; solid Rosso primary fills on gold/inscribe/popup CTAs; dock has enter/exit motion + 44px controls + `:focus-visible`. Remaining debt is **modal page-inert**, **content dock keyboard/ARIA**, **red-on-dark selection contrast**, and **dense 32px chrome**.

---

## Score: **7.2 / 10**

Strong **focus-visible baseline**, real `<button>` usage, drawer + DetailModal/Poetic **Tab traps**, and solid white-on-Rosso primary CTAs (~4.9:1). Score held back by incomplete **dialog isolation** (no `inert` on page behind modals), **reflection dock** keyboard/name gaps, **Rosso text-on-dark** selection states under 4.5:1, and widespread **sub-40px** dense controls.

| Dimension | Score | Notes |
|-----------|------:|-------|
| Focus-visible | 8.0 | Global ring + local replacements after most `outline: none`; a few outline colors use translucent `--border-hero` |
| Keyboard navigation | 6.5 | Modal/drawer/Poetic Esc + Tab trap; dock no Esc; hover card pointer-first |
| ARIA / semantics | 7.0 | Dialogs labelled; combobox in popup; intent pills missing `aria-pressed` |
| Reduced motion | 7.0 | Broad PRM; strips materials; no `prefers-reduced-transparency` / `prefers-contrast` |
| Contrast (Rosso CTAs) | 6.5 | Solid white-on-`#da291c` ≈ **4.9:1** (AA pass); active red-on-dark chips ≈ **3.7:1** fail |
| Hit targets | 6.5 | Nav/popup primary/dock 44px; many sanctuary/people/filter chips 32px |
| Screen reader labels | 7.0 | Icon buttons labelled; dock textarea placeholder-only; hover SVG icons unlabeled |
| Modal traps | 7.5 | Tab cycle + focus restore solid; page behind not `inert` (SR escape risk) |

---

## What works (do not regress)

1. **Global `:focus-visible` system** — `button` / `a` / `input` / `select` / `textarea` ring on `--ring` (`global.css` 192–198).
2. **Local focus replacements after `outline: none`** — settings (`settings.css` 78–80), onboarding (`onboarding.css` 285–287), optical/detail/sanctuary inputs (`sanctuary.css` 188–190, 998–1000, 1709–1711), people (`people.css` 31–33, 865–867), popup (`popup.css` 348–358), dock (`dock.ts` 80–82, 149–151, 179–181, 208–210).
3. **DetailModal dialog pattern** — `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + Esc + Tab trap + focus restore (`DetailModal.tsx` 458–503, 522–527).
4. **Drawer isolation** — focus trap, Esc, restore to menu toggle, `inert` + `aria-hidden` on main when open (`App.tsx` 220–264, 404–406, 472–476).
5. **Solid Rosso primary CTAs** — `.btn-primary`, `.popup-btn-primary`, `.sanctuary-btn-gold`, `.sanctuary-detail-btn-inscribe`, `.dock-save-btn` use `var(--primary)` + white `on-primary` (`global.css` 118–120; `popup.css` 779–782; `sanctuary.css` 1606–1610, 1665–1668; `dock.ts` 189–191).
6. **44px discipline on primary chrome** — global `button { min-height: 44px }` (`global.css` 103); modal close 44×44 (`sanctuary.css` 651–661); popup icon/actions (`popup.css` 101–102, 752, 819–822); dock toggle/collapse/save (`dock.ts` 57, 135–136, 193); museum plaque (`overlay.ts` 112–113).
7. **`.sr-only` utility** — present and used (e.g. preferred edition) (`global.css` 593–603; `DetailModal.tsx` 886).
8. **Onboarding structure** — step nav `aria-label`, `aria-current="step"`, sections `aria-labelledby`, labelled password fields, `role="alert"` / `role="status"` (`Onboarding.tsx` 145–155, 225–231, 253, 390).
9. **Popup combobox** — `role="combobox"` + `aria-expanded` / `controls` / `autocomplete` + listbox options with `aria-selected` (`popup.tsx` 521–570).
10. **Reduced-motion coverage** — global sledgehammer + local PRM on sanctuary modal, dock, popup, onboarding step pane (`global.css` 607–636; `sanctuary.css` 642–649; `dock.ts` 213–230, 263–272).

---

## Severity-ranked findings

Severity: **P0** WCAG blocker / keyboard-critical · **P1** major AA gap · **P2** clear a11y debt · **P3** polish.

---

### P0 — None

No single defect fully blocks primary flows for all users (modals have Tab traps; primary CTAs meet AA text contrast; core chrome is keyboard-reachable). Remaining issues are **major AA / AT quality**, not total lockout.

---

### P1 — Major

#### F01 — Modals trap Tab but do not inert the page (screen-reader escape)

**WCAG:** 2.4.3 Focus Order · best practice for `aria-modal` (APG dialog)  
**Apple / FE guidelines:** Modal must isolate both keyboard **and** AT browse modes.

**Evidence:** DetailModal and PoeticCaptureCanvas implement document-level Tab wrap + Esc + focus restore, but neither sets `inert` / `aria-hidden` on the app shell behind the dialog. Drawer correctly does (`App.tsx` 475).

```458:503:src/ui/components/DetailModal.tsx
  // Focus trap + Esc (incl. exit interrupt) + restore focus — matches PoeticCaptureCanvas
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // ... Tab wrap on FOCUSABLE_SELECTOR inside modalRef only
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      // restore previousFocusRef
    };
  }, []);
```

```522:526:src/ui/components/DetailModal.tsx
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
```

Modal is often a sibling inside page trees (`Library.tsx`, `Home.tsx`, `Search.tsx`, …) — virtual cursor / rotor can still reach underlying controls while `aria-modal` is only a hint.

**Fix:** When dialog opens, set `inert` on the root shell (or all siblings outside the portal); clear on close. Prefer a single portal under `document.body` + one shared `useFocusTrap` helper used by DetailModal, PoeticCapture, and any future sheet.

---

#### F02 — Reflection dock: weak keyboard model + unlabeled textarea

**WCAG:** 2.1.1 Keyboard · 4.1.2 Name, Role, Value · 2.4.3 Focus Order  
**Surfaces:** `src/content/dock.ts`

| Gap | Evidence |
|-----|----------|
| No Esc to collapse | `buildCard` / `toggle` only click handlers (`dock.ts` 329, 422–424) |
| No focus move into card on expand | `render` swaps DOM; never `.focus()` textarea or close (`430–445`) |
| No focus return to pill on collapse | Pill recreated without restore |
| Toggle has no `aria-expanded` / `aria-controls` | `buildPill` is plain button with text only (`362–368`) |
| Textarea name = placeholder only | `textarea.placeholder = '…'` (`339`); no `aria-label` / `<label>` |
| Expanded card is not a dialog/region | No `role="dialog"` or labelled region for AT |

**Partial good:** collapse button has `aria-label` (`327`); focus-visible + 44px targets; PRM skips motion (`263–272`, `213–230`).

**Fix:**

```ts
// On expand: closeBtn or textarea focus; document keydown Escape → collapse
// toggleBtn.setAttribute('aria-expanded', String(expanded))
// textarea.setAttribute('aria-label', 'Page reflection notes')
// On collapse: restore focus to pill
```

---

#### F03 — Rosso Corsa **selection / chip** contrast fails AA (red text on Cinema Black)

**WCAG:** 1.4.3 Contrast (Minimum) — normal text 4.5:1  
**Brand note:** Solid **white on `#da291c`** primary CTAs ≈ **4.9:1** → **AA pass**. Failures are **Rosso as text/icon color** on near-black, not filled CTAs.

**Approximate ratios (sRGB relative luminance):**

| Pair | Ratio | Verdict |
|------|------:|---------|
| `#ffffff` on `#da291c` (primary CTA) | ~4.9:1 | AA pass (normal text) |
| `#da291c` on `#181818` (active chip / accent text) | ~3.7:1 | **AA fail** |
| `#da291c` focus ring on `#181818` | ~3.7:1 | 1.4.11 non-text **pass** (≥3:1) |

**Evidence — active intent pills (11px text, Rosso fg):**

```725:729:src/ui/styles/popup.css
.intent-pill.active {
  background: var(--primary-soft, rgba(218, 41, 28, 0.12));
  border-color: var(--primary, #da291c);
  color: var(--primary, #da291c);
}
```

Same pattern: nav active tab color (`tokens.css` `--nav-tab-fg-active: var(--primary)` ~305–307), chip actives using primary as text (`global.css` 510–512), various sanctuary meta in `--border-hero` / primary tints.

**Solid CTA good examples (keep):**

```118:120:src/ui/styles/global.css
.btn-primary {
  background-color: var(--primary);
  color: var(--btn-primary-fg);
```

```779:782:src/ui/styles/popup.css
.popup-btn-primary {
  background: var(--primary);
  color: var(--on-primary-fg, #ffffff);
```

**Fix direction:**

| Pattern | Prefer |
|---------|--------|
| Selected chip / intent | `background: var(--primary); color: var(--on-primary-fg)` (filled scarce Rosso) |
| Or keep outline style | `color: var(--fg-base)` + Rosso border only (white/near-white text) |
| Focus ring if ring fails in light themes | `outline-color: color-mix(in oklch, var(--primary) 70%, white)` already used in popup (`popup.css` 357) — reuse app-wide |

Do **not** lighten Rosso hex for brand; change **pairing** (fill vs text role).

---

#### F04 — Hit targets under 40×40 (and under Apple 44pt) on dense interactive chrome

**WCAG:** 2.5.8 Target Size (Minimum) AA ≥24×24 — most pass; **Apple HIG / FE guidelines** expect **≥44×44** (or ≥40 with padding).  
**WCAG 2.5.5 AAA** is 44×44.

| Location | Detail |
|----------|--------|
| `src/styles/sanctuary.css:130` | `.sanctuary-acquire-btn` `min-height: 32px` |
| `src/styles/sanctuary.css:228,245,852,889,943…` | Multiple 32px filter/chip/control heights |
| `src/styles/sanctuary.css:1179-1180` | Tag remove / compact controls 32×32 |
| `src/ui/styles/people.css:107-108,686-687` | Icon / unfollow 32px |
| `src/ui/styles/global.css:501` | Generic chips `min-height: 32px` |
| `src/ui/styles/global.css:221-232` | Range thumb **28×28** (track is 4px) |
| `src/ui/styles/popup.css:575-576` | Slider thumbs 28×28 |
| `src/ui/styles/popup.css:702-716` | `.intent-pill` padding `8px 4px` — height often &lt;44 without min-height |
| `src/ui/styles/onboarding.css:141-154` | CTA relies on global button min-height; no local min-height if global not applied |
| `src/ui/components/inline-notice.css:95-96` | Dismiss 32×32 |

**Fix:** `min-height/min-width: 44px` (or 40px floor) on interactive chips; expand hit area with `::before { inset: -Npx }` where visual size must stay tight (already used for deselect — `popup.css` 517–522). Range: larger thumb or invisible 44px hit padding.

---

### P2 — Clear a11y debt

#### F05 — Intent / toggle groups missing pressed state for AT

Popup intent pills are real buttons in a `role="group"` but selection is **class-only** — no `aria-pressed` (`popup.tsx` 640–661). Elsewhere the codebase already uses `aria-pressed` (Search, NewReleases, Recommendations).

**Fix:** `aria-pressed={sanctuaryIntent === '…'}` on each pill (mirror Search filter chips).

---

#### F06 — `prefers-reduced-motion` incorrectly kills materials; no transparency/contrast prefs

**WCAG:** 2.3.3 Animation from Interactions (AAA) / user settings respect  
**Apple:** Three independent signals — reduced **motion**, reduced **transparency**, more **contrast**.

```607:628:src/ui/styles/global.css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    ...
  }
  .sanctuary-modal-backdrop,
  .sanctuary-modal-content,
  [class*="plaque"],
  .media-card.sanctuary-media-card {
    backdrop-filter: none !important;
  }
}
```

**Gaps:** Zero `prefers-reduced-transparency` or `prefers-contrast` under `src/`. Global `0.01ms` removes useful opacity feedback.

**Fix:** Keep short opacity cross-fades under PRM; move `backdrop-filter: none` to `prefers-reduced-transparency`; under `prefers-contrast: more` solidify plaques and strengthen borders/rings.

---

#### F07 — Focus ring color uses translucent hero red in places (weaker than `--ring`)

```106:108:src/styles/sanctuary.css
.sanctuary-action-button:focus-visible {
  outline: 2px solid var(--accent-gold, var(--border-hero));
  outline-offset: 2px;
}
```

`--border-hero` is `rgba(218, 41, 28, 0.45)` (`tokens.css` 30) — outline paints at reduced alpha; non-text contrast vs canvas can fall near/under 3:1 depending on compositing. Same pattern: filmography / tag chips (`sanctuary.css` 1989–1991, 2007–2009, 2787–2789); dock toggle uses `--accent-gold` alias (OK if solid primary).

**Fix:** Always `outline: 2px solid var(--ring)` (solid `#da291c`) or lightened mix for light theme — never translucent border tokens as ring color.

---

#### F08 — Content hover card: decorative icons not hidden; no dialog semantics

Hover card actions are real `<button>`s with 44px height and focus-visible (`hoverCard.tsx` 201–227, 953–981), but inline SVGs lack `aria-hidden="true"` (unlike popup/DetailModal). Card is pointer/hover-triggered — keyboard users on host pages may not reach it without plaque focus.

**Fix:** `aria-hidden` on decorative SVGs; ensure museum/book plaques remain the keyboard path into capture (`overlay.ts` 76, `bookOverlay.ts` 440+).

---

#### F09 — Sub-12px interactive labels reduce legibility (related to 1.4.4 / usability)

Not always a pure contrast fail, but FE guidelines ban unreliable type on controls:

| Location | Size |
|----------|------|
| `popup.css` status badges | 9px (prior review) |
| `sanctuary.css` inscribe / gold / restraint CTAs | 11px uppercase |
| `popup.css` intent pills / slider headers | 10–11px |
| `onboarding.css` labels | 11px |

Prefer ≥12px for interactive labels; caps can stay 11px only if weight/tracking keep legibility.

---

### P3 — Polish

- **Dock save hover** swaps fill to `--primary-soft` while keeping white text (`dock.ts` 203–206) — contrast still OK on dark overlay, but loses clear “primary” affordance; prefer `--primary-hover` solid.
- **Range `accent-color: var(--border-hero)`** (`sanctuary.css` 1012–1013) — translucent accent on track; use solid `--primary`.
- **Onboarding step dots** are non-interactive `<span>`s with labels — good for SR progress; ensure completed steps aren’t announced as actionable.
- **Live regions** — Library results `aria-live="polite"` and NoticeProvider are good; capture “saved” ceremony still mostly visual (consider polite status on save success in popup/dock).

---

## Checklist (requested)

| Check | Status | Notes |
|-------|--------|-------|
| **focus-visible** | Mostly pass | Global + local rings; translucent ring tokens residual |
| **Keyboard nav** | Partial | Modal/drawer/Poetic good; dock Esc/focus; hover card host-page limited |
| **ARIA** | Partial | Dialogs/combobox/nav strong; intent `aria-pressed`; dock names |
| **reduced-motion** | Partial | Broad; over-couples materials; no reduced-transparency/contrast |
| **Rosso Corsa CTA contrast** | CTA pass / chip fail | White on solid primary ~4.9:1; red-on-dark ~3.7:1 |
| **Hit targets** | Partial | Primary chrome 44px; dense 32px / 28px thumbs |
| **Screen reader labels** | Partial | Icon buttons good; dock textarea; hover SVGs |
| **Modal traps** | Tab pass / AT partial | Trap + restore; missing page `inert` |

---

## Top fixes (priority order)

### 1. Dialog isolation + dock keyboard/ARIA (highest leverage)

- DetailModal + PoeticCapture: `inert` on app shell (or portal + inert siblings); shared focus-trap helper.  
- Dock: Esc, `aria-expanded`, `aria-label` on textarea, focus into card / restore to pill.

### 2. Rosso selection contrast

- Active chips / intent pills / selected filters: **filled** `background: var(--primary); color: #fff` **or** white text + red border — never `#da291c` text on `#181818` for ≤14px UI text.

### 3. Hit-target floor

- Floor interactive chrome at **44×44** (min 40); expand with pseudo hit areas; grow range thumbs or padding; set `min-height: 44px` on intent pills and acquire/filter chips.

**Follow-ons:** solid `--ring` everywhere; split PRM vs reduced-transparency; `aria-pressed` on popup intent; decorative SVG `aria-hidden`.

---

## Dimension detail (for scoring audit trail)

### Focus-visible
- **Pass:** `global.css` 192–198; popup 348–358; dock 80–210; sanctuary optical/detail/input; settings; people; discovery lobby + search; overlay plaque; hover card buttons.  
- **Weak:** outline color via `--border-hero` alpha (`sanctuary.css` 106–108).

### Keyboard
- **Pass:** DetailModal Esc + Tab (`DetailModal.tsx` 467–496); Poetic same family; drawer (`App.tsx` 220–264); popup search Esc/arrows (`popup.tsx` 535–547).  
- **Fail/partial:** dock no Esc/focus move; content hover depends on pointer.

### ARIA
- **Pass:** dialogs labelled; drawer `aria-expanded`/`controls`; onboarding steps; popup combobox; book overlay labels.  
- **Fail/partial:** dock expanded state; intent pills pressed; hover icons.

### Reduced motion
- **Pass:** global + component PRM; dock JS PRM; modal skip exit animation.  
- **Fail:** materials under PRM; missing transparency/contrast media queries.

### Contrast (Rosso)
- **Pass:** solid primary CTAs white-on-red.  
- **Fail:** primary-as-text on dark for chips/active tabs.

### Hit targets
- **Pass:** global buttons, modal close, popup icons, dock, plaques.  
- **Fail:** 32px sanctuary/people density; 28px thumbs; short intent pills.

### SR labels
- **Pass:** close/settings/deselect/reflect labels; sr-only preferred edition.  
- **Fail:** dock notes field; some decorative SVGs.

### Modal traps
- **Pass:** Tab cycle, Esc, restore, accordion `inert` inside modal (`DetailModal.tsx` 682, 763).  
- **Fail:** page not inert → AT browse outside dialog.

---

## Score rationale

| Prior signal (2026-08-04) | Now |
|---------------------------|-----|
| Focus holes P1 | Largely closed → +0.5–0.8 |
| Translucent primary CTAs / white-on-pale-red | Solid primary on gold/inscribe/popup → +0.3 |
| Drawer trap only | Still best-in-app; modals still lack page inert |
| Dock hard-cut + no a11y | Motion + labels partial; keyboard still incomplete |

**7.2/10** = solid AA foundation on app shell and primary CTAs; not yet “AT-hard” on content-script surfaces or modal isolation. A **8.5+** needs F01–F04 closed and PRM/transparency split.

---

*Audit method: read-only code inspection of listed surfaces + token contrast math. No runtime screen-reader session. WCAG 2.2 AA oriented.*
