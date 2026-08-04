# Frontend Design (marketplace skill) — Aesthetic direction after Ferrari

**Date:** 2026-08-04  
**Lens:** `frontend-design` (claude-plugins-official marketplace)  
**Subject:** Subsume — private cinematic sanctuary for film, series, and books (Chrome extension)  
**Scope:** Post–Ferrari design-system remapping (Rosso Corsa on Cinema Black), not a full page build  
**Sources of truth inspected:** `src/shared/tokens.css`, `src/ui/index.html`, `src/ui/styles/global.css`, `src/ui/styles/poetic-sanctuary.css`, `docs/superpowers/plans/2026-08-04-ferrari-design-system.md`, `DESIGN.md`, `CINEMATIC_JOURNAL_DESIGN_SPEC.md`, `brand.md`, `docs/CINEMA_VOICE.md`, signature UI (`HardcoverSpineCard`, `FilmGrain`, poetic capture)

---

## Score

| Axis | Score | Note |
|------|------:|------|
| **Distinctiveness** | 5/10 | Palette is legible; type and vernacular no longer product-native |
| **Intentional choices** | 7/10 | Token-first remap is disciplined; Ferrari brief is coherent as *engineering* |
| **Anti-template** | 4/10 | Lands squarely in AI default cluster #2 (near-black + vermilion) |
| **Overall aesthetic direction** | **5.5 / 10** | Crafted remapping of the wrong signature for this subject |

**Overall: 5.5 / 10**

Calibration (skill): AI-generated design currently clusters around (1) warm cream + serif + terracotta, (2) **near-black + acid-green or vermilion**, (3) broadsheet hairlines. Cluster (2) is exactly the post-Ferrari default canvas + primary. A hired studio would only keep that pair if the *subject* demanded it — racing marque, emergency ops, blood-and-ink editorial — not a quiet theatre of memory.

---

## Grounding (what the product is)

| | |
|--|--|
| **Subject** | Private archive + capture for works that stay with you (screen + page) |
| **Audience** | Cinephiles / readers who want reflection over tracking spreadsheets |
| **Job of the UI** | Make contemplation feel sacred; chrome recedes; reflections and artwork lead |
| **Prior identity** | Gilded Night — warm gold voltage, Outfit + Newsreader, museum plaque, hardcover spine |
| **Ferrari move** | Remap gold → Rosso Corsa `#da291c`, canvas → `#181818`, single-family Inter, tighter radii |

The product’s own philosophy still says *private cinematic sanctuary*, Criterion/MUBI restraint, Act II immersion with editorial serif, one hero moment. The Ferrari system was borrowed from automotive marketing (full-bleed car hero, racing red, FerrariSans mono-family). Those worlds only overlap on “dark luxury.” They diverge on emotional temperature: sanctuary wants afterglow; Ferrari wants voltage.

---

## What was done well (intentional craft)

1. **Token-first remap** — Variable names preserved (`--primary`, `--gold` aliases); surfaces can retheme without a class rename war. Engineering hygiene is strong.
2. **Named voltage with hierarchy** — Primary / hover / pressed / soft, success `#03904a`, info `#4c98b9`, on-primary white (correct for red). Not a random hex dump.
3. **Tighter geometry** — Radius ladder 2 / 4 / 8px moves away from soft SaaS “squircle everything” toward sharper editorial chrome.
4. **Legal / trademark restraint** — Plan explicitly forbids Cavallino and FerrariSans; good product hygiene.
5. **Signature product objects still exist in structure** — Poetic capture curtain, hardcover spine cards, film grain (with reduced-motion opt-out), plaque glass, literary text roles as *tokens* — the *system* of sanctuary UX was not deleted, only recolored.
6. **Motion discipline** — Cinematic naming (Slow Dolly, Curtain Close, soft settle) with user-facing caps ≤300ms still matches a careful product, not bounce-fest AI motion.
7. **Theme labels** — Cinema Black / White Canvas is better product language than “Dark / Light” alone.

These are intentional. They are not enough to make the *direction* distinctive for Subsume.

---

## Critique against skill principles

### 1. Distinctiveness — “could not be mistaken for anyone else’s”

**Before Ferrari:** Gold-on-near-black with a **serif editorial face** for reflections was a clear thesis: gilded frame, theatre lobby, literary journal. Wrong for some products; right for this one.

**After Ferrari:**

- Canvas `#181818` + accent `#da291c` is the most common “premium dark tool” recipe in AI UI output and startup dashboards.
- **Inter for both UI and editorial** erases the display/body pairing the skill treats as personality-carrying. Inter is the default face of the modern web. FerrariSans is proprietary character; substituting Inter keeps the *name* of mono-family luxury and loses the *feel*.
- Class/token vocabulary still says “gold” (`--gold`, `--badge-on-gold-fg`, gold soft bg aliases) while pixels say racing red — a semiotic muddle that undercuts intentional brand.

**Verdict:** Distinctiveness declined. Recolor ≠ re-identity. The remappable shell now looks like many products; the sanctuary *behaviors* are what still feel Subsume.

### 2. Intentional choices — palette, type, layout, signature

| Layer | Ferrari claim | Skill / product test | Result |
|-------|---------------|----------------------|--------|
| **Color** | Rosso Corsa scarce voltage | Primary floods nav active, chips, platforms, selection, onboarding CTA, intent-memory | Voltage is **systematic**, not scarce — closer to “brand red everywhere” than Cavallino restraint |
| **Type** | Single family like FerrariSans | Product needs characterful display *and* editorial immersion face | **Failed subject** — Inter mono-stack is intentional for Ferrari clone, accidental for sanctuary |
| **Layout** | Full-bleed cinematic hero | Extension shell is dense chrome (nav, archive filters, discovery lobby) | Marketing hero language not native to popup/app IA; real heroes are poster blur + plaque |
| **Signature** | Racing red on black | Skill: one memorable signature, rest quiet | Product’s true signatures (spine, capture canvas, grain) compete with a **generic accent** |

**Chanel test:** The remap added a loud accessory (vermilion system) while removing the accessory that mattered (serif immersion). Wrong accessory kept; right one cut.

### 3. Anti-template — three AI clusters

| Cluster | Post-Ferrari Subsume |
|---------|----------------------|
| (1) Cream + serif + terracotta | Light theme is cool gray `#f7f7f7` (avoids cream default) — good |
| (2) Near-black + vermilion/acid | **Primary dark identity is this cluster** |
| (3) Broadsheet hairline density | Partial risk on archive filters / data pages; not the main identity |

The Ferrari plan *named* the look after a luxury brand to justify cluster (2). Naming a template does not un-template it. Without FerrariSans, Cavallino geometry, and full-bleed automotive photography, the residual is **stock dark + red CTA**.

Atmosphere presets (sunset / emerald / french) that recolor `--primary` further admit primary is a skin, not a subject-bound material — flexible, but not a strong identity thesis.

### 4. Subject vernacular (where distinctive choices should come from)

Skill: *materials, instruments, artifacts of the subject’s world.*

| Product vernacular | Present after Ferrari? |
|--------------------|------------------------|
| Celluloid, grain, curtain, plaque, hardcover spine | Yes (components / motion / voice docs) |
| Warm gold / frame / lobby lamp | **Removed** from tokens |
| Rosso Corsa / racing livery / automotive hero | **Imported** into tokens, not into product metaphors |
| Criterion / MUBI quiet editorial | Spec still asks; type stack no longer supports serif Act II |

Mismatch: **token system now speaks Ferrari; product copy and architecture still speak picture palace.** Users feel that as “nice dark app with red buttons,” not “I entered a private theatre.”

### 5. Semantic & emotional risk of red as primary

- **Danger collision:** Error, abandoned status, destructive actions already live in reds (`#ef4444`, `#f87171`, `#f13a2c` warning in DESIGN.md). Selection, memory intent, and “save” voltage share the same hue family as failure.
- **Emotional temperature:** Sanctuary cadence is feeling → reflection → memory. Racing red is adrenaline and alert. Gold read as *precious / chosen*; red reads as *urgent / brand / stop*.
- **Books expansion:** Literary archive + red primary is a harder story than gilded bookmark / ink / parchment accents.

### 6. Documentation fracture (undermines intentional identity)

| Doc | Still says |
|-----|------------|
| `brand.md` | Gilded Night, Outfit + Newsreader, gold sparingly |
| `PRODUCT.md` | Gilded Night / gold accent |
| `CINEMATIC_JOURNAL_DESIGN_SPEC.md` | Newsreader editorial, Outfit UI, deep velvet |
| `tokens.css` + `index.html` | Ferrari / Cinema Black, Inter only |
| `DESIGN.md` | FerrariSans, full Ferrari marketing analysis |

Multiple authorities = agents and humans will reintroduce gold or serif or racing language inconsistently. Intentional systems are single-throated.

### 7. What still scores as *Subsume* (do not abandon)

These are the anti-template assets that survive Ferrari paint:

- **Poetic capture** — one focal point, poster dim, italic prompt energy (even if italic is now Inter, not Newsreader)
- **Hardcover spine card** — archive as object, not table row
- **Film grain** — ambient signature with reduced-motion respect
- **Literary text role tokens** — reflection / artwork / title / meta / control hierarchy
- **Cinema voice** — programme, afterglow, house lights (when applied)
- **One-hero-moment rule** (spec) — still the right restraint doctrine

The direction problem is not “no soul left”; it is **soul in components, generic blood in the brand voltage**.

---

## Score rationale (why 5.5, not lower or higher)

**Not ≤4:** Execution is controlled; not random gradients, not glassmorphism stack, not Inter *plus* five display fonts. Motion and sanctuary objects show taste memory.

**Not ≥7:** Fails the skill’s explicit anti-template test; type pairing collapsed; subject vernacular replaced by automotive cosplay without proprietary type; red/danger ambiguity; docs out of sync. Distinctiveness is below pre-Ferrari Gilded Night for *this* product.

Comparable prior internal lens (2026-07-21 design-taste ~6.5/10 under gold + dual type). Post-Ferrari aesthetic direction is a **half-step back on identity**, a **half-step forward on token discipline**.

---

## Recommendations (direction only — not implementation scope of this review)

Ranked for distinctiveness recovery while keeping token discipline:

1. **Re-pair type for the product, not the donor brand**  
   Keep a quiet UI sans (Inter is fine for chrome) but restore a **characterful editorial face** for reflections, empty states, and Act II headings (Newsreader or a more ownable alternative). Ferrari mono-family was the wrong constraint for a dual-mode sanctuary.

2. **Pick voltage from the theatre, not the paddock**  
   Either: (a) return to a warm precious accent (gilded / amber / copper) with scarce use, or (b) invent a third option tied to celluloid/print (e.g. deep cyan projection beam, warm tungsten, ink black + single paper cream band) — anything justified by *cinema/archive materials*, not F1.

3. **If red stays, ration it brutally**  
   Primary CTAs only; never nav-active + chips + platform + selection + intent-memory all at once. Split “semantic danger” further from “brand.” Scarcity is what made Rosso Corsa iconic; flood is what makes SaaS red.

4. **One signature element, declared**  
   Skill: spend boldness in one place. Candidate: **hardcover spine + poetic capture ceremony** as the unforgettable pair; grain optional ambient. Brand color should support them, not compete.

5. **Collapse design authority**  
   Single living brief: tokens + short identity page that match. Retire or archive conflicting Gilded Night / FerrariSans claims so agents stop thrashing.

6. **Light theme as parchment, not neutral gray SaaS**  
   White Canvas `#f7f7f7` avoids cream-template (1) but also abandons “warm paper archive.” A slight warm gray or paper tone *with* cool dark sanctuary would encode medium (screen vs page) better than pure neutral.

---

## Dimension checklist (skill process)

| Step | Assessment |
|------|------------|
| Grounded in subject | Product subject clear; Ferrari donor brand not grounded in subject |
| Hero as thesis | Product heroes exist; brand thesis now “red on black,” not “what stayed with you” |
| Typography carries personality | **Regressed** — Inter dual-role is template utility |
| Structure is information | Archive/intent structure still product-real; numbered SaaS markers not the main issue |
| Motion deliberate | Strong relative to most extensions |
| Complexity matches vision | Vision is quiet sanctuary; red system is louder than vision |
| Restraint / one signature | Spec says yes; token flood says no |
| Anti-AI-default | **Fails cluster #2** |

---

## Top findings (summary)

1. **Anti-template fail:** Post-Ferrari identity is AI cluster #2 (near-black + vermilion), justified by a donor brand without its proprietary type.  
2. **Typography regression:** Dual editorial/UI pairing (sanctuary soul) collapsed to Inter-only; Act II immersion loses material voice.  
3. **Subject / brand mismatch:** Automotive Rosso Corsa voltage fights private-theatre emotional register and collides with danger reds.  
4. **Signature diluted:** True Subsume signatures (spine, capture, grain, plaque) remain in UX; brand paint is generic and over-applied.  
5. **Authority drift:** `brand.md` / journal spec / PRODUCT still Gilded Night + serif while tokens + HTML are Ferrari + Inter — intentional systems cannot have three throats.

---

## Closing

Ferrari was a **clean industrial remapping** of a luxury marketing system onto Subsume’s token layer. As engineering, it is competent. As **frontend-design aesthetic direction** for a private cinematic sanctuary, it is a **template-shaped wrong risk**: it spent boldness on a default dark+red pair and paid for it by stripping the type contrast that made Subsume non-generic.

**Score: 5.5 / 10** — intentional token craft, insufficient product-specific distinctiveness, fails anti-template calibration.

---

*Skill: marketplace `frontend-design` · Review only · No code changes in this pass.*
