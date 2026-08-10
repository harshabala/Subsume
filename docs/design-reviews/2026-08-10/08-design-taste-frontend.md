# Design Taste Frontend — Anti-Slop Audit (post Ferrari + P0)

**Date:** 2026-08-10  
**Lens:** `design-taste-frontend` (anti-slop, redesign-first, pre-flight §14)  
**Repo:** Subsume `@ a5471b5`  
**Surface:** Chrome extension shell, popup, sanctuary pages, capture, archive, content plaques  
**Mode:** Read-only audit (no code changes)  
**Context:** Ferrari token remap + P0 wave + open-issues A–H closed (`fix/design-p0-review-wave` plan). Prior taste audit: `docs/design-reviews/2026-08-04/08-design-taste-frontend.md` (**5.5 / 10**). Craft hygiene feedback: `17-open-issues-fix-feedback.md` (~**7.7** multi-skill craft).

---

## Design Read

**Reading this as:** redesign of a private multi-medium sanctuary product UI (extension shell, popup, capture, archive) for design-conscious cinephiles and readers, with a **named north star of Option A synthesis** (sanctuary soul + scarce Rosso Corsa on Cinema Black), still only partially executed in live chrome.

**Inferred dials of the live product (not aspirational):**

| Dial | Read | Evidence |
|------|------|----------|
| `DESIGN_VARIANCE` | **5** | Symmetrical page headers, centered onboarding, standard card stacks; split lobby on Home only |
| `MOTION_INTENSITY` | **5–6** | Curtain/dolly ≤300ms, enter staggers, notice/dock/accordion/onboarding step motion; PRM gated |
| `VISUAL_DENSITY` | **5** | Discovery lobby multi-band; archive denser; capture quieter |

**Redesign mode:** **Preserve IA + sanctuary objects; visual system still token-first with partial geometry/scarcity.** Not full Ferrari marketing fidelity; not full literary dual-type restore.

---

## Verdict (one line)

**Hygiene and voltage discipline improved after Ferrari + P0; identity and AI-rhythm tells did not. Still a dual-brand recolor with intentional sanctuary islands, not a locked taste system.**

**Score: 6.2 / 10**

| Band | Meaning |
|------|---------|
| 9–10 | Distinct, non-generic, brand-locked |
| 7–8 | Intentional with few tells |
| **5–6** | **Mixed: real craft + identity fracture / AI rhythm** (upper edge of band) |
| 3–4 | Mostly template |
| 1–2 | Pure slop |

| Milestone | Score | Delta |
|-----------|------:|------|
| Pre-Ferrari (Gilded Night, 2026-07-21) | 6.5 | — |
| Post-Ferrari first taste audit (2026-08-04) | 5.5 | −1.0 (palette yes, system/voice fracture) |
| **Post Ferrari + P0 + A–H (this audit)** | **6.2** | **+0.7** (hygiene/scarcity/motion; identity/tells flat) |

Craft multi-skill mean (~7.7) is **not** the same as anti-slop taste. This lens weights dual-brand fracture, eyebrow rhythm, type signature, and production-test tells harder than focus rings or transition lists.

---

## What P0 + open issues actually fixed (protect the gains)

Do not re-open pure token churn. These were real taste-adjacent wins:

| Fix | Why it matters for taste |
|-----|--------------------------|
| Solid primary CTAs (`--primary`, not translucent border-hero fills) | Voltage reads intentional, not misty AI red |
| Gold chroma purge (no live `hsla(45…)`) | Color Consistency Lock toward single brand red |
| `transition: all` gone; explicit property lists | Motion discipline, no accidental layout thrash |
| Hover gated to fine pointer | Less mobile jank; craft, not template glow |
| Modal exit shorter + ease-out family | Cinematic claim without draggy ease-in exits |
| Chip active = soft primary fill, not solid red CTA | Scarcity of Rosso improved (G) |
| `--radius-none` + `.btn-primary` sharp | Partial Shape Consistency toward Ferrari |
| Spacing ladder extended (`3xl`–`super`) | DESIGN.md geometry partial |
| Shadow tokens motion parity + dock/accordion/notice/onboarding enter + popup PRM | Motion claimed ≈ motion shown under PRM |
| `brand.md` / PRODUCT aligned Cinema Black + Rosso + Inter monofont | Docs no longer teach gold/serif as live system |

**Soul still intact (do not sand down while “fixing Ferrari”):**

- Poetic Capture Canvas (one writing moment, progressive disclosure)
- Hardcover / openable archive spines
- Film grain (fixed overlay, reduced-motion kill)
- Real poster / media art (not div-fake dashboards)
- Shell max-width alignment (`--app-shell-max`)

---

## Dual-brand analysis

North star on paper: **Option A synthesize** — sanctuary soul + scarce Rosso + Cinema Black (`docs/superpowers/plans/2026-08-04-design-open-issues.md`).

Live reality is still **two unfinished brands** sharing one hex root.

### Brand A — Ferrari / Cinema Black (tokens + shell)

| Layer | Spec | Live |
|-------|------|------|
| Canvas | `#181818` Cinema Black | Yes (`tokens.css`) |
| Voltage | Rosso Corsa `#da291c`, scarce CTAs/focus | Hex yes; scarcity **partial** (nav active, logo, borders, monogram still red) |
| Type | Single sans, display 500, tracked uppercase CTAs | Inter 400–700; **no display scale / CTA tracking system** |
| Geometry | Sharp CTAs (0), hairlines over shadow stacks | `btn-primary` 0; sanctuary buttons often 2px; cards 4–8; shadcn `--radius: 0.5rem` |
| Iconography | Brand-specific (not claimed) | Material Symbols Outlined — generic kit |
| Layout language | Full-bleed cinematic hero photography | Extension shell: poster frame + plaque, not marketing full-bleed |

### Brand B — Sanctuary / Criterion theatre (product voice + chrome)

| Layer | Spec (historical soul) | Live |
|-------|------------------------|------|
| Metaphor | Vault, ledger, marquee, afterglow, house, programme | **Still dominant** in copy and empty states |
| Type | Editorial display + UI pair (Newsreader/Outfit era) | Collapsed to **Inter dual-role** + **italic as serif cosplay** on plaques/onboarding |
| Micro-labels | Museum plaques, catalogue indices | `.sanctuary-subtitle` uppercase 0.18em **every page**; `Index 00`, `Catalogue No. 03`, `Registry Index 00`, `No. 001`, `Programme index 00` |
| Material | Soft plaques, glass blur | `backdrop-filter` plaques still default empty/hero chrome |
| Class/token names | Gold-era | `.sanctuary-btn-gold`, `--gold`, `--accent-gold` resolve to red — mental model still “gold painted red” |

### Fracture matrix

| Layer | Ferrari claim | Sanctuary claim | Coherent? |
|-------|---------------|-----------------|-----------|
| Palette hex | Rosso + near-black | — | **Yes** |
| Accent scarcity | CTA/focus only | Red as former gold multi-role | **Partial** (chips better; nav/logo/borders still red) |
| Type | Single sans, weight ladder | Literary italic hierarchy | **No** (neither system fully ships) |
| Radius | Sharp interactive | Soft plaque cards | **Partial** |
| Lexicon | Quiet product English | Theatre / vault / programme meta | **No** (B wins copy; A wins paint) |
| Docs | `brand.md` Ferrari-aligned | Cinematic journal residual | **Mostly yes** for brand.md; journal lag remains |
| Motion | ≤300ms precision | Ceremony (curtain, grain, capture) | **Yes** (best synthesis zone) |

**Synthesis status:** ~**85% palette**, ~**45% geometry/hygiene**, ~**30% type**, ~**20% voice**.  
Until type + lexicon + eyebrow rhythm lock to one story, further hex tweaks will not raise this lens past ~7.

---

## Anti-slop findings (P0–P3)

Severity: **P0** identity/blocker · **P1** major taste · **P2** polish · **P3** nit

| ID | Sev | Finding | Evidence (post-P0) | vs 2026-08-04 |
|----|-----|---------|-------------------|---------------|
| **T01** | **P0** | **Dual brand without finished synthesis** — Ferrari voltage on Criterion theatre chrome and lexicon | `tokens.css` Ferrari header vs live subtitles/indices/vault copy; gold class aliases | Open (docs clearer, paint cleaner; synthesis not shipped) |
| **T02** | **P1** | **Inter monofont + italic “editorial”** — neither Ferrari display craft nor sanctuary dual-type | `--font-editorial` === Inter; `.sanctuary-plaque-title` italic; onboarding 42px italic-adjacent theatre | Open |
| **T03** | **P1** | **Eyebrow / section-number / plaque-index overuse** | Page headers: Search, Recs, Stats, Alerts, People, Settings + `Catalogue No. 03`, `Index 00`, `Registry Index 00`, Home `No. 001`, empty-state indices | Open (mechanical fail §4.7 / §14) |
| **T04** | **P1** | **Rosso still multi-role** (better than pre-P0, not scarce) | Nav active, logo, ring, borders, monogram; chips **improved** to soft fill | Partial close (G) |
| **T05** | **P1** | **Shape Consistency Lock soft-mixed** | `radius-none` / sm 2 / md 4 / lg 8 / shadcn 0.5rem / pills | Partial (btn-primary sharp) |
| **T06** | **P1** | **Atmosphere presets recolor brand voltage** | sunset/emerald/french reassign `--primary` | Open (intentional feature; voids single-voltage when on) |
| **T07** | **P1** | **Em-dashes in user-visible copy** (§9.G hard ban) | Onboarding body, Settings help, Alerts, Stats footnotes, DetailModal linking, digest notifications, edition title joins, ReflectionTimeline attribution | Open |
| **T08** | **P2** | **Onboarding = centered manifesto + dual ambient glows + 3 equal pillars** | `Onboarding.tsx` `.onboarding-glow-cool/warm` + Discover/Capture/Archive | Open |
| **T09** | **P2** | **Glass/blur plaque default** for empty + inputs | `.sanctuary-empty-plaque` blur(16px); lobby chrome | Open |
| **T10** | **P2** | **Discovery lobby multi-job** (not one hero moment) | Home: plaque hero + feed + recently reflected + weather + picks + programme bands | Open |
| **T11** | **P2** | **Status rainbow + semantic multi-hue** vs one brand voltage | to-watch / watching / watched / abandoned multi-color badges; success/info/warning family | Open (product need; still Color Lock tension) |
| **T12** | **P2** | **Copy register split** — literary house voice vs operational settings | Home/Recs/Onboarding vs Settings/Alerts | Open |
| **T13** | **P3** | **Gold class/token names residual** | `.sanctuary-btn-gold`, `--gold-*` | Open (hygiene; values correct) |
| **T14** | **P3** | **Material Symbols + ad-hoc SVG** | `index.html` / `popup.html` | Open |
| **T15** | **P3** | **Dock textarea focus-visible ring** residual | content dock border-only focus | Minor a11y (noted 17-feedback) |

### Closed since prior taste audit (do not re-file)

- Translucent primary CTAs  
- Live gold chroma leftovers  
- `transition: all`  
- Modal ease-in exit drag  
- Missing PRM on popup / major shell motion  
- Chip solid-red-as-CTA (soft active now)  
- `brand.md` teaching gold/serif as live system  

---

## Pre-flight style check (taste-relevant §14)

| Check | Result |
|-------|--------|
| Redesign mode + audit | **Pass** (this doc) |
| Color Consistency Lock (one accent whole product) | **Fail** (status rainbow + atmospheres + multi-role red) |
| Shape Consistency Lock | **Fail** (mixed radii; partial sharp CTA) |
| Eyebrow count ≤ ceil(n/3) | **Fail** (page-level subtitle on nearly every surface) |
| No section-number eyebrows | **Fail** (`Catalogue No. 03`, `Index 00`, `No. 001`, registry/programme indices) |
| Zero em-dashes in UI copy | **Fail** |
| Serif discipline / no fake editorial | **Fail** (italic Inter stand-in) |
| Page Theme Lock | **Pass** (Cinema Black / White Canvas; atmospheres are accent switches) |
| Motion motivated + reduced-motion | **Pass** (post P0/A–H) |
| Real product visuals | **Pass** (posters / spines / capture) |
| CTA solid + contrast | **Pass** (post P0) |
| Cards only when elevation earns hierarchy | **Partial** |
| Marquee max-one / no scroll cues | **Pass** (no marketing marquee spam) |
| No fake product UI from divs | **Pass** |

---

## Score breakdown

| Dimension | /10 | Note |
|-----------|----:|------|
| Brand / identity coherence | 5.0 | North star named; live still dual |
| Anti-slop (layout / micro-labels) | 4.5 | Soul objects yes; eyebrow/index rhythm no |
| Typography | 4.5 | Inter dual-role; italic theatre; no display ladder |
| Color / voltage discipline | 7.0 | Hex + solid CTA + soft chips; scarcity incomplete |
| Motion / material craft | 8.0 | Best dimension post P0/A–H |
| Distinctiveness vs generic dark SaaS | 6.5 | Capture/spines/grain still Subsume |
| **Weighted overall** | **6.2** | |

---

## Top fixes (ordered)

### 1. Finish identity synthesis in **copy + micro-labels** (P0 → unlocks score)

Pick and ship **one** lexicon layer for shell pages:

- **Shell path (recommended under Option A):** plain product English — “Search”, “Recommendations”, “Alerts”, “Empty library”. Kill `Catalogue No. 03`, `Index 00`, `Registry Index 00`, `Marquee Programme · Ledger First`, `Programme index 00`, Home `No. 001` as decoration.
- **Capture/reflection only:** keep literary warmth (afterglow, inscription) if desired — but **max 1 eyebrow per 3 sections** sitewide (`.sanctuary-subtitle` not automatic page chrome).

Mechanical target: count of uppercase `letter-spacing: 0.18em`-class labels above headlines ≤ ceil(sectionCount / 3).

### 2. Type decision — stop italic-Inter cosplay (P1)

Either:

- **(a) Monofont Ferrari-adapted:** keep Inter; add real display scale (weight 500–600, negative tracking ladder, uppercase tracked CTAs from `DESIGN.md`); ban italic-as-serif on plaque titles/onboarding headlines; **or**
- **(b) Sanctuary dual-type:** restore one real display face for capture + reflection only; UI stays Inter/system.

Do not leave `--font-editorial` as an alias that means nothing.

### 3. Em-dash purge in user-visible strings (P1, skill hard ban)

Rewrite onboarding, Settings help, Alerts, Stats footnotes, DetailModal, notifications, and empty-state copy to periods / commas / hyphens. Treat `—` as ship-blocker for this lens even when “literary.”

### Honorary 4–6 (if capacity)

4. **Onboarding de-slop:** drop dual glow orbs; replace three equal pillars with one short value moment + single CTA (or progressive steps without feature-card triad).  
5. **Documented radius rule:** interactive primary = `radius-none`; cards = one step (2 or 4); no shadcn 0.5rem drift without alias.  
6. **Gold name hygiene:** `*-btn-gold` → `*-btn-primary` (aliases one release). Cosmetic but ends “painted gold” mental model.

---

## What not to do next

- Another pure token remap without identity execution.  
- Full Ferrari marketing redesign (full-bleed car photography, proprietary marks) — out of product scope.  
- Sanding capture / spines / grain to chase “cleaner SaaS.”  
- Restoring Newsreader **and** keeping every catalogue-index eyebrow (worst of both brands).

---

## Top 3 (executive)

1. **P0 — Dual brand unfinished:** Ferrari paint + Criterion theatre chrome/copy; synthesis named, not shipped.  
2. **P1 — Micro-label / section-number slop:** `.sanctuary-subtitle` + catalogue/registry/programme indices fail eyebrow restraint hard.  
3. **P1 — Type + em-dash:** Inter dual-role + italic cosplay + widespread `—` keep the UI reading as LLM-literary template on a racing-red shell.

**Protect:** Capture canvas, hardcover spines, film grain, solid Rosso CTAs, motion ≤300ms + PRM, soft chip fills.

---

## Sources inspected

- Skill: `~/.agents/skills/design-taste-frontend/SKILL.md`  
- Prior: `docs/design-reviews/2026-08-04/08-design-taste-frontend.md`, `17-open-issues-fix-feedback.md`  
- Plans: `docs/superpowers/plans/2026-08-04-ferrari-design-system.md`, `2026-08-04-design-open-issues.md`  
- Brand: `DESIGN.md`, `brand.md`  
- Tokens: `src/shared/tokens.css`, `src/shared/shadowTokens.ts`  
- Pages: Home, Onboarding, Search, Recommendations, NewReleases, Stats, Alerts, People, Settings, Library, popup  
- Chrome: `src/styles/sanctuary.css`, onboarding/discovery styles, sanctuary components  

---

## Deliverable meta

| Field | Value |
|-------|--------|
| Path | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/08-design-taste-frontend.md` |
| Score | **6.2 / 10** |
| Top 3 | Dual-brand unfinished · eyebrow/index slop · type + em-dash |
| Stance | Hygiene up; taste system still dual — next wave is identity + copy, not tokens |
