# Design Taste Frontend — Anti-Slop Audit

**Date:** 2026-08-04  
**Lens:** `design-taste-frontend` (anti-slop, redesign-first)  
**Surface:** Subsume post-Ferrari rebrand (token remap + sanctuary product UI)  
**Mode:** Read-only audit (no code changes)  
**Scope:** Brand coherence, generic LLM patterns, intentional craft vs templated chrome

---

## Design Read

**Reading this as:** redesign of a private multi-medium sanctuary product UI (Chrome extension shell, popup, capture, archive) for design-conscious cinephiles and readers, with a **luxury-automotive cinematic** voltage (Ferrari `DESIGN.md` / Rosso Corsa on `#181818`) layered onto an older **literary theatre / Criterion** language (museum plaques, Acts, vault, afterglow).

**Inferred dials of the live product (not aspirational):**

| Dial | Read | Evidence |
|------|------|----------|
| `DESIGN_VARIANCE` | **5** | Mostly symmetrical grids, centered onboarding, standard card stacks; occasional split lobby |
| `MOTION_INTENSITY` | **5** | Curtain/dolly tokens ≤300ms, enter staggers, grain gated by reduced-motion |
| `VISUAL_DENSITY` | **5** | Discovery lobby multi-band; archive denser; capture quieter |

**Redesign mode:** **Preserve product IA + sanctuary objects; visual overhaul attempted via token swap.** That is not a full Ferrari system adoption.

---

## Verdict (one line)

**Ferrari-on-sanctuary is currently a recolor with residual gold-era theatre chrome, not a coherent luxury system: tasteful in pockets, templated in rhythm.**

**Score: 5.5 / 10**

| Band | Meaning |
|------|---------|
| 9–10 | Distinct, non-generic, brand-locked |
| 7–8 | Intentional with few tells |
| **5–6** | **Mixed: real craft + identity fracture / AI rhythm** |
| 3–4 | Mostly template |
| 1–2 | Pure slop |

Prior taste score (2026-07-21, Gilded Night): **6.5/10**.  
Post-Ferrari delta: **color voltage improved; brand coherence and type signature regressed.** Net slightly worse as a *taste system*, slightly sharper as a *palette*.

---

## Direction — What the product is trying to be

1. **Cinema Black + Rosso Corsa** — near-black canvas (`#181818`), single brand voltage red (`#da291c`), light mode as White Canvas (`#f7f7f7` / white). Theme labels match Ferrari plan (`Cinema Black` / `White Canvas`).
2. **Sanctuary product metaphor** — theatre lobby (Act I), poetic capture, hardcover archive, museum plaques, film grain.
3. **Restraint language in docs** — one hero moment, ≤300ms motion, reduced-motion grain kill, gold→primary aliases for compatibility.

Ferrari `DESIGN.md` wants: **scarce red, sharp 0px geometry, single sans at modest weights, full-bleed photography as chrome, hairlines over shadow stacks.**

Sanctuary specs still want: **editorial serif hierarchy, warm gold/parchment restraint, Criterion / literary journal type.**

Those two briefs share “cinematic dark luxury” at the mood level and **diverge hard** on type, radius, accent scarcity, and decorative density. Live code sits in the gap.

---

## What feels intentional (protect)

| Signal | Where | Why it works |
|--------|--------|--------------|
| **Poetic Capture Canvas** | `poetic-sanctuary.css`, `PoeticCaptureCanvas` | One focal writing moment, progressive disclosure, poster dim on write — product soul, not kit UI |
| **Hardcover / openable archive cards** | `HardcoverSpineCard`, library stagger | Object-like medium memory; enter motion motivated |
| **Film grain as brand, not garnish** | `FilmGrain.tsx` | Fixed overlay, reduced-motion opt-out, low opacity tokens |
| **Token-first Ferrari remap** | `tokens.css`, `shadowTokens.ts` | Rosso Corsa + canvas hexes consistent at the CSS-variable root; `--gold` aliases keep ship stable |
| **Motion discipline** | curtain 280–300ms, `ease-focus-pull`, soft-settle | Cinematic claim without multi-second theatrical hijacks |
| **Theme naming** | `themeLabels.ts` | `Cinema Black` / `White Canvas` / `System` — clear post-rebrand voice |
| **Shell alignment** | `app-nav.css`, `--app-shell-max` | Shared max-width column for nav + content — craft, not accidental |

These are the parts that still feel like **Subsume**, not “dark SaaS with a red button.”

---

## What feels like slop / template (fix)

### Identity fracture (highest severity)

The rebrand remapped **hex values** and left the **voice, micro-labels, class names, and type roles** on Gilded Night / Criterion autopilot:

- Docs still teach gold + Newsreader/Outfit (`brand.md`, large parts of `CINEMATIC_JOURNAL_DESIGN_SPEC.md`) while runtime tokens are Ferrari + **Inter for both `--font-editorial` and `--font-ui`**.
- UI still says **vault / ledger / repertoire / afterglow / Act I / House Notice / Marquee Programme** under a racing-red primary.
- Classes like `.sanctuary-btn-gold`, `--accent-gold`, `--gold-text` remain; values point at red. Users do not see names, but the **mental model of the system is still “gold sanctuary painted red.”**

Ferrari precision and literary theatre can coexist only if deliberately synthesized (e.g. sharp chrome + scarce red + one real display face). Right now it is **two unfinished brands**.

### Typography demotion

- **Inter** loaded from Google Fonts for app + popup + shadow DOM (`index.html`, `popup.html`, `shadowTokens.ts`).
- `--font-editorial` === `--font-ui` === Inter. Editorial hierarchy is simulated with **italic + size**, not a display family.
- Onboarding headline: `font-style: italic` at 42px on Inter — classic AI “serif substitute.”
- Ferrari plan accepts Inter as FerrariSans substitute, but **without weight 500 display discipline, negative tracking ladder, or CTA tracking system** from `DESIGN.md`. Result: neutral SaaS face wearing literary italics.

Loss of Newsreader/Outfit removed the most distinctive pre-rebrand signature without replacing it with Ferrari-grade type craft.

### AI production-test tells still dense

| Tell (skill §9 / §4.7) | Live evidence |
|------------------------|---------------|
| Eyebrow / mono-caps micro-labels every section | `.sanctuary-subtitle` + plaque indices on Search, Recs, Stats, Alerts, People, Home feed notices |
| Section-number / catalogue micro-meta | `Catalogue No. 03 · Historic Theatre Programme`, `Index 00`, `Registry Index 00`, `Programme index 00` |
| Middle-dot separator as default glue | Home, Stats, Settings lists, alerts, popup meta rows |
| Em-dash in user-visible copy | Onboarding body, Settings, Alerts, Stats footnotes, error strings |
| Three equal feature pillars | Onboarding Discover / Capture / Archive column |
| Ambient dual glow orbs | `.onboarding-glow-cool` + `.onboarding-glow-warm` |
| Soft glass plaques everywhere | Repeated `backdrop-filter: blur(16–20px)` on empty states, inputs, lobby chrome |
| Status rainbow chips | to-watch blue / watching amber / watched green / abandoned red — second palette fighting scarce Rosso |

Eyebrow count clearly exceeds **ceil(sections / 3)** on multi-section pages (Home, Recommendations, Settings blocks).

### Geometry vs Ferrari system

| Ferrari `DESIGN.md` | Live Subsume |
|---------------------|--------------|
| CTA/card **radius 0** (sharp) | `--radius-sm/md/lg` = 2 / 4 / 8; cards often 4–8px; shadcn `--radius: 0.5rem` |
| Scarce red on primary CTA only | Red on logo, nav active, chips, borders, monogram, platform chips, intent memory, digest AI badge… |
| Hairlines, not shadow tiers | Multi-tier poster/nav/drawer/hero/plaque shadows still present |
| Full-bleed photographic hero | Extension shell: poster cards + lobby plaque, not full-bleed cinema photography |

Radius is tighter than pre-rebrand soft gold UI, but **not Ferrari-sharp**. Shape Consistency Lock is soft-mixed (2 / 4 / 6 / 8 / 50% / 999px pills).

### Color Consistency Lock leaks

- Atmosphere presets (`sunset` / `emerald` / `french`) **reassign `--primary`** to amber / green / violet. That is a deliberate feature, but it **voids single-voltage Ferrari** whenever enabled.
- Semantic status colors remain multi-hue dashboard language on a “one brand voltage” system.
- Discovery ambient layer still has a warm radial with **gold-era fallback** `hsla(45, 60%, 50%, 0.06)` if soft token missing.

### Discovery lobby still multi-job

Home still stacks: hero plaque + Act I copy + dual optical CTAs + text links + live feed + recently inscribed + weather + picks + weekly programme. Prior audit called this **lobby density** — still true. Not pure slop layout, but not “one hero moment” either (`CINEMATIC_JOURNAL` §3.1 vs live Home).

### Copy register

Literary / performative craft voice (`Quietly` energy without the banned phrase, but same register): “picture palace,” “emotional projections from the house,” “inscribe,” “afterglow.” Mixed with operational settings prose. One register per page is violated between Home and Settings especially.

---

## Brand coherence matrix

| Layer | Claimed authority | Live state | Coherent? |
|-------|-------------------|------------|-----------|
| Palette | Ferrari / tokens.css | Rosso + #181818 largely yes | **Yes (tokens)** |
| Type | Ferrari: single sans 500; Sanctuary: Newsreader+Outfit | Inter + italic theater | **No** |
| Radius | Ferrari 0 | Soft-small mixed | **Partial** |
| Accent scarcity | Ferrari scarce red | Red multi-role + status rainbow | **No** |
| Naming | Gold aliases OK | gold classes + gold docs | **Fog** |
| Product metaphor | Sanctuary theatre | Still theatre | **Yes (product)** |
| Marketing metaphor | Automotive cinema | Not expressed in layout | **N/A / incomplete** |
| Icons | — | Material Symbols Outlined | **Generic kit** |

**Conclusion:** Token compliance ≠ taste compliance. The rebrand is **~80% palette, ~30% system, ~20% voice.**

---

## Severity-ranked findings

Severity: **P0** identity/blocker · **P1** major taste · **P2** polish · **P3** nit

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| **T01** | **P0** | **Dual brand, no synthesis** — Ferrari voltage on Gilded Night / Criterion chrome and copy | `tokens.css` vs `brand.md` / cinematic spec vs page subtitles |
| **T02** | **P1** | **Inter as editorial + UI** — loses sanctuary signature and Ferrari display craft | `--font-editorial`, `index.html` Google Fonts Inter |
| **T03** | **P1** | **Eyebrow / section-number / plaque-index overuse** | `sanctuary-subtitle`, `Catalogue No. 03`, `Index 00`, empty-state indices |
| **T04** | **P1** | **Red is not scarce** — primary used as gold was (nav, chips, borders, badges) | tokens semantic block + components |
| **T05** | **P1** | **Radius / shape system not Ferrari-locked** | 2–8px + shadcn 0.5rem vs DESIGN.md `rounded.none` |
| **T06** | **P1** | **Atmosphere presets recolor brand voltage** | `tokens.css` sunset/emerald/french |
| **T07** | **P2** | **Em-dashes + middle-dot glue** in user-facing strings | Onboarding, Settings, Home, Alerts |
| **T08** | **P2** | **Onboarding = centered manifesto + dual glows + 3 pillars** | `Onboarding.tsx` / `onboarding.css` |
| **T09** | **P2** | **Glass/blur plaque default** for empty + inputs | `sanctuary.css`, `poetic-sanctuary.css` |
| **T10** | **P2** | **Docs lag runtime** — gold palette and serif still taught | `brand.md`, README type note, cinematic spec tokens |
| **T11** | **P2** | **Discovery lobby still multi-CTA multi-band** | `Home.tsx` |
| **T12** | **P3** | **Gold class names residual** (harmless runtime, noisy system) | `.sanctuary-btn-gold`, `--gold-*` |
| **T13** | **P3** | **Material Symbols** as default icon kit | `index.html` / `popup.html` |

---

## Pre-flight style check (taste only)

Not a full code ship checklist — selected skill §14 items relevant to **this rebrand**:

| Check | Result |
|-------|--------|
| Redesign mode detected + audit | Pass (this doc) |
| Color Consistency Lock (one accent whole product) | **Fail** (status rainbow + atmosphere) |
| Shape Consistency Lock | **Fail** (mixed radii) |
| Eyebrow count ≤ ceil(n/3) | **Fail** |
| No section-number eyebrows | **Fail** |
| Zero em-dashes in UI copy | **Fail** |
| Serif discipline / no fake editorial | **Fail** (italic Inter stand-in) |
| Page Theme Lock | Pass (theme tokens; atmospheres are accent theme switches) |
| Motion motivated + reduced-motion | **Mostly pass** |
| Real product visuals (posters, not fake dashboards) | **Pass** (real media art) |
| Cards only when elevation earns hierarchy | **Partial** (many card shells remain) |

---

## Score breakdown

| Dimension | /10 | Note |
|-----------|-----|------|
| Brand / identity coherence | 4 | Two systems, token-only merge |
| Anti-slop (layout / micro-labels) | 5 | Signature objects yes; eyebrow rhythm no |
| Typography | 4 | Inter monofamily + italic theatre |
| Color / voltage discipline | 6 | Hexes good; scarcity and atmospheres weak |
| Motion / material craft | 7 | Capture, grain, curtain still strong |
| Distinctiveness vs generic dark SaaS | 6 | Still more Subsume than Linear clone |
| **Weighted overall** | **5.5** | |

---

## Direction recommendation (audit only — not implementation)

Pick **one** north star and finish it. Do not average them.

### Path A — Ferrari precision (automotive cinematic)

- Scarce Rosso on primary CTAs + focus only.
- Radius 0 (or documented 2px max) everywhere interactive.
- Inter (or better: Söhne / Geist) at **500 display / 400 body**, uppercase tracked CTAs, **no italic-as-serif**.
- Kill or quarantine atmosphere presets that recolor primary.
- Quiet lexicon: drop Act/Index/Catalogue No. theatre-meta.
- Hero moments via **poster photography**, not dual ambient glows.

### Path B — Sanctuary literary (pre-Ferrari soul, modernized)

- Keep dark canvas; choose a **non-gold** single accent if not gold (deep rose, cold silver, forest — not AI purple).
- Restore real **display + UI pair** (not Inter dual-role).
- Keep plaques/capture/spines; **thin eyebrows to 1 per 3 sections**.
- Treat Ferrari `DESIGN.md` as reference mood only, not token source.

### Path C — Explicit synthesis (hardest, best if intentional)

Name it (e.g. “Cinema Black, Rosso voltage, literary capture only in Act II”).  
Rules example:

1. Shell / nav / settings = Ferrari-sharp mono-sans, scarce red.  
2. Capture + reflection surfaces only = editorial voice (one real display face).  
3. Archive = object-driven (spines), not eyebrow-driven.

Until one path is locked, further palette tweaks will keep reading as **templated recolor**.

---

## Top 5 findings (executive)

1. **P0 — Dual brand without synthesis:** Ferrari tokens on Gilded Night/Criterion chrome and lexicon → recolor, not rebrand.  
2. **P1 — Typography collapse:** Inter for editorial + UI + italic “serif cosplay” erases both sanctuary signature and Ferrari display discipline.  
3. **P1 — Micro-label / section-number slop:** Subtitles, `Catalogue No. 03`, `Index 00`, plaque indices exceed eyebrow restraint.  
4. **P1 — Rosso not scarce + radii not locked:** Red multi-role accent and soft mixed corners fight Ferrari precision.  
5. **Protect — Capture / spines / grain / curtain:** Still the intentional product soul; do not sand these down while “fixing Ferrari.”

---

## Sources inspected (read-only)

- `src/shared/tokens.css`, `src/shared/shadowTokens.ts`, `src/shared/themeLabels.ts`
- `DESIGN.md`, `docs/superpowers/plans/2026-08-04-ferrari-design-system.md`
- `brand.md`, `CINEMATIC_JOURNAL_DESIGN_SPEC.md`, `docs/design-taste-findings-2026-07-21.md`
- `src/ui/pages/Home.tsx`, `Onboarding.tsx`, sample pages (Search, Recs, Stats, Alerts, People)
- `src/ui/styles/*` (global, onboarding, poetic-sanctuary, discovery-layout, app-nav, library)
- `src/styles/sanctuary.css` (eyebrow / plaque / gold-btn patterns)
- `src/ui/index.html`, `popup.html` (Inter + Material Symbols)

---

## Deliverable meta

| Field | Value |
|-------|--------|
| Path | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-04/08-design-taste-frontend.md` |
| Score | **5.5 / 10** |
| Stance | **Templated recolor with intentional sanctuary islands** — not yet tasteful Ferrari-on-sanctuary |
