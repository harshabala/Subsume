# Redesign Existing Projects — Premium Upgrade Path Audit

| Field | Value |
| --- | --- |
| **Date** | 2026-08-10 |
| **Skill** | `redesign-existing-projects` |
| **Repo** | Subsume @ `a5471b5` |
| **Scope** | Audit only — upgrade path from hybrid Ferrari/sanctuary → premium quality without breaking function |
| **Surfaces** | App shell, popup, sanctuary/capture, content-script shadow tokens, onboarding, library/archive, discovery, people, settings |
| **Stack** | Preact + vanilla CSS custom properties (`src/shared/tokens.css`), no Tailwind |
| **Prior** | [2026-08-04/14-redesign-existing-projects.md](../2026-08-04/14-redesign-existing-projects.md) (score **6.8**) |

---

## Executive summary

Subsume is a **token-first Cinema Black + Rosso Corsa shell** painted over a **literary sanctuary product**. Post-Ferrari remount and subsequent hygiene (solid CTAs, gold chroma purge, brand.md alignment) raised craft above typical extension UI. The product still **reads as a hybrid**: racing-red voltage and monofont Inter on one side; poetic capture, hardcover spines, film grain, and cinema-voice copy on the other — without a fully synthesized surface language.

This is **not** a ground-up redesign. The upgrade path is **character restoration + accent scarcity + surface language**, applied in small reviewable waves against the existing Preact/CSS stack. Function, data model, and motion budget stay intact.

### North star (locked)

**Option A — Synthesize** (from 2026-08-04 consensus / open-issues plan):

> Sanctuary soul first. Ferrari only as **scarce voltage** (Rosso Corsa) + **Cinema Black** canvas. No trademarked Ferrari marks, no FerrariSans, no full automotive marketing layout.

Litmus: *Does this screen make the user want to stay and reflect?*

### Current quality score

# **7.1 / 10**

| Band | Meaning |
| --- | --- |
| 0–4 | Generic AI default / unfinished |
| 5–6 | Competent product UI with fingerprint issues |
| **7.1** | **Strong craft + intentional system; premium still blocked by Inter monofont, multi-accent chrome, Material icons, and equal card grids** |
| 8–9 | Editorial luxury (Criterion / MUBI / restrained cinema-house) |
| 10 | Category-defining visual identity |

**Delta vs 2026-08-04 (6.8 → 7.1):**

| Improved | Still blocking |
| --- | --- |
| Solid `--primary` CTAs (`.sanctuary-btn-gold` → solid `#da291c`) | Inter for both `--font-ui` *and* `--font-editorial` |
| Residual gold chroma (`hsla(45,…)`, `#c9a84c`) **gone** from `src/` | Rainbow status chips (blue/amber/green/red) |
| `brand.md` / `PRODUCT.md` aligned to Cinema Black + Rosso | Material Symbols Outlined as default chrome |
| Spacing ladder extended (`--spacing-3xl`…`--super`) | Equal `auto-fill` border+shadow card grids |
| Hover media queries, curtain motion, grain preserved | Gold *naming* debt (`--gold*`, `.sanctuary-btn-gold`) |
| | `CINEMATIC_JOURNAL_DESIGN_SPEC` still Newsreader/Outfit dual-type |

---

## Framework & styling method

| Layer | Live path | Notes |
| --- | --- | --- |
| UI | `src/ui/` Preact pages + `src/ui/styles/*.css` | No framework migration |
| Sanctuary | `src/styles/sanctuary.css` + poetic/capture CSS | Dual class systems coexist |
| Tokens | `src/shared/tokens.css` | Canonical runtime values |
| Shadow DOM | `src/shared/shadowTokens.ts` | Must stay in parity on any font/token change |
| Fonts | Google Fonts Inter 400–700 only (`src/ui/index.html`) | Single family |
| Icons | Material Symbols Outlined (same HTML) | Default AI/Google fingerprint |
| Theme | `data-theme` + optional `data-atmosphere` | Atmosphere recolors primary — keep optional |

**Rule for upgrades:** work with vanilla CSS variables and existing classes. Do not introduce Tailwind, redesign architecture, or rewrite Preact trees unless a surface is already being touched for layout.

---

## Hybrid identity map

```text
                    FERRARI LAYER                         SANCTUARY LAYER
              (precision · scarce red · mono)        (theatre · reflection · memory)
         ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
         │ Cinema Black #181818            │   │ Three Acts (Lobby / Auditorium /│
         │ Rosso Corsa #da291c (primary)   │   │   Hardcover Archive)            │
         │ Tight radii 2/4/8               │   │ Film grain · curtain ceremony   │
         │ Inter monofont (plan choice)    │   │ Poetic capture · empty theatre  │
         │ Uppercase button/caption DNA    │   │ Spine cards · literary copy     │
         │ DESIGN.md automotive ladder     │   │ Spec dual-type Newsreader/Outfit│
         └─────────────────────────────────┘   └─────────────────────────────────┘
                              \                     /
                               \    LIVE HYBRID    /
                                \  red paint on    /
                                 \ sanctuary soul /
                                  \______________/
```

**Synthesis rule (do not break):**

1. Canvas, motion, grain, copy, empty states, capture immersion → **sanctuary wins**.  
2. Primary voltage, focus ring, scarce CTA red, tighter chrome radius → **Ferrari wins**.  
3. Type: restore **dual system** (editorial serif + distinctive UI sans) — Ferrari monofont was a remount convenience, not the product north star.  
4. Never ship Cavallino, FerrariSans, or trademarked marks.

---

## Design audit (skill checklist × live evidence)

### Typography — **weakest premium lever**

| Check | Status | Evidence |
| --- | --- | --- |
| Inter / default font everywhere | **Hit** | `--font-ui` and `--font-editorial` both Inter in `tokens.css`; only Inter loaded in `index.html` |
| Headlines lack presence | Partial | `.sanctuary-title` 34px italic editorial *role* but same Inter face → “UI italic,” not Criterion display |
| Body width | Pass-ish | Shell max 1200px; descriptions often capped |
| Weights 400–700 | Pass | Inter loads full useful range |
| Tabular nums | Partial | Stats/library use `tabular-nums` in places; keep expanding |
| Letter-spacing | Partial | Strong on labels; display tracking still modest |
| All-caps subheaders everywhere | **Hit** | Dense `text-transform: uppercase` across `sanctuary.css` (headers, buttons, chips, captions) |
| text-wrap balance/pretty | Pass | Titles and empty states |
| Spec vs live | **Hit** | Cinematic spec still Newsreader/Outfit; brand.md documents Inter monofont |

**Diagnosis:** Ferrari correctly killed accidental gold and proprietary fonts, but **collapsed the dual-type system that made Subsume feel editorial**. Premium path starts with type character, not another palette swap.

---

### Color and surfaces

| Check | Status | Evidence |
| --- | --- | --- |
| Pure `#000` | Pass | `#181818` / sunken `#121212` |
| Oversaturated accent | Watch | Rosso is intentionally loud — scarcity is the luxury constraint |
| More than one accent | **Hit** | Status: blue / amber / green / red fills; emotion spectrum includes purple `--color-awe` (oklch hue 290) |
| Warm vs cool grays | Mild | Neutrals gray; shadows still cool `hsla(240, …)` |
| Purple/blue AI gradient | Partial | Awe purple + cool melancholy blue on emotional UI |
| Flat / no texture | Pass | Film grain + ambient layers |
| Residual gold chroma | **Pass** (improved) | No `hsla(45` / `#c9a84c` in `src/` |
| Gold *names* | **Hit** | `--gold`, `--gold-text`, `.sanctuary-btn-gold`, `--accent-gold` aliases throughout |

**Diagnosis:** Identity base is clean. **Chrome is still multi-accent tracker SaaS**. Luxury restraint wants monovoltage Rosso + monochrome status language; emotion spectrum should desaturate and avoid “AI purple.”

---

### Layout

| Check | Status | Evidence |
| --- | --- | --- |
| Shell max-width / gutter | Pass | `--app-shell-max: 1200px`, shared nav column |
| Equal card grids | **Hit** | `.card-grid` / sanctuary grids `repeat(auto-fill, minmax(…))` |
| Border + shadow cards | **Hit** | `.media-card` elevated rectangle + hover lift |
| Left sidebar dashboard | Pass | Top subnav + drawer (not generic left-rail AI app) |
| Depth / asymmetry | Partial | Spines + stagger exist; many lists still flat equal tiles |
| Uniform radius | Partial | Tokens 2/4/8; some ad hoc 10px / 50% circles remain |

**Diagnosis:** Shell geometry is mature. Content still defaults to **media-tracker grids**. Archive hardcover ambition wants spine/masonry/asymmetric memory lanes more often.

---

### Interactivity and states

| Check | Status | Evidence |
| --- | --- | --- |
| Hover | Pass | Cards/buttons with `@media (hover: hover)` in many places |
| Pressed | Pass | Global `button:active { scale(0.97) }` |
| Focus rings | Mixed | Good ring tokens; residual `outline: none` without always-paired `:focus-visible` (sanctuary, popup, people, poetic) |
| Loading | Mixed | Skeletons exist; generic spinners may still appear |
| Empty states | Pass | `EmptyStateProjection` + cinema copy |
| Motion budget | Pass | Curtain ≤300ms; soft-settle; PRM gates on grain/modals |
| Active nav | Pass | Subnav / primary tabs |

**Diagnosis:** Interaction craft is already premium-product band. Upgrade is **focus completeness + skeleton-only loading**, not new animation libraries.

---

### Content / voice

| Check | Status |
| --- | --- |
| AI marketing clichés | Pass |
| Cinema voice / productCopy | Pass — distinctive moat |
| Oops! / loud success | Pass |
| Title Case abuse | Mild — many labels uppercase via CSS instead |

**Do not “redesign” voice into startup SaaS.** Reduce visual shouting that fights the prose.

---

### Component patterns

| Check | Status | Evidence |
| --- | --- | --- |
| Generic card | **Hit** | Border + fill + hover-lift media tiles |
| Modal-as-workspace | **Hit** | DetailModal / poetic capture as deep work |
| Circular avatars only | **Hit** | People photos `border-radius: 50%` extensively |
| Pill / uppercase chips | **Hit** | Status + intent chrome |
| Gold-named primary button | **Hit** | `.sanctuary-btn-gold` (values fixed; name still Gilded Night) |

---

### Iconography

| Check | Status | Evidence |
| --- | --- | --- |
| Default icon set | **Hit** | Material Symbols Outlined |
| Cliche metaphors | Mild | `auto_awesome` Recommendations; `new_releases` Now Showing |
| Favicon / extension icons | Pass | Packaged |

---

### Code / token hygiene

| Check | Status |
| --- | --- |
| Semantic HTML | Partial — articles on archive cards; skip-link missing |
| Gold naming debt | **Hit** — widespread aliases |
| Spec drift | **Hit** — cinematic journal still dual-type Gilded-era type |
| Shadow token parity | Watch — any font upgrade must land in `shadowTokens.ts` |
| z-index scale | Mild — needs documented ladder |

---

### Strategic omissions

| Check | Status |
| --- | --- |
| Skip to content | **Missing** in app shell |
| Legal / privacy | Docs exist; ensure settings/onboarding surface |
| Back from deep modals | Partial — keep exit clarity |
| Cookie banner | N/A (extension context) |

---

## Generic AI / hybrid patterns inventory (ranked)

1. **Inter-as-everything** — editorial role is a costume; biggest generic fingerprint  
2. **Material Symbols chrome** — Google/AI default icon layer  
3. **Multi-accent status + emotion rainbow** — tracker SaaS, not monovoltage restraint  
4. **Border + surface + hover-lift equal card grid** — media tracker archetype  
5. **All-caps micro-labels as default hierarchy** — shouts where sentence case / small-caps would curate  
6. **Legacy gold semantics** — values remapped; language invites Gilded Night regression  
7. **Purple emotional “awe”** — soft AI-gradient fingerprint  
8. **Circular avatars + centered person cards** — social-app default  
9. **Modal-as-workspace** for Act II immersion instead of full-bleed quiet stage  
10. **Cinematic spec vs live tokens** — agents still have two north stars for type  
11. **Atmosphere presets recoloring primary** — optional OK; default Cinema Black is brand for screenshots  
12. **Focus gaps** — residual `outline: none` without guaranteed `:focus-visible`

---

## What already scores premium (do not regress)

Protect these in every wave:

- Cinema Black canvas (not pure black), restrained hairline borders  
- Solid Rosso primary CTAs + white on-primary text  
- Film grain with reduced-motion opt-out  
- Motion budget ≤300ms; curtain / focus-pull / soft-settle tokens  
- Shell alignment (`--app-shell-max` / gutter shared with nav)  
- Empty-state theatre framing (`EmptyStateProjection`)  
- Product copy lexicon (`productCopy.ts`, cinema voice)  
- Hardcover spine card concept + archive stagger-in  
- Shadow DOM token path for overlays  
- Atmosphere as *optional* personalization  
- Hover gates with `(hover: hover) and (pointer: fine)` where present  

---

## Scorecard by skill domain

| Domain | Score /10 | One-line |
| --- | --- | --- |
| Typography | 4.5 | Inter dual-role is the ceiling |
| Color & surfaces | 7.4 | Strong base; status/emotion over-accented; gold chroma fixed |
| Layout | 7.0 | Shell excellent; content grids generic |
| Interactivity & states | 8.0 | Among the best layers; focus holes remain |
| Content / voice | 8.5 | Distinctive, non-AI-marketing |
| Components | 6.2 | Still card/modal SaaS patterns; spines help |
| Iconography | 4.0 | Material default |
| Code/token hygiene | 7.0 | Values good; names & cinematic-spec lag |
| Strategic completeness | 7.0 | Extension context; skip-link gap |
| **Overall** | **7.1** | Crafted hybrid; type/icons/status/cards drag premium |

---

## Upgrade plan (phased, function-safe)

Ordered by **impact × risk** per skill Fix Priority, adapted to Subsume hybrid.

### Phase 0 — Decision lock (half day, zero UI risk)

| Item | Action |
| --- | --- |
| North star | Confirm **Option A synthesize** in agent brief / brand docs |
| Spec reconciliation | Annotate `CINEMATIC_JOURNAL_DESIGN_SPEC` §3.2: dual-type is *target*; live tokens may lag; supersede monofont-only note in brand when dual-type ships |
| Guardrails | No Tailwind; no architecture rewrite; motion ≤300ms; no Ferrari trademarks; shadow tokens must track |

**Exit:** One written north star; implementers stop flip-flopping monofont vs dual-type.

---

### Phase 1 — Character: dual type + docs (1–3 days, low functional risk)

**#1 premium lever.**

1. Load dual Google Fonts (or self-host):  
   - **Editorial:** Newsreader (or Cormorant Garamond fallback stack) for page titles, reflections, onboarding headlines, logo wordmark, poetic body  
   - **UI:** Outfit or Satoshi (or keep Inter *only* for dense settings tables)  
2. Update `tokens.css`:  
   - `--font-editorial: 'Newsreader', Georgia, serif`  
   - `--font-ui: 'Outfit', …` (or chosen sans)  
3. Mirror stacks in `shadowTokens.ts` + content overlay font injection  
4. Update `index.html` / popup HTML font links  
5. Reconcile `brand.md` typography table with dual system  
6. Soften default all-caps: sentence case for nav labels; reserve uppercase for true captions / primary button chrome only  

**Exit criteria:** Visual QA on Library, Capture, Home, People, Popup, one content overlay; `npm run typecheck && npm test && npm run build` green; brand docs match tokens.

**Risks:** FOIT/FOUT on first paint — use `display=swap` and system fallbacks already in stacks. Extension CSP: Google Fonts already used; prefer same pattern or self-host if CSP tightens.

---

### Phase 2 — Accent scarcity law (1–2 days, low–medium risk)

1. **Rosso Corsa only for:** primary CTA, focus ring, active mark, rare hero border  
2. **Status chips → monochrome:** weight + border + optional neutral dot; drop blue/green/amber fills in `tokens.css` status tokens  
3. **Emotions:** desaturate oklch chroma; re-map `--color-awe` off purple (prefer warm-neutral or soft red-adjacent within restraint)  
4. Keep semantic success/info/danger **distinct** from brand primary (delete/error must not reuse Rosso as “status watched”)  
5. Screenshot kit: default Cinema Black only (atmosphere off)

**Exit:** No multi-color status rainbow on archive/search; emotion bars no longer read as AI gradient.

**Risks:** Users who relied on color-only status discrimination — pair with clear labels (already present via `statusLabels.ts`).

---

### Phase 3 — Surface language: cards & people (2–4 days, medium risk)

1. **Media cards:** prefer poster-led tiles; remove full box borders where elevation is unnecessary; hairline or none  
2. **Archive:** lean into hardcover spine / intentional uneven rhythm; reduce pure equal `minmax` monotony where content allows  
3. **People:** squircle or rounded-rect portraits (`--radius-lg`–xl); left-aligned dossier rows over centered circle grids  
4. **Hover:** keep lift but gate with fine-pointer media query everywhere remaining  
5. Rename when touching files: `.sanctuary-btn-gold` → `.sanctuary-btn-primary` (alias old class temporarily for safety)

**Exit:** Archive/people no longer screenshot as “SaaS media grid with red accent.”

**Risks:** Layout shifts in tests that snapshot class names or structure — update tests with CSS/class renames; do not change data handlers.

---

### Phase 4 — Icon system (1–2 days, medium risk)

1. Replace Material Symbols in primary chrome (App nav, popup, drawer) with Phosphor subset **or** 12–16 house monoline SVGs (reel, marquee, dossier, projection, archive)  
2. Kill `auto_awesome` metaphor for Recommendations  
3. Standardize one stroke weight  
4. Leave Material only if a secondary surface is not yet migrated (track debt)

**Exit:** Zero Material Symbols in primary app subnav + popup.

**Risks:** Bundle size if importing full icon packs — use explicit icon components, not the whole set.

---

### Phase 5 — Ceremony & depth (2–4 days, higher design effort)

1. **Act II:** capture/reflect as full-bleed quiet stage; reduce competing chrome  
2. Prefer slide-over / route-level sanctuary over nested modal stacks where feasible **without** breaking save/exit flows  
3. True glass plaques (1px inner border + inner shadow) only on capture/overlay heroes  
4. One spotlight-border hero moment max per view (One Hero Moment rule)  
5. Align shadow hue to neutral/red-tinted canvas; drop cool 240° if canvas stays neutral gray  

**Exit:** Capture feels quieter; one hero moment rule observable on Library / Capture / Discovery.

**Risks:** Modal focus traps and exit animations — preserve DetailModal/poetic enter-exit contracts and tests (`detailModalExit`, poetic capture).

---

### Phase 6 — Hygiene & a11y (1–2 days, low risk)

1. Skip-to-content on app shell  
2. Every `outline: none` → paired `:focus-visible` with `var(--ring)`  
3. Documented z-index scale; purge inline style sprawl into utilities when touching files  
4. Privacy/legal reachability from settings footer  
5. Skeleton-only for feed/archive/people; spinner only for indeterminate micro-actions  
6. Finish gold alias rename pass when safe  

**Exit:** Keyboard path clean; no orphan focus styles; typecheck/test/build green.

---

## Wave summary (implementer table)

| Wave | Goal | Exit criteria | Break-function risk |
| --- | --- | --- | --- |
| **W0** | North star + spec note | Docs agree Option A | None |
| **W1** | Dual fonts live (app, popup, shadow) | Visual QA + gates green | Low |
| **W2** | Monovoltage + mono status | No rainbow status fills | Low |
| **W3** | Sanctuary surfaces | Cards/people not SaaS grid | Medium |
| **W4** | Icon house set | No Material in primary chrome | Medium |
| **W5** | Ceremony + glass sparingly | One hero moment / quieter Act II | Medium–high |
| **W6** | A11y + naming hygiene | Skip-link, focus, gates green | Low |

---

## Top 3 upgrades (priority shortlist)

1. **Restore editorial dual-type** — serif for memory/reflection/display; distinctive sans for UI. Ends Inter-everywhere AI fingerprint and restores the Criterion/MUBI register the cinematic sanctuary demands.  
2. **Enforce monovoltage accent** — Rosso only for primary voltage; monochrome status; desaturate emotion spectrum (no purple “awe”).  
3. **Replace equal border-cards** with sanctuary surfaces — spine/plaque/poster-led archive; squircle people; less hover-lift rectangle SaaS.

*(Next: Material → house icons; gold name purge; skip-link + focus completeness.)*

---

## Top fixes (actionable backlog)

| # | Fix | Files (entry points) | Risk |
| --- | --- | --- | --- |
| 1 | Dual font tokens + HTML links | `tokens.css`, `index.html`, `popup.html`, `shadowTokens.ts`, `brand.md` | Low |
| 2 | Status token monochrome remap | `tokens.css` status-* blocks; chip CSS in sanctuary | Low |
| 3 | Desaturate emotion colors | `tokens.css` `--color-awe` etc.; emotional-components CSS | Low |
| 4 | Soften all-caps default | `sanctuary.css`, `app-nav.css`, chip classes | Low |
| 5 | Media card border discipline | `library.css`, sanctuary media-card rules | Med |
| 6 | People portrait geometry | `people.css` | Med |
| 7 | Icon swap in App + popup | `App.tsx`, `popup.tsx`, `index.html` | Med |
| 8 | Rename `.sanctuary-btn-gold` | `sanctuary.css` + class references | Low (alias) |
| 9 | Skip-link + focus audit | `App.tsx`, outline:none sites | Low |
| 10 | Align cinematic spec §type | `CINEMATIC_JOURNAL_DESIGN_SPEC.md` | None |

---

## Risks (upgrade without breaking function)

| Risk | Mitigation |
| --- | --- |
| Visual-only CSS breaks layout assumptions | Prefer token/value changes; avoid markup restructure in W1–W2 |
| Font loading / CSP | Reuse existing Google Fonts pattern or self-host under extension web_accessible if required |
| Shadow DOM desync | Always update `shadowTokens.ts` with app token/font changes |
| Status color accessibility | Keep text labels; never color-only encoding |
| Class renames | Temporary dual-class (`sanctuary-btn-gold sanctuary-btn-primary`) then delete |
| Modal ceremony changes | Preserve focus trap, ESC, exit duration tests |
| Atmosphere presets | Do not remove; default brand screenshots = Cinema Black |
| Test snapshots / selectors | Run full `npm test` after each wave; update selectors only when intentional |
| Trademark | Never ship Cavallino / FerrariSans / “Ferrari” as product branding in UI copy |

**Hard rules for implementers:**

- Work with existing stack only (Preact + CSS variables).  
- Do not migrate frameworks or styling libraries.  
- Do not break capture save, library status updates, detection overlays, or OAuth/settings.  
- Gates after each wave: `npm run typecheck`, `npm test`, `npm run build`.  
- User-facing motion remains ≤300ms; grain stays PRM-aware.

---

## Score rationale (brief)

- **+** Token architecture, solid Rosso CTAs, Cinema Black canvas, motion budget, grain, empty theatre, literary copy, shell geometry, gold chroma purge, brand.md alignment.  
- **−** Inter monofont, Material Symbols, multi-accent status/emotion, equal border-card grids, all-caps density, gold naming, cinematic-spec type drift, residual focus holes, missing skip-link.

**Verdict:** Subsume is a **solid 7.1 hybrid** — craft and voice already exceed generic trackers; premium sanctuary reading is blocked by **type character, accent scarcity, and surface language**, not by missing features. The path is phased synthesis (Option A), not another full recolor.

---

*Audit only. No application code or design assets were changed in this pass.*
