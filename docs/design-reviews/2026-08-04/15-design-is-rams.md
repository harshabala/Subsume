# Design Is — Dieter Rams audit of Subsume

| Field | Value |
|-------|--------|
| **Date** | 2026-08-04 |
| **Method** | design-is (Dieter Rams ten principles) |
| **Target** | Full Subsume product design (shipped UI + tokens + copy + content-layer overlays) |
| **Repo** | `/Users/harshabalakrishnan/Subsume` |
| **Surfaces audited** | App shell (`App.tsx`), Archive/Library, Discovery (Home), Poetic Capture, Onboarding, popup grain, content plaques, `tokens.css`, product copy |
| **Mode** | Static repo evidence (INFERRED visuals from source CSS/components; no live browser session) |
| **Overall** | **16 / 30** |
| **Verdict** | **REDESIGN** |

---

## 0. Scope lock

### What is being audited
Subsume is a Chrome extension for private archive, capture, and discovery of **films, series, and books**. Primary design surfaces:

1. **Full app** (`src/ui/`) — Archive (default land), Discovery, Search, Recommendations, Now Showing, Creators, Stats, Alerts, Settings  
2. **Poetic Capture Canvas** — emotion-first inscription flow  
3. **Toolbar popup** — quick log / overview (film grain shared)  
4. **Content layer** — museum plaques, hover cards, screenplay dock on host pages  

Canonical tokens: `src/shared/tokens.css` (currently **Ferrari / Cinema Black / Rosso Corsa**).  
Product philosophy docs: `CINEMATIC_JOURNAL_DESIGN_SPEC.md`, `PRODUCT.md`, `brand.md` (latter two still describe **Gilded Night / gold / Newsreader+Outfit** — out of sync with code).

### Primary user
Someone curating a private relationship with works that stay with them — not a social feed maximizer.

### Primary tasks
1. Browse / filter the private **Archive**  
2. **Capture** what stayed with them (Reflect → Poetic Capture)  
3. **Detect** works while browsing third-party sites  
4. Optionally configure catalogue / AI keys  

### Constraints
- Preact + Vite Chrome extension  
- Shadow DOM isolation for content scripts  
- Motion budget ≤300ms (tokenized); `prefers-reduced-motion` respected in many places  
- Multi-medium (screen + books)  

### Out of scope for this audit
- Backend correctness of detection APIs  
- Store listing conversion copy alone  
- Pure engineering SOLID architecture  

---

## 1. Evidence summary

### 1.1 Structural

| Finding | Evidence |
|---------|----------|
| **Primary IA: 3 primary + 4 explore + 2 house tools** | `src/ui/App.tsx` `PRIMARY_NAV` (Archive / Discovery / Settings), `EXPLORE_NAV` (Search, Recommendations, Now Showing, Creators), `HOUSE_TOOLS_NAV` (House Stats, Premiere Alerts) ~L39–57, L346–468 |
| **Default land: Archive** | `getInitialPage()` returns `'library'` ~L72 |
| **Archive filter stack (stacked chrome)** | Medium tabs (All / Screen / Books) + screen sub-tabs (Films / Series) + collection status (5) + collapsible intent (4) + search + sort + tags — `IntentNavigation.tsx`, `ArchiveControls.tsx`, `Library.tsx` |
| **Interactive density on Archive** | ≥3 tablists + search + sort + optional tag chips + cards + modal — primary task competes with filter chrome |
| **Repeated nav affordances** | Primary destinations appear in top nav **and** drawer; explore in subnav **and** drawer — `App.tsx` L348–467 |
| **Capture progressive disclosure** | `PoeticCaptureCanvas.tsx` `RECALL_DISCLOSURE_CHARS = 40` — intent/rating after recall |
| **Content plaques** | `src/content/overlay.ts` museum plaque injects rating + Reflect |

### 1.2 Visual (INFERRED from tokens + CSS)

| Finding | Evidence |
|---------|----------|
| **Spacing scale** | `4, 8, 12, 20, 24, 32` px — `tokens.css` L49–54 |
| **Type** | Single family **Inter** for both UI and editorial; mono JetBrains — `tokens.css` L43–46; `index.html` Inter only (Newsreader/Outfit removed) |
| **Primary voltage** | Rosso Corsa `#da291c` on canvas `#181818` — `tokens.css` L8–16 |
| **Gold aliases remapped to red** | `--gold: var(--primary)` L22–23; classes still named `sanctuary-btn-gold` in `sanctuary.css` |
| **Light mode present** | `[data-theme="light"]` White Canvas — `tokens.css` L317+ |
| **Idle decoration** | `FilmGrain` SVG `feTurbulence` on app + popup unless reduced motion — `FilmGrain.tsx` L15–48; mounted `App.tsx` L344 |
| **Focus rings** | Global `focus-visible` outline `var(--ring)` — `global.css` L191–198 |
| **Motion tokens** | Durations ≤300ms; `prefers-reduced-motion` blocks in `sanctuary.css`, `poetic-sanctuary.css`, `layout.css` |
| **Brand doc fracture** | Live tokens = Ferrari red; `brand.md` / `PRODUCT.md` / README still Gilded Night gold + Newsreader/Outfit |

### 1.3 Copy & honesty

| Finding | Evidence |
|---------|----------|
| **Canonical keep labels** | `productCopy.ts`: “Add to archive”, “In archive”, honest editions note L57–58 |
| **Theatre jargon density** | “Full repertoire”, “Full programme”, “Browse the house”, “House tools”, “House Stats”, “programme”, “inscriptions”, “Curator’s programme”, “marquee” — `IntentNavigation.tsx` L8–38; `App.tsx` L409–454; `Recommendations.tsx` |
| **Label collision** | Collection tab **“Now showing”** (watching status) vs explore nav **“Now Showing”** (new releases page) — `IntentNavigation.tsx` L21 vs `App.tsx` L43 |
| **Emotion labels (poetic)** | e.g. “Awe · the sublime frame” — `statusLabels.ts` L100–128 (expressive; not plain) |
| **Onboarding honesty** | TMDb optional; skip paths; no forced paywall — `Onboarding.tsx` L46–114, L212–220 |
| **Demo library** | Opt-in only — `ensureDemoLibrary.ts` comment L10–12 |
| **Dark pattern scan** | No forced continuity / fake scarcity / confirmshaming found in audited strings |
| **Inflation / cosplay** | Token comments and plan claim “Ferrari design system” for a product that is not Ferrari — `tokens.css` L1–3; `docs/superpowers/plans/2026-08-04-ferrari-design-system.md` |

### 1.4 Weight & friction (INFERRED)

| Finding | Evidence |
|---------|----------|
| **Stack** | Preact + preact-router + idb — lean dependency surface (`package.json`) |
| **External font cost** | Inter + Material Symbols Outlined from Google Fonts — `index.html` L8–11 |
| **Idle visual cost** | Film grain painted on every full-app and popup frame when motion allowed |
| **Home load fan-out** | Parallel prefs + weekly digest + recommendations + discovery feed — `Home.tsx` L171–180 |
| **Onboarding steps** | 5 steps before full use — `Onboarding.tsx` `TOTAL_STEPS = 5` |
| **Animation on idle** | Grain always present; skeleton pulses on loading only; reduced-motion kills many animations |

### 1.5 Accessibility

| Finding | Evidence |
|---------|----------|
| **Landmarks / labels** | Primary nav `aria-label="Primary"`, explore `aria-label="Explore"`, many tablists with `aria-selected` / `aria-pressed` |
| **Drawer a11y** | `aria-expanded`, `aria-controls`, focus restore, main `inert` when open — `App.tsx` L361–476 |
| **Skip-link** | **Missing** in `index.html` / app shell |
| **Capture dialog** | Focus trap selectors, heading/textarea ids — `PoeticCaptureCanvas.tsx` |
| **Contrast (INFERRED)** | `#ffffff` on `#181818` strong; muted `#969696` / `#666666` on dark — body muted may fail large small-text targets at 4.5:1 in edge cases; not instrumented live |
| **Reduced motion** | Film grain null; drawer closes instantly; modal enter/exit disabled under media query |

### Known gaps
- No live contrast measurement or screenshot regions  
- Exact initial JS bytes not measured from `dist/` in this pass (chunk names present: `ui-*.js`, `popup-*.js`, CSS splits)  
- Popup surface scored via shared tokens/grain only, not full flow walkthrough  

---

## 2. Scorecard (0–3 each; max 30)

Scoring rules applied: **tie → lower score**; **score worst instance**; no weights.

### 1. Good design is innovative — **2 / 3**
**Evidence:** Poetic Capture (emotion before metadata), Shadow DOM museum plaques, intent-grouped hardcover archive, emotional aura spectrum — not a generic Letterboxd clone.  
**Justification:** Clear pattern improvements over commodity trackers (score 2), but does not introduce a widely unprecedented interaction with full restraint; Ferrari token cosplay is imitation, not product innovation. Not a wholesale copy (would be 0).

### 2. Good design makes a product useful — **2 / 3**
**Evidence:** Archive is default land; capture, detect, search, settings exist; medium-aware status labels help books vs screen (`statusLabels.ts`). Filter stack + 5-step onboarding + dual chrome add steps before primary reflection.  
**Justification:** Primary tasks complete, but adjacent surface multiplies steps (score 2, not 3).

### 3. Good design is aesthetic — **2 / 3**
**Evidence:** Single token file, coherent dark canvas, controlled radius (2–8px), spacing ladder, focus rings. Editorial dual-type (Newsreader + Outfit) **removed** for Inter-only; racing red conflicts with “quiet literary sanctuary” philosophy still claimed in `CINEMATIC_JOURNAL_DESIGN_SPEC.md` / `PRODUCT.md`.  
**Justification:** A visible system exists with ≤2 material inconsistencies on the live surface (score 2). Identity fracture with product soul is real but docs don’t paint pixels — worst live issue is loss of editorial type hierarchy, not total chaos.

### 4. Good design makes a product understandable — **1 / 3**
**Evidence:** “Full repertoire” / “Full programme” / “Browse the house” / “House Stats”; dual axes status+intent; **Now showing** vs **Now Showing** collision; Roman I/II/III icons for primary destinations; emotion copy “the sublime frame”.  
**Justification:** 2–3 primary controls need metaphor decoding; jargon is load-bearing on first run (score 1).

### 5. Good design is unobtrusive — **1 / 3**
**Evidence:** Persistent film grain (`FilmGrain` on app + popup); two chrome rows (primary + explore); drawer duplicates both; onboarding ambient glows; empty-state “projection beam”. Plaques are quieter (good).  
**Justification:** Decoration and chrome compete with content on the app shell (score 1). Content-layer plaques alone would score higher.

### 6. Good design is honest — **2 / 3**
**Evidence:** Editions share-archive note is exemplary honesty (`productCopy.ts` L57–58); demo seed opt-in; API keys skippable; no dark patterns found. Theatre “programme / curator” language mildly inflates recommendation surfaces; internal “Ferrari” branding is cosplay not user-facing fraud.  
**Justification:** ≤1 minor inflation class of issues; no deceptive flows (score 2).

### 7. Good design is long-lasting — **1 / 3**
**Evidence:** (1) Automotive **Rosso Corsa** retheme as fashion graft (2026 Ferrari plan), (2) **film grain** overlay as 2020s “cinematic UI” fad, (3) heavy **house/theatre** vocabulary that will age as costume. Warmer gold literary system was more timeless for a sanctuary.  
**Justification:** 2–3 dated markers (score 1).

### 8. Good design is thorough down to the last detail — **2 / 3**
**Evidence:** Empty (`EmptyStateProjection`), loading, error, success ceremony (capture save), focus-visible, disabled opacity, reduced-motion paths present across sanctuary/poetic CSS. Missing skip-link; some secondary pages still plaque-heavy for errors.  
**Justification:** One state/detail class rough or missing (score 2).

### 9. Good design is environmentally friendly — **2 / 3**
**Evidence:** Preact stack (light); motion mostly gated; dark mode + system theme; grain null under reduced motion. Costs: always-on grain paint when allowed, two Google Fonts stylesheets, Home multi-fetch on Discovery.  
**Justification:** Lean runtime intent and motion gating fit score 2; not score 3 (idle decoration + external font weight).

### 10. Good design is as little design as possible — **1 / 3**
**Evidence:** Removable without breaking primary task: film grain, explore subnav row (could fold), drawer duplication of primary, onboarding glow layers, empty-state beam SVG, Ferrari alias/gold class residue, multi-axis filters beyond one clear control.  
**Justification:** 3–5 removable elements (score 1).

---

## 3. Totals

| # | Principle | Score |
|---|-----------|------:|
| 1 | Innovative | 2 |
| 2 | Useful | 2 |
| 3 | Aesthetic | 2 |
| 4 | Understandable | **1** |
| 5 | Unobtrusive | **1** |
| 6 | Honest | 2 |
| 7 | Long-lasting | **1** |
| 8 | Thorough | 2 |
| 9 | Environmentally friendly | 2 |
| 10 | As little design as possible | **1** |
| | **Overall** | **16 / 30** |

---

## 4. Verdict

### **REDESIGN**

> Subsume’s product purpose and core interaction patterns (capture, plaques, archive) are real, but the **shipped design language and chrome density fail Rams’ threshold** (16/30): understandability, unobtrusiveness, longevity, and restraint are load-bearing gaps—not polish nits.

**Why redesign, not refine:** Total **16 < 20**. Load-bearing **#4 Understandable** is at 1 (theatre jargon + dual filter axes + label collisions). Visual identity was recently force-mapped onto an automotive system that fights the sanctuary brief—refining red opacity will not restore clarity or timelessness.

**Why not NEW:** The product is not a stub. Poetic Capture, museum plaques, intent archive, medium-aware status, token architecture, and reduced-motion discipline are decisions worth **preserving and rebuilding around**.

### Highest-leverage moves (spine for next plan)

1. **#4 Understandable** — Replace house/programme/repertoire jargon with plain labels; resolve **Now showing** vs **Now Showing**; collapse status vs intent into one scannable model for first-time users. Evidence: `IntentNavigation.tsx` L8–38; `App.tsx` L43, L409–454.  
2. **#5 / #10 Unobtrusive + less design** — Remove idle film grain by default (or settings-only); single navigation row; kill drawer duplication of primary destinations. Evidence: `FilmGrain.tsx`; `App.tsx` L344–390.  
3. **#7 Long-lasting** — **Discard Ferrari Rosso cosplay** as product identity; restore a timeless sanctuary palette (warm restrained accent + true editorial type hierarchy), not a luxury-auto skin. Evidence: `tokens.css` L1–46 vs `CINEMATIC_JOURNAL_DESIGN_SPEC.md` / prior Gilded Night.  
4. **#2 Useful** — Reduce Archive to one primary filter dimension on first paint; progressive disclosure for advanced filters; shorten onboarding to essentials. Evidence: `Library.tsx` + `IntentNavigation.tsx` stack; `Onboarding.tsx` 5 steps.  
5. **#6 / #3 Honest aesthetic** — Align `brand.md`, `PRODUCT.md`, README fonts/palette claims with whatever ships; retire “gold” class semantics or rename; keep honesty notes like editions share-archive. Evidence: brand docs vs `tokens.css`; `productCopy.ts` L57–58 (keep).

---

## 5. What to preserve vs discard

### Preserve (non-empty)
- **Three-act product model:** Discover → Capture → Archive (`README.md`, capture flow)  
- **Poetic Capture progressive disclosure** — recall before intent/rating (`PoeticCaptureCanvas.tsx` L33–34, L54–55)  
- **Museum plaques in isolated Shadow DOM** (`overlay.ts`, `shadowTokens.ts`)  
- **Medium-aware status labels** (`statusLabels.ts` L69–87) and **productCopy honesty** for editions  
- **Token architecture** (CSS variables, light/dark/system, motion duration caps, focus-visible)  
- **`prefers-reduced-motion` discipline** already wired in grain, modals, drawer  
- **Archive as home** for returning users (`getInitialPage` → library)  

### Discard (structural causes of failure)
- **Ferrari / Rosso Corsa product skin** as brand identity (`tokens.css` header + primary hex; Ferrari plan) — caused #7, harms #3/#5  
- **Always-on film grain** as default chrome — caused #5, #9, #10  
- **Theatre-house jargon layer** on operational chrome — caused #4  
- **Dual nav + drawer mirror** of the same destinations — caused #5, #10  
- **Stacked multi-axis Archive chrome** on first paint — caused #2, #4, #10  

---

## 6. /make-plan handoff (REDESIGN)

Copy-paste into the next session:

````
/make-plan Redesign Subsume’s shipped design system and primary app chrome. Current design failed a Dieter Rams (design-is) audit at **16/30** with critical gaps in principles **#4 Understandable, #5 Unobtrusive, #7 Long-lasting, #10 As little design as possible**.

Verdict paragraph (quoted from audit):
> Subsume’s product purpose and core interaction patterns (capture, plaques, archive) are real, but the shipped design language and chrome density fail Rams’ threshold (16/30): understandability, unobtrusiveness, longevity, and restraint are load-bearing gaps—not polish nits.

Why redesign and not refine: Total is below 20; load-bearing understandability is at 1/3 (jargon + dual filter axes + label collisions), and the Ferrari Rosso skin fights the sanctuary product—token tweaks alone will not fix chrome density or plain language.

Preserve from current design (MUST):
- Poetic Capture Canvas progressive disclosure (recall → intent/rating) — `src/ui/components/PoeticCaptureCanvas.tsx`
- Museum catalogue plaques + Shadow DOM isolation — `src/content/overlay.ts`, `src/shared/shadowTokens.ts`
- Medium-aware status labels + editions honesty copy — `src/shared/statusLabels.ts`, `src/shared/productCopy.ts` (EDITIONS_SHARE_ARCHIVE_NOTE)
- CSS variable architecture, light/dark/system themes, ≤300ms motion tokens, focus-visible, prefers-reduced-motion hooks — `src/shared/tokens.css`, `src/ui/styles/global.css`
- Archive as default landing for returning users — `src/ui/App.tsx` getInitialPage
- Core destinations: Archive, Discovery, Search, Capture, Settings (product purpose)

Discard (MUST):
- Ferrari / Rosso Corsa as Subsume brand identity (`src/shared/tokens.css` primary #da291c system; “Ferrari” comments/plan as product skin). Caused failure on #7 Long-lasting.
- Always-on FilmGrain default on app/popup (`src/ui/components/FilmGrain.tsx` mounted in App/popup). Caused failure on #5 Unobtrusive, #10 less design.
- House/programme/repertoire/marquee jargon on primary chrome (`IntentNavigation.tsx`, Recommendations, App drawer “Browse the house”). Caused failure on #4 Understandable.
- Dual explore subnav + drawer mirroring of the same primary destinations without progressive need. Caused failure on #5/#10.
- Multi-axis Archive filters all visible on first paint (medium + screen type + collection + intent + search + sort + tags). Caused failure on #2/#4/#10.

Top moves from the audit (verbatim):
1. Principle #4 — Understandable: Replace house/programme/repertoire jargon with plain labels; resolve Now showing vs Now Showing; collapse status vs intent into one scannable model for first-time users. Evidence: IntentNavigation.tsx; App.tsx nav labels.
2. Principles #5 / #10 — Unobtrusive + less design: Remove idle film grain by default (or settings-only); single navigation row; kill drawer duplication of primary destinations. Evidence: FilmGrain.tsx; App.tsx shell.
3. Principle #7 — Long-lasting: Discard Ferrari Rosso cosplay as product identity; restore a timeless sanctuary palette (restrained warm accent + true editorial type hierarchy), not a luxury-auto skin. Evidence: tokens.css vs cinematic sanctuary brief.
4. Principle #2 — Useful: Reduce Archive to one primary filter dimension on first paint; progressive disclosure for advanced filters; shorten onboarding to essentials. Evidence: Library + IntentNavigation stack; Onboarding TOTAL_STEPS = 5.
5. Principles #6 / #3 — Honest aesthetic: Align brand.md, PRODUCT.md, README palette/typography claims with shipped tokens; retire misleading gold class semantics or rename. Evidence: brand docs vs tokens.css.

Redesign principles in priority order:
1. #4 Understandable — A first-time user can name every primary control without theatre metaphor.
2. #2 Useful — Archive browse and Reflect complete in the fewest steps; filters don’t block the grid.
3. #10 As little design as possible — Every chrome element earns its place; no idle decoration by default.
4. #7 Long-lasting — Palette and type would still read as calm sanctuary in 3+ years (no brand cosplay, no grain fad default).
5. #5 Unobtrusive — Content (posters, recall text, titles) is figure; UI is ground.

Deliverables for the plan:
- New information architecture (not a recolor of dual-nav + dual-filter): screen map for Archive, Capture, Discover, Settings
- New primary flow low-fi (side-by-side vs current Archive first paint and App shell)
- Token decisions: type scale (restore editorial vs UI distinction or justify single family), spacing scale, **color count cap**, accent rationale (not Ferrari)
- States checklist: empty, loading, error, success, focus, disabled (keep thoroughness ≥ current)
- Plain-language string table for every primary control (replace jargon)
- Migration path: existing library data unchanged; theme preference migration if token names/values change; users on dark default stay dark
- Cutover criteria: design-is re-audit target ≥20 with no principle at 0; #4 ≥2; film grain not default; docs match tokens
- Regression: plaques, Poetic Capture disclosure, reduced-motion, editions honesty note still ship

Anti-patterns to guard against (specific to REDESIGN):
- Porting old dual-nav + full filter stack under new colors
- Keeping Ferrari and “sanctuary gold” both behind flags indefinitely
- Redesigning to follow another brand trend (another cosplay)
- Treating Preserve list as optional
- Expanding feature scope (new rec algorithms, new media types) under this design redesign
````

---

## 7. Auditor notes

- Scored **what ships in source**, not what `brand.md` still wishes.  
- Ferrari plan completion made visual system more consistent with itself and **less** consistent with Subsume’s literary sanctuary purpose—Rams #7 and #10 punish fashion grafts.  
- Content-layer plaques would score higher alone on #5; the **app shell** is the worst instance for unobtrusive/less-design.  
- Re-run this audit after redesign with live screenshots + measured bundle bytes for #3 and #9 precision.

---

*End of design-is review. No implementation in this artifact.*
