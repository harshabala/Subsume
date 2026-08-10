# Brand Design Coherence Review — Subsume (Post–Ferrari Rebrand)

| Field | Value |
| --- | --- |
| **Date** | 2026-08-04 |
| **Reviewer lens** | brand-design skill (palette · type · contrast · docs authority · semantic safety) |
| **Implementation source of truth** | `src/shared/tokens.css`, `src/shared/shadowTokens.ts`, `src/shared/themeLabels.ts` |
| **Reference systems** | `DESIGN.md` (Ferrari extract), `docs/superpowers/plans/2026-08-04-ferrari-design-system.md` |
| **Legacy / competing docs** | `brand.md`, `PRODUCT.md`, `CINEMATIC_JOURNAL_DESIGN_SPEC.md`, `README.md`, `docs/DESIGN_AGENT_BRIEF.md` |
| **Scope** | Coherence only — no product source changes |
| **Overall score** | **6.5 / 10** |

---

## 1. Executive summary

The **runtime token layer** has been successfully remapped from **Gilded Night** (gold `#c9a84c` on near-obsidian) to a **Ferrari-inspired cinematic system**: **Rosso Corsa** (`#da291c`) on **Cinema Black** (`#181818`), with **Inter** as the single sans stack and theme labels **Cinema Black / White Canvas**. App shell, popup, and Shadow DOM token seeds align on the same primary and canvas.

Coherence breaks down outside the CSS variable values:

1. **Authoritative product docs still describe gold, Outfit/Newsreader, and Gilded Night.**
2. **Semantic / status reds** (`--destructive`, `--danger-*`, abandoned status, error) sit next to brand red and compete for the same hue family.
3. **Shape, spacing, and elevation** only partially match `DESIGN.md` (sharp 0px CTAs, 8px named ladder, photographic depth over multi-tier shadows).
4. **Naming debt** (`--gold`, `.sanctuary-btn-gold`, “gold” soft tokens) means the system *looks* red but *reads* gold in code and mental models.
5. **Atmosphere presets** intentionally recolor `--primary`, diluting the single-voltage Rosso Corsa story when enabled.

**Verdict:** Token swap is real and largely consistent in product CSS. Brand *system* coherence (docs + semantics + geometry + vocabulary) is unfinished. Treat this as **phase-1 Ferrari palette applied**, not full brand lock.

---

## 2. What “Ferrari rebrand” means here

Per `DESIGN.md` + the 2026-08-04 plan:

| Pillar | Ferrari intent | Subsume implementation status |
| --- | --- | --- |
| Canvas | Near-black `#181818`, never pure black | **Met** in `:root` / dark |
| Brand voltage | Scarce Rosso Corsa `#da291c` | **Met** as `--primary`; scarcity not enforced in usage audit |
| On-primary | White on red | **Met** (`--primary-foreground` / `--btn-primary-fg` / `--on-primary-fg` = `#ffffff`) |
| Light | White / soft `#f7f7f7` canvas | **Met** (`White Canvas` labels + light tokens) |
| Type | Single sans (FerrariSans → **Inter** substitute) | **Met** in tokens + HTML font loads |
| Shape | Sharp **0px** CTAs/cards; pills only for badges | **Partial** — tighter radii (2/4/8) but not sharp-default |
| Spacing | Named 8px ladder (xxxs→super) | **Miss** — app uses 4/8/12/20/24/32 scale |
| Elevation | Photo + brightness steps; minimal shadows | **Miss** — multi-tier shadow stack retained |
| Semantics | Success `#03904a`, info `#4c98b9`, warning `#f13a2c` | **Partial** — success/info match; warning is amber, not Ferrari warning red |
| Naming | No Cavallino / trademark marks | **Met** (no marks found) |
| Docs | Single brand narrative | **Fail** — multi-doc conflict |

---

## 3. Palette evaluation

### 3.1 Core seeds (dark / default)

| Role | Token | Value | DESIGN.md / plan | Notes |
| --- | --- | --- | --- | --- |
| Canvas | `--bg-base` | `#181818` | `#181818` | Correct Cinema Black |
| Elevated | `--bg-elevated` | `#242424` | Plan: slightly above canvas; DESIGN often `#303030` for cards | Split: cards also use `--card` / `--bg-overlay` `#303030` |
| Overlay / card surface | `--bg-overlay` / `--card` | `#303030` | `#303030` | Aligns with canvas-elevated |
| Ink | `--fg-base` | `#ffffff` | `#ffffff` | Pure white display/body emphasis |
| Body muted | `--fg-muted` | `#969696` | `#969696` | Correct |
| Soft muted | `--fg-subtle` / control | `#666666` / meta `#8f8f8f` | Match DESIGN body/muted | Good hierarchy |
| Primary | `--primary` | `#da291c` | Rosso Corsa | Correct |
| Primary hover / pressed | `#9d2211` / `#b01e0a` | Plan match | Correct |
| Primary soft | `rgba(218, 41, 28, 0.10–0.12)` | Plan match | Correct |
| Hairline (dark) | `hsla(0,0%,100%,0.08)` | DESIGN hairline often `#303030` solid | Functional equivalent; different technique |
| Gradients | red voltage `#da291c → #9d2211` | Plan match | Correct (not gold) |
| Success | `#03904a` | Ferrari semantic success | Correct |
| Info | `#4c98b9` | Ferrari semantic info | Correct |

**Contrast (qualitative WCAG AA lens):**

- White (`#ffffff`) on `#181818` / `#242424` / `#303030` — strong AA for body and UI.
- `#969696` on `#181818` — roughly ~5:1 class; acceptable for secondary UI; borderline for long-form body depending on size.
- White on `#da291c` — correct for buttons; Rosso Corsa is saturated and large-type friendly; small red-on-dark text (`--gold-text-soft` `#ff6b5c`) should stay sparse.
- Light mode: `#181818` on `#f7f7f7` / white — solid; primary red on light needs white label (implemented).

### 3.2 Light mode (“White Canvas”)

Light remaps parchment cream (`#f5f0e8`) → neutral soft white (`#f7f7f7` / `#ffffff` / `#ebebeb`). Primary stays Rosso Corsa. Theme labels and Settings copy path through `THEME_LABELS` correctly.

**Issue:** system `@media (prefers-color-scheme: light)` block remaps a **subset** of semantic tokens (not the full light semantic matrix). Risk of mixed dark-semantic leftovers when `data-theme` is unset and OS is light. Explicit `[data-theme="light"]` is more complete.

### 3.3 Atmosphere presets (brand dilution)

`sunset` / `emerald` / `french` reassign `--primary` (and often canvas tint) under dark (and light accent-only). Plan explicitly kept these as intentional overrides.

**Brand-design view:** atmospheres are product features, but they violate Ferrari’s “single brand voltage” rule while active. Coherence recommendation: document atmospheres as **temporary cinematic filters**, not brand modes; keep default Cinema Black = Rosso Corsa only; never ship marketing screenshots in non-default atmospheres as “the brand.”

### 3.4 Alias / legacy gold channel

```text
--gold: var(--primary);
--accent-gold: var(--primary);
--gold-text / --gold-soft-bg / --badge-on-gold-fg / --accent-gold-border*
```

Values are red; names are gold. Class names such as `.sanctuary-btn-gold` still encode the old brand. This is **compatible** (plan choice) but **incoherent** for future agents and humans reading CSS.

### 3.5 Palette score

| Dimension | Score | Comment |
| --- | --- | --- |
| Seed accuracy vs DESIGN.md | 9/10 | Core hexes match |
| Light/dark twin brand | 8/10 | Same primary; light neutrals correct |
| Gradient identity | 8/10 | Red voltage applied |
| Semantic brand integration | 4/10 | See §5 |
| Alias / naming purity | 3/10 | Gold vocabulary remains |
| **Palette subtotal** | **6.5/10** | Strong seeds; weak semantics + naming |

---

## 4. Font system

### 4.1 Runtime (product)

| Surface | Family | Evidence |
| --- | --- | --- |
| `tokens.css` | `--font-ui` / `--font-editorial` / `--font-sans` → **Inter** + system stack | Single-family Ferrari substitute |
| `shadowTokens.ts` | Same Inter stack + Google Fonts URL | Content Shadow DOM aligned |
| `index.html` / `popup.html` | `family=Inter:wght@400;500;600;700` | Loaded correctly |
| Mono | JetBrains Mono (declared; may fall back if not loaded) | Acceptable for IDs/numbers |

**Source grep:** no remaining `Newsreader` / `Outfit` / `c9a84c` / `b8962e` under `src/` (product cleaned).

### 4.2 Ferrari type principles vs UI CSS

| Principle (`DESIGN.md`) | Expected | Observed |
| --- | --- | --- |
| Single sans | Inter substitute for FerrariSans | **Yes** |
| Display weight 500 | Modest, not bombastic | Mixed — headings use tracking-tight; some `font-weight: 600/700` on CTAs/titles |
| CTA uppercase + ~1.4px tracking | Luxury precision | **Partial** — onboarding, poetic sanctuary, some discovery labels use uppercase + tracking; global `.btn-primary` does not force uppercase |
| Nav uppercase + tracking | Consistent voice | Partial by surface |
| Editorial serif split | Ferrari: none | **Correctly removed** in tokens |
| Literary sanctuary serif (`CINEMATIC_*`) | Newsreader for reflections | **Broken relative to sanctuary philosophy docs**; intentional for Ferrari plan |

### 4.3 Philosophy tension

Ferrari rebrand collapses UI + editorial to one sans. That matches automotive marketing restraint. Subsume’s **cinematic sanctuary** narrative historically relied on **serif reflection** (Newsreader) vs sans chrome (Outfit). Product now is more “precision automotive UI” than “literary journal.”

That is a coherent **Ferrari** choice and a **product-voice** risk: capture/reflection surfaces may feel less “hardcover archive” and more “dashboard.” Not a token bug — a **brand-positioning debt** until `CINEMATIC_JOURNAL_DESIGN_SPEC.md` is rewritten under Inter-only rules (or dual register is explicitly allowed: Inter chrome + optional serif for reflection only).

### 4.4 Font score

**7.5 / 10** — implementation is clean and consistent; hierarchy/CTA tracking incomplete; docs and sanctuary voice still argue for a dual family.

---

## 5. Semantic vs brand red conflict

### 5.1 The collision

Brand primary and several feedback colors occupy the same red/orange-red neighborhood:

| Token family | Example values (dark) | Role |
| --- | --- | --- |
| **Brand** | `--primary` `#da291c`, soft reds, `--intent-memory-fg` | Identity, CTA, selection, memory intent |
| **Destructive / danger** | `--destructive` `#ef4444`, `--danger-fg` ~hsl(0,60%,65%), `--danger-bg-solid` | Delete, destructive actions |
| **Error** | `--error-fg` `rgb(255, 68, 68)` | Form/system errors |
| **Status abandoned** | `#f87171` + soft red bg | Library status |
| **Warning (DESIGN.md)** | `#f13a2c` (Ferrari) | Validation warning |
| **Warning (tokens)** | `#fbbf24` / `rgb(255, 153, 0)` | Amber — **not** Ferrari warning red |

### 5.2 Why this fails brand-design rules

1. **Single voltage rule** (`DESIGN.md`): “Don’t introduce a saturated brand color other than Rosso Corsa” — product needs *non-brand* reds for danger, but they must be **visually separable** (hue shift, chroma, or pattern) so primary CTAs are not mistaken for errors and vice versa.
2. **Same-hue CTAs vs errors:** A filled Rosso Corsa primary and a solid danger button both read as “important red action.” Cognitive load increases; error urgency can be under- or over-read.
3. **Abandoned status red** on archive cards can look like “brand accent badges,” especially next to memory intent red.
4. **`--destructive: #ef4444`** is a default Tailwind/shadcn red, not a designed complement to `#da291c`.
5. **Ferrari warning `#f13a2c` is unused**; tokens kept Gilded-era amber warnings. That is actually *better* for separation than another red — but it **drifts from DESIGN.md semantics** and should be documented as deliberate.

### 5.3 Recommended resolution (docs/design only — not applied here)

| Concern | Recommendation |
| --- | --- |
| Brand red | Only: primary fill, focus ring, logo monogram, scarce selection, intentional “memory” accent |
| Danger / delete | Prefer **outline/ghost danger** with coral or cooler red, or use **icon + text** without solid fill matching CTA |
| Error text | Cooler red-magenta or high-chroma but lower-luminance than Rosso Corsa; never equal `#da291c` |
| Abandoned | Neutral muted + icon, or desaturated rose — avoid CTA-adjacent chroma |
| Warning | Keep **amber** in product (good separation) and update `DESIGN.md` semantic-warning for *Subsume product* vs Ferrari marketing extract |
| Success / info | Keep Ferrari greens/blues — they already clear the red channel |

### 5.4 Conflict score

**4.0 / 10** — primary is correct, but the red channel is overcrowded and under-specified.

---

## 6. Shape, spacing, elevation, motion

### 6.1 Radius

| DESIGN.md | tokens.css | UI practice |
| --- | --- | --- |
| CTA/card **0px** dominant | `--radius-sm: 2px`, `md: 4px`, `lg: 8px`; shadcn `--radius: 0.5rem` (8px) | Buttons often `var(--radius-sm)` (2px); cards `radius-md` / hardcoded 4px; some full pills remain |

Ferrari signature is **razor-sharp** CTAs. Subsume is “tighter than soft SaaS” but not sharp-default. Residual pill radii (status chips, brand marks, spinners) need an explicit allowlist.

### 6.2 Spacing

DESIGN ladder: 4 / 8 / 16 / 24 / 32 / 48 / 64 / 96 / 128.  
App tokens: 4 / 8 / **12** / **20** / 24 / 32 — compact product density, not editorial super-spacing. Acceptable for an extension UI; **not** DESIGN.md-faithful.

### 6.3 Elevation

DESIGN: photographic depth + brightness steps; avoid multi-tier shadows.  
Tokens: `--shadow-sm` through `--shadow-hero`, poster/nav/drawer/plaque shadows retained from sanctuary era. Cinematic grain opacities still present. **Mood fit for sanctuary**, **mismatch for pure Ferrari marketing extract**.

### 6.4 Motion

Duration tokens remain ≤300ms user-facing (plan constraint). Ferrari extract itself under-specifies motion; no major coherence failure here.

### 6.5 Geometry subscore

**5.5 / 10**

---

## 7. Docs drift (critical)

Authoritative *implementation* is tokens.css; multiple docs still teach the **previous brand**. Agents reading repo root will reintroduce gold or dual-serif systems.

| Document | Claims today | Reality after rebrand | Severity |
| --- | --- | --- | --- |
| **`brand.md`** | Palette **Gilded Night**; gold `#c9a84c`; Outfit + Newsreader; “gold-on-dark”; Geist residual language | Tokens are Ferrari / Inter | **Critical** |
| **`PRODUCT.md`** | “Gilded Night / Cinematic Sanctuary”; “gold accent for selection and primary actions” | Rosso Corsa / Cinema Black | **Critical** |
| **`CINEMATIC_JOURNAL_DESIGN_SPEC.md`** | Authority with tokens.css; still embeds Newsreader/Outfit, velvet/parchment CSS sample; duration-curtain 450ms vs tokens ≤300ms | Tokens supersede samples but text still guides agents | **High** |
| **`README.md`** | Credits Newsreader & Outfit; authority note still points at cinematic + tokens over brand.md | Fonts are Inter | **High** |
| **`docs/DESIGN_AGENT_BRIEF.md`** | Gilded Night + Parchment; Newsreader/Outfit as live fonts | Obsolete | **High** |
| **`DESIGN.md`** | Full Ferrari marketing extract (FerrariSans, Cavallino language, 0px radius, warning red) | Partially applied; over-specifies automotive chrome Subsume does not ship | **Medium** (reference vs product contract unclear) |
| **Ferrari plan** | Correct implementation plan; aliases retained | Matches what was done | **Low** (good) |
| **Theme labels + tests** | Cinema Black / White Canvas | Implemented + tested | **Aligned** |

### 7.1 Authority graph (current, messy)

```text
  DESIGN.md (Ferrari marketing extract)
        │  (inspiration; not fully productized)
        ▼
  tokens.css  ◄── shadowTokens.ts  ◄── themeLabels.ts   ✅ live product
        ▲
        │  claimed co-authority, stale samples
  CINEMATIC_JOURNAL_DESIGN_SPEC.md
        ▲
  brand.md / PRODUCT.md / README / DESIGN_AGENT_BRIEF   ❌ still Gilded Night
```

### 7.2 Required doc outcomes (for coherence, future work)

1. Rewrite **`brand.md`** as **Ferrari / Cinema Black** (or archive Gilded Night to `brand.md.bak` / `docs/legacy/`).
2. Update **`PRODUCT.md`** register + tone (Rosso Corsa scarce accent; Inter; Cinema Black default).
3. Patch **`CINEMATIC_*`** font/token samples and motion numbers; state dual register if serif returns for reflection only.
4. Refresh **README** font credits and brand one-liner.
5. Mark **DESIGN_AGENT_BRIEF** historical or retarget to Ferrari.
6. Add a short **“Subsume product delta from DESIGN.md”** note: Inter not FerrariSans; no Cavallino; radii not 0 yet; amber warnings retained; atmospheres allowed.

### 7.3 Docs score

**3.0 / 10**

---

## 8. Cross-surface consistency

| Surface | Palette | Type | Notes |
| --- | --- | --- | --- |
| Full app (`tokens.css` + global) | Ferrari | Inter | Primary surfaces |
| Popup | Shares tokens + Inter load | Inter | Brand mark uses CSS classes; ensure mark color is primary not hard gold |
| Content Shadow DOM | `shadowTokens` mirrors core seeds | Inter inject | Semantic danger tokens thinner in shadow set (`--destructive` only) |
| Sanctuary CSS | Token-driven; class names still “gold” | Inter via vars | Works; vocabulary debt |
| Store / listing assets | Not re-audited here | — | Screenshot/marketing may still show gold — check before Chrome Web Store refresh |

---

## 9. Strengths (keep)

1. **Token-first remapping** preserved CSS variable names → low breakage, high ship speed.
2. **Rosso Corsa + Cinema Black + white-on-red** correctly encoded dark and light.
3. **Inter** loaded on app, popup, and shadow roots — no orphaned Google Fonts for Outfit/Newsreader in product.
4. **Theme labels** and unit test lock Ferrari naming.
5. **Success/info** semantic colors match Ferrari extract.
6. **No trademarked Ferrari marks** in code paths reviewed.
7. **Plan document** is clear enough to continue phase-2 (geometry, naming rename, docs).

---

## 10. Findings summary (priority)

| P | Finding | Impact |
| --- | --- | --- |
| P0 | **`brand.md` / `PRODUCT.md` still Gilded Night gold** | Agents and humans re-apply wrong brand |
| P0 | **Semantic + brand red channel overcrowded** | CTA vs danger vs abandoned ambiguity |
| P1 | **`--gold*` naming and `.sanctuary-btn-gold` classes** | Mental model drift; harder refactors |
| P1 | **Shape/elevation not Ferrari-sharp** | Looks “tinted sanctuary,” not precision automotive |
| P1 | **CINEMATIC + README still Outfit/Newsreader** | Typography authority split |
| P2 | **Spacing ladder ≠ DESIGN.md** | Editorial pacing never lands |
| P2 | **Atmospheres override primary** | Brand screenshots / default path unclear |
| P2 | **System light theme incomplete semantic remap** | Edge-case token mix |
| P2 | **Warning token amber ≠ DESIGN warning red** | Doc/product semantic mismatch (amber is OK if documented) |
| P3 | **CTA uppercase/tracking incomplete** | Ferrari voice partial |

---

## 11. Scorecard

| Category | Weight | Score | Weighted |
| --- | --- | --- | --- |
| Core palette seeds (dark/light) | 20% | 8.5 | 1.70 |
| Semantic vs brand separation | 15% | 4.0 | 0.60 |
| Typography system | 15% | 7.5 | 1.13 |
| Shape / spacing / elevation | 10% | 5.5 | 0.55 |
| Cross-surface token parity | 10% | 8.0 | 0.80 |
| Naming / token vocabulary purity | 10% | 3.5 | 0.35 |
| Docs & authority coherence | 20% | 3.0 | 0.60 |
| **Overall** | **100%** | | **6.5 / 10** |

---

## 12. Top 5 findings (for executive return)

1. **Docs drift is the largest coherence failure** — `brand.md` and `PRODUCT.md` still sell Gilded Night gold while runtime is Rosso Corsa; cinematic/README still prescribe Outfit + Newsreader.
2. **Semantic vs brand red conflict** — `#da291c` primary sits beside `#ef4444` destructive, coral danger, abandoned `#f87171`, and error reds without a separation policy.
3. **Gold alias vocabulary remains** — `--gold`, `--accent-gold`, `--badge-on-gold-fg`, `.sanctuary-btn-gold` encode a retired brand in live code.
4. **Geometry incomplete vs `DESIGN.md`** — 2–8px radii and multi-tier shadows instead of sharp 0px CTAs and brightness-step elevation.
5. **Font philosophy split** — Inter single-family is correctly implemented for Ferrari, but sanctuary literary-serif narrative was never re-authored, leaving product voice and docs at odds.

---

## 13. Suggested phase-2 order (documentation / design only unless product work is scheduled)

1. Rewrite `brand.md` + `PRODUCT.md` to Cinema Black / Rosso Corsa / Inter; archive Gilded Night.
2. Publish a **red-channel policy** (brand vs danger vs status) and adjust tokens when product work is allowed.
3. Align `CINEMATIC_JOURNAL_DESIGN_SPEC.md` + README font credits; declare Inter as UI+editorial or reintroduce optional reflection serif deliberately.
4. Optionally rename gold aliases in a dedicated cleanup PR (or leave aliases with a deprecation comment block at top of tokens.css).
5. Decide radius policy: adopt `0` for primary CTAs (Ferrari) *or* document Subsume delta as “2px precision soft-sharp.”

---

## 14. Evidence index (absolute paths)

| Artifact | Path |
| --- | --- |
| Live tokens | `/Users/harshabalakrishnan/Subsume/src/shared/tokens.css` |
| Shadow tokens | `/Users/harshabalakrishnan/Subsume/src/shared/shadowTokens.ts` |
| Theme labels | `/Users/harshabalakrishnan/Subsume/src/shared/themeLabels.ts` |
| Theme label test | `/Users/harshabalakrishnan/Subsume/tests/themeLabels.test.ts` |
| Font loads | `/Users/harshabalakrishnan/Subsume/src/ui/index.html`, `.../popup.html` |
| Ferrari extract | `/Users/harshabalakrishnan/Subsume/DESIGN.md` |
| Implementation plan | `/Users/harshabalakrishnan/Subsume/docs/superpowers/plans/2026-08-04-ferrari-design-system.md` |
| Stale brand | `/Users/harshabalakrishnan/Subsume/brand.md` |
| Stale product register | `/Users/harshabalakrishnan/Subsume/PRODUCT.md` |
| Sanctuary philosophy | `/Users/harshabalakrishnan/Subsume/CINEMATIC_JOURNAL_DESIGN_SPEC.md` |
| This review | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-04/09-brand-design.md` |

---

*End of review. Product source intentionally untouched.*
