# Roast My Product — Subsume (post design update)

**Date:** 2026-08-10  
**Skill:** roast-my-product  
**Repo:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Frame:** Product critique *after* Ferrari cinematic design system work (Rosso Corsa / Cinema Black / Inter). Design polish is assumed present; this roast asks whether the product survives contact with real users.

**What / who / stage (from repo evidence)**  
- **What:** Chrome extension — private multi-medium sanctuary for films, series, books: web detection → emotion-first capture → editorial archive.  
- **Who (claimed):** Cinephiles and serious readers who want afterglow and crew/author memory more than social tracking.  
- **Stage:** Late MVP / ship-ready beta (`v0.3.0`), local-first, no backend, no monetization.

---

## Verdict

You spent a design program recoloring a product that still fails the only test that matters: **most installers will never complete one honest inscription** — and the ones who do still have no reason to open Subsume tomorrow.

---

## Scorecard

| Dimension | Score | Justification |
|-----------|------:|---------------|
| Value Proposition (2×) | **6/10** | Thesis is real (“reflect before metadata”) but buried under theatre-lobby poetry. A stranger needs the README lecture. |
| Crypto Necessity | **10/10** | Correctly zero crypto. No ornamental chain. Full credit. |
| Target User Clarity | **5/10** | “Private sanctuary cinephile/reader” is a mood board, not a reachable cohort. No evidence of 10 named users waiting. |
| First-Time User Experience | **4/10** | 5-step API key ceremony → default **empty Archive**. Demo is opt-in. Value is *told*, not *forced*. |
| Core Loop | **5/10** | Capture is beautiful once reached; return trigger is weak (memory lives in your head; Letterboxd lives in social habit). |
| Competitive Moat | **3/10** | Competent team clones detection + Preact archive in weeks. Local data is not a network effect. |
| Technical Execution | **7/10** | Solid SOLID architecture, large Vitest suite, free-source fallbacks. Still: unencrypted keys, residual brand debt, detection fixture ≠ wild web. |
| Naming & Messaging | **4/10** | “Subsume” does not mean “film/book sanctuary.” CWS short desc is clearer than the product voice. Brand says Ferrari; soul says reading room. |
| Monetization Path | **2/10** | No plan in-product. User brings API keys. Privacy posture is virtuous and commercially sterile. |
| Market Timing | **5/10** | Anti-algorithm fatigue is real; Chrome Web Store graveyard + Letterboxd/Goodreads dominance is also real. |
| **Weighted Total** | **57/110** | Value prop contributes 12/20; sum of all dimensions as scored. |

**Band (framework):** **50–69 — Needs significant work.** Design update did not move this into “Strong.”

**Dimension math (for audit):**  
`2×6 + 10 + 5 + 4 + 5 + 3 + 7 + 4 + 2 + 5 = 57`.

---

## What the design update actually bought you

Be honest about what Ferrari delivered:

| Changed | Unchanged (existential) |
|---------|-------------------------|
| Token palette gold → Rosso Corsa | Time-to-first-inscription |
| Theme labels Cinema Black / White Canvas | Empty-archive activation |
| Shell/popup/sanctuary recolor | Competitive category position |
| Craft reviews ~**6.5 mean** (2026-08-04 index) | Monetization = none |
| Residual gold class names + translucent “primary” CTAs | Distribution channel |

**Brutal read:** You shipped a **rebrand of an unfinished habit product**. Luxury paint on a car that still has no reliable ignition sequence. Multiple design skills already told you craft is mid-tier (high-end visual **5.5**, anti-slop **5.5**, DESIGN.md compliance **~58%**). Calling the update “done” is self-soothing.

---

## The Worst Issues (what would kill this product)

### 1. Activation death spiral (highest kill probability)

**What's wrong**  
`Onboarding.tsx` still runs **5 steps**, three of which are key theater (TMDb, OMDb, LLM) before the house is “lit.” Then `getInitialPage()` defaults returning users to **`library`**. `ensureDemoLibraryIfEmpty` **explicitly does not seed** — ownership purity over first value. Empty state copy is poetic (“leave the first inscription”) without a forced path: open Letterboxd → see plaque → Reflect → save.

**Why it matters**  
Extensions die in the first session. If the core promise is inscription, and the first screen is an empty vault after a key ceremony, churn is not a metrics problem — it is product design.

**What good looks like**  
≤2 screens: value + optional single key. Land on **Discovery** or a guided **Inscribe first title** with a prefilled demo work *or* deep-link to a known-good title page. Measure “first inscription &lt; 90s” as the only north-star for v0.3.x.

**Evidence**  
- `src/ui/pages/Onboarding.tsx` — `TOTAL_STEPS = 5`  
- `src/ui/App.tsx` — `getInitialPage()` → `'library'`  
- `src/ui/lib/ensureDemoLibrary.ts` — “Does **not** auto-seed demo titles”

---

### 2. Category and messaging failure (nobody knows why to install)

**What's wrong**  
Product voice invents a private dialect: picture palace, house tools, sanctuary intents, Roman nav (I / II / III), “inscribe.” The name **Subsume** is a vocabulary flex, not a job-to-be-done. CWS short description is actually clearer than in-app philosophy. Concurrently, brand identity is **Ferrari racing red on a literary sanctuary** — dual identity with no synthesis (already consensus P0 in 2026-08-04 design index).

**Why it matters**  
You cannot out-market Letterboxd/Goodreads with obscurity. Installers decide in three seconds. If the icon + name + first screen don’t scream *“save what stayed with you while you browse,”* you lose before capture ever loads.

**What good looks like**  
One job in plain English everywhere: **Save what stayed with you — from any page.** Poetic layer *after* habit. Pick one brand north star (sanctuary theatre **or** precision luxury), stop cosplaying both.

---

### 3. No moat, no money, feature sprawl (slow death)

**What's wrong**  
Feature surface is a portfolio résumé: plaques, dock, hardcover archive, people/filmography, AI two-stage prompts, digests, Drive sync, Goodreads import, books + screen, alerts, stats, emotional weather. That is impressive engineering and catastrophic focus for a zero-revenue extension with **local-only data** (no network effects, no marketplace, no social graph). Monetization path score is near-floor: users pay OpenAI/TMDb, not you.

**Why it matters**  
Without retention and revenue, the product dies when the builder’s attention dies. Competitors (or Letterboxd notes + Goodreads shelves + a notes app) already cover 80% of the functional job. Your differentiation is emotional capture — which most users will not discover under the sprawl.

**What good looks like**  
Ruthless P0 loop only: **Detect → Reflect → Archive → Weekly pull-back.** Gate AI, alerts, Drive, stats behind “after 10 inscriptions.” Publish a boring monetization hypothesis (e.g. optional hosted backup + managed keys for $X/mo) or admit this is art, not a product business.

---

### 4. Core loop has weak gravity

**What's wrong**  
The best moment (Poetic Capture Canvas) is high craft. The *return* moment is underbuilt. Digests/alerts exist but are optional complexity. There is no social proof, no shared shelf, no public identity — by design (privacy). Privacy without a substitute retention mechanic is a diary most people abandon.

**Why it matters**  
Habit products without external triggers lose to the apps that own the browsing context (Letterboxd, Netflix UI, Goodreads). Your plaques only fire if detection hits and overlays are on — fragile for “daily open.”

**What good looks like**  
One default weekly ritual that requires zero AI keys (free feed already exists): *Sunday lobby with three picks + “what stayed with you last week?”* Notification is the product, not a House Tool.

---

### 5. Trust & polish debt undermines “premium sanctuary”

**What's wrong**  
API keys unencrypted in IndexedDB (documented — still a trust tax for power users). Class names still scream `btn-sanctuary-gold` after “Ferrari.” Design reviews flagged translucent primary CTAs and residual gold chroma. Detection harness **27/30** medium correct offline — good for fixtures, not a guarantee on messy real pages where false confidence destroys the magic.

**Why it matters**  
Premium brand claims raise the bar. Mid execution + key anxiety + missed plaques = “pretty tracker that doesn’t work on my tab.”

**What good looks like**  
Solid primary CTAs only; purge gold semantics from names or finish the alias story; contextual key prompts at feature use; honest “can’t read this page” states that teach domains where Subsume shines.

---

## Common Sins Detected

*(Framework is crypto-oriented; mapped to consumer product equivalents.)*

| Sin | How it shows up in Subsume |
|-----|----------------------------|
| **Complexity worship** | SOLID essays, two-stage LLM, multi-medium catalogue, atmosphere presets — sophistication advertised; job-to-be-done obscured. |
| **No retention loop** | One beautiful capture; weak day-2/day-7 reason to open the extension. |
| **Bridge to nowhere** | Impressive client-side architecture with no distribution plan and no revenue path. |
| **Jargon overload** | Sanctuary / house / inscribe / plaque / Roman numerals — non-native users bounce. |
| **Ornamental blockchain** | N/A — correctly absent. (Do not invent a token for “taste NFTs.” Ever.) |
| **Copy-paste protocol** | Not a clone of Uniswap — but *is* adjacent to Letterboxd + Goodreads + notes without a single-sentence wedge that survives contact with those brands. |

---

## UX Red Flags (adapted from web3 list → extension UX)

| Flag | Instance |
|------|----------|
| **Gate before value** | API key steps before any inscription (wallet-gate analogue). |
| **No preview of magic** | Onboarding describes plaques; does not show a static mock or one-tap demo plaque. |
| **Loading without meaning** | Home multi-source cold open can feel heavy; free feed helps but still multi-system. |
| **No shareable state / growth** | Local-only by design — kills word-of-mouth “look at my archive” unless export/screenshot is first-class. |
| **Error recovery uneven** | Some notice/retry paths solid; silent or raw failures still called out in prior product review. |
| **Empty state is poetry, not instruction** | `EmptyStateProjection` defaults to abstract guidance, optional single action. |

---

## Score commentary (per dimension)

### 1. Value Proposition — 6/10 (×2 → 12)

**Wrong:** “Private sanctuary for films, shows, and books” is clear in `PRODUCT.md` / CWS; in the product shell it becomes a metaphor stack. Differentiation (emotion before metadata, on-page plaques) is strong *if* explained.

**Why it matters:** Confused value → zero installs from cold traffic.

**Good:** One sentence, no metaphor: *Chrome extension that lets you note what stayed with you on any film/book page and keep a private library.*

### 2. Crypto Necessity — 10/10

Correct product category. Do not “web3 your taste.”

### 3. Target User Clarity — 5/10

**Wrong:** Persona is aesthetic, not operational. No channel (Letterboxd power users? Criterion Discord? Indian parallel-cinema Twitter?) owned in the product or listing strategy files.

**Why it matters:** You cannot market to a vibe.

**Good:** “People who already rate on Letterboxd and keep notes in Apple Notes — we merge that into one private capture on the page.”

### 4. First-Time User Experience — 4/10

See kill #1. This is the score that should embarrass you after a full design program.

### 5. Core Loop — 5/10

Act I–III narrative is coherent on paper. Habit frequency is “whenever art hits you” — sparse by nature. Product must manufacture return (digest, revisit intent, creator follows) as **defaults**, not advanced tools.

### 6. Competitive Moat — 3/10

Switching costs only after a deep library. No social graph, no exclusive catalog, no patentable AI. Engineering quality is not a moat.

### 7. Technical Execution — 7/10

Deserve credit: handler maps, Shadow DOM lifecycle, free sources, test harness, catalog validation for AI. Cap at 7 because production trust (keys), wild detection, and brand-token debt are still shipping concerns. Above 7 requires battle evidence from real users, not Vitest green.

### 8. Naming & Messaging — 4/10

Memorable for literature majors; opaque for CWS search. “Subsume” does not spell the job. Ferrari messaging on a reflection product confuses the brand story further.

### 9. Monetization Path — 2/10

Absent. Privacy-first is a product choice, not a business model. “We’ll figure it out” is the kill switch for sustainability.

### 10. Market Timing — 5/10

Tailwinds: recommendation fatigue, multi-medium culture, local-first privacy. Headwinds: extension discovery is brutal; attention tools are saturated; AI features require user-paid keys in a world of free ChatGPT.

---

## Fix These Now

1. **Highest impact — Force first inscription in &lt;90s**  
   Collapse onboarding to welcome + skippable TMDb. Post-complete: auto-open capture on a seeded title **or** Discovery with single primary CTA *Inscribe your first title* and secondary *See how plaques work* (static mock). Default landing for new users: Discovery, not empty Archive. Keep demo opt-in for *replacement*, but never leave first open hollow.

2. **Easiest win — Kill jargon on the first screen**  
   Replace house/palace metaphor on step 1 and empty states with operational copy matching CWS: what to click, where to go (Letterboxd/IMDb/Amazon book page). Rename nav mentally for new users even if brand terms stay deeper: Archive / Discover / Settings is fine; “House tools” is not.

3. **Existential fix — One retention ritual + monetization hypothesis**  
   Ship one default weekly free-feed digest notification that reopens the lobby (no LLM required). Write a one-page monetization decision: art project (stop calling it a business) **or** paid hosted backup / managed keys / Pro detection domains. Without this, feature work is rearranging furniture on a sinking lease.

---

## Top 3 kills (summary)

1. **Activation:** keys + empty Archive → no first inscription.  
2. **Positioning:** obscure name + dual brand (Ferrari vs sanctuary) → no install clarity.  
3. **Economics + focus:** feature sprawl, no moat, no revenue → dies with founder attention.

---

## Path forward (90-day product, not design)

| Phase | Outcome | Anti-goal |
|-------|---------|-----------|
| **Days 1–14** | Activation metric: % sessions with ≥1 inscription; ship 2-step FTUE + first-capture funnel | More token remaps |
| **Days 15–45** | Weekly free digest default-on (with quiet hours); plaque reliability on top 5 domains | New mediums / more AI providers |
| **Days 46–90** | Either 50 weekly active inscribers *or* kill non-core surfaces; pick monetization or portfolio-only label | Another full visual system |

**Design debt still open (do not confuse with product validation):** solid primary CTAs, purge residual gold chroma/class confusion, type identity decision, stop dual-brand theatre. Those raise craft from ~6.5 → 8; **they do not save a product nobody activates.**

---

## One-line for the builder

Stop polishing the lobby. Make the first guest write something on the wall — or admit you’re building a beautiful private museum with no visitors.
