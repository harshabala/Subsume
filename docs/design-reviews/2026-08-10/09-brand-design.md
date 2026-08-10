# Brand Design Coherence Review — Subsume (Delta from 2026-08-04)

| Field | Value |
| --- | --- |
| **Date** | 2026-08-10 |
| **Commit / tree** | `a5471b5` (workspace Subsume) |
| **Reviewer lens** | brand-design skill (palette · type · contrast · docs authority · semantic safety · geometry) |
| **Implementation source of truth** | `src/shared/tokens.css`, `src/shared/shadowTokens.ts`, `src/shared/themeLabels.ts` |
| **Brand contract** | `brand.md` (Cinema Black + Rosso Corsa; now aligned with runtime) |
| **Reference systems** | `DESIGN.md` (Ferrari extract), `docs/superpowers/plans/2026-08-04-ferrari-design-system.md` |
| **Competing / partial docs** | `CINEMATIC_JOURNAL_DESIGN_SPEC.md`, `README.md`, `docs/DESIGN_AGENT_BRIEF.md` |
| **Prior review** | [2026-08-04/09-brand-design.md](../2026-08-04/09-brand-design.md) — **6.5 / 10** |
| **Scope** | Coherence only — no product source changes |
| **Overall score** | **7.0 / 10** |
| **Delta** | **+0.5** vs Aug 4 |

---

## 1. Executive summary

Runtime remains a solid **Ferrari-adapted cinematic system**: **Rosso Corsa** (`#da291c`) on **Cinema Black** (`#181818`), **White Canvas** light, **Inter** monofont, theme labels locked. Since Aug 4, the **largest brand-coherence P0 is closed**: root **`brand.md`** and **`PRODUCT.md`** now describe the live palette, type, and scarce-red policy instead of Gilded Night gold.

What still blocks a full brand lock:

1. **Authority graph is still multi-headed** — `CINEMATIC_JOURNAL_DESIGN_SPEC.md` claims co-authority with `tokens.css` and still embeds **Newsreader / Outfit**, velvet samples, and **450ms** curtain; README still credits those fonts; `DESIGN_AGENT_BRIEF.md` is fully Gilded Night.
2. **Semantic vs brand red** is *documented* in `brand.md` but **not implemented** — `#ef4444` destructive, coral danger, abandoned `#f87171`, and error reds still crowd Rosso Corsa.
3. **Gold vocabulary debt** (`--gold*`, `.sanctuary-btn-gold`) remains live; values are red, names are retired brand.
4. **Geometry** improved slightly (global `.btn-primary` → `--radius-none`; spacing ladder gained 48–128 rungs) but cards, shadcn `--radius: 0.5rem`, multi-tier shadows, and 12/20 mid-scale still diverge from pure `DESIGN.md`.

**Verdict:** Phase-1 palette + **docs contract for brand.md/PRODUCT** landed. Phase-2 (red-channel tokens, naming purge, cinematic/README authority rewrite, geometry policy) still open. Coherence is **shippable default brand**, not **fully locked system**.

---

## 2. Ferrari / Subsume pillar table

| Pillar | Ferrari / brand intent | Status 2026-08-04 | Status 2026-08-10 | Notes |
| --- | --- | --- | --- | --- |
| Canvas | Near-black `#181818`, never pure black | **Met** | **Met** | Unchanged; Cinema Black default |
| Brand voltage | Scarce Rosso Corsa `#da291c` | **Met** (scarcity unenforced) | **Met** (scarcity still unenforced) | Atmospheres still recolor `--primary` |
| On-primary | White on red | **Met** | **Met** | `#ffffff` on primary paths |
| Light | White Canvas `#f7f7f7` / white | **Met** | **Met** | Labels + tokens aligned |
| Type | Single sans (Inter substitute) | **Met** in product | **Met** in product | Docs outside brand.md/PRODUCT still dual-serif |
| Shape | Sharp **0px** CTAs/cards | **Partial** | **Partial ↑** | `.btn-primary` uses `--radius-none`; cards still 2–8px |
| Spacing | Named 8px ladder (xxxs→super) | **Miss** (4/8/12/20/24/32) | **Partial** | Now includes 48/64/96/128; still has 12/20 density rungs |
| Elevation | Photo + brightness; minimal shadows | **Miss** | **Miss** | Multi-tier `--shadow-*` retained |
| Semantics | Success/info Ferrari; warn/danger separable | **Partial** | **Partial ↑** | Policy in `brand.md`; token values unchanged |
| Naming | No Cavallino; no retired “gold” mental model | **Fail** (aliases) | **Fail** (aliases) | brand.md acknowledges legacy aliases |
| Docs | Single brand narrative | **Fail** | **Partial ↑** | brand.md + PRODUCT fixed; cinematic/README/brief stale |
| Trademark | No Cavallino / FerrariSans assets | **Met** | **Met** | Still clean |

---

## 3. Palette evaluation

### 3.1 Core seeds (unchanged, correct)

| Role | Token | Value | Match |
| --- | --- | --- | --- |
| Canvas | `--bg-base` | `#181818` | DESIGN / brand.md |
| Elevated | `--bg-elevated` | `#242424` | Product elevation step |
| Card / overlay | `--bg-overlay` / `--card` | `#303030` | DESIGN canvas-elevated |
| Ink / muted / subtle | `#ffffff` / `#969696` / `#666666` | Match |
| Primary / hover / pressed | `#da291c` / `#9d2211` / `#b01e0a` | Match |
| Primary soft | `rgba(218, 41, 28, 0.10–0.12)` | Match |
| Success / info | `#03904a` / `#4c98b9` | Ferrari semantic |
| Warning | Amber `#fbbf24` family | **Deliberate product delta** vs DESIGN `#f13a2c` |

**Contrast (qualitative AA):** White on Cinema Black surfaces strong; muted gray secondary OK; white-on-Rosso correct for CTAs. Soft red text (`#ff6b5c`) should stay sparse.

### 3.2 Light mode

White Canvas remap remains complete under `[data-theme="light"]`. System `@media (prefers-color-scheme: light)` still remaps a **subset** of semantic tokens (status fg + core shell, not full danger/success matrix) — same edge-case risk as Aug 4.

### 3.3 Atmospheres

`sunset` / `emerald` / `french` still reassign `--primary` (and dark canvas tints). brand.md does not forbid them; single-voltage rule remains diluted when active. Treat as **temporary cinematic filters**, not brand modes for marketing screenshots.

### 3.4 Gold aliases (unchanged)

```text
--gold / --accent-gold → var(--primary)
--gold-text / --gold-soft-bg / --badge-on-gold-fg / --accent-gold-border*
.sanctuary-btn-gold
```

Values red; names gold. Compatible, not coherent.

### 3.5 Palette subscore

| Dimension | Aug 4 | Aug 10 |
| --- | ---: | ---: |
| Seed accuracy | 9/10 | 9/10 |
| Light/dark twin brand | 8/10 | 8/10 |
| Gradient identity | 8/10 | 8/10 |
| Semantic brand integration | 4/10 | 4.5/10 |
| Alias / naming purity | 3/10 | 3.5/10 |
| **Palette subtotal** | **6.5** | **6.6** |

---

## 4. Typography

| Surface | Family | Status |
| --- | --- | --- |
| `tokens.css` | Inter for `--font-ui` + `--font-editorial` | Aligned |
| `shadowTokens.ts` | Inter + Google Fonts URL | Aligned |
| App / popup HTML | Inter weights 400–700 | Aligned |
| Mono | JetBrains Mono declared | OK |
| Product src | No Newsreader/Outfit | Clean |

**Philosophy tension (unchanged):** Ferrari monofont vs sanctuary “literary journal” (serif reflections) still unresolved in `CINEMATIC_JOURNAL_DESIGN_SPEC.md`. `brand.md` correctly forbids reintroducing Newsreader/Outfit without a deliberate dual-type decision.

**CTA type craft:** Uppercase + tracking partial (onboarding, poetic, layout labels); global `.btn-primary` still not forced uppercase/tracked.

**Font score: 7.5 / 10** (same as Aug 4 — implementation clean; narrative docs still split outside brand.md).

---

## 5. Semantic vs brand red

### 5.1 Policy (new since Aug 4)

`brand.md` now states:

| Use | Token |
| --- | --- |
| Brand / CTA / selection | `--primary` `#da291c` |
| Destructive / error | `--destructive` / `--danger-*` — distinct coral; **do not reuse primary for delete** |
| Success / info | Ferrari green / blue |
| Warning | Amber family (kept for contrast) |

### 5.2 Runtime (unchanged collision)

| Family | Example | Problem |
| --- | --- | --- |
| Brand | `#da291c`, intent-memory, soft reds | Correct identity |
| Destructive | `#ef4444` (shadcn default) | Same red neighborhood as brand |
| Danger | `hsl(0, 60%, 65%)`, solid danger | Reads as “another red CTA” |
| Error | `rgb(255, 68, 68)` | Same |
| Abandoned status | `#f87171` | Looks brand-adjacent on archive |
| DESIGN warning | `#f13a2c` unused | Amber retained (good separation if documented) |

**Conflict score: 4.5 / 10** (+0.5 for written policy; tokens still overcrowded).

---

## 6. Geometry (shape, spacing, elevation, motion)

| Axis | DESIGN.md | Product today | Delta vs Aug 4 |
| --- | --- | --- | --- |
| Radius | 0px CTAs/cards | `--radius-none` on `.btn-primary`; else 2/4/8; shadcn `--radius: 0.5rem` | **↑** primary CTA sharpness |
| Spacing | 4/8/16/24/32/48/64/96/128 | 4/8/**12**/ **20**/24/32/**48/64/96/128** | **↑** super ladder present; mid-scale still dense |
| Elevation | Minimal shadows | Multi-tier sm→hero + poster/nav/drawer | Same |
| Motion | Under-specified in extract | ≤300ms curtain 280/220; ease-out / focus-pull | Aligned with brand.md |

**Geometry subscore: 6.0 / 10** (was 5.5).

---

## 7. Docs authority (critical delta)

### 7.1 Document matrix

| Document | Aug 4 | Aug 10 | Severity now |
| --- | --- | --- | --- |
| **`brand.md`** | Gilded Night gold + Outfit/Newsreader | **Cinema Black + Rosso Corsa + Inter**; semantic policy; gold alias note | **Aligned** |
| **`PRODUCT.md`** | Gilded Night gold | **Cinema Black + Rosso Corsa**; scarce accent | **Aligned** |
| **`tokens.css` / theme labels** | Ferrari live | Ferrari live | **Aligned** |
| **`CINEMATIC_JOURNAL_DESIGN_SPEC.md`** | Newsreader/Outfit; supersedes brand.md; 450ms | **Still** Newsreader/Outfit sample; still claims authority over brand.md; duration sample 450ms | **High** |
| **`README.md`** | Credits Newsreader & Outfit; authority → cinematic + tokens | **Still** credits Newsreader & Outfit (Attribution); authority note unchanged | **High** |
| **`docs/DESIGN_AGENT_BRIEF.md`** | Gilded Night + Parchment | **Unchanged** (obsolete) | **High** |
| **`DESIGN.md`** | Full Ferrari marketing extract | Same — inspiration, not productized | **Medium** (needs explicit product delta callout) |
| Historical plans / old reviews | Gilded references | Expected archive | **Low** |

### 7.2 Authority graph (improved but messy)

```text
  brand.md  ─────────────┐  ✅ now correct Cinema Black / Rosso Corsa
  PRODUCT.md ────────────┤
  DESIGN.md (extract) ───┼──► tokens.css ◄── shadowTokens / themeLabels  ✅ live
                         │
  CINEMATIC_JOURNAL ─────┘  ⚠️ still claims supersession + stale type/motion samples
  README attribution ──────  ⚠️ still Newsreader/Outfit
  DESIGN_AGENT_BRIEF ──────  ❌ Gilded Night
```

**Recommended authority (for future work):**

1. **Live UI:** `src/shared/tokens.css` (+ shadow/theme companions)  
2. **Brand narrative for agents:** `brand.md`  
3. **Product register:** `PRODUCT.md`  
4. **Philosophy (interaction / sanctuary):** `CINEMATIC_JOURNAL_DESIGN_SPEC.md` — after font/motion samples are patched  
5. **`DESIGN.md`:** reference extract with an explicit “Subsume deltas” section (Inter, no Cavallino, amber warnings, atmospheres, soft-sharp 2px cards)

### 7.3 Docs score

**6.5 / 10** (was **3.0**). Primary brand contract fixed; secondary agent-facing docs still poison reintroductions.

---

## 8. Cross-surface consistency

| Surface | Palette | Type | Notes |
| --- | --- | --- | --- |
| Full app | Ferrari | Inter | Primary |
| Popup | Shared tokens | Inter | Shared primary |
| Content Shadow DOM | `shadowTokens` mirrors seeds + gold aliases | Inter | Danger set thinner than app |
| Sanctuary CSS | Token-driven; gold class names | Inter via vars | Vocabulary debt |
| Store listing assets | Not re-audited | — | Verify screenshots show Rosso Corsa, not gold |

**Cross-surface: 8.0 / 10** (unchanged).

---

## 9. Strengths (keep)

1. **Correct root brand contract** — `brand.md` + `PRODUCT.md` match runtime (major Aug 10 win).
2. **Token-first remapping** still intact; no gold hex regression in product palette seeds.
3. **Inter** on app, popup, and shadow roots.
4. **Theme labels** Cinema Black / White Canvas.
5. **Success/info** Ferrari semantic colors.
6. **No trademarked Ferrari marks**.
7. **`.btn-primary` → radius-none** edges geometry toward DESIGN intent.
8. **Spacing super ladder** (48–128) now exists for editorial pacing when used.
9. **Motion ceiling** ≤300ms + documented in brand.md.

---

## 10. Findings (P0–P3)

| P | Finding | Impact | Δ from Aug 4 |
| --- | --- | --- | --- |
| ~~P0~~ | ~~`brand.md` / `PRODUCT.md` Gilded Night~~ | — | **Resolved** |
| P0 | **CINEMATIC + README + DESIGN_AGENT_BRIEF still teach dual-serif / gold-era identity** | Agents reintroduce Newsreader/Outfit or wrong authority | Was P1; **elevated** as remaining docs P0 |
| P0 | **Semantic + brand red channel overcrowded** | CTA vs danger vs abandoned ambiguity | Policy only; tokens **unchanged** |
| P1 | **`--gold*` / `.sanctuary-btn-gold` vocabulary** | Mental model drift | Unchanged |
| P1 | **Shape/elevation incomplete vs DESIGN.md** | Soft sanctuary chrome, not precision automotive | Slight CTA radius progress |
| P1 | **Authority graph: cinematic still supersedes brand.md on paper** | Conflicting agent instructions | Worse relative once brand.md is correct |
| P2 | **Atmospheres override `--primary`** | Brand screenshot / default path unclear | Unchanged |
| P2 | **System light incomplete semantic remap** | Edge-case token mix | Unchanged |
| P2 | **Warning amber ≠ DESIGN warning red** | OK if product delta documented in DESIGN.md | Unchanged |
| P2 | **Spacing mid-scale 12/20** | Not pure 8px ladder | Super rungs added |
| P3 | **CTA uppercase/tracking incomplete** | Ferrari voice partial | Unchanged |

---

## 11. Scorecard (weighted)

| Category | Weight | Aug 4 | Aug 10 | Weighted (Aug 10) |
| --- | ---: | ---: | ---: | ---: |
| Core palette seeds (dark/light) | 20% | 8.5 | 8.5 | 1.70 |
| Semantic vs brand separation | 15% | 4.0 | 4.5 | 0.68 |
| Typography system | 15% | 7.5 | 7.5 | 1.13 |
| Shape / spacing / elevation | 10% | 5.5 | 6.0 | 0.60 |
| Cross-surface token parity | 10% | 8.0 | 8.0 | 0.80 |
| Naming / token vocabulary purity | 10% | 3.5 | 4.0 | 0.40 |
| Docs & authority coherence | 20% | 3.0 | 6.5 | 1.30 |
| **Overall** | **100%** | **6.5** | **7.0** | **6.61 → 7.0** |

Headline **7.0 / 10** reflects resolved root brand contract (skill-critical artifact) while remaining high-severity doc and red-channel gaps cap further gains.

---

## 12. Delta from 2026-08-04

| Change | Direction |
| --- | --- |
| Rewrite `brand.md` → Cinema Black + Rosso Corsa + Inter + semantic policy | **Major +** |
| Update `PRODUCT.md` register | **Major +** |
| `.btn-primary` sharp radius (`--radius-none`) | **Minor +** |
| Spacing tokens include 48–128 | **Minor +** |
| Semantic red token values | **None** |
| Gold alias rename | **None** |
| CINEMATIC / README fonts / BRIEF | **None (still stale)** |
| Atmospheres / system light / elevation | **None** |

**Net:** Coherence moved from “phase-1 palette, docs lie” to “palette + root docs true; secondary docs and semantics unfinished.”

---

## 13. Top fixes (ordered)

1. **P0 — Fix remaining authority & type docs**  
   - Patch `CINEMATIC_JOURNAL_DESIGN_SPEC.md`: Inter monofont (or explicit dual-register decision), motion ≤300ms, **do not supersede** `brand.md` on palette/type.  
   - README Attribution → Inter (not Newsreader/Outfit).  
   - Retarget or archive `docs/DESIGN_AGENT_BRIEF.md`.  
   - Add **“Subsume product deltas from DESIGN.md”** short section (Inter, amber warning, soft radii, atmospheres).

2. **P0 — Implement red-channel policy in tokens**  
   - Keep brand primary scarce.  
   - Shift danger/error toward cooler or lower-chroma coral; prefer outline/ghost delete.  
   - Desaturate abandoned status away from CTA chroma.  
   - Keep amber warning; note product delta in DESIGN.md.

3. **P1 — Naming + geometry lock**  
   - Deprecate `--gold*` / `.sanctuary-btn-gold` (aliases with comments or rename PR).  
   - Document radius policy: **0 primary CTAs** (done on `.btn-primary`) + **2px soft-sharp cards** as intentional Subsume delta *or* push more surfaces to 0.  
   - Prefer brightness steps over expanding shadow tiers on new work.

---

## 14. Top 3 (executive)

1. **Secondary docs still fight the brand** — cinematic spec, README font credits, and design agent brief can still reintroduce dual-serif / Gilded Night despite fixed `brand.md`.  
2. **Semantic vs brand red remains a product risk** — policy written, tokens still collide.  
3. **Geometry and gold vocabulary still say “tinted sanctuary”** — not full Ferrari precision or clean brand vocabulary.

---

## 15. Evidence index (absolute paths)

| Artifact | Path |
| --- | --- |
| Live tokens | `/Users/harshabalakrishnan/Subsume/src/shared/tokens.css` |
| Shadow tokens | `/Users/harshabalakrishnan/Subsume/src/shared/shadowTokens.ts` |
| Theme labels | `/Users/harshabalakrishnan/Subsume/src/shared/themeLabels.ts` |
| Brand contract | `/Users/harshabalakrishnan/Subsume/brand.md` |
| Product register | `/Users/harshabalakrishnan/Subsume/PRODUCT.md` |
| Ferrari extract | `/Users/harshabalakrishnan/Subsume/DESIGN.md` |
| Sanctuary philosophy | `/Users/harshabalakrishnan/Subsume/CINEMATIC_JOURNAL_DESIGN_SPEC.md` |
| README | `/Users/harshabalakrishnan/Subsume/README.md` |
| Stale agent brief | `/Users/harshabalakrishnan/Subsume/docs/DESIGN_AGENT_BRIEF.md` |
| Prior review | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-04/09-brand-design.md` |
| This review | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/09-brand-design.md` |

---

*End of review. Product source intentionally untouched.*
