# Redesign Existing Projects — Premium Upgrade Audit

| Field | Value |
| --- | --- |
| **Date** | 2026-08-04 |
| **Skill** | `redesign-existing-projects` |
| **Repo** | Subsume (post-Ferrari design system) |
| **Scope** | Audit only — no implementation |
| **Surfaces** | App shell, popup, sanctuary/capture, content-script shadow tokens, onboarding, library/archive, discovery, people, settings |
| **Stack** | Preact + vanilla CSS custom properties (`src/shared/tokens.css`), no Tailwind |

---

## Executive summary

Ferrari landed as a **token-first palette remount**: Cinema Black canvas (`#181818`) + Rosso Corsa primary (`#da291c`), tighter radii, Inter as the single family, gold variables aliased to red. That pass fixed the loudest gold-on-obsidian identity conflict and left a coherent dark shell.

What remains is not “broken SaaS” — it is **premium with generic DNA still in the skeleton**. The product already has cinema-voice copy, film grain, ≤300ms motion discipline, skeletons, empty states, focus rings, and a real token layer. The upgrade path is therefore **character restoration and pattern discipline**, not a ground-up redesign.

### Current quality score

# **6.8 / 10**

| Band | Meaning |
| --- | --- |
| 0–4 | Generic AI default / unfinished |
| 5–6 | Competent product UI with fingerprint issues |
| **6.8** | **Strong craft + intentional system, still undercut by Inter-default type, multi-accent chrome, and card-grid SaaS patterns** |
| 8–9 | Editorial luxury (Criterion / MUBI / Ferrari marketing restraint) |
| 10 | Category-defining visual identity |

**Score rationale (brief):**

- **+** Token architecture, Cinema Black canvas, motion budget, grain, focus/hover/active, empty + skeleton states, literary product copy, shell max-width alignment.
- **−** Inter for both UI *and* editorial (spec conflict), Material Symbols as default iconography, rainbow status accents, border+shadow card grids, residual gold *names* and warm-hue fallbacks, heavy all-caps labelling, documentation drift (`brand.md` / cinematic spec vs live tokens).

---

## Context: post-Ferrari baseline

| Layer | Live state | Notes |
| --- | --- | --- |
| Canvas | `#181818` / elevated `#242424` / card `#303030` | Not pure `#000` — good |
| Primary | `#da291c` (Rosso Corsa) | High voltage; scarcity is the luxury constraint |
| Type | Inter 400–700 for `--font-ui` *and* `--font-editorial` | Ferrari plan choice; fights sanctuary serif philosophy |
| Radius | `2 / 4 / 8` (+ shadcn `--radius: 0.5rem`) | Tighter = more automotive; residual 10px cards exist |
| Texture | `FilmGrain` SVG turbulence | Premium differentiator — keep |
| Motion | Curtain/focus-pull ≤300ms, reduced-motion gates | Already above average |
| Naming debt | `--gold`, `.sanctuary-btn-gold`, `--badge-on-gold-fg` | Values remapped; language still Gilded Night |
| Specs | `CINEMATIC_JOURNAL_DESIGN_SPEC` still cites Newsreader/Outfit | Canonical conflict with live Inter |

---

## Framework & styling method

- **UI:** Preact pages under `src/ui/` + CSS files in `src/ui/styles/` and `src/styles/sanctuary.css`
- **Tokens:** `src/shared/tokens.css` (app) + `src/shared/shadowTokens.ts` (content-script Shadow DOM)
- **Fonts:** Google Fonts Inter + Material Symbols Outlined (`src/ui/index.html`)
- **Theme:** `data-theme` light/dark/system + optional `data-atmosphere` (sunset / emerald / french)
- **No** Tailwind / styled-components — upgrades stay in CSS variables and existing class systems

---

## Design audit (by skill checklist)

### Typography — **weakest premium lever right now**

| Check | Status | Evidence / note |
| --- | --- | --- |
| Browser default / Inter everywhere | **Hit** | `--font-ui` and `--font-editorial` both Inter; Google Fonts only loads Inter |
| Headlines lack presence | Partial | Page titles use italic 28px; without a true serif they read as “UI italic,” not Criterion display |
| Body too wide | OK-ish | Shell max 1200px; some empty-state copy capped ~400px |
| Only 400/700 | Pass | Inter loads 400–700 |
| Numbers / tabular | Pass | `.stat-value { font-variant-numeric: tabular-nums }` |
| Letter-spacing | Partial | Good on labels; display tracking still modest |
| All-caps subheaders everywhere | **Hit** | Subnav, status badges, monogram, intent/type pills, lobby links |
| Orphans / text-wrap | Pass | `text-wrap: balance` / `pretty` on titles and empty states |
| Spec vs live | **Hit** | Spec + `brand.md` still prescribe Outfit + Newsreader; Ferrari plan forced single-family Inter |

**Diagnosis:** Ferrari correctly killed proprietary FerrariSans and accidental gold, but **collapsed the dual-type system that made Subsume feel editorial**. Italic Inter is not a literary journal. This is the #1 generic-AI fingerprint on an otherwise considered product.

---

### Color and surfaces

| Check | Status | Evidence / note |
| --- | --- | --- |
| Pure `#000` | Pass | `#181818` / `#121212` sunken |
| Oversaturated accent | Watch | Rosso Corsa is intentionally loud; overuse on chips/badges will scream |
| More than one accent | **Hit** | Status palette: blue / amber / green / red; emotional aura: purple–blue–orange spectrum; atmosphere presets recolor primary |
| Warm vs cool grays | Mild | Neutrals are gray; shadows still `hsla(240, …)` cool-tint on neutral canvas |
| Purple/blue AI gradient | Partial | Discovery ambient cool ellipse + emotion `--color-awe` ~ hue 290 (purple) |
| Generic black shadows | Mostly pass | Tinted shadows present; some pure black overlays remain |
| Flat / no texture | Pass | Film grain + ambient radial layers |
| Even linear gradients | Mild | `--gradient-bg` 135° is subtle; accent gradient is standard L→R red |
| Random dark-in-light | Watch | Light mode exists (“White Canvas”); sanctuary mood must stay consistent |
| Residual gold hue | **Hit** | e.g. discovery ambient fallback `hsla(45, 60%, 50%, 0.06)`; search focus ring gold-ish |

**Diagnosis:** Primary identity is clean. **Chrome is still multi-accent** (tracker SaaS status colors + emotion rainbow). Luxury restraint wants **one voltage** (Rosso) and **neutral status language**.

---

### Layout

| Check | Status | Evidence / note |
| --- | --- | --- |
| Everything centered | Partial | Onboarding centered ceremony OK; person cards over-centered |
| Three equal feature columns | Mild | Not marketing page; archive/search use equal `auto-fill` card grids |
| `100vh` issues | Pass | `%` / flex height shell; extension context |
| No max-width | Pass | `--app-shell-max: 1200px` + gutters; nav aligns to same column |
| Uniform radius | Partial | Tokens tight; `.person-card` uses `10px`; posters `6px` ad hoc |
| No depth / overlap | Partial | Lobby grid has presence; many lists remain flat card stacks |
| Missing whitespace | Mixed | Discovery secondary band + poetic capture breathe; settings denser (OK) |
| Dashboard left sidebar | Pass | Top nav + drawer — not default left-rail AI dashboard |
| Optical alignment | Partial | Nav logo already has 1px optical pad — good pattern to extend |

**Diagnosis:** Shell geometry is mature. **Content layouts still default to equal media-card grids** (tracker archetype). Archive “hardcover notebook” ambition wants spine/masonry/asymmetric memory lanes more often than `minmax(200px, 1fr)`.

---

### Interactivity and states

| Check | Status | Evidence / note |
| --- | --- | --- |
| Hover states | Pass | Cards, buttons, subnav, popup |
| Active / pressed | Pass | Global `button:active { scale(0.97) }` |
| Transitions | Pass | Fast/normal tokens; transform-based hovers |
| Focus ring | Pass | `:focus-visible` + `--ring` Rosso |
| Loading | Mixed | Skeletons exist; **generic circular `.subsume-spinner`** still in system |
| Empty states | Pass | `EmptyStateProjection` + cinema copy (“Nothing inscribed yet”) |
| Error states | Pass | Inline notices / validation; product copy helpers |
| Active nav | Pass | Subnav `.active`, primary tabs |
| Motion on layout props | Mostly pass | Enter animations use opacity + translate |

**Diagnosis:** Interaction craft is already in the “premium product” band. Upgrade is **retire spinners in favor of layout-matched skeletons** and deepen spring/soft-settle only where ceremony matters (capture save, curtain).

---

### Content

| Check | Status | Evidence / note |
| --- | --- | --- |
| AI marketing clichés | Pass | No Elevate / Seamless / Unleash in product surfaces |
| Cinema voice | Pass | `productCopy.ts`, `CINEMA_VOICE.md`, empty/CTA lexicon |
| Oops! / loud success | Pass | Direct, calm errors |
| Placeholder lorem | Pass | — |
| Title Case abuse | Mild | Nav labels mixed; many labels uppercase via CSS |

**Diagnosis:** Copy is a **strength**. Do not “redesign” voice into startup SaaS. Keep house-manager lexicon; reduce visual shouting (all-caps + multi-color badges) that fights the prose.

---

### Component patterns

| Check | Status | Evidence / note |
| --- | --- | --- |
| Generic card (border + shadow + fill) | **Hit** | `.media-card`, `.person-card`, recommendation rows, popup stats |
| Filled + ghost only | Partial | Lobby text links exist — good; primary/secondary still dominate elsewhere |
| Pill New/Beta | Mild | Type/status chips often pill/uppercase |
| Modals for everything | **Hit** | `DetailModal` / poetic capture as primary deep work surface |
| Avatar circles only | **Hit** | People photos `border-radius: 50%` |
| Sun/moon theme toggle | Pass | Settings-driven theme + atmosphere, not a gimmick switch |

**Diagnosis:** Cards still **look like elevated rectangles**. Sanctuary philosophy asks for plaques, spines, and typography hierarchy — not another bordered tile.

---

### Iconography

| Check | Status | Evidence / note |
| --- | --- | --- |
| Default icon set | **Hit** | Material Symbols Outlined (Google default — same class of problem as Lucide) |
| Cliche metaphors | Mild | `auto_awesome` for Recommendations; `new_releases` for Now Showing |
| Stroke consistency | N/A | Single Material set |
| Favicon / extension icons | Pass | Packaged icons present |

---

### Code quality (design-adjacent)

| Check | Status | Evidence / note |
| --- | --- | --- |
| Semantic HTML | Partial | `article` on archive cards; improve landmark consistency |
| Inline styles mixed | **Hit** | Widths, delays, spectrum bars, margins across pages |
| Arbitrary z-index | Mild | Nav `z-index: 100` OK; keep a documented scale |
| Dead gold naming | **Hit** | Widespread `--gold*` aliases and class names |
| Meta (extension) | N/A | Chrome extension UI; store assets separate |

---

### Strategic omissions

| Check | Status |
| --- | --- |
| Skip to content | Likely missing in app shell |
| Legal links | Privacy docs exist; ensure settings/onboarding surface them |
| Back navigation | Deep modals need clear exit (partially handled) |
| Cookie banner | N/A for pure extension context in most cases |

---

## Generic AI patterns inventory (post-Ferrari)

Ranked by how much they block “premium sanctuary” reading:

1. **Inter-as-everything** — single-family default; editorial italic is a costume, not a type system  
2. **Material Symbols chrome** — instantly recognizable Google/AI UI icon layer  
3. **Multi-accent status + emotion rainbow** — tracker SaaS, not monovoltage Ferrari restraint  
4. **Border + surface + hover-lift card grid** — equal poster tiles everywhere  
5. **All-caps micro-labels as default hierarchy** — shouting where sentence case or small-caps would feel curated  
6. **Legacy gold semantics** — `--gold`, `sanctuary-btn-gold`, warm `hsla(45, …)` fallbacks after a red remount  
7. **Purple emotional “awe” + cool ambient wash** — soft AI-gradient fingerprint on discovery  
8. **Circular avatars + centered person cards** — social-app default  
9. **Generic circular spinner** next to otherwise good skeletons  
10. **Modal-as-workspace** for reflections/details instead of sheet / full-bleed Act II immersion  
11. **Documentation drift** — `brand.md` / cinematic spec still gold + Outfit/Newsreader while tokens are Ferrari/Inter  
12. **Atmosphere presets that recolor primary** — optional, but each preset multiplies accent identity if over-exposed in marketing screenshots  

---

## What already scores premium (do not regress)

Preserve these when upgrading:

- Cinema Black canvas (not pure black), restrained hairline borders  
- Film grain with reduced-motion opt-out  
- Motion budget and soft-settle / curtain durations  
- Shell alignment (`--app-shell-max` / gutter shared with nav)  
- Focus-visible and press feedback  
- Empty-state theatre framing (`EmptyStateProjection`)  
- Product copy lexicon and `productCopy.ts` centralization  
- Shadow DOM token parity path for overlays  
- Atmosphere *as optional* personalization (keep, but don’t make screenshots multi-brand)  
- Hardcover spine card *concept* and stagger-in archive motion  

---

## Scorecard by skill domain

| Domain | Score /10 | One-line |
| --- | --- | --- |
| Typography | 4.5 | Inter dual-role is the ceiling |
| Color & surfaces | 7.0 | Strong base; status/emotion over-accented |
| Layout | 7.0 | Shell excellent; content grids generic |
| Interactivity & states | 8.0 | Among the best layers |
| Content / voice | 8.5 | Distinctive, non-AI-marketing |
| Components | 6.0 | Still card/modal SaaS patterns |
| Iconography | 4.0 | Material default |
| Code/token hygiene | 6.5 | Token values good; names & docs lag |
| Strategic completeness | 7.0 | Extension context; skip-link gap |
| **Overall** | **6.8** | Crafted system with default-type / multi-accent drag |

---

## Upgrade roadmap (no implementation in this review)

Ordered by **impact × risk** (skill Fix Priority adapted to post-Ferrari Subsume).

### P0 — Character (days, low functional risk)

1. **Restore dual typography**  
   - UI sans with character (Outfit, Satoshi, or keep Inter *only* for dense settings)  
   - Editorial serif for page titles, reflections, onboarding headlines, logo wordmark (Newsreader or equivalent)  
   - Re-link Google Fonts + shadow font stylesheet  
   - Reconcile `brand.md` / `CINEMATIC_JOURNAL_DESIGN_SPEC` with live tokens  

2. **Accent scarcity law**  
   - Rosso Corsa: primary CTA, focus ring, active mark, rare hero border  
   - Status: monochrome chips + typography/weight; optional single neutral dot  
   - Emotions: desaturate; avoid purple “AI awe”; prefer warm/cool *within* neutral family  
   - Scrub residual `hsla(45, …)` gold fallbacks  

3. **Retire gold language**  
   - Rename aliases over time (`--gold` → `--brand` / drop)  
   - `.sanctuary-btn-gold` → primary/restraint button names  
   - Prevent future agents from reintroducing Gilded Night  

### P1 — Pattern replacement (medium risk, high polish)

4. **Card system → sanctuary surfaces**  
   - Prefer poster-led tiles without full box borders; plaque glass only when elevation means something  
   - Archive: spine / masonry / intentional uneven rhythm over equal auto-fill  
   - People: squircle or rounded-rect portraits; left-aligned rows or dossier list, not centered circle grid  

5. **Icon system**  
   - Replace Material Symbols with a tighter set (Phosphor custom subset, or 12–16 house monoline SVGs: reel, marquee, dossier, projection)  
   - Kill `auto_awesome` metaphor for recommendations  

6. **Loading**  
   - Skeleton-only for feed/archive/people; spinner only for indeterminate micro-actions if at all  

### P2 — Depth & ceremony (higher design effort)

7. **Act II immersion**  
   - Capture/reflect as full-bleed quiet stage; reduce chrome density  
   - Prefer slide-over or route-level sanctuary over nested modal stacks where possible  

8. **Surface craft**  
   - True glass plaques (1px inner border + inner shadow) *only* on capture/overlay heroes  
   - Spotlight border under cursor on archive cards (one hero moment per view)  
   - Align shadow hue to canvas (neutral/red-tinted, drop cool 240° if canvas is neutral)  

9. **Label hierarchy**  
   - Replace default all-caps with sentence case + tracking; reserve uppercase for true captions  
   - `text-wrap: pretty` on reflection bodies  

10. **Light mode as White Canvas editorial**  
    - Not “dark theme inverted”; cream/paper bands only where intentional (Ferrari light bands as reference, without trademark)  

### P3 — Hygiene & a11y

11. Skip-to-content on app shell  
12. Documented z-index scale; purge inline style sprawl into utilities  
13. Ensure privacy/legal reachability from settings footer  
14. Screenshot/store kit: single atmosphere (default Cinema Black) for brand consistency  

---

## Suggested implementation waves (for a future worker)

| Wave | Goal | Exit criteria |
| --- | --- | --- |
| **W1 Type + docs** | Dual fonts live everywhere (app, popup, shadow) | Visual QA; typecheck/tests green; brand docs match tokens |
| **W2 Accent law** | One primary voltage; mono status | No blue/green status fills; no gold hue fallbacks |
| **W3 Cards & people** | Non-generic surfaces | Archive/people no longer read as “SaaS media grid” |
| **W4 Icons** | Custom/Phosphor subset | Zero Material Symbols in primary chrome |
| **W5 Ceremony** | Capture immersion + glass/spotlight sparingly | One hero moment per screen rule observable |

---

## Top 5 upgrades (priority shortlist)

1. **Bring back editorial dual-type** — serif for memory/reflection/display; distinctive sans for UI. Ends Inter-everywhere AI fingerprint and restores Criterion/MUBI register the cinematic spec demands.  
2. **Enforce monovoltage accent** — Rosso only for primary voltage; monochrome status; desaturate emotion spectrum; delete residual gold-hue fallbacks.  
3. **Replace equal border-cards** with sanctuary surfaces — spine/plaque/poster-led archive; less hover-lift rectangle SaaS.  
4. **Swap Material Symbols** for a small cinema-house icon set (or Phosphor subset) with consistent stroke.  
5. **Purge gold naming + align brand docs** — finish the Ferrari remount linguistically so agents and humans stop designing “gold” on a red system.

---

## Risk notes for implementers

- **Do not** reintroduce trademarked Ferrari marks, FerrariSans, or Cavallino.  
- **Do not** rewrite Preact architecture or migrate CSS frameworks.  
- Atmosphere presets intentionally recolor `--primary` — treat as optional skins; default Cinema Black is the brand.  
- Shadow DOM must receive any font/token upgrades via `shadowTokens.ts` or overlays will desync.  
- Keep motion ≤300ms for user-facing transitions; grain remains reduced-motion aware.  
- Run existing gates after visual work: `npm run typecheck`, `npm test`, `npm run build`.

---

## Verdict

Subsume post-Ferrari is a **solid 6.8**: token discipline and interaction craft already exceed typical extension UIs, and the literary voice is a real moat. The product still **reads partially as a well-themed media tracker** because type, icons, status color, and card grids are still generic patterns wearing a red coat.

The premium path is not another palette swap. It is **type character + accent scarcity + surface language** — then icons and archive layout — until every screen passes the sanctuary litmus: *does this make the user want to stay and reflect?*

---

*Audit only. No code or design assets were changed in this pass.*
