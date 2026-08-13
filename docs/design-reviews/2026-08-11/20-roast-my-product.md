# Roast My Product — Subsume (2026-08-11)

**Product:** Subsume Chrome MV3 extension v0.3.0  
**HEAD:** `main` @ `615113d`  
**Stage:** Late MVP / portfolio-shippable beta  
**Audience:** Private cinephiles & readers who care about afterglow more than completionism  

---

## Verdict

You built a **cathedral for a habit that still has no reliable Sunday service** — gorgeous engineering and design craft on top of a product that most installers will never complete one honest inscription in.

---

## Scorecard

| Dimension | Score | Justification |
|-----------|------:|---------------|
| Value Proposition (2×) | **6/10** | Thesis is real (“reflect before metadata”) but buried under theatre poetry and a name that means “absorb,” not “film journal.” A stranger needs the README sermon. |
| Crypto Necessity | **10/10** | Correctly zero crypto. No ornamental chain. Full credit. |
| Target User Clarity | **5/10** | “Private sanctuary cinephile/reader” is a mood board, not a reachable cohort. No evidence of 10 named users waiting. |
| First-Time User Experience | **5/10** | Improved (2-step onboarding, Discovery land, first-inscription CTA) but still optional keys theatre, empty vault poetry, and no forced first capture under 90s in the wild. |
| Core Loop | **5/10** | Capture is beautiful once reached; return trigger is weak (memory lives in your head; Letterboxd lives in social habit + FOMO). |
| Competitive Moat | **3/10** | Competent team clones detection + Preact archive in weeks. Local data is switching cost, not a network effect. |
| Technical Execution | **8/10** | Large Vitest suite (~544), solid architecture, free fallbacks, recent a11y/motion work is real. Still: plaintext API keys, detection ≠ wild web, CWS distribution unclear. |
| Naming & Messaging | **4/10** | “Subsume” does not mean “film/book sanctuary.” CWS short desc is clearer than product voice. Ferrari-on-sanctuary dual brand was partially fixed; mono screenplay type is an acquired taste, not a mass pitch. |
| Monetization Path | **2/10** | No plan in-product. User brings API keys. Privacy virtue is commercially sterile. |
| Market Timing | **5/10** | Anti-algorithm fatigue is real; Chrome Web Store graveyard + Letterboxd/Goodreads dominance is also real. |
| **Weighted Total** | **59/110** | Value prop 12/20 + sum of others. |

**Band:** Needs significant work (50–69).

---

## The Worst Issues

### 1. Activation still dies in the first session

**What's wrong:** You fixed the five-step key ceremony and empty-Archive default — good. You still do not **force** a first inscription. Demo library is opt-in. Discovery can feel like a lobby with no usher. Plaque detection depends on the right host page existing. Many users will install, admire the UI, and leave with zero personal data.

**Why it matters:** Products without a completed first success never form habit. Craft score ≠ retention.

**What good looks like:** Install → ≤90s → user has written one reflection about a real title they care about (or a seeded one they claim as theirs). Measure it.

### 2. No return ritual

**What's wrong:** The core loop is “feel something → open Subsume → inscribe.” Feeling something is external and rare. There is no default weekly pulse that works without LLM keys, no “unfinished reflection” nag that isn’t creepy, no social graph, no streak that isn’t gamified garbage — so nothing pulls the user back Tuesday morning.

**Why it matters:** Letterboxd wins on social FOMO and diary habit. Subsume wins on privacy and depth — but depth without a calendar is a drawer of unused notebooks.

**What good looks like:** One free, local, weekly “house selection” or “what stayed with you this week?” surface that fires without keys and deep-links into capture.

### 3. Naming and vocabulary are a growth tax

**What's wrong:** Subsume + inscribe + plaque + house + repertoire + afterglow. Power users might love it. Normal people searching “movie journal chrome extension” will never find you and may bounce on first sentence.

**Why it matters:** Distribution is half the product. Unclear naming is silent failure.

**What good looks like:** Store listing and first screen in plain English; keep poetry one layer deeper.

### 4. Moat is “I spent months” not “users can’t leave”

**What's wrong:** Local library is real switching cost only after months of use. Before that, zero. Detection heuristics, free API waterfall, and dual-medium model are clever — not proprietary.

**Why it matters:** Without distribution or network effects, you are always one funded clone away from irrelevance.

**What good looks like:** Either (a) own a distribution channel (newsletter, community, CWS featured) or (b) build a data moat users refuse to re-enter (export is good ethics; re-import elsewhere must hurt).

### 5. Monetization is a shrug

**What's wrong:** BYOK for AI, free Open Library path, no paid tier, no hosting costs passed through because everything is local. Virtuous for privacy. Dead as a business.

**Why it matters:** Without revenue or a portfolio-only intent, the product dies when founder attention dies.

**What good looks like:** Explicit choice: paid private backup / multi-device sync **or** admit portfolio art piece and stop feature sprawl.

---

## Common Sins Detected

*(Adapted from crypto sins list — Subsume is not crypto; patterns still apply.)*

- **Complexity Worship:** Theatre IA (Acts, House tools, Explore strip) + dual domain models (legacy LibraryStatus + CatalogWork) celebrate sophistication. Users want “save what I felt.”
- **No Retention Loop:** Install-and-admire is the dominant path without a forced weekly ritual.
- **Bridge to Nowhere (portfolio edition):** Impressive technical achievement (cross-medium recs, detection harness, spring drawer) with unclear distribution plan.
- **Jargon Overload:** Product voice still prefers “inscribe / plaque / house” over “save a reflection / movie card / home.”
- **Phantom Metrics risk:** Local-only means you can’t even *see* activation death without shipping honest local counters surfaced to the builder.

**Not guilty:** Ornamental blockchain, wallet gate, token-first thinking. Correctly avoided.

---

## UX Red Flags

*(Web3 flags N/A; extension analogues:)*

- **Value delayed by ceremony:** Even shortened onboarding is still a monogram + pillars essay before the first save.
- **Loading without explanation:** Multi-source Discovery cold open can spin without “pulling free catalogue…” honesty everywhere.
- **Silent content-script failures:** Hover add/remove can fail without user-visible error (console only paths remain a risk).
- **Spatial break:** Reflect from plaque opens full Sanctuary tab — immersion dies at the best moment.
- **Settings as feature landfill:** Keys, AI, Drive, alerts, atmosphere — power-user complete, first-session hostile if they wander in.

---

## Fix These Now

1. **Highest impact — Force first inscription <90s**  
   After onboarding: modal or full-screen “Inscribe one title now” with Search pre-focused + optional seed title “claim this as practice.” Block “later” until one save or explicit hard skip with guilt-free analytics flag for you.

2. **Easiest win — Store listing / first screen plain English**  
   One sentence: “Private movie & book journal for Chrome. Save what stayed with you while you browse.” Keep poetry in the product, not the pitch.

3. **Existential fix — Decide: product or portfolio**  
   If product: ship free weekly local digest as default retention + one paid path (encrypted backup). If portfolio: freeze features, write the case study, ship CWS once, stop polishing Ferrari drawers for zero users.

---

## Brutal honesty on recent craft

You just shipped spring drawers, Rosso chips, monofont identity, activation CTAs, and a multi-skill design machine. That is **founder craft**, not product-market fit. Craft without activation metrics is expensive self-soothing.

**Technical 8/10 does not buy Core Loop 5/10.**

---

*Roast lens: roast-my-product skill · Subsume session context 2026-08-11*
