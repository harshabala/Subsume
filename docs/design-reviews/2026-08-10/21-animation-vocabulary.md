# Animation Vocabulary — Subsume Motion Naming Audit

**Date:** 2026-08-10  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Skill:** `animation-vocabulary` (map motions to named terms; flag misnamed / wrong-feel)  
**Scope:** Tokens, CSS keyframes/classes, design-spec brand lexicon, JS ceremony flags  
**Mode:** Read-only review → write this doc only  

**Motion naming / intent clarity score: 6.0 / 10**

---

## Score rationale

| Strengths | Gaps |
| --- | --- |
| Brand lexicon exists in `CINEMATIC_JOURNAL_DESIGN_SPEC.md` §5: **Slow Dolly**, **Focus Pull**, **Curtain Close** | Spec names ≠ token names ≠ keyframe names (three parallel vocabularies) |
| Comments on sanctuary/poetic modals correctly label enter/exit intent | `--duration-curtain` powers **Slow Dolly enter**; “curtain” only fits exit metaphorically |
| Duration ladder + no-bounce soft-settle are documented in `tokens.css` | `--ease-focus-pull` used for almost all ceremony enters — not Focus Pull |
| Stagger via `--feed-index` / suggestion index is clear and capped | `popupSlide` is scale+fade, not slide; `plaque-reveal` is width accordion, not reveal |
| Press scale 0.97–0.98 matches **Press / Tap feedback** | `aura-save-settle` overshoots (mild **Bounce**) while brand forbids bounce |
| True **Crossfade** naming on recommendations phase is honest (opacity-only) | Skeleton named “pulse” (opacity loop) rather than **Skeleton / Shimmer** sheen |

**6.0/10** — intentional cinematic language at the product layer, but implementers meet generic/misleading CSS names that drift from both the brand terms and the standard animation glossary. Intent is clearer in comments than in identifiers.

---

## Canonical glossary (skill terms used below)

Only terms from the animation-vocabulary glossary are used as “correct” names. Brand terms (Slow Dolly, etc.) are product dialect and must map *onto* glossary terms.

| Brand / local name | Closest glossary term(s) | Feel |
| --- | --- | --- |
| Slow Dolly | **Scale in** + **Fade in** + slight **Translate** (Y) | Cinematic enter from slightly small + below |
| Curtain Close | **Exit** (reverse enter): **Fade out** + reverse scale/translate | Not a literal curtain; no clip-path wipe |
| Focus Pull | **Blur** (+ opacity dim) on non-focal chrome | Cinema DOF metaphor; not an easing curve |
| Soft settle | Custom **Easing** / multi-stop **linear()** | Decelerating, no oscillation (when used without overshoot) |
| Save ceremony | One-shot **orchestration** of settle + gold line | Rare delight budget |
| Gold line | **Scale** on X (line grow) ≈ thin **Reveal** | Underline sweeps left→right then fades |
| Feed / library card in | **Stagger** of **Slide in** + **Fade in** | Cascade, first 6 only |
| Press scale | **Press / Tap feedback** | Physical press |
| Hover lift | **Hover effect** (`translateY`) | Micro lift |
| Drawer open | **Slide in** (X) + backdrop **Fade in** | Standard sheet |
| Accordion panels | **Accordion / Collapse** | Height expand |
| Skeleton pulse | **Pulse** / weak **Skeleton** (no sheen) | Loading ambient |
| Empty projector beam | **Reveal** via **Clip-path** | Circle expand then fade |
| Empty projector frame | **Reveal** via **Clip-path** inset | Iris open |
| Recommendations phase | **Fade in** (named crossfade; half of **Crossfade**) | Soft content swap |

---

## Vocabulary map — current effects

### Tokens (`src/shared/tokens.css`, partial parity in `shadowTokens.ts`)

| Identifier | Role in code | Glossary mapping | Naming quality |
| --- | --- | --- | --- |
| `--duration-instant` (100ms) | Micro | **Duration** | Clear |
| `--duration-fast` (130ms) | Chrome / press | **Duration** | Clear |
| `--duration-normal` (220ms) | Default UI | **Duration** | Clear |
| `--duration-slow` (260ms) | Drawer / slower UI | **Duration** | Clear |
| `--duration-curtain` (280ms) | Modal **enter** (comment: Slow Dolly) | **Duration** for scale+fade enter | **Mismatch** — says curtain, means dolly enter |
| `--duration-curtain-close` (220ms) | Modal **exit** | **Duration** for reverse enter | OK-ish as product dialect; not literal curtain |
| `--duration-soft-settle` (280ms) | Save / aura | **Duration** | Clear |
| `--ease-out` | Default UI decelerate | **Ease-out** / custom **Cubic-bezier** | Clear |
| `--ease-focus-pull` | Modal enter, feed stagger, card hover, borders… | Generic **Ease-out**-family curve | **Mismatch** — Focus Pull is a blur effect, not this ease |
| `--ease-soft-settle` | Aura + gold line | Custom **Easing** (no bounce) | Clear when overshoot avoided |
| `--transition-fast` / `--transition-base` | Compound shorthand | **Duration** + **Easing** | Clear; base uses weak `ease` |

### Brand lexicon (spec §5)

| Spec term | Spec claim | Shipped reality | Glossary truth |
| --- | --- | --- | --- |
| **The Slow Dolly** | 450ms opacity + 4px up drift | 280ms opacity + `scale(0.96)` + `translateY(8px)`; token `--duration-curtain` | **Scale in** + **Fade in** + **Translate** — not camera dolly; duration drift vs spec |
| **The Focus Pull** | Blur poster/meta when typing reflection | Implemented as `.poetic-poster.writing` / `.staging-one-focal-point` (blur + dim + slight scale). Class `focus-pull-active` on Home is a no-op shell | **Blur** feedback — correct intent, weak naming in CSS hooks |
| **The Curtain Close** | Quiet 300ms fade out, no snap | Reverse of enter: scale 1→0.96 + Y + fade; 220ms; same ease as enter | **Exit** / reverse **Scale in** — “curtain” implies **Reveal**/clip wipe that is not present |

### Keyframes & named animations

| Name | Location | Actual motion | Glossary | Name fit |
| --- | --- | --- | --- | --- |
| `sanctuary-modal-enter` / `poetic-modal-enter` | sanctuary / poetic CSS | opacity 0→1, scale 0.96→1, Y 8→0 | **Scale in** + **Fade in** + **Slide in** (partial) | Generic OK; brand “Slow Dolly” only in comments |
| `sanctuary-modal-exit` / `poetic-modal-exit` | same | reverse enter | **Exit** | OK; brand “Curtain Close” only in comments |
| `*-backdrop-enter/exit` | same | opacity only | **Fade in / Fade out** | Clear |
| `popupSlide` | `popup.css` | opacity + Y + **scale 0.98→1** | **Scale in** + **Fade in** + slight **Translate** | **Misnamed** — not **Slide in** alone |
| `popup-suggestion-enter` | `popup.css` | opacity + Y 6px, delayed by index | **Stagger** + **Slide in** + **Fade in** | Good |
| `libraryCardIn` / `discoveryFeedIn` | library / discovery CSS | opacity + Y 8px, `--feed-index` delay | **Stagger** + **Slide in** + **Fade in** | Good (mechanical names) |
| `home-digest-enter` | discovery-layout | same family as feed enter | **Fade in** + **Translate** | OK |
| `fadeInSanctuary` | poetic-sanctuary | opacity + Y 10px | **Fade in** + **Slide in** | Name undersells translate |
| `inline-notice-enter/exit` | inline-notice.css | opacity + Y ±6px | **Slide in/out** + **Fade** | Clear |
| `alerts-form-enter/exit` | settings.css | opacity + Y | **Slide in/out** + **Fade** | Clear |
| `recommendations-crossfade-in` | recommendations.css | opacity 0→1 only | **Fade in** (half **Crossfade**) | Slight overclaim — no outgoing layer |
| `subsume-pulse` / `poetic-pulse` / `subsume-skeleton-pulse` | recs / poetic / layout / hoverCard | opacity or scale loop | **Pulse**; loading **Skeleton** | Pulse OK; skeleton lacks **Shimmer** sheen |
| `aura-save-settle` | emotional-components.css | scale 0.985 → **1.015** → 1 + opacity | Mild **Bounce** / overshoot settle | Conflicts brand “no bounce”; name says settle |
| `save-ceremony-gold-line` | emotional-components.css | `scaleX(0→1)` + fade out | **Scale** reveal / line grow | Good descriptive name |
| `empty-projector-in` | emotional-components.css | opacity + Y | **Fade in** + **Slide in** | OK |
| `empty-projector-beam` | same | circle **clip-path** expand + fade | **Reveal** (clip-path) | Product name strong; glossary = Reveal |
| `empty-projector-frame` | same | inset **clip-path** open | **Reveal** | Same |
| `onboarding-step-enter` | onboarding.css | opacity + Y | **Fade in** + **Slide in** | Clear |
| `sanctuary-notice-enter` | sanctuary-shared.css | (notice enter) | **Enter** | OK |
| `modal-enter` (legacy) | global.css | translateY-only (no scale) | **Slide in** + **Fade** | Dual system vs Slow Dolly pair |
| `fadeInBackdrop` / `fadeOutBackdrop` | sidebar.css | opacity | **Fade in / out** | Clear |
| `subsume-ui-spin` | layout.css | rotate infinite | **Loop** (spinner; **Linear** OK) | Clear |

### Classes / JS flags (not keyframes)

| Name | Location | Actual motion | Glossary | Name fit |
| --- | --- | --- | --- | --- |
| `.plaque-reveal` | `overlay.ts` | `max-width` 0→120 + opacity | **Accordion**-like width + **Fade**; not clip **Reveal** | **Misnamed** + wrong-feel (layout thrash) |
| `.dock-enter` / `.dock-enter-active` | `dock.ts` | opacity + translateY | **Slide in** + **Fade in** | Clear |
| `.save-ceremony` / `SAVE_CEREMONY_MS` | DetailModal, PoeticCapture, Aura | orchestrates aura + gold line | **Orchestration** | Strong product name |
| `.staging-one-focal-point` / `.poetic-poster.writing` | poetic CSS | blur + dim poster | **Focus Pull** / **Blur** | Intent clear; not named Focus Pull |
| `.focus-pull-active` | Home + layout CSS | empty positioning hook | — | **Dead / misleading name** |
| `.discovery-catalogue-pulse` | discovery-layout | static compact stats row (no loop) | None | **Misnamed** — not **Pulse** |
| `:active { scale(0.97–0.98) }` | sanctuary chrome | scale down | **Press / Tap feedback** | Correct feel |
| Card/plaque `:hover { translateY(-Npx) }` | library, sanctuary, overlays | lift | **Hover effect** | Clear |
| Side drawer `.open` / `.closing` | sidebar.css | translateX + opacity | **Slide in/out** | Clear |
| Reflection expand (`max-height` / `grid-template-rows`) | sanctuary.css | height bridge | **Accordion / Collapse** | Unnamed in code |
| Feed stagger `--feed-index` | cards | delay cascade | **Stagger** | Clear variable intent |

---

## Mismatches (wrong name or wrong feel)

Ordered by confusion risk for designers/agents implementing motion.

| # | Severity | Local name | What it actually is | Why it matters |
| --- | --- | --- | --- | --- |
| 1 | **HIGH** | `--duration-curtain` for modal **enter** | **Slow Dolly** = **Scale in** + **Fade in** + **Translate** | Agents/tools extend “curtain” for enters; product dialect and token dialect disagree |
| 2 | **HIGH** | **Curtain Close** (comments/spec) | Reverse **Scale in** / **Exit**, not clip-path **Reveal** | “Curtain” implies wipe/mask; shipped motion is reverse dolly — wrong mental model when tuning |
| 3 | **HIGH** | `--ease-focus-pull` on almost all ceremony motion | Generic strong **ease-out** curve | Focus Pull is **Blur** on writing; ease token steals the name and dilutes the real effect |
| 4 | **MEDIUM** | `popupSlide` | **Scale in** + fade + slight Y | High-frequency popup; “slide” invites longer travel / direction-aware work that would feel wrong |
| 5 | **MEDIUM** | `.plaque-reveal` | Width **Accordion** + fade | **Reveal** should be opacity/transform/clip; name excuses layout animation |
| 6 | **MEDIUM** | Spec Slow Dolly **450ms** vs token **280ms** | Duration ladder | Spec and tokens tell two stories; naming without a single source of truth |
| 7 | **MEDIUM** | `aura-save-settle` scale overshoot to 1.015 | Mild **Bounce** | Brand forbids bounce; “settle” + soft-settle curve conflict with keyframe shape |
| 8 | **MEDIUM** | `recommendations-crossfade-in` | Single-layer **Fade in** | True **Crossfade** needs simultaneous out+in |
| 9 | **LOW** | `.focus-pull-active` on Home | No blur pull | Dead class reads as implemented Focus Pull |
| 10 | **LOW** | `.discovery-catalogue-pulse` | Static layout block | “Pulse” implies **Idle animation** / ambient loop |
| 11 | **LOW** | Skeleton `*-pulse` | Opacity **Pulse**, not **Shimmer** | Fine for loading; don’t call it shimmer in docs |
| 12 | **LOW** | Dual modal systems (`modal-enter` vs Slow Dolly pair) | Different enter recipes | Same product concept, two names and two feels |

### Correctly named / good intent (protect)

- **Stagger** via `--feed-index` / `--suggestion-index` (capped, PRM-safe)  
- **Press / Tap feedback** scale band 0.97–0.98  
- Drawer **Slide in** + backdrop **Fade** naming  
- `save-ceremony` product term + gold line keyframe name  
- Empty projector clip-path pair (product names map cleanly to **Reveal**)  
- Explicit enter/exit pairs on DetailModal / PoeticCapture (lifecycle matches **Enter / Exit**)  
- Brand ban on continuous **Pulse** on primary chrome (loading pulse exception is coherent)

---

## Intent clarity checklist

| Question | Verdict |
| --- | --- |
| Can a new contributor pick the brand verb for modal open/close from token names alone? | **No** — must read comments/spec |
| Do keyframe names encode glossary verbs (fade, scale, stagger, reveal)? | **Partially** — many are `*-enter` only |
| Is Focus Pull discoverable as an effect vs an ease? | **No** — ease owns the name; effect is `writing` / `staging-one-focal-point` |
| Are high-frequency motions named for restraint? | **Weak** — popup still `popupSlide` 300ms scale ceremony |
| Does “soft settle” always mean no overshoot? | **No** — aura keyframe overshoots |

---

## Top fixes

### 1. One motion dictionary: brand term → glossary term → token → keyframe

Add a short table to `tokens.css` (or a single `MOTION.md` only if product already wants docs) and **align identifiers**:

| Brand | Glossary | Token (proposed) | Keyframe pattern |
| --- | --- | --- | --- |
| Slow Dolly | Scale in + Fade in + Translate Y | `--duration-slow-dolly` (alias keep `--duration-curtain` temporarily) | `*-dolly-enter` |
| Curtain Close | Exit (reverse dolly) *or* true fade-only exit | `--duration-curtain-close` | `*-curtain-exit` **or** rename brand to **Reverse Dolly** if motion stays reverse-scale |
| Focus Pull | Blur + dim non-focal | no ease rename; use `--ease-out` for enters | classes: `.focus-pull` / `.focus-pull-writing` |
| Soft settle | Custom ease, **no bounce** | keep `--ease-soft-settle` | keyframes must not exceed scale 1.0 |

**Ship rule:** comments and tokens use the same three brand verbs; glossary terms appear in parentheses once.

### 2. Rename the three highest-confusion identifiers

Without changing feel (rename-only PR):

| From | To (glossary-honest) |
| --- | --- |
| `popupSlide` | `popup-scale-in` or `popup-enter` |
| `.plaque-reveal` | `.plaque-expand` (or implement true **Reveal** with opacity/transform and then keep “reveal”) |
| `--ease-focus-pull` (generic use) | `--ease-ceremony` / keep focus-pull **only** where blur Focus Pull runs |

Deprecate dead `.focus-pull-active` or wire it to real Focus Pull so the name is true.

### 3. Make “settle” and “curtain” feel match their names

1. **`aura-save-settle`:** remove scale overshoot above 1.0 (e.g. 0.99 → 1.0 only) so **Soft settle** stays no-**Bounce**, matching brand and token comments.  
2. **Curtain Close:** either  
   - **A)** keep reverse dolly but rename brand string to **Reverse Dolly / Exit**, or  
   - **B)** change exit to opacity-led **Fade out** (true “quiet curtain”) and drop exit scale so the metaphor holds.  
3. Cap popup enter to **Fade in** ± tiny Y for high frequency; reserve full Slow Dolly (**Scale in**) for rare modals only — name follows frequency.

---

## Recommended vocabulary cheat-sheet (for future PRs)

Use these words in PR titles / class names when adding motion:

| If you mean… | Say… | Avoid saying… |
| --- | --- | --- |
| Opacity only appear/disappear | **Fade in / Fade out** | Slide, curtain, dolly |
| Grows from ~0.96 with fade | **Scale in** (brand: Slow Dolly) | Pop in, bounce, spring |
| Items cascade with delay | **Stagger** | Pulse, marquee |
| Height/width open section | **Accordion / Collapse** | Reveal (unless clip/mask) |
| Clip/mask uncover | **Reveal** | Expand, slide |
| Tap scale down | **Press / Tap feedback** | Pop, bounce |
| Writing dims background | **Focus Pull** (**Blur**) | ease-focus-pull as the effect |
| Loading placeholder loop | **Pulse** or **Skeleton** | Shimmer (unless sheen exists) |
| A↔B same slot | **Crossfade** (both layers) | Crossfade for single fade-in |
| Overshoot settle | **Bounce** / **Pop in** | Soft settle (brand-forbidden) |

---

## Out of scope (not scored here)

- Performance (`transition: all`, layout thrash) — see `12-improve-animations.md`  
- Missing motion opportunities — see `11-find-animation-opportunities.md`  
- Motion quality principles score — see `05-design-motion-principles.md` (7.6/10 craft; this doc scores **naming** only)

---

## Verdict

Subsume already *thinks* in a short cinematic dialect (Slow Dolly, Focus Pull, Curtain Close, Save Ceremony). That is a strength. Naming clarity drops because:

1. tokens encode “curtain” for dolly enter,  
2. “focus-pull” encodes an ease used everywhere,  
3. keyframes like `popupSlide` and classes like `plaque-reveal` describe the wrong glossary verb.

**Score: 6.0 / 10.** Top three: **unify the dictionary**, **rename the three worst identifiers**, **align settle/curtain feel with their names**.
