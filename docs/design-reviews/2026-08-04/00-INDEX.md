# Subsume multi-skill design review — 2026-08-04

**Subject:** Subsume after Ferrari token remap (Rosso Corsa `#da291c` / Cinema Black `#181818` / Inter)  
**Method:** 16 parallel specialized review agents, one skill each  
**Loadable build:** `~/Desktop/Subsume-dev`

## Scoreboard

| # | Skill | Score | File |
|---|--------|------:|------|
| 01 | Impeccable | **6.4** | [01-impeccable.md](./01-impeccable.md) |
| 02 | Apple Design | **6.7** | [02-apple-design.md](./02-apple-design.md) |
| 03 | Emil Kowalski | **6.2** | [03-emil-kowalski.md](./03-emil-kowalski.md) |
| 04 | Frontend design guidelines | **6.7** | [04-frontend-design-guidelines.md](./04-frontend-design-guidelines.md) |
| 05 | Motion design principles | **7.6** | [05-design-motion-principles.md](./05-design-motion-principles.md) |
| 06 | High-end visual design | **5.5** | [06-high-end-visual-design.md](./06-high-end-visual-design.md) |
| 07 | Userinterface wiki | **7.5** | [07-userinterface-wiki.md](./07-userinterface-wiki.md) |
| 08 | Design taste (anti-slop) | **5.5** | [08-design-taste-frontend.md](./08-design-taste-frontend.md) |
| 09 | Brand design | **6.5** | [09-brand-design.md](./09-brand-design.md) |
| 10 | Product review | **7.4** | [10-product-review.md](./10-product-review.md) |
| 11 | Find animation opportunities | **7.0** alive | [11-find-animation-opportunities.md](./11-find-animation-opportunities.md) |
| 12 | Improve animations plan | **6.5** | [12-improve-animations.md](./12-improve-animations.md) |
| 13 | Frontend-design (marketplace) | **5.5** | [13-frontend-design-marketplace.md](./13-frontend-design-marketplace.md) |
| 14 | Redesign existing projects | **6.8** | [14-redesign-existing-projects.md](./14-redesign-existing-projects.md) |
| 15 | Design-is (Dieter Rams) | **16/30** → **REDESIGN** | [15-design-is-rams.md](./15-design-is-rams.md) |
| 16 | Ferrari DESIGN.md compliance | **~58% / 5.8** | [16-ferrari-design-md-compliance.md](./16-ferrari-design-md-compliance.md) |

**Mean craft scores (where /10):** ≈ **6.5 / 10**  
**Strongest:** motion principles, UI wiki hygiene, product value  
**Weakest:** luxury bar, anti-slop / marketplace distinctiveness, DESIGN.md fidelity

## Consensus themes (cross-skill)

### P0 — Fix first (repeated by ≥4 reviews)

1. **Translucent primary CTAs** — Many “primary” fills use `--border-hero` (~45% red) instead of solid `#da291c` (`sanctuary-btn-gold`, settings gold, poetic save, inscribe). White-on-pale-red contrast risk on light.
2. **Residual gold chroma** — Live tokens are red, but `hsla(45, …)` / warm gold still appears in Search chips, discovery-search, book overlay, emotional ceremony, Search.tsx.
3. **Brand docs drift** — `brand.md`, `PRODUCT.md`, README/journal specs still Gilded Night + Newsreader/Outfit while runtime is Ferrari + Inter.
4. **Dual identity, no synthesis** — Racing-red “Ferrari” paint on a literary sanctuary product without a chosen north star (precision luxury vs private theatre).

### P1 — High leverage polish

5. **Kill `transition: all`** on popup, people, nav, onboarding, discovery, plaque CTAs.
6. **Dock expand hard DOM swap** — no enter/exit vs sanctuary modals (`dock.ts`).
7. **Asymmetric modal exit** — longer + ease-in vs enter; DetailModal / poetic.
8. **No `@media (hover: hover)`** — sticky hover lifts on touch.
9. **Weak focus rings** — several `outline: none` without visible `:focus-visible` replacements.
10. **DESIGN.md geometry not shipped** — sharp 0 radius CTAs, 8px spacing ladder through 128px, scarce red, uppercase button type.

### Protect (do not sand down)

- Poetic capture / hardcover spines / film grain / curtain ceremony  
- Motion token ceiling ≤300ms + broad reduced-motion  
- Shell gutter alignment, drawer focus trap  
- Real button semantics in many places  

## Recommended product decision

Pick **one** direction before more token churn:

| Option | Meaning |
|--------|---------|
| **A. Synthesize** | Keep sanctuary soul; Ferrari only as scarce voltage + dark canvas (adapt DESIGN.md) |
| **B. Full Ferrari** | Sharp geometry, display ladder, scarce red, editorial spacing (compliance path) |
| **C. Revert hybrid** | Restore dual-type literary journal; drop racing-red as brand (amber/gold or monochrome) |

Rams audit recommends **REDESIGN** (re-author brand system), not another partial recolor.

## Suggested fix waves

1. **Brand hygiene (1–2 days)** — Solid primary CTAs; purge gold hex/hsla; rewrite brand.md/PRODUCT.md; name policy for semantic vs brand red.
2. **Motion hygiene (1–2 days)** — `transition` props only; hover media query; dock + dossier enter/exit; modal exit ease.
3. **Type + identity (3–5 days)** — Restore editorial/UI pairing *or* commit to monofont with real display scale; icon set; radius/spacing alignment to chosen DESIGN.md.
4. **Product activation** — Guided first capture after onboarding; empty archive how-to.

## How to read

Start with this index → pick the skill closest to your question → open that file for file:line evidence. Full corpus ≈ 5k lines under this folder.
