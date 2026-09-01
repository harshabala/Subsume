# Plan: Fix every roast issue (2026-08-11)

**Source roast:** `docs/design-reviews/2026-08-11/20-roast-my-product.md`  
**Branch:** `feat/roast-fixes-activation-retention`  
**Repo:** `/Users/harshabalakrishnan/Subsume`

## Global Constraints

- Work on feature branch only; conventional commits; no force-push.
- Do not break free offline core loop (zero API keys still works).
- Local-first privacy: no cloud analytics; activation metrics stay on-device only.
- Motion ≤300ms user-facing; keep `prefers-reduced-motion` / transparency split.
- Tests: add focused tests per task; full suite green before branch complete.
- YAGNI: no real payment processor, no new cloud backend, no dual-type font reverse.
- Protect: Poetic Capture, hardcover spines, spring drawer, solid Rosso CTAs, closed-shadow plaques.

## Issue → Task Map

| Roast issue | Task |
|-------------|------|
| Activation dies / force first inscription | T1 |
| No return ritual / weekly pulse | T2 |
| Naming / plain English pitch | T3 |
| Phantom metrics / builder can't see activation | T4 |
| Silent content-script failures | T5 |
| Spatial break Reflect new tab | T6 |
| Loading without explanation | T7 |
| Settings landfill for new users | T8 |
| Monetization shrug / product-or-portfolio | T9 |
| Moat / distribution (code-reachable part) | T10 export stickiness + CWS pitch |

---

## Task 1: Force first inscription flow

**Files:** `src/ui/pages/Onboarding.tsx`, `src/ui/App.tsx`, `src/ui/pages/Home.tsx` or new `FirstInscriptionGate.tsx`, `src/shared/types.ts`, `src/background/storage.ts` defaults, tests

**Requirements:**
1. Pref flag `firstInscriptionComplete: boolean` (default false). Set true on first successful archive inscription (ADD_TO_LIST / capture save path that creates library item with note OR any first library item from user action).
2. After onboarding completes, show a blocking-but-skippable full-screen or modal gate: headline plain English "Save your first reflection", primary CTA opens Search focused, secondary "I'll do this later" sets a soft skip timestamp but keeps banner on Discovery until first inscription.
3. When library is empty and `!firstInscriptionComplete`, Discovery shows persistent region (already partial) upgraded to **required path**: primary button Search + optional one-tap "Try with a practice title" that seeds a single demo work into library and opens capture.
4. Acceptance: new install can complete first reflection without leaving the extension UI for an external host page.

**Tests:** onboarding complete → gate visible; skip → banner remains; first save → flag true and gate gone.

---

## Task 2: Free weekly return ritual (no keys)

**Files:** prefs defaults, Home Discovery, dispatch/digest generation path, alarms if needed, Settings weekly selection copy

**Requirements:**
1. Default `dispatchEnabled` (or equivalent free digest) **true** for new installs so a weekly local selection runs without LLM.
2. Discovery home always shows a "This week" / "Your weekly selection" card when digest exists; empty state explains "You'll get a free local pick list every week — no API keys."
3. Card deep-links to search/capture for first item.
4. Copy must say **weekly selection** never Dispatch for users.

**Tests:** default prefs dispatch enabled; Home renders weekly section when digest present.

---

## Task 3: Plain-English pitch surfaces

**Files:** `Onboarding.tsx` welcome copy, `manifest.json` description if needed, `README.md` top blurb, popup empty/overview one-liner, `PRODUCT.md`

**Requirements:**
1. First onboarding screen leads with: "Private movie & book journal for Chrome. Save what stayed with you while you browse." Poetry secondary.
2. Popup empty vault: plain English first, poetry optional second line.
3. README tagline matches.

**Tests:** string presence tests or onboarding test for plain pitch.

---

## Task 4: Local activation counters (device-only)

**Files:** storage prefs or separate storage key `subsume_activation_metrics`, handlers, Settings diagnostics or House Stats quiet section

**Requirements:**
1. Counters: `appOpens`, `firstInscriptionAt`, `inscriptionsTotal`, `weeklySelectionOpens` — never leave device.
2. Increment appOpens when options page loads (once per session).
3. Surface in Settings → Diagnostics (or House Stats) with privacy line: "Stored only on this device."

**Tests:** counter increment pure function / handler test.

---

## Task 5: Visible errors for content-script archive actions

**Files:** `hoverCard.tsx`, `overlay.ts` / book overlay add handlers, toast or chrome.notifications or in-card error text

**Requirements:**
1. On ADD_TO_LIST / REMOVE failure from hover card or plaque, show user-visible error in the card (role=alert) for ≥3s; do not only console.error.
2. Success path unchanged.

**Tests:** if unit-testable message path, mock sendMessage failure → error text set.

---

## Task 6: Reflect without always opening a new tab

**Files:** content overlay Reflect handler, `OPEN_CAPTURE_CANVAS` / options URL open path

**Requirements:**
1. Prefer `chrome.runtime.sendMessage` to open capture in existing extension options tab if one is open; else open one tab (not pile of tabs).
2. Document behavior in code comment.
3. Do not break capture deep link `?act=capture&mediaId=`.

**Tests:** unit test pure helper for URL builder / tab reuse logic if extracted.

---

## Task 7: Honest Discovery loading copy

**Files:** `Home.tsx`

**Requirements:**
1. While feed/digest/library loading, show explicit status lines: "Loading your archive…", "Fetching free catalogue…", not a silent spinner only.
2. Error plaques already exist — keep and ensure retry visible.

**Tests:** optional render test for loading text.

---

## Task 8: Settings progressive disclosure for new users

**Files:** `Settings.tsx`, `settingsCatalog.ts`

**Requirements:**
1. When `!firstInscriptionComplete`, Settings opens to a "Start here" panel: plain pitch, link to Search, link to first inscription, collapse advanced (AI, Drive, atmosphere) under "More options".
2. After first inscription, current full catalog remains default.

**Tests:** catalog filter / section visibility helper test.

---

## Task 9: Product vs portfolio decision surface

**Files:** `PRODUCT.md`, Settings Backup section, optional `docs/PRODUCT_INTENT.md`

**Requirements:**
1. Document decision: **product path** — free core + optional paid encrypted backup later (not implemented payments).
2. Settings Backup block copy: "Free forever on this device. Optional private backup (coming) — never sells your data."
3. No fake checkout.

**Tests:** none required beyond copy presence if testing copy module.

---

## Task 10: Export stickiness + store pitch

**Files:** export UX if any, README CWS section, `store/LISTING.md` if present

**Requirements:**
1. After export success, show: "Keep this file — it's the only full copy of your sanctuary off this device."
2. CWS/listing short description = plain English pitch from T3.

**Tests:** optional.

---

## Done when

All tasks committed; full test suite green; PR opened against main; roast issues mapped in PR body.
