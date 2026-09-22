# Roast My Product — Subsume Baseline Re-run (2026-09-22)

**Product:** Subsume Chrome MV3 extension v0.3.0  
**HEAD:** `6976165` (`feat/path-to-10` / `main`)  
**Stage:** Calibrated Baseline / Path-to-10 Milestone  
**Audience:** Private cinephiles & book lovers seeking a reflective sanctuary away from algorithmic feeds  
**Comparison:** Calibrated diff against the 2026-08-11 baseline (`615113d`)  

---

## Verdict

You built a real doorway and started holding weekly services, but your sanctuary still leaves the altar keys on the porch and speaks in stage whispers to newcomers.

---

## Scorecard Diff (Aug-11 vs. Sept-22 Baseline)

| Dimension | Aug-11 | Sept-22 | Delta | Justification |
|-----------|:------:|:-------:|:-----:|---------------|
| Value Proposition (2×) | 6/10 | **7/10** | **+1** (+2 wt) | Shipped `PLAIN_ENGLISH_PITCH` ("Private movie & book journal for Chrome...") leads Onboarding, Store listing, and empty states. A stranger gets the core purpose instantly. Held back from 8+ by lingering "picture palace" and "afterglow" subtext. |
| Crypto Necessity (1×) | 10/10 | **10/10** | **0** | Flawless local-first IndexedDB architecture. Zero blockchain bloat, zero token gimmicks, zero ornamental distributed ledgers. Full credit maintained. |
| Target User Clarity (1×) | 5/10 | **5/10** | **0** | The pitch is cleaner, but the audience is still an idealized mental construct ("anti-algorithm cinephile/reader"). Still lacks a named cohort of 10 real users testing builds or a defined acquisition wedge. |
| First-Time User Experience (1×) | 5/10 | **7/10** | **+2** | `FirstInscriptionGate` forces the first save decision immediately after onboarding; "Try with a practice title" provides an instant zero-friction path; Settings progressive disclosure hides advanced tabs. Still docked for TMDb API token form in Step 2. |
| Core Loop (1×) | 5/10 | **7/10** | **+2** | Free weekly selection (`dispatchEnabled: true`) now active out-of-the-box without API keys; weekly notification badge armed; persistent "This week" card on Discovery provides a recurring return trigger. |
| Competitive Moat (1×) | 3/10 | **4/10** | **+1** | Added explicit export stickiness warning (`EXPORT_KEEP_FILE_NOTICE`) and declared product-path intent over portfolio abandon. Moat remains low switching cost until months of personal writing accumulate. |
| Technical Execution (1×) | 8/10 | **8/10** | **0** | 83 test suites (~570+ tests), robust tab reuse (`openCaptureCanvasTab`), local device-only activation counters, accessible modal trapping. Blocked from 9/10 because API keys are stored in unencrypted plaintext in IndexedDB. |
| Naming & Messaging (1×) | 4/10 | **6/10** | **+2** | Replaced internal jargon "Dispatch" with "Weekly selection"; plain-English headlines across Onboarding, popup, and README. "Subsume" remains an opaque Latinate brand, and theatrical taxonomy (Acts, House, Plaques) still surfaces in the first 60 seconds. |
| Monetization Path (1×) | 2/10 | **3/10** | **+1** | Documented product intent in `docs/PRODUCT_INTENT.md` (free local core + future paid E2EE cloud backup/sync) and placed a teaser in Settings. Still zero billing infrastructure, pricing validation, or waitlist capture. |
| Market Timing (1×) | 5/10 | **5/10** | **0** | Growing fatigue with Goodreads and Letterboxd monetization creates clear appetite for quiet tools, but Chrome Web Store distribution remains brutal without an audience funnel. |
| **Weighted Total** | **59/110** | **69/110** | **+10** | **Band: 69/110** — Top threshold of *Needs significant work* (50–69), poised to cross into *Strong* (70–89). |

---

## Dimension-by-Dimension Deep Dive

### 1. Value Proposition (Weight: 2×)
- **Aug-11 Score:** 6/10 (12/20 weighted)
- **Sept-22 Score:** 7/10 (14/20 weighted) — **Delta: +1**
- **What moved the score:** The introduction and systematic enforcement of `PLAIN_ENGLISH_PITCH` ("Private movie & book journal for Chrome. Save what stayed with you while you browse.") across `src/shared/productCopy.ts`, Onboarding Step 1 headline, popup empty state, `store/LISTING.md`, and `README.md`. A new visitor no longer has to parse an artistic manifesto to figure out what the software does.
- **Why it is not an 8 or 9:** The secondary subcopy immediately retreats into poetic theatre ("Your private picture palace: afterglow and memory matter more than any algorithm's tally"). The brand name "Subsume" still means "absorb into a rule" rather than "reflect on art". The value prop is understandable, but still requires the user to forgive some literary pretension.

### 2. Crypto Necessity (Weight: 1×)
- **Aug-11 Score:** 10/10
- **Sept-22 Score:** 10/10 — **Delta: 0**
- **What moved the score:** Nothing broke, and no bad decisions were made.
- **Why it remains 10/10:** Subsume proves that local-first, privacy-respecting client software needs zero Web3 baggage. Data lives in client-side IndexedDB, keys stay local, and exports are standard JSON. It does not pretend a blockchain solves local journal ownership.

### 3. Target User Clarity (Weight: 1×)
- **Aug-11 Score:** 5/10
- **Sept-22 Score:** 5/10 — **Delta: 0**
- **What moved the score:** Stagnant. While product copy was sharpened, customer development did not happen between commits.
- **Why it remains a 5/10:** The target persona remains an abstraction: "the quiet cinephile and reader who dislikes Letterboxd stars." Who are they? Where do they hang out? Can the team name 10 specific people who installed build `6976165` and wrote 3 reflections this week? Until real user feedback and usage channels exist, this is founder empathy, not target user validation.

### 4. First-Time User Experience (Weight: 1×)
- **Aug-11 Score:** 5/10
- **Sept-22 Score:** 7/10 — **Delta: +2**
- **What moved the score:** The activation funnel was fundamentally re-architected in `6976165`:
  1. `FirstInscriptionGate.tsx` appears full-screen immediately following onboarding, forcing a clear choice: "Search for a title", "Try with a practice title", or explicit soft-skip.
  2. "Try with a practice title" seeds practice data and opens the reflection canvas in one tap, proving the core value in under 30 seconds.
  3. Discovery lobby maintains a persistent `discovery-first-inscription` banner if skipped.
  4. Settings implements `shouldShowSettingsStartHere`, collapsing overwhelming configuration tabs into `<details className="settings-more-options">`.
  5. Discovery displays honest loading copy ("Loading your archive… Fetching free catalogue and weekly selection…") rather than blank spinners.
- **Why it is not an 8 or 9:** Onboarding Step 2 still asks for a TMDb API Read Access Token before the user has ever used the product. Even with an "Enter without keys" button, putting an API key field in the onboarding flow creates cognitive dread and tech-support anxiety for everyday readers. Furthermore, the "practice title" action seeds the entire 12-item demo library rather than a focused single work.

### 5. Core Loop (Weight: 1×)
- **Aug-11 Score:** 5/10
- **Sept-22 Score:** 7/10 — **Delta: +2**
- **What moved the score:** The activation/retention fixes directly resolved the "no return ritual" indictment:
  1. `dispatchEnabled` is now `true` by default in `src/background/storage.ts`.
  2. The multi-medium weekly selection runs automatically every week using free local catalog data without requiring an LLM or API keys.
  3. Discovery highlights "This week · Weekly selection" with a direct CTA to reflect on the lead title.
  4. System notifications (`weekly-digest`) and browser action badges (`✦`) trigger when a new selection is ready.
  5. `openCaptureCanvasTab` reuses existing tabs instead of opening duplicate tabs every time a user clicks "Reflect".
- **Why it is not an 8 or 9:** The loop is still vulnerable to browser notification suppression. If the user dismisses Chrome notifications or browses without opening the extension popup/options, Subsume has no secondary re-engagement mechanic. There is no in-browser nudge when finishing a movie on Netflix or finishing a book on Goodreads.

### 6. Competitive Moat (Weight: 1×)
- **Aug-11 Score:** 3/10
- **Sept-22 Score:** 4/10 — **Delta: +1**
- **What moved the score:** Shipped the export stickiness notice (`EXPORT_KEEP_FILE_NOTICE`: "Keep this file — it's the only full copy of your sanctuary off this device.") and explicitly established a long-term data sovereignty thesis in `docs/PRODUCT_INTENT.md`.
- **Why it is not higher:** A moat requires either high switching costs, network effects, or proprietary data. Subsume has zero network effects by design. Switching costs only become tangible after a user has authored dozens of deeply personal reflections over 6+ months. Right now, any skilled front-end engineer could fork the UI concepts in a week.

### 7. Technical Execution (Weight: 1×)
- **Aug-11 Score:** 8/10
- **Sept-22 Score:** 8/10 — **Delta: 0**
- **What moved the score:** Engineering craft increased noticeably:
  - Accessible dialog primitives: `FirstInscriptionGate` implements ARIA role dialog, modal aria tags, focus trap, and Escape key handling.
  - Tab management: `openCaptureCanvasTab` fixes tab pollution by reusing active UI tabs.
  - Privacy-preserving instrumentation: `activationMetrics.ts` tracks activation events purely in local storage with zero network leakage.
  - Content script resilience: `hoverCard.tsx` and `bookOverlay.ts` show user-visible error alerts (`ARCHIVE_UPDATE_ERROR`) rather than silent console errors.
- **Why it cannot get a 9/10:** **Critical security hole:** API keys (TMDb, OMDb, OpenAI, Anthropic, Gemini) are stored in cleartext in IndexedDB `preferences`. Any malicious extension with storage permissions or local disk access can exfiltrate raw LLM credentials. Furthermore, there is no end-to-end automated test verifying a clean-slate cold install in an actual headless browser.

### 8. Naming & Messaging (Weight: 1×)
- **Aug-11 Score:** 4/10
- **Sept-22 Score:** 6/10 — **Delta: +2**
- **What moved the score:** Major cleanup of internal jargon:
  - Eliminated "Dispatch" in favor of "Weekly selection" (`WEEKLY_SELECTION_LABEL`).
  - Added the clear, plain tagline to the onboarding screen, popup header, and CWS store metadata.
  - Settings panels now feature plain-language descriptions instead of developer shorthand.
- **Why it is not a 7 or 8:** The brand name "Subsume" remains an obstacle—it does not evoke cinema, books, or journaling. Within 60 seconds of use, the user is still confronted with "repertoire", "afterglow", "vault", "inscriptions", "plaques", and "monogram". The product suffers from a dual personality: a crisp modern Chrome extension trapped inside an avant-garde cinema archive.

### 9. Monetization Path (Weight: 1×)
- **Aug-11 Score:** 2/10
- **Sept-22 Score:** 3/10 — **Delta: +1**
- **What moved the score:** Shipped `docs/PRODUCT_INTENT.md` declaring Subsume as a commercial product path rather than an abandoned portfolio experiment. Added `BACKUP_SECTION_PITCH` ("Free forever on this device. Optional private backup (coming) — never sells your data.") to the Settings UI.
- **Why it is still a 3/10:** Words are cheap. There is no payment gateway (Stripe/LemonSqueezy), no cloud backup server architecture, no pricing tiers, and no email waitlist to gauge conversion intent. It is an honest intention, but not yet a business.

### 10. Market Timing (Weight: 1×)
- **Aug-11 Score:** 5/10
- **Sept-22 Score:** 5/10 — **Delta: 0**
- **What moved the score:** No macro shifts between August and September 2026.
- **Why it remains a 5/10:** The cultural backlash against algorithmic feeds, ad-tracking, and gamified book/movie social networks is real and growing. However, consumer willingness to pay for standalone desktop browser extensions is notoriously low. The timing is decent, but distribution headwinds remain steep.

---

## The Worst Issues Remaining Today

### 1. Plaintext API Keys in IndexedDB Storage
**What's wrong:** User API keys (TMDb, OMDb, Gemini, Anthropic, OpenAI) are saved in cleartext inside IndexedDB `preferences` (`src/background/storage.ts` and `src/background/handlers/settings.ts`). While sanitized for content scripts, any local file inspection or extension vulnerability exposes raw user credentials.  
**Why it matters:** Users entering expensive, personal LLM tokens (e.g. OpenAI/Anthropic keys with auto-billing) face real financial and security risk. A privacy-focused tool cannot be careless with credentials.  
**What good looks like:** Encrypt sensitive credentials at rest using Web Crypto API (AES-GCM) with an extension-derived salt or Chrome storage session, or leverage `chrome.storage.session` for transient session keys.

### 2. Theatrical Jargon in the First 60 Seconds
**What's wrong:** Despite the plain-English headline, the onboarding screen and Discovery view are still saturated with archaic vocabulary: "picture palace", "afterglow", "repertoire", "plaques", "vault", "Acts", and "inscribing".  
**Why it matters:** First impressions dictate bounce rates. New users looking for a clean movie/book log feel alienated by baroque terminology before they understand the tool's utility.  
**What good looks like:** Reserve poetic terminology for deeper reflective states (like the Reflection canvas itself). Keep navigation, onboarding, and primary action buttons strictly functional: "Home", "Library", "Save Note", "Recent Entries".

### 3. Unverified Cold-Install Flow
**What's wrong:** While Vitest unit tests cover individual components, there is no end-to-end automated test executing a pristine cold install in a clean browser session (empty IndexedDB, unseeded storage, fresh Chrome extension context) and completing the first reflection.  
**Why it matters:** Edge cases in IndexedDB initialization, permission prompts, or async preference hydration can silently break for a user who downloads from the Chrome Web Store on day one.  
**What good looks like:** A Playwright-based headless Chrome test that loads the unpacked extension into a pristine profile, navigates onboarding without keys, seeds a practice reflection, and verifies persistence.

### 4. Non-Existent Backup Scaffold
**What's wrong:** Settings promises "Optional private backup (coming) — never sells your data", but there is literally zero architectural scaffolding in the codebase for how private backup will work (e.g., zero-knowledge encryption format, client-side key derivation, or sync protocol).  
**Why it matters:** If local IndexedDB is corrupted, cleared by Chrome storage pressure, or the user switches laptops, their entire journal is permanently vaporized unless they manually remembered to download a raw JSON file.  
**What good looks like:** A concrete cryptographic backup format specification, an export checksum validator, and an optional encrypted Google Drive / WebDAV sync provider scaffolded in code.

### 5. Export Format Lacks Moat & Documentation
**What's wrong:** The export feature produces a JSON dump, accompanied by a warning to "Keep this file". But there is no accompanying documentation, schema validation tool, or human-readable HTML/Markdown export option.  
**Why it matters:** Users don't know what to do with a raw `.json` file. If they can't easily view, print, or migrate their data to Obsidian or Notion, the export feels like a developer debug log rather than a prized personal asset.  
**What good looks like:** An export modal that offers Markdown/HTML export options, documents the schema, and demonstrates why Subsume's relational reflections are vastly superior to a Letterboxd CSV.

---

## Common Sins & UX Red Flags (Re-Audit)

### Sins Mitigated vs. Sins Active
- **Complexity Worship [PARTIALLY MITIGATED]:** The Settings page now collapses advanced options for newcomers, and "Weekly selection" replaced "Dispatch". However, Discovery is still labeled "Act I", and navigation retains theatrical labels in the drawer.
- **No Retention Loop [MITIGATED]:** Free weekly selection defaults to enabled (`dispatchEnabled: true`), generating recurring local digests without user configuration.
- **Phantom Metrics [RESOLVED]:** Shipped `activationMetrics.ts` with transparent, device-only activation counters visible in Settings Diagnostics.
- **Jargon Overload [ACTIVE]:** Still active across secondary copy and navigation.
- **Bridge to Nowhere [ACTIVE]:** Excellent local architecture, but zero documented customer acquisition channels or community distribution.

### UX Red Flags Checked
- **Value delayed by ceremony [IMPROVED]:** Reduced to 2 onboarding steps + 1 gate, but Step 2 still shows an API key form.
- **Loading without explanation [RESOLVED]:** Discovery now renders explicit loading text: "Loading your archive… Fetching free catalogue and weekly selection…".
- **Silent content-script failures [RESOLVED]:** Hover card and book overlay now display `ARCHIVE_UPDATE_ERROR` with `role="alert"` upon failure.
- **Spatial break on reflection [RESOLVED]:** `openCaptureCanvasTab` reuses existing tabs instead of opening new tabs.
- **Settings as feature landfill [IMPROVED]:** New users now see a clean "Start here" card with other sections tucked into `<details>`.

---

## Fix List: Path from 69 to 90+ (Top 3 Priorities)

1. **Highest Impact: Strip API Key Ceremony from Onboarding (Target: FTUX 7 -> 9, Value Prop 7 -> 8)**
   - Remove Step 2 (TMDb key input) from initial onboarding entirely. Let every new install land directly into the product with zero key prompts.
   - Move all API key configurations exclusively into Settings → Catalog Sources.
   - Make the "Practice Title" experience a single-item interactive walkthrough that teaches the user how to reflect in under 45 seconds.

2. **Easiest Win: Encrypt Keys at Rest & Clarify First-Minute Vocabulary (Target: Tech Execution 8 -> 9, Naming 6 -> 7)**
   - Implement Web Crypto AES-GCM wrapping for stored API keys in IndexedDB.
   - Replace "Act I", "repertoire", "plaques", and "afterglow" in onboarding and Discovery lobby with simple, clear English ("Home", "Catalog", "Saved Cards", "Notes").

3. **Existential Fix: Validated Backup & Acquisition Funnel (Target: Moat 4 -> 7, Monetization 3 -> 6)**
   - Build a client-side encrypted export (password-protected AES-256 JSON/Markdown).
   - Launch an email capture / waitlist landing page for the encrypted multi-device sync tier to validate commercial willingness-to-pay before writing server backend code.
   - Establish a direct distribution channel (CWS featured submission + curated Substack/Letterboxd migration guide).

---

*Roast baseline re-run: roast-my-product framework · Commit `6976165` · 2026-09-22*
