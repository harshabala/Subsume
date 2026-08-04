# Product Review — Subsume

**Date:** 2026-08-04  
**Skill:** product-review  
**Surfaces reviewed:** Onboarding, Home (Discovery), Library (Archive), Settings, extension popup, content overlays (museum plaques, book plaques, hover cards, screenplay dock), Poetic Capture Canvas  
**Visual context:** Ferrari design system (Rosso Corsa `#da291c` on near-black `#181818` canvas; Inter UI stack — no proprietary FerrariSans)  
**Product stage (inferred):** Ship-ready beta / late MVP — multi-medium sanctuary with detection, capture, archive, AI curator, backup  

**Review frame**

| Question | Answer used for evaluation |
|----------|----------------------------|
| What | Chrome extension: private sanctuary for films, series, and books — discovery on the open web, emotion-first capture, editorial archive |
| Who | Cinephiles and readers who care about afterglow, crew, and personal resonance more than completionist tracking |
| Core use case (ONE) | While browsing or after a work lands, **inscribe what stayed with you** and keep it in a private, intent-organized vault |
| Not | Social network, Letterboxd clone, or pure tracker |

---

## Executive Summary

Subsume has a rare, coherent product thesis: reflection before metadata, private multi-medium archive, and discovery that lives *on the pages the user already browses*. The Poetic Capture Canvas, museum plaques, hardcover Archive, and free-source fallbacks form a strong core that already delivers on the “sanctuary” promise. The main product risk is **activation**: first-run still walks users through a multi-step key ceremony, then lands them in an empty (or nearly empty) Archive without a forced first inscription — so the philosophy is clear before the habit is formed. Ferrari UI work has remapped shell tokens well; residual gold-hue hardcodes on book overlays and some search chrome slightly undercut the new brand voltage.

**Overall: 7.4 / 10** — Strong product with distinctive value; tighten onboarding → first capture, empty-state activation, and cross-surface Ferrari consistency to reach competitive polish.

---

## Scorecard

| Dimension | Score | Summary |
|-----------|-------|---------|
| Onboarding Flow | 6.5/10 | Beautiful welcome + skippable keys, but 5 steps skew to setup over first value; no guided first inscription after “Enter the house” |
| Core Experience | 8.0/10 | Emotion-first capture, plaques, Archive intents, dual medium, popup log — primary loop works and feels special |
| Error Handling | 7.5/10 | Notices, retries, free-feed degradation, validation on keys; some silent failures and raw message passthrough |
| Information Architecture | 7.0/10 | Clear primary triad (Archive / Discovery / Settings) + Explore strip; Settings dense; literary labels need learning |
| Visual Design & Polish | 8.0/10 | Distinctive cinematic system; Ferrari tokens largely live; leftover gold on book plaques / search chips |
| Performance | 7.0/10 | Prefetch, pagination, O(1) content cache; Home multi-source load can feel heavy on cold open |
| Accessibility | 7.0/10 | Focus traps, reduced motion, 44px targets, sr-only labels; Shadow DOM + Roman ratings limit SR clarity |
| Feature Completeness | 8.5/10 | Unusually complete for an extension: detect, capture, archive, people, alerts, AI, Drive, Goodreads, books+screen |
| **Overall** | **7.4/10** | Average of eight dimensions |

**Verdict band:** Strong — fix the gaps (especially activation) and the product is competitive with a clear niche.

---

## Top 3 Strengths

1. **Emotion-first capture is the product, not a feature**  
   Poetic Capture Canvas opens with “What stayed with you?”, progressive disclosure of intent/rating after ~40 characters of recall, emotional sliders + aura, focus trap, reduced-motion ceremony, and save feedback. Popup “Inscribe a title” and plaque “Reflect” converge on the same thesis. This is the differentiation vs trackers.

2. **In-context discovery without leaving the page**  
   Museum plaques (★ score → Reflect), hover cards with library state, book plaques (confidence-gated), and optional screenplay dock deliver Act I where users already browse. Closed Shadow DOM isolation and content prefs (keys never to content scripts) show product + trust maturity.

3. **Archive as editorial vault, not a spreadsheet**  
   Intent navigation (Keep This Memory / Revisit / Wishlist), medium filters (All / Screen / Books), hardcover spine cards with recall excerpts, DetailModal, pagination, and honest empty states make the private library feel intentional. Multi-medium (Open Library default, optional Google Books) expands the sanctuary beyond film-only tools.

---

## Top 3 Improvements

1. **Collapse activation to one first inscription**  
   After welcome (or one optional “keys later” screen), land on Discovery or popup-ready capture with a single CTA: *Inscribe your first title*. Defer OMDb/LLM steps until a feature needs them. Expected impact: more users complete the core loop in &lt;60s.

2. **Empty Archive must sell the habit, not only the poetry**  
   Empty states are well-written but abstract (“leave the first inscription”). Pair copy with two concrete actions: *Search catalogue* (already present) + *Open a Letterboxd/IMDb/book page* (with one-line how plaques appear) + optional *Load highlight reel* (demo) in-app, not only popup. Expected impact: fewer cold-start bounces.

3. **Finish Ferrari on content surfaces**  
   Shell tokens are Rosso Corsa; book plaque borders still use gold `hsla(45, …)` and Search type chips hardcode warm gold tints. Align overlays/popup with primary red voltage so the brand story holds everywhere the product is “felt.” Expected impact: trust + polish consistency with the Ferrari design program.

---

## First-Time User Walkthrough (evidence)

| Moment | Observation | Emotion |
|--------|-------------|---------|
| Install → open house | Skeleton nav, then onboarding if `onboardingComplete` false | Neutral |
| Step 1 welcome | “Your private picture palace” + Discover / Capture / Archive pillars — value clear in &lt;5s | Delight / clarity |
| Steps 2–4 keys | TMDb optional but framed as “catalogue key”; OMDb; LLM — all skippable with validation | Mild friction / setup fatigue |
| Step 5 done | “The house is lit” → Enter the house | Ready |
| Default page | Returning default is **Archive** (`getInitialPage` → library) — often empty | Confusion if no demo |
| Empty Archive | Poetic empty + Search catalogue CTA | Partial clarity |
| Discovery Home | Lobby hero, live feed (Trakt/TVmaze free path), Reflect/Archive on plaque | Value appears if feed loads |
| Popup | Stats, overlay status, Inscribe, tab-title prefill for film pages | Strong secondary path |
| Plaque on web | ★ + Reflect — fastest path to core value *if* detection hits | Delight when it works |
| Capture | Full-screen emotion-first canvas | Peak product moment |
| Settings | 8 sections — power-user complete | Overwhelming early |

**Time to first meaningful action (estimated):**

- Best path (popup on film page or plaque Reflect): **~30–90s** after install if onboarding skipped through keys.  
- Default path (full onboarding + empty Archive): **3–8+ minutes** before first inscription — activation risk.

---

## Detailed Dimension Reviews

### 1. Onboarding Flow (6.5/10)

**Working well**

- Clear value prop without tracker jargon on step 1; three pillars match product acts.
- Progress dots with `aria-current="step"`; password fields; external links for TMDb/OMDb.
- Keys skippable (“I'll add keys later” / Skip); empty TMDb blocked from false “validate” with honest error.
- Open Library / free sources documented so books work without keys.
- OpenAI `sk-` format warning; keys stay local messaging on final step.
- Gated by `onboardingComplete` — no half-state shell.

**Needs improvement**

- **Severity: High** — Five steps over-index on API ceremony before any archive or capture moment.
- **Severity: High** — Post-onboarding has no checklist, tour, or forced first inscription; demo library is opt-in only (correct for ownership, wrong for empty first impression if not surfaced).
- Literary framing (“picture palace”, “house”) is brand-aligned but may not map to “what do I click?” for pragmatic users.
- No preview of plaques/hover behavior during onboarding (value is told, not shown).

**Suggested fix**  
2-step onboarding: (1) Welcome + pillars + optional “see how discovery works” static mock, (2) optional TMDb only. Move OMDb/LLM to Settings with contextual prompts when user opens AI Recommendations or Ratings. After complete → Discovery with hero CTA *Inscribe first title* and secondary *Skip for now → Archive*.

---

### 2. Core Experience (8.0/10)

**Working well**

- **Capture:** Progressive disclosure, emotional spectrum, intent chips, rating, atmosphere/lingering fields, multi-message save pipeline, ceremony + error recovery.
- **Discover:** Home lobby, live feed without keys, weekly digest with free-feed fallback, recommendations hydration, platform chips.
- **Archive:** Intent + medium + tags + search + sort + load more; spine cards surface emotional recall.
- **Popup:** Dual overview/log views; tab title heuristics (Letterboxd, IMDb, Netflix, Wikipedia); success overlay.
- Product copy centralization (`productCopy.ts`) keeps archive verbs consistent.

**Needs improvement**

- **Severity: Medium** — Hero “Directed by” line can show raw bio text when `wikidataDirectorBio` is used as director stand-in (`heroDirector` path) — trust hit if bio dumps into plaque.
- **Severity: Medium** — Core loop spans three entry points (plaque → full app capture, popup log, Search → detail); mental model for “where did I save this?” can blur for new users.
- **Severity: Low** — Roman numeral rating (I–X) is aesthetic; less scannable than 1–10 for speed raters.

**Suggested fix**  
Unify “saved” confirmation with deep link “View in Archive” from popup and capture. Normalize director display to name-only when bio exists. Keep Roman numerals but expose `aria-label` with numeric score (partially present elsewhere — ensure on all rating controls).

---

### 3. Error Handling (7.5/10)

**Working well**

- `formatUserError` + `showNotice` / InlineNotice patterns on Settings, Home add, onboarding save failure.
- Library load error plaque + Try Again; filtered empty with clear filters; capture load error + retry.
- Feed error plaque with Try again; discovery free-source fallback when digest empty.
- Key validation before continue on TMDb/OMDb.
- Goodreads import: partial success messaging with row samples; Drive connect status text.
- `role="alert"` on onboarding errors; `aria-live="polite"` on archive counts.

**Needs improvement**

- **Severity: Medium** — Popup demo restore swallows errors (`catch { /* ignore */ }`).
- **Severity: Medium** — Some paths still surface raw exception strings to users.
- **Severity: Low** — Home dashboard outer catch only `console.error` without user-visible global failure state if prefs+feeds both fail oddly.

**Suggested fix**  
Standardize all user-visible failures through notice + one recovery action. Never silent-catch user-initiated actions. Map network/rate-limit codes to short copy (“Live feed is quiet — try again in a minute”).

---

### 4. Information Architecture (7.0/10)

**Working well**

- Primary nav: **Archive · Discovery · Settings** — three-act mental model.
- Explore subnav: Search, Recommendations, Now Showing, Creators — discovery destinations without crowding primary.
- House tools (Stats, Premiere Alerts) in drawer — secondary but findable.
- Settings sections catalog with plain-language descriptions (`settingsCatalog.ts`).
- Hash deep links (`#ai-curator`, `#diagnostics`) and `?page=` / `?act=capture` routing.
- Default returning users to Archive (philosophy: vault first) is intentional.

**Needs improvement**

- **Severity: Medium** — Eight Settings sections + AI curator + Drive + diagnostics is power-user dense; first-week users only need Appearance + API keys + Browsing overlays.
- **Severity: Medium** — Naming dualities (Library vs Archive, Home vs Discovery, Now Showing vs New Releases in code) are mostly cleaned in UI but code/docs still mix terms.
- **Severity: Low** — Drawer “Browse the house” metaphor vs material icons in Explore — slight visual IA inconsistency.

**Suggested fix**  
Settings “Essentials” default view (theme, overlays, TMDb) with “Advanced” expand. Keep literary names in headings but use operational verbs on buttons (already partial: Search catalogue, Try again).

---

### 5. Visual Design & Polish (8.0/10)

**Working well**

- Ferrari-aligned tokens: primary `#da291c`, canvas `#181818`, elevated surfaces, Inter stacks, tighter radii, red gradients (`tokens.css`, `shadowTokens.ts`).
- Cinematic lobby, film grain, plaque language, focus-pull, motion ≤300ms, atmosphere presets preserved.
- Skeleton loaders on app shell, library, home cards.
- Popup film grain + success ceremony; content plaques with hover spring and focus-visible rings.

**Needs improvement**

- **Severity: Medium (Ferrari program)** — `bookOverlay.ts` borders still gold-hue `hsla(45, 80%, 55%, …)`; Search type filter inline gold soft backgrounds — breaks Rosso Corsa system on high-visibility surfaces.
- **Severity: Low** — PRODUCT.md still references “Gilded Night / gold accent” — product messaging lag vs design system.
- **Severity: Low** — Extension surfaces are desktop-primary; popup density is good but long log form can feel cramped.

**Suggested fix**  
Replace residual gold hardcodes with `var(--primary)` / red rgba aliases per Ferrari plan. Sweep inline styles in Search. Update PRODUCT.md register line to Ferrari cinematic system.

---

### 6. Performance (7.0/10)

**Working well**

- Nav prefetch (`usePrefetch`); library page size 40 with append.
- Content-script O(1) library set for hover/badge (documented architecture).
- Home uses `Promise.allSettled` so one failing source doesn’t block shell.
- Debounced popup search (350ms); lazy poster images in several lists.
- Capture closes with animation fallback timers so UI doesn’t hang.

**Needs improvement**

- **Severity: Medium** — Home cold load fans out prefs, digest, recommendations, discovery feed, then media hydration — can feel slow on first open without skeleton for *all* sections (partial skeleton only).
- **Severity: Low** — Capture save is multi sequential IPC (add → status → notes → rating) without optimistic UI until ceremony.
- **Severity: Low** — Client-side filter after paginated fetch can miss matches until “Open more of the vault” (honest note exists — still friction).

**Suggested fix**  
Stagger Home: paint lobby + empty hero first, stream feed next. Batch capture save if backend allows. Consider server-side (worker) filter for intent when library is large.

---

### 7. Accessibility (7.0/10)

**Working well**

- Capture dialog: `role="dialog"`, `aria-modal`, labelled heading, focus trap, Escape, restore focus, `sr-only` on recall label.
- Nav drawer: focus trap, Escape, `aria-expanded` / `aria-controls`, close restores focus to menu toggle, reduced-motion skip animation.
- Plaques: `aria-label` Reflect, `min-height/width` 44px, focus-visible outlines.
- Onboarding step nav labelled; errors as alerts.
- Theme/system support; contrast targets for Ferrari dark (white on near-black, muted body `#969696`).

**Needs improvement**

- **Severity: Medium** — Closed Shadow DOM overlays may be inconsistently exposed to screen readers depending on host page; not a full WCAG audit surface.
- **Severity: Medium** — Roman numeral rating buttons need consistent accessible names (“Rating 7 of 10”).
- **Severity: Low** — Popup suggestions keyboard highlight exists; ensure full listbox pattern (aria-activedescendant) if not complete.
- **Severity: Low** — No i18n; English literary copy only — acceptable for stage, noted for completeness.

**Suggested fix**  
Audit rating/intent chips for accessible names; add live region “Reflection saved” for SR after capture; document overlay a11y limits in store listing.

---

### 8. Feature Completeness (8.5/10)

**Working well**

- Screen + books detection, plaques, hover, dock.
- Archive intents, emotions, tags, notes, editions (books), people/filmography, alerts, stats.
- Free sources (TVmaze, Trakt, Wikidata) + optional TMDb/OMDb/Google Books/LLM.
- Recommendations, weekly digest / dispatch, discovery feed, search.
- Export/import, Google Drive, Goodreads CSV seed, diagnostics, content overlay prefs, site blocklist area (browsing settings).
- Demo library restore (opt-in) — correct product honesty after removing silent seed.

**Needs improvement**

- **Severity: High (activation, not feature gap)** — Missing **first-run success path** as a designed feature (checklist / sample capture), not more catalogue APIs.
- **Severity: Medium** — Social/share intentionally absent (brand OK); competitive switch from Letterboxd still needs import/export clarity for *screen* (Goodreads covered for books).
- **Severity: Low** — Streaming deep availability varies by data source; platform chips help but “where to watch” is not always first-class.
- **Severity: Low** — Cross-medium recommendations / AI require configuration — power is gated behind settings many users skip.

**Suggested fix**  
Ship “First night in the house” checklist (3 steps: enable overlays, inscribe one title, open Archive). Optional Letterboxd CSV later. Surface “AI off — rule-based picks still work” on Recommendations empty state.

---

## Severity Findings (full list)

| ID | Severity | Area | Finding | Impact |
|----|----------|------|---------|--------|
| P1 | **High** | Onboarding / activation | Multi-step key wizard before any inscription; no post-setup guided capture | Users bounce before core value |
| P2 | **High** | Empty states | Archive empty is poetic but under-specifies *how* to get first title (web plaques + popup under-explained in-app) | Cold vault feels broken |
| P3 | **Medium** | Ferrari UI | Book plaques + Search chips still gold-hue hardcoded | Brand inconsistency after token remap |
| P4 | **Medium** | IA / Settings | Eight equal-weight settings sections overwhelm early users | Config anxiety; overlays/keys missed |
| P5 | **Medium** | Core copy | Literary vocabulary on critical CTAs increases cognitive load for pragmatic users | Mis-clicks / abandonment |
| P6 | **Medium** | Home hero | Director/bio field misuse risk on plaque subtitle | Looks buggy; trust damage |
| P7 | **Medium** | Errors | Silent catch on popup demo restore; occasional raw errors | Users don’t know what failed |
| P8 | **Medium** | A11y | Overlay SR exposure + rating control names incomplete | Exclusion of SR users on core loop |
| P9 | **Medium** | Performance | Home multi-source fan-out on first paint | Slow first impression |
| P10 | **Low** | Docs/register | PRODUCT.md still Gilded Night / gold | Internal misalignment |
| P11 | **Low** | Ratings UX | Roman numerals aesthetic over scannability | Slower logging for some users |
| P12 | **Low** | Completeness | Screen library import parity with Goodreads books path | Switchers from trackers stick less |

---

## Web3 patterns note

`crypto-ux-patterns.md` does not apply (Subsume is not a wallet/web3 product). Analogous trust patterns **are** present and score well: local-first data, optional credentials deferred, no keys in content scripts, export without secrets, honest free-tier data sources.

---

## Improvement Roadmap

### Quick wins (&lt; 1 day)

- [ ] **P3** — Remap book plaque + Search gold hardcodes to Ferrari primary/red soft tokens  
- [ ] **P2** — Empty Archive: add secondary CTA “How discovery works” (3 bullets: browse → plaque → Reflect) + surface “Load highlight reel” in-app  
- [ ] **P7** — Remove silent catches on user actions; always notice  
- [ ] **P10** — Align PRODUCT.md visual register with Ferrari  
- [ ] **P6** — Clamp hero director line to name / short credit, never full bio dump  

### Medium effort (1–3 days)

- [ ] **P1** — Reduce onboarding to welcome + optional TMDb; contextual prompts for OMDb/LLM  
- [ ] **P1/P2** — Post-onboarding “First inscription” path: open Search or popup log with prefilled empty state  
- [ ] **P4** — Settings Essentials vs Advanced grouping  
- [ ] **P5** — Dual-layer copy: literary page titles + plain button verbs audit  
- [ ] **P8** — Accessible names on rating/intent; capture success live region  
- [ ] **P9** — Progressive Home loading (lobby first, feeds second)  

### Major investment (1+ week)

- [ ] **Guided first-run product surface** — Interactive mini-tour or mock plaque in onboarding  
- [ ] **Screen import** (Letterboxd/CSV) parity with Goodreads for switchers  
- [ ] **Full overlay a11y + detection confidence UX** — Explain mid-band books not auto-plaqued; user-confirm flow  
- [ ] **Where to watch** enrichment as first-class when providers exist  

---

## Ferrari UI context (product implications)

| Layer | Ferrari status (product view) | User-facing effect |
|-------|-------------------------------|--------------------|
| App shell tokens | Remapped to Rosso Corsa / Cinema Black | Primary CTAs and nav voltage feel intentional |
| Onboarding | Uses onboarding primary tokens | Welcome feels on-brand |
| Popup / sanctuary cards | Largely token-driven | Consistent “house” interior |
| Content book plaques | Residual gold borders | Discovery *on the web* still reads slightly Gilded Night |
| Motion | ≤300ms, reduced-motion aware | Matches luxury restraint (not flashy sports-car chaos) |

Ferrari is a **restraint + voltage** system: one red accent, near-black canvas, white ink. Product copy should stay calm and editorial; red should mark primary actions (Reflect, Save, Enter the house) only — already mostly true in shell.

---

## Closing

Subsume does not need more features to be valuable; it needs a **sharper first night**: get one real inscription into the vault, show the user their own words on a spine, and prove that plaques will meet them on the next tab. The core experience and feature completeness already sit at “strong product.” Close activation and surface consistency, and the score moves cleanly into the 8s.
