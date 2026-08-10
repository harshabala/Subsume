# Product Review — Subsume

**Date:** 2026-08-10  
**Skill:** product-review  
**Repo / rev:** `/Users/harshabalakrishnan/Subsume` @ `a5471b5`  
**Surfaces reviewed:** Onboarding, activation path, Home (Discovery), Library (Archive) empty states, Poetic Capture Canvas, extension popup, Search, Recommendations empty states, content plaques (museum / book), Settings IA  
**Product stage:** Ship-ready beta / late MVP (v0.3.0) — multi-medium sanctuary with detection, capture, archive, AI curator, backup  

**Review frame**

| Question | Answer used for evaluation |
|----------|----------------------------|
| What | Chrome extension: private sanctuary for films, series, and books — discovery on the open web, emotion-first capture, editorial archive |
| Who | Cinephiles and readers who care about afterglow, crew, and personal resonance more than completionist tracking |
| Core use case (ONE) | While browsing or after a work lands, **inscribe what stayed with you** and keep it in a private, intent-organized vault |
| Not | Social network, Letterboxd clone, or pure tracker |
| Focus this pass | Onboarding, activation, core loop, empty states, feature completeness |

---

## Executive Summary

Subsume’s product thesis remains unusually clear and well-executed where it matters: **reflection before metadata**, in-page discovery (museum plaques), and an editorial Archive that feels like a vault rather than a spreadsheet. The core loop — detect → Reflect → Poetic Capture → Archive — is coherent and differentiated. The product’s main weakness is still **activation**: a five-step key ceremony, default landing on an empty Archive, demo library opt-in only (and only surfaced in the popup / Settings), and empty states that are poetic but under-specify the fastest path to a first inscription. Feature completeness is high for an extension; retention risk is “never complete one loop,” not “missing catalogue APIs.”

**Overall: 7.3 / 10** — Strong core product with distinctive value; activation and empty-state action design are the blockers between beta polish and competitive first-session conversion.

---

## Scorecard

| Dimension | Score | Summary |
|-----------|-------|---------|
| Onboarding Flow | 6.0/10 | Beautiful welcome + skippable keys; 5 steps over-index setup; no guided first inscription after “Enter the house” |
| Core Experience | 8.0/10 | Emotion-first capture, plaques, Archive intents, dual medium, popup log — primary loop works and feels special |
| Error Handling | 7.5/10 | Notices, retries, free-feed degradation, key validation; some silent catches and raw message passthrough |
| Information Architecture | 7.0/10 | Clear triad Archive / Discovery / Settings + Explore strip; Settings dense; literary labels need learning |
| Visual Design & Polish | 8.0/10 | Distinctive cinematic system (Cinema Black + Rosso Corsa); shell/popup polished; residual surface inconsistencies possible |
| Performance | 7.0/10 | Prefetch, pagination, O(1) content cache; Home multi-source cold open can feel heavy |
| Accessibility | 7.0/10 | Focus traps, reduced motion, 44px plaques, dialog patterns; Shadow DOM + Roman ratings limit SR clarity |
| Feature Completeness | 8.5/10 | Detect, capture, archive, people, alerts, AI, Drive, Goodreads, books+screen — unusually complete |
| **Overall** | **7.3/10** | Average of eight dimensions |

**Verdict band:** Strong — fix activation (onboarding → first inscription → filled Archive) and empty-state CTAs; feature surface is already competitive for the niche.

---

## Top 3 Strengths

1. **Emotion-first capture is the product, not a feature**  
   Poetic Capture Canvas opens with “What stayed with you?”, progressive disclosure of intent/rating after ~40 characters of recall, emotional spectrum + aura, focus trap, reduced-motion-aware exit, multi-step save pipeline. Popup “Inscribe a title” and plaque “Reflect” converge on the same thesis. This is the differentiation vs trackers.

2. **In-context discovery without leaving the page**  
   Museum plaques (★ score → Reflect), hover cards with library state, book plaques (confidence-gated), and optional screenplay dock deliver Act I where users already browse. Closed Shadow DOM isolation and content prefs (keys never to content scripts) show product + trust maturity.

3. **Archive as editorial vault + honest multi-medium completeness**  
   Intent navigation (Keep This Memory / Revisit / Wishlist), medium filters (All / Screen / Books), hardcover spine cards with recall excerpts, free sources (Open Library, Trakt, TVmaze) so books and a live feed work without keys. Demo auto-seed removed intentionally — ownership honesty is correct; activation must compensate with explicit CTAs.

---

## Top 3 Improvements

1. **Collapse activation to one first inscription (highest impact)**  
   After welcome (or one optional “keys later” screen), land on Discovery or open popup-ready capture with a single primary CTA: *Inscribe your first title*. Defer OMDb/LLM steps until a feature needs them. Expected impact: more users complete the core loop in &lt;60s; fewer drop-offs during setup fatigue.

2. **Empty Archive must sell the habit with three concrete actions**  
   Empty states are well-written but abstract (“leave the first inscription”). Pair copy with: (1) *Search catalogue*, (2) *Inscribe a title* (popup or in-app capture entry), (3) *Load highlight reel* (demo) — currently only on popup empty / Settings, not on Archive empty. Add one-line “how plaques appear” (open IMDb / Letterboxd / a book page). Expected impact: fewer cold-start bounces when default page is empty Archive.

3. **Post-onboarding landing: Discovery + first-night checklist, not silent empty vault**  
   `getInitialPage()` defaults to `library`. After first complete, route to `home` once (or show a 3-step checklist: enable overlays → inscribe one title → open Archive). Expected impact: first session shows live feed value immediately; Archive becomes destination after value, not before.

---

## Activation Issues (focused)

| # | Issue | Evidence | Severity | User impact |
|---|--------|----------|----------|-------------|
| A1 | Multi-step key wizard before value | `Onboarding.tsx`: 5 steps (welcome → TMDb → OMDb → LLM → done); OMDb/LLM optional but still sequential | **High** | Setup fatigue; users skip keys then land empty without knowing free path works |
| A2 | No forced / guided first inscription | `completeOnboarding` only sets `onboardingComplete` + prefs; no tour, checklist, or capture deep-link | **High** | Philosophy understood; habit never formed |
| A3 | Default landing is empty Archive | `getInitialPage()` → `'library'`; `ensureDemoLibraryIfEmpty` does **not** seed | **High** | First post-setup screen often “Nothing inscribed yet” |
| A4 | Demo / sample path hidden from main empty state | Popup: “Load the highlight reel”; Settings restore; **Library empty has only “Search catalogue”** | **High** | Best cold-start bridge is not where most users look first |
| A5 | Empty copy under-specifies in-page path | Archive empty: browse / capture / search — no explicit “open Letterboxd/IMDb and look for ★ Reflect” | **Medium** | Core discovery surface (plaques) never taught in-app |
| A6 | Hero director line can dump bio | Home: `heroDirector = media?.wikidataDirectorBio` shown as “Directed by …” | **Medium** | Trust hit if long bio appears under marquee title |
| A7 | Secondary features gate on archive density | Recommendations empty: need more reels; Home picks need ≥3 projected | **Medium (expected)** | Correct product honesty; needs clear path to fill ledger, not dead ends |
| A8 | Popup demo restore silent on failure | `catch { /* ignore */ }` on restore | **Low–Medium** | User clicks demo CTA, nothing happens, no recovery |

**Time to first meaningful action (estimated)**

| Path | Time | Notes |
|------|------|--------|
| Best: skip keys → popup on film page → Inscribe | ~30–90s | Tab-title heuristics help Letterboxd/IMDb/Netflix |
| Best in-page: plaque Reflect on detected poster | ~30–90s | Depends on detection + overlays on |
| Default: full onboarding + empty Archive | **3–8+ min** | Activation risk; may never inscribe |
| Demo path if discovered in popup | ~2 min | Fills vault without true “first memory” — good for UI tour, weak for emotional thesis |

---

## First-Time User Walkthrough (evidence)

| Moment | Observation | Emotion |
|--------|-------------|---------|
| Install → open house | Skeleton nav, then onboarding if `onboardingComplete` false | Neutral |
| Step 1 welcome | “Your private picture palace” + Discover / Capture / Archive pillars — value clear in &lt;5s | Delight / clarity |
| Steps 2–4 keys | TMDb optional but framed as “catalogue key”; OMDb; LLM — all skippable with validation | Mild friction / setup fatigue |
| Step 5 done | “The house is lit” → Enter the house | Ready |
| Default page | Returning default **Archive** — often empty | Confusion if no demo |
| Empty Archive | Poetic empty + Search catalogue only | Partial clarity |
| Discovery Home | Lobby hero, live feed (Trakt/TVmaze free path), Reflect/Archive on plaque | Value appears if feed loads |
| Popup | Stats, overlay status, Inscribe, empty → highlight reel | Strong secondary path |
| Plaque on web | ★ + Reflect — fastest path *if* detection hits | Delight when it works |
| Capture | Full-screen emotion-first canvas | Peak product moment |
| Settings | 8 sections — power-user complete | Overwhelming early |

---

## Detailed Dimension Reviews

### 1. Onboarding Flow (6.0/10)

**Working well**

- Clear value prop without tracker jargon on step 1; three pillars match product acts (Discover / Capture / Archive).
- Progress dots with `aria-current="step"`; password fields; external links for TMDb/OMDb.
- Keys skippable (“I'll add keys later” / Skip); empty TMDb blocked from false validate with honest error.
- Open Library / free sources documented so books work without keys.
- OpenAI `sk-` format warning; “keys stay in your browser” on final step.
- Gated by `onboardingComplete` — no half-state shell.

**Needs improvement**

- **High** — Five steps over-index on API ceremony before any archive or capture moment.
- **High** — Post-onboarding has no checklist, tour, or forced first inscription.
- Literary framing is brand-aligned but may not map to “what do I click?” for pragmatic users.
- No preview of plaques/hover behavior during onboarding (value is told, not shown).

**Suggested fix**  
2-step onboarding: (1) Welcome + pillars + optional static mock of a plaque, (2) optional TMDb only. Move OMDb/LLM to Settings with contextual prompts when user opens AI Recommendations or Ratings. After complete → Discovery with hero CTA *Inscribe first title* and secondary *Open Archive*.

---

### 2. Core Experience (8.0/10)

**Working well**

- **Capture:** Progressive disclosure (`RECALL_DISCLOSURE_CHARS = 40`), emotional spectrum, intent chips, rating, atmosphere/lingering fields, multi-message save pipeline, ceremony + error recovery.
- **Discover:** Home lobby, live feed without keys, weekly digest with free-feed fallback, recommendations hydration.
- **Archive:** Intent + medium + tags + search + sort + load more; spine cards surface emotional recall.
- **Popup:** Dual overview/log views; tab title heuristics; success overlay “Reflection saved”.
- Product copy centralization (`productCopy.ts`) keeps archive verbs consistent.

**Needs improvement**

- **Medium** — Hero “Directed by” can surface raw bio when `wikidataDirectorBio` is used as director stand-in.
- **Medium** — Core loop spans three entry points (plaque → full app capture, popup log, Search → detail); mental model for “where did I save this?” can blur for new users.
- **Low** — Roman numeral rating (I–X) is aesthetic; less scannable than 1–10 for speed raters.

**Suggested fix**  
Unify “saved” confirmation with deep link “View in Archive” from popup and capture. Normalize director display to name-only. Keep Roman numerals but ensure `aria-label` with numeric score on all rating controls.

---

### 3. Error Handling (7.5/10)

**Working well**

- `formatUserError` + `showNotice` / InlineNotice on Settings, Home add, onboarding save failure.
- Library load error plaque + Try Again; filtered empty with clear filters; capture load error + retry.
- Feed error plaque with Try again; free-source fallback when digest empty.
- Key validation before continue on TMDb/OMDb.
- `role="alert"` on onboarding errors; `aria-live="polite"` on archive counts.

**Needs improvement**

- **Medium** — Popup demo restore swallows errors.
- **Medium** — Some paths still surface raw exception strings to users.
- **Low** — Home outer failures may only `console.error` without global failure UI.

**Suggested fix**  
Never silent-catch user-initiated actions. Map network/rate-limit codes to short copy (“Live feed is quiet — try again in a minute”).

---

### 4. Information Architecture (7.0/10)

**Working well**

- Primary nav: **Archive · Discovery · Settings** — three-act mental model.
- Explore subnav: Search, Recommendations, Now Showing, Creators.
- House tools (Stats, Premiere Alerts) in drawer.
- Settings sections catalog with plain-language descriptions (`settingsCatalog.ts`).
- Hash deep links (`#ai-curator`, `#diagnostics`) and `?page=` / `?act=capture` routing.

**Needs improvement**

- **Medium** — Eight Settings sections overwhelm first-week users; essentials are Appearance + API keys + Browsing overlays.
- **Medium** — Code/docs still mix Library vs Archive, Home vs Discovery.
- **Low** — Default-to-Archive is intentional philosophy but fights activation (see A3).

**Suggested fix**  
Settings “Essentials” default with “Advanced” expand. First-run default page: Discovery until `libraryCount > 0`.

---

### 5. Visual Design & Polish (8.0/10)

**Working well**

- Cinema Black + Rosso Corsa system (`tokens.css`); cinematic lobby, film grain, plaque language, motion discipline.
- Skeleton loaders on app shell, library, home cards.
- Popup film grain + success ceremony; Search type chips use red tint (`rgba(218, 41, 28, 0.08)`) — aligned with Ferrari program vs older gold hardcodes on shell.

**Needs improvement**

- **Low–Medium** — Content-script book plaques historically used gold-hue borders; keep content surfaces on same primary voltage as shell.
- **Low** — Extension is desktop-primary; long popup log form can feel cramped.

**Suggested fix**  
Audit content Shadow DOM tokens for residual gold; keep primary actions scarce Rosso only.

---

### 6. Performance (7.0/10)

**Working well**

- Nav prefetch (`usePrefetch`); library page size 40 with append.
- Content-script O(1) library set for hover/badge.
- Home uses multi-source load with partial skeletons.
- Debounced popup search; lazy posters; capture exit animation fallbacks.

**Needs improvement**

- **Medium** — Home cold load fans out prefs, digest, recommendations, discovery feed, media hydration.
- **Low** — Capture save is sequential IPC without optimistic UI until ceremony.
- **Low** — Client-side filter after paginated fetch can miss matches (honest copy exists).

**Suggested fix**  
Stagger Home: paint lobby first, stream feed next. Batch capture save if backend allows.

---

### 7. Accessibility (7.0/10)

**Working well**

- Capture dialog: `role="dialog"`, focus trap, Escape, restore focus.
- Nav drawer: focus trap, Escape, `aria-expanded` / `aria-controls`, reduced-motion skip.
- Plaques: `aria-label` Reflect, min 44px targets.
- Onboarding step nav labelled; errors as alerts.

**Needs improvement**

- **Medium** — Closed Shadow DOM overlays inconsistently exposed to SR depending on host page.
- **Medium** — Roman numeral rating buttons need consistent accessible names (“Rating 7 of 10”).
- **Low** — No i18n; English literary copy only.

**Suggested fix**  
Live region “Reflection saved” after capture; document overlay a11y limits in store listing.

---

### 8. Feature Completeness (8.5/10)

**Working well**

- Screen + books detection, plaques, hover, dock.
- Archive intents, emotions, tags, notes, editions (books), people/filmography, alerts, stats.
- Free sources + optional TMDb/OMDb/Google Books/LLM.
- Recommendations, weekly digest / dispatch, discovery feed, search.
- Export/import, Google Drive, Goodreads CSV seed, diagnostics, overlay prefs.
- Demo library restore (opt-in) — correct honesty after removing silent seed.

**Needs improvement**

- **High (activation, not feature gap)** — Missing designed **first-run success path** (checklist / sample capture in main UI).
- **Medium** — No Letterboxd/screen CSV import parity with Goodreads books path.
- **Low** — Streaming “where to watch” not always first-class.
- **Low** — AI power gated behind settings many users skip (rule-based path exists — surface it).

**Suggested fix**  
Ship “First night in the house” checklist (3 steps). Optional Letterboxd CSV later. Recommendations empty: “AI off — rule-based picks still work when you have more inscriptions.”

---

## Empty States Audit

| Surface | Empty behavior | Actionable? | Grade |
|---------|----------------|-------------|-------|
| Archive (true empty) | Title + poetic message + hint + **Search catalogue** | Partial — missing Inscribe + demo + plaque how-to | B− |
| Archive (filtered) | Clear filters + load-more hint | Yes | A− |
| Archive (load error) | Try Again | Yes | A |
| Popup recent | Highlight reel restore | Yes (but silent fail) | B+ |
| Home picks | “Add a few titles… projected” | Weak — no CTA button | C+ |
| Home programme | Refresh / Full programme | Partial | B |
| Recommendations ledger | Search catalogue | Yes | B+ |
| Search (no matches) | Spelling / broaden filter guidance | Yes (guidance only) | B |
| Search (pre-search) | No dedicated empty — input-first | OK | B |
| People / Alerts / Stats | Plaque empties | Varies | B |

**Principle gap:** Best empty states name the next click *and* teach the unique surface (plaques). Archive empty teaches “browse the web” abstractly; popup teaches demo; neither teaches both in one place.

---

## Core Loop Assessment

```
Act I  Discover  →  plaques / hover / live feed / search
Act II Capture   →  Poetic Capture Canvas or popup Inscribe
Act III Archive  →  intent shelves + detail modal
```

| Loop property | Assessment |
|---------------|------------|
| Clarity of thesis | Excellent — emotion before metadata |
| End-to-end works | Yes for engaged users with detection or search |
| Feedback on success | Good (ceremony, popup success overlay); deep-link to Archive incomplete |
| Habit trigger | Weak on first run (no checklist, empty default) |
| Return reason | Strong once filled (alerts, digest, creators, recommendations) |

**Loop verdict:** Core loop quality **8/10**; **activation into the loop 5/10**. Product quality is gated by first inscription, not by mid-funnel features.

---

## Severity Findings

| ID | Severity | Area | Finding | Impact |
|----|----------|------|---------|--------|
| P1 | **High** | Onboarding / activation | Multi-step key wizard before any inscription; no post-setup guided capture | Users bounce before core value |
| P2 | **High** | Empty states | Archive empty under-specifies how to get first title; demo CTA not on Archive | Cold vault feels broken |
| P3 | **High** | Landing | Default page Archive when empty | First impression = emptiness |
| P4 | **Medium** | IA / Settings | Eight equal-weight settings sections | Config anxiety; overlays/keys missed |
| P5 | **Medium** | Core copy | Literary vocabulary on critical paths | Cognitive load for pragmatic users |
| P6 | **Medium** | Home hero | Director/bio field misuse risk | Looks buggy; trust damage |
| P7 | **Medium** | Errors | Silent catch on popup demo restore | Users don’t know what failed |
| P8 | **Medium** | A11y | Overlay SR exposure + rating control names | Exclusion on core loop |
| P9 | **Medium** | Performance | Home multi-source fan-out | Slow first Discovery impression |
| P10 | **Low** | Completeness | Screen library import parity with Goodreads | Switchers from trackers stick less |
| P11 | **Low** | Ratings UX | Roman numerals aesthetic over scannability | Slower logging for some users |

---

## Web3 patterns note

`crypto-ux-patterns.md` does not apply (Subsume is not a wallet/web3 product). Analogous trust patterns **are** present and score well: local-first data, optional credentials deferred, no keys in content scripts, export without secrets, honest free-tier data sources.

---

## Improvement Roadmap

### Quick Wins (&lt; 1 day)

- [ ] **Archive empty: three CTAs** — Search catalogue · Inscribe a title (open popup path or `?act=capture` after pick) · Load highlight reel. Impact: cold-start survival.
- [ ] **One-line plaque how-to** on Archive/Home empty: “On IMDb, Letterboxd, or a book page, look for ★ Reflect.” Impact: teaches unique surface.
- [ ] **Popup demo restore: show error notice** on failure. Impact: trust on the one demo CTA that exists.
- [ ] **Hero director name-only** — never dump `wikidataDirectorBio` into “Directed by”. Impact: marquee trust.
- [ ] **Home picks empty: button** → Search catalogue. Impact: dead-end removal.

### Medium Effort (1–3 days)

- [ ] **2-step onboarding** — welcome + optional TMDb; OMDb/LLM deferred to Settings with deep links. Impact: activation time.
- [ ] **First-run route to Discovery** until `libraryCount > 0`. Impact: live feed as first value.
- [ ] **First-night checklist** (3 steps) dismissible card on Home. Impact: guided habit.
- [ ] **Settings Essentials / Advanced** split. Impact: less config anxiety.
- [ ] **View in Archive** after capture/popup save. Impact: loop closure.

### Major Investment (1+ week)

- [ ] **Letterboxd / screen CSV import** parity with Goodreads. Impact: switcher activation.
- [ ] **Guided first plaque experience** (optional sample page or in-extension demo HTML). Impact: teaches Act I without leaving product.
- [ ] **Home load orchestration** — progressive section hydration. Impact: first-paint feel.
- [ ] **Full a11y pass** on Shadow DOM overlays + rating controls. Impact: inclusive core loop.

---

## Comparison to 2026-08-04 product review

| Area | 2026-08-04 | 2026-08-10 |
|------|------------|------------|
| Overall | 7.4 | **7.3** |
| Onboarding | 6.5 | **6.0** (same structure; scored harder against activation outcomes) |
| Core / Features | 8.0 / 8.5 | Unchanged — still strengths |
| Activation P1/P2 | Open | **Still open** — 5-step keys, empty Archive default, demo not on Library empty |
| Demo auto-seed | Opt-in only | Still opt-in (`ensureDemoLibraryIfEmpty` loads only) |
| Search chip brand | Gold residual called out | Shell Search chips use Rosso tint — progress |

No activation redesign landed between reviews; scores hold or dip slightly on onboarding severity relative to feature maturity.

---

## Output for handoff

| Field | Value |
|-------|--------|
| **Score** | **7.3 / 10** |
| **Top 3 fixes** | (1) Collapse onboarding → first inscription (2) Archive empty: Search + Inscribe + demo + plaque how-to (3) First-run land on Discovery + checklist |
| **Path** | `/Users/harshabalakrishnan/Subsume/docs/design-reviews/2026-08-10/10-product-review.md` |
