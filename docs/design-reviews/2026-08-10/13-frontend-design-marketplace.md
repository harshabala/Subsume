# Frontend Design (marketplace skill) — Distinctive vs templated defaults

**Date:** 2026-08-10  
**Repo:** Subsume @ `a5471b5`  
**Lens:** `frontend-design` (claude-plugins-official marketplace skill)  
**Subject:** Subsume — private cinematic sanctuary for film, series, and books (Chrome extension)  
**Scope:** Aesthetic direction audit — palette, typography, signature, anti-template calibration. Review only; no code changes.  
**Sources inspected:** `src/shared/tokens.css`, `src/ui/index.html`, `src/ui/styles/global.css`, `src/ui/styles/poetic-sanctuary.css`, `src/ui/styles/app-nav.css`, `src/ui/styles/popup.css`, `src/styles/sanctuary.css`, signature components (`HardcoverSpineCard`, `FilmGrain`, poetic capture), `brand.md`, `PRODUCT.md`, `DESIGN.md`, `CINEMATIC_JOURNAL_DESIGN_SPEC.md`

---

## Score

| Axis | Score | Note |
|------|------:|------|
| **Distinctiveness** | 5/10 | Product objects (spine, capture, grain) are ownable; brand voltage + type are not |
| **Intentional choices** | 7/10 | Token ladder, motion caps, radius discipline, theme labels — engineered on purpose |
| **Anti-template** | 4/10 | Lands in skill cluster **#2**: near-black + vermilion, Inter mono-stack |
| **Subject vernacular** | 5/10 | Cinema metaphors in UX structure; automotive red in tokens |
| **Overall aesthetic direction** | **5.5 / 10** | Crafted remapping of a template pair onto a sanctuary product |

**Overall: 5.5 / 10**

### Calibration (skill, explicit)

AI-generated UI currently clusters around:

1. Warm cream (`~#F4F1EA`) + high-contrast serif + terracotta  
2. **Near-black + single bright acid-green or vermilion**  
3. Broadsheet hairlines, zero radius, dense newspaper columns  

Post-Ferrari Subsume dark identity is **cluster (2)** by construction: canvas `#181818`, primary `#da291c`, Inter for UI *and* editorial. Naming it “Rosso Corsa / Cinema Black” does not exit the cluster without proprietary type, scarce voltage, and subject-native materials.

---

## Grounding (skill: pin subject before judging)

| | |
|--|--|
| **Subject** | Private archive + capture for works that stay with you (screen + page) |
| **Audience** | Cinephiles / readers who want reflection over tracking spreadsheets |
| **Single job of the UI** | Make contemplation feel sacred; chrome recedes; reflections and artwork lead |
| **Live identity** | Cinema Black + Rosso Corsa (Ferrari-adapted tokens), Inter mono-family |
| **Spec philosophy** | Private cinematic sanctuary, Criterion/MUBI restraint, Act II editorial immersion |

A studio hired for *this* brief would spend boldness on theatre/archive vernacular (grain, plaque, hardcover object, editorial immersion face, one quiet voltage). A studio hired to clone luxury auto marketing would spend boldness on racing red + full-bleed hero. Live tokens chose the second risk for the first product.

---

## What is intentional and well executed

These are real design decisions, not accidental noise:

1. **Token-first system** — Named voltage hierarchy (`--primary` / hover / pressed / soft), semantic success/info, `--on-primary` white on red. Surfaces retheme without class wars.
2. **Tight editorial geometry** — Radius ladder 2 / 4 / 8px rejects soft SaaS squircles.
3. **Motion with product language** — Slow Dolly / Curtain Close, user-facing ≤300ms, soft settle without bounce, `prefers-reduced-motion` kills film grain.
4. **Signature product *objects* still exist** — Poetic capture (one focal point, poster dim, plaque glass), hardcover spine cards, film grain ambient, literary text-role tokens (`--text-reflection` → control).
5. **Theme naming** — Cinema Black / White Canvas beats “Dark / Light.”
6. **Trademark restraint** — No Cavallino, no FerrariSans (correct).
7. **Partial authority cleanup since earlier thrash** — `brand.md` and `PRODUCT.md` now describe Cinema Black + Rosso Corsa and Inter mono-stack, matching live tokens more closely than mid-summer Gilded Night conflict.

Execution craft is above generic extension UI. **Direction** is still the failure mode.

---

## Distinctiveness analysis

### 1. Anti-template test (skill core)

| Cluster | Live Subsume |
|---------|----------------|
| (1) Cream + serif + terracotta | Light theme `#f7f7f7` cool gray — **avoids** cream default |
| (2) Near-black + vermilion/acid | **Primary dark identity** — `#181818` + `#da291c` |
| (3) Broadsheet density | Partial risk on archive filters / settings density; not main brand |

Without FerrariSans, Cavallino geometry, and automotive photography, residual brand read is **stock dark tool + red CTA** — the default the skill warns against.

Atmosphere presets that recolor `--primary` further treat primary as a skin, not a subject-bound material: flexible engineering, weak identity thesis.

### 2. Typography (skill: “type carries personality”)

| Role | Spec / sanctuary need | Live |
|------|----------------------|------|
| Display / Act II immersion | Characterful editorial (was Newsreader) | **Inter** via `--font-editorial` |
| UI chrome | Quiet sans (Outfit / Inter) | **Inter** via `--font-ui` |
| Loaded fonts (`index.html`) | Dual pair | **Inter only** (+ Material Symbols) |

`sanctuary.css` still *routes* classes through `--font-editorial` vs `--font-ui`, but both variables resolve to the same Inter stack. That is dual-role **plumbing** with mono-family **pixels** — intentional for a Ferrari monofont clone, accidental for a dual-mode sanctuary.

Inter is the default face of the modern web. Pairing is erased. Act II immersion cannot feel literary when reflection text is the same utility sans as settings labels.

### 3. Voltage scarcity vs flood

Brand docs claim **scarce** Rosso Corsa for primary CTAs and selection. Implementation still paints red/primary through:

- Nav logo / active affordances (token: `--nav-tab-fg-active`, `--nav-logo-fg`)
- Chip active states (`poetic-sanctuary.css`, popup)
- Platform / gold-alias surfaces (`--gold` → `--primary` across people, recommendations, layout)
- Focus rings (`--ring: #da291c`)
- Selection / soft fills / borders

Scarcity is what made racing red iconic. Flood is what makes SaaS red. **Chanel test:** loud system accent kept; editorial type contrast cut.

### 4. Subject vernacular vs donor brand

| Product vernacular | In product? |
|--------------------|-------------|
| Celluloid grain, curtain, plaque, hardcover spine | Yes — components / motion |
| Warm frame / precious / lobby lamp | No in tokens (gold names alias to red) |
| Rosso Corsa / racing livery | In tokens only — not in product metaphors |
| Criterion / MUBI quiet editorial | Spec asks; type stack no longer supports serif immersion |

**Mismatch:** tokens speak Ferrari voltage; UX architecture and cinema voice still speak picture palace. Users experience “nice dark app with red buttons,” not “I entered a private theatre.”

### 5. Signature dilution (skill: one memorable risk)

Skill: spend boldness in **one** place; keep surroundings quiet.

| Candidate signature | Status |
|---------------------|--------|
| Hardcover spine + poetic capture ceremony | Still the product-native unforgettable pair |
| Film grain | Ambient, reduced-motion safe — supporting, not hero |
| Brand red on black | Competes for “the thing you remember” and loses to every dark SaaS |

True Subsume memory should be **object + ceremony**. Brand paint currently competes instead of supporting.

### 6. Semantic / emotional temperature of red

- Danger / destructive family (`#ef4444`, coral danger tokens) shares hue neighborhood with brand primary.
- Sanctuary cadence is feeling → reflection → memory; racing red reads as adrenaline / alert / stop.
- Books expansion wants ink, paper, bookmark warmth more than paddock voltage.

### 7. Documentation fracture (remaining)

| Doc | Says |
|-----|------|
| `tokens.css`, `index.html`, `brand.md`, `PRODUCT.md` | Ferrari / Cinema Black, Inter mono, Rosso Corsa |
| `CINEMATIC_JOURNAL_DESIGN_SPEC.md` | Newsreader editorial, Outfit UI, deep velvet sanctuary palette |
| `DESIGN.md` | Full Ferrari marketing analysis including FerrariSans (not shipped) |
| Class/token names | `--gold`, `.sanctuary-btn-gold`, gold soft aliases → red values |

Authority is **two-throated** on type immersion (journal vs tokens). Semi-gold vocabulary on red pixels is a semiotic muddle.

---

## What still scores as Subsume (protect)

Do not abandon these when recovering distinctiveness:

- **Poetic capture** — one focal point, poster dim, italic prompt energy, plaque glass  
- **Hardcover spine card** — archive as object, not table row  
- **Film grain** — ambient signature with reduced-motion respect  
- **Literary text-role tokens** — reflection / artwork / title / meta / control hierarchy  
- **Cinema voice** — programme, afterglow, house lights (when applied)  
- **One-hero-moment rule** — still the correct restraint doctrine  
- **Motion naming + duration cap** — rare among extensions  

Problem is not “no soul left.” Soul lives in **components and ceremony**; generic blood lives in **brand voltage and mono type**.

---

## Score rationale

**Not ≤4:** Controlled craft — no random gradient soup, no glassmorphism stack, no five display fonts. Sanctuary objects and motion show taste memory. Token hygiene is professional.

**Not ≥7:** Fails the skill’s explicit anti-template test (cluster #2); type pairing collapsed; subject vernacular displaced by automotive cosplay without proprietary type; primary flood vs claimed scarcity; journal/spec still asks for a face the app does not load. Distinctiveness remains below pre-Ferrari Gilded Night (gold + dual type) for *this* product.

Comparable internal baseline: ~6.5/10 under gold + dual type (design-taste findings); post-Ferrari aesthetic direction stays a **half-step back on identity**, **half-step forward on token discipline** — unchanged at **5.5/10** on this re-audit.

---

## Top 3 fixes (ranked for distinctiveness recovery)

### 1. Re-pair type for the product, not the donor brand
Keep a quiet UI sans (Inter is fine for chrome). Restore a **characterful editorial face** for reflections, empty states, poetic capture, and Act II headings (Newsreader or a more ownable alternative). Load it in `index.html` / popup shell; point `--font-editorial` only. Ferrari mono-family was the wrong constraint for a dual-mode sanctuary.

### 2. Pick voltage from the theatre, not the paddock
Either: (a) return to a warm precious accent (gilded / amber / copper) used **scarcely**, or (b) invent a third option tied to celluloid/print (projection-beam cyan, warm tungsten, ink black + single paper cream band) — justified by *cinema/archive materials*, not F1.  
If red stays: **ration brutally** — primary CTAs only; demote nav active, chips, platforms, and gold-alias surfaces to neutral or soft; separate brand hue from danger family.

### 3. Declare one signature; quiet everything else
Lock **hardcover spine + poetic capture ceremony** as the unforgettable pair; grain stays optional ambient. Brand color supports them, never competes. Collapse remaining doc conflict: journal immersion type and tokens must match; retire or archive contradictory gold-name / FerrariSans claims so agents stop thrashing.

---

## Dimension checklist (skill process)

| Step | Assessment |
|------|------------|
| Grounded in subject | Product subject clear; Ferrari donor not grounded in subject |
| Hero as thesis | Product heroes exist (capture/poster); brand thesis is “red on black” |
| Typography carries personality | **Regressed** — Inter dual-role is template utility |
| Structure is information | Archive/intent structure still product-real |
| Motion deliberate | Strong relative to most extensions |
| Complexity matches vision | Vision is quiet sanctuary; red system is louder than vision |
| Restraint / one signature | Spec says yes; token flood says no |
| Anti-AI-default | **Fails cluster #2** |

---

## Top findings (summary)

1. **Anti-template fail:** Live identity is AI cluster #2 (near-black + vermilion), justified by a donor brand without its proprietary type.  
2. **Typography regression:** Dual editorial/UI pairing collapsed to Inter-only; Act II immersion loses material voice.  
3. **Subject / brand mismatch:** Automotive Rosso Corsa fights private-theatre emotional register and collides with danger reds; true signatures (spine, capture, grain) remain in UX while brand paint is generic and over-applied.

---

## Closing

Ferrari remains a **clean industrial remapping** of a luxury marketing system onto Subsume’s token layer. As engineering, it is competent. As **frontend-design aesthetic direction** for a private cinematic sanctuary, it is still a **template-shaped wrong risk**: boldness spent on a default dark+red pair, paid for by stripping the type contrast that made Subsume non-generic.

**Score: 5.5 / 10** — intentional token craft, insufficient product-specific distinctiveness, fails anti-template calibration.

---

*Skill: marketplace `frontend-design` · Review only · No code changes in this pass.*
