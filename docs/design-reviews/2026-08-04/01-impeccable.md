# Impeccable design review — Ferrari remap (Subsume)

**Date:** 2026-08-04  
**Target:** Full product surfaces after Ferrari design-system remap (app shell, popup, sanctuary, content Shadow DOM)  
**Repo:** `/Users/harshabalakrishnan/Subsume`  
**Desktop loadable:** `~/Desktop/Subsume-dev`  
**Mode:** Operate (journal / extension UI) with Experience accents (capture, archive plaques)  
**Method:** ⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed). Assessment A (design director review of source + tokens) + Assessment B (static pattern scan / detector-style greps). Browser overlay injection not run in this session.

**Score: 6.4 / 10**

---

## Executive verdict

The token-first Ferrari remap **lands the brand voltage correctly at the system layer**: Cinema Black `#181818`, Rosso Corsa `#da291c`, White Canvas light theme, Inter stacks, and theme labels (`Cinema Black` / `White Canvas` / `System`) are coherent and test-backed. Shadow DOM tokens track the same dark defaults. That is real craft discipline.

What keeps this from feeling **shipped Ferrari** is not palette — it is **semantic misuse of tokens and unfinished identity transfer**. Primary CTAs and active chips still paint with `--border-hero` (45% translucent red) instead of solid `--primary`, so Rosso Corsa rarely arrives as the scarce, decisive racing red the brief demands. Gilded Night names (`.btn-sanctuary-gold`, `--accent-gold`, “gold” class vocabulary) and warm-taupe CSS fallbacks still describe the old world. `DESIGN.md` still documents Ferrari marketing (FerrariSans, `rounded.none`, car-hero photography) while the product intentionally uses Inter + soft 2–8px radii + journal chrome — so the written system and the running system disagree.

**Single biggest opportunity:** Make solid Rosso Corsa the only primary fill path; demote translucent red to borders/focus only; rewrite `DESIGN.md` as Subsume’s Ferrari journal system (not the car site dump).

---

## Strengths

1. **Token remapping is disciplined and complete at the core.** `:root`, `[data-theme="dark"]`, `[data-theme="light"]`, and partial system-light media queries share Rosso Corsa / Cinema Black / White Canvas values. Compatibility aliases (`--gold`, `--accent-gold` → primary) preserve component wiring without a mass rename.  
   Evidence: `src/shared/tokens.css:1–284`, light block `316–503`, plan constraints honored in `docs/superpowers/plans/2026-08-04-ferrari-design-system.md`.

2. **Shadow DOM parity for content surfaces.** `shadowTokens.ts` injects the same dark Ferrari canvas into closed shadow roots and loads Inter once — content plaques/dock/overlays will not regress to host-page fonts/colors.  
   Evidence: `src/shared/shadowTokens.ts:6–94`, `setupShadowStyles`.

3. **Theme labeling and application path are clear.** User-facing names match the brief; `applyThemePreference` / atmosphere hooks stay small and predictable.  
   Evidence: `src/shared/themeLabels.ts:3–7`, `tests/themeLabels.test.ts:5–9`, `src/shared/theme.ts:9–17`.

4. **Motion floor remains product-aware.** Duration tokens stay ≤300ms; reduced-motion media queries exist across sanctuary, popup, layout, recommendations, emotional components, etc. Focus-visible rings widely use red-tinted outlines (good post-gold).

5. **Structural UI maturity from prior wraps is intact.** 44px targets on many primary controls, semantic ARIA on People/Recommendations/Onboarding, Archive-first IA, solid popup primary using `var(--primary)` rather than translucent hero border.

---

## Severity-ranked findings

Severity map for this review: **Critical** ≈ P0/P1 ship blockers or WCAG/brand integrity failures · **Important** ≈ P1/P2 consistency & a11y · **Minor** ≈ P2/P3 polish.

### Critical

| ID | Finding | Location | Why it matters |
|----|---------|----------|----------------|
| **C1** | **Primary CTAs fill with translucent `--border-hero` (45% red), not solid Rosso Corsa** | `src/styles/sanctuary.css:1557–1559`, `1615–1617`; `src/ui/styles/settings.css:227–229`; `src/ui/styles/poetic-sanctuary.css:244–246`, `275–277`, `303–305`; also people/recommendations chip fills | Ferrari brief: scarce **solid** `#da291c` CTAs. Translucent fills look washed, vary by underlying surface, and break the “racing red voltage” read. Hover jumps to solid `--primary-hover-bg`, so resting state and hover disagree in weight. |
| **C2** | **Light-theme primary CTAs risk white-on-pale-red contrast failure** | Same CTA rules + `tokens.css:402` (`--on-primary-fg: #ffffff`) + light `--border-hero` ~40% over `#f7f7f7` | Composite fill ≈ soft pink; white label fails WCAG AA. Poetic capture uses `--on-accent-fg` (ink on light) while sanctuary gold buttons use `--on-primary-fg` (white) — **split, inconsistent, one path fails White Canvas**. |
| **C3** | **`DESIGN.md` is still Ferrari.com marketing system, not Subsume product design** | `DESIGN.md` typography (FerrariSans), components (Cavallino, race calendar, preowned cards), Overview lines 274–288 vs `tokens.css:43–46` Inter + plan “Do not use proprietary FerrariSans” | Agents and humans will “comply” with the wrong system (display 80px mega, `rounded.none`, car heroes). Product truth is Inter + journal chrome. Documentation integrity failure for every future impeccable/polish pass. |
| **C4** | **Dangerous on-primary fallback `#0a0a0a` (Gilded Night ink-on-gold)** | `src/ui/styles/popup.css:777`, `785` | If `--on-primary-fg` is missing in a surface, Rosso Corsa buttons get **near-black text on red** (wrong) or low contrast. Should fallback to `#ffffff`. |

### Important

| ID | Finding | Location | Why it matters |
|----|---------|----------|----------------|
| **I1** | **Gold vocabulary still dominates classnames & token names** | `.sanctuary-btn-gold` `sanctuary.css:1615`; `.btn-sanctuary-gold` `settings.css:226`; Alerts/Settings class strings; dozens of `var(--accent-gold…)` | Developers keep shipping “gold” mental model; copy and code review language lag the Ferrari remap. Plan allowed deferral — still a system integrity debt. |
| **I2** | **Warm Gilded Night hex fallbacks remain in CSS** | `recommendations.css:78–79`, `88`, `100–102`, `111–112` (`#5a5248`, `#9e9a90`, `#f0e6d8`); success fallbacks `#3d8b5f` in popup/settings-nav/inline-notice | Tokenless surfaces reintroduce taupe/warm literary palette and non-Ferrari success green (`#03904a` is the semantic success in tokens). |
| **I3** | **Shadow tokens are dark-only; content UI ignores White Canvas / atmosphere** | `shadowTokens.ts:11–93` hardcodes Cinema Black | User on White Canvas still sees dark plaques on host pages — intentional for “cinema overlay” maybe, but undocumented and thematically split. No light injection path. |
| **I4** | **System light `@media` remap is incomplete vs full `[data-theme="light"]`** | `tokens.css:506–578` vs `316–503` | Choosing System + OS light misses many semantic tokens (status colors, onboarding, danger, shadows, etc.) that explicit White Canvas remaps — visual partial light mode. |
| **I5** | **Atmosphere presets override Rosso Corsa primary** | `tokens.css:582–695` (sunset/emerald/french) | Optional atmospheres are cool, but they **unseat the brand voltage**. Settings “Look & atmosphere” can leave the product looking non-Ferrari without labeling that risk. |
| **I6** | **`--border-hero` overloaded as fill, border, text color, accent-color, underline** | 100+ uses under `src/` (e.g. sanctuary tabs, chips, checkboxes `settings.css:169`, `187`) | A border token used as brand red for everything creates muddy hierarchy: every active state glows the same translucent red; true primary loses scarcity. |
| **I7** | **Editorial identity lost when both fonts = Inter but italics/serif fallbacks remain** | `tokens.css:43–44`; `popup.css:62` `Georgia, serif` fallback; widespread `font-style: italic` on titles (e.g. sanctuary plaque titles `sanctuary.css:72`) | Inter italic is not literary Newsreader; Georgia fallback fights Ferrari single-sans. Either lean hard into uppercase tracked UI (Ferrari CTA type) or keep a restrained editorial face — currently neither. |
| **I8** | **Spacing scale ≠ DESIGN.md 8px ladder** | Tokens: 4/8/12/20/24/32 (`tokens.css:49–54`); DESIGN: 4/8/16/24/32/48… | Agents following DESIGN will space wrong; product spacing is denser app-UI, not editorial luxury. |
| **I9** | **Hardcoded error color outside tokens** | `onboarding.css:301` `color: #c45c5c` | Bypasses `--error-fg` / theme flip; light/dark consistency and future palette edits miss this. |
| **I10** | **Small touch targets remain (popup + rating)** | `poetic-sanctuary.css:259–260` 36×36 rating; popup heights 28–32px (`popup.css:100`, `574`, `593`) | Extension popup is dense; still fails 44×44 Fitts/WCAG target guidance on secondary controls. |
| **I11** | **Semantic warning token drift** | DESIGN/plan semantic warning `#f13a2c`; tokens use amber `--warning: #fbbf24` / orange status | Red-on-red with Rosso Corsa if warning uses Ferrari warning red; current amber is safer but undocumented vs plan. |

### Minor

| ID | Finding | Location | Why it matters |
|----|---------|----------|----------------|
| **M1** | Shadcn `--radius: 0.5rem` vs Ferrari-tight 2–8px product radii | `tokens.css:141` | Soft radius island if shadcn-like components appear. |
| **M2** | `--gold-text-soft: #ff6b5c` pink-coral accent | `tokens.css:186` | Reads candy, not Rosso Corsa; soft accents should stay on red family at controlled L. |
| **M3** | Nav logo/active red scarcity diluted by red on every chip/dot/tab | app-nav + settings chips | Brand voltage overused → “always red,” not “scarce red.” |
| **M4** | Italic onboarding warn + monogram-as-warn color | `onboarding.css:306–313` | Personality leftover; tone uneven vs sharp automotive CTA language. |
| **M5** | Class rename deferred leaves Settings “Gold CTA” comment | `settings.css:225` | Comment lies; confuses audits. |
| **M6** | Material Symbols + Inter dual external font requests | `index.html` / `popup.html` | Perf/CSP surface; fine for now, worth subsetting later. |
| **M7** | Film grain still present | FilmGrain component + grain opacity tokens | Cinematic OK; with Ferrari (cleaner automotive) may feel residual Gilded Night — intentionality check. |
| **M8** | `outline: none` on many inputs relying on border/box-shadow only | global, sanctuary, popup, settings | Focus-visible often patched elsewhere; uneven on custom controls. |

---

## Design specificity

**LLM:** Subsume still reads as a **cinematic film/book journal** (archive, plaques, poetic capture, Roman nav marks, film grain) with a **red-black automotive paint job**. That is more specific than a generic dark SaaS app, but the Ferrari layer is mostly chromatic + typographic swap, not a re-authored composition language (no sparse solid CTAs, no sharper zero-radius discipline, no hero-band pacing). Category-interchangeable risk: medium if gold names stay and CTAs stay translucent.

**Deterministic / static scan (Assessment B):**  
- No leftover `#c9a84c` / `#b8962e` gold hex in `src/` (remap success).  
- Residual Gilded warm fallbacks: recommendations + success `#3d8b5f`.  
- `--border-hero` as background: **~20 CSS rules**.  
- `gold` identifier still pervasive (classes, tokens, comments).  
- Font: Inter wired; FerrariSans absent (correct per plan).  
- Reduced-motion: present in 18+ CSS files.  
- Browser detector overlay: **not injected this run** (degraded).

---

## Heuristics snapshot (Operate mode, /40)

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | Notices/async exist; atmosphere/theme feedback subtle |
| 2 | Match system / real world | 3 | Film/book language strong; gold classnames confuse makers not users |
| 3 | User control & freedom | 3 | Theme + archive maturity; modal/drawer traps improved historically |
| 4 | Consistency & standards | **2** | Solid vs translucent primary; light vs dark CTA ink; DESIGN vs code |
| 5 | Error prevention | 3 | Confirm patterns; onboarding still key-gated (product, not Ferrari) |
| 6 | Recognition rather than recall | 3 | Labeled nav mostly; some icon density |
| 7 | Flexibility & efficiency | 2 | Limited accelerators; dense settings |
| 8 | Aesthetic & minimalist design | **2** | Red used too broadly; translucent fills add visual noise |
| 9 | Error recovery | 3 | Inline notices; some hardcoded error colors |
| 10 | Help & documentation | 2 | Onboarding help uneven; DESIGN.md misleads builders |
| **Total** | | **26/40** | **Acceptable → low Good** |

Cognitive load: **moderate** (2–3 checklist fails: wall of settings options; multi-accent red hierarchy; dual gold/primary mental models for implementers).

---

## Top 10 prioritized fixes

1. **C1/C2 — Primary fill contract:** All primary CTAs use `background: var(--primary); color: var(--on-primary-fg, #ffffff)`. Reserve `--border-hero` for borders/underlines only. Files: `sanctuary.css`, `settings.css`, `poetic-sanctuary.css`, `people.css`, `recommendations.css`.
2. **C4 — Fix popup fallbacks** `#0a0a0a` → `#ffffff` on `.popup-btn-primary` (`popup.css:777,785`).
3. **C3 — Rewrite `DESIGN.md` for Subsume Ferrari journal** (Inter, radius 2–8, spacing tokens as implemented, no Cavallino/FerrariSans, no car-hero components). Align spacing ladder or document deliberate app density.
4. **I6 — Introduce semantic tokens** e.g. `--cta-bg`, `--focus-ring`, `--chip-active-fg` so components stop borrowing `--border-hero`.
5. **I2 — Sweep warm/success fallbacks** to Ferrari values (`#03904a` or token refs only; kill `#5a5248` / `#f0e6d8` / `#3d8b5f`).
6. **I4 — Complete system-light token parity** with `[data-theme="light"]` block (or share via cascade).
7. **I1 — Rename gold classes** (or alias with deprecation): `.btn-sanctuary-primary`, drop “Gold CTA” comments.
8. **I3 — Decide content overlay theme policy** (always Cinema Black vs follow app theme) and document; implement light shadow tokens if following.
9. **I7 — Typography POV:** either full uppercase tracked Ferrari UI for chrome + Inter 500 display, or add a single licensed editorial face — remove Georgia fallbacks and accidental italic-as-serif.
10. **I5/M3 — Scarcity pass:** limit solid Rosso to logo, primary CTA, focus ring; mute chips/tabs to hairline + ink; label atmospheres as “mood (overrides brand red)”.

Suggested impeccable command sequence after approval:  
`$impeccable document` (honest DESIGN.md) → `$impeccable colorize` / token contract for CTA → `$impeccable layout` (hierarchy/scarcity) → `$impeccable typeset` → `$impeccable polish`.

---

## Persona red flags (brief)

- **Alex (power user):** Gold classnames + inconsistent primary fills slow theme work; atmospheres silently steal brand red.  
- **Jordan (first-timer):** Visual system is dark-cinema-first — White Canvas CTAs that fail contrast undermine trust.  
- **Sam (a11y):** White-on-translucent-red CTAs (light); small rating targets; reliance on red alone for active chips.

---

## Positive regressions avoided

- No proprietary FerrariSans or Cavallino marks (plan-compliant).  
- No residual Gilded gold hex in live tokens.  
- Inter loaded in app + popup + shadow.  
- Theme labels shipped and tested.

---

## Run notes

| Item | Status |
|------|--------|
| Assessment independence | Degraded single-context (no spawn_agent) |
| CLI detect.mjs | Not executed end-to-end; equivalent static greps used |
| Browser overlay | Skipped (no live injection this run) |
| Product code mutations | None (read-only) |
| Deliverable path | `docs/design-reviews/2026-08-04/01-impeccable.md` |

---

## Score rationale (6.4 / 10)

| Band | Meaning |
|------|---------|
| 8–10 | Ferrari-grade scarcity + token honesty + DESIGN = code |
| **6–7** | **Palette remapped; semantic/CTA/docs unfinished (here)** |
| 4–5 | Cosmetic recolor only, gold still visible |
| 0–3 | Broken theme / unusable contrast |

Token layer: **8/10**. Component semantic application: **5/10**. Docs & naming integrity: **4/10**. Blended product design score: **6.4/10**.
