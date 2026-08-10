# Interaction Design Deep-Dive — Subsume

**Date:** 2026-08-10  
**Repo:** Subsume @ `a5471b5`  
**Scope:** Capture / reflect / archive state machines; Fitts’s law; feedback latency; error recovery; progressive disclosure; hover vs click affordances; content-script interruption; multi-surface consistency (popup vs sanctuary vs dock vs page overlays)  
**Mode:** Read-only interaction audit against implementation  

---

## Score: **6.8 / 10**

Emotion-first capture is real and well-orchestrated on the Poetic Capture Canvas. The product weakens where **three (or more) capture dialects** diverge, page→house context switches interrupt flow, and several content-script actions fail silently. Strong bones on timing, progressive disclosure (canvas only), and Fitts targets in chrome; weaker on recovery, multi-surface parity, and hover-only primary actions.

---

## Dimension scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Capture → Reflect → Archive SM | 7.0 | Clear product thesis; multiple incomplete state machines |
| Progressive disclosure | 7.5 | Canvas 40-char gate is excellent; popup dumps everything |
| Fitts’s law / targets | 7.5 | 44px norm on chrome; small rating chips + compact plaques |
| Feedback latency | 7.0 | 150ms hover, 50ms prefetch, ≤300ms motion; long success holds |
| Error recovery | 5.5 | Sanctuary/popup notices OK; hover/dock/book add often silent |
| Hover vs click affordances | 6.0 | Reflect reveal is hover-gated; touch/keyboard second-class |
| Content-script interruption | 6.0 | Closed shadow + trusted gestures good; Reflect opens new tab |
| Multi-surface consistency | 5.5 | Popup ≠ canvas ≠ hover ≠ dock on fields, feedback, outcomes |
| **Overall** | **6.8** | Weighted toward core loop + multi-surface |

---

## 1. State machines (Capture / Reflect / Archive)

### 1.1 Canonical product loop (intended)

```
[Discover on page] → [Capture intent] → [Reflect (emotion/prose)] → [Archive (intent + status)] → [Revisit / edit in Sanctuary]
```

Implementation splits this into **five partial machines** that do not share one state model or one feedback contract.

### 1.2 Machine A — Page hover card (membership only)

| State | Trigger | Outcome |
|-------|---------|---------|
| Idle | — | Title text scanned; listeners attached |
| Prefetch | `mouseenter` + 50ms | `GET_TITLE_DETAILS` cached |
| Loading card | 150ms show delay | Skeleton hover card |
| Ready | Resolve + library status | Poster, ratings, Add / Remove |
| Success flash | Add / Remove OK | “Added/Removed!” 1200ms → exit |
| Fail | Network / handler error | **Silent** (console only) |

**Missing states:** Reflect, rating, notes, intent, undo.

Evidence: `src/content/hoverCard.tsx` (`SHOW_DELAY_MS = 150`, `PREFETCH_DEBOUNCE_MS = 50`, `handleAdd` / `handleRemove`).

### 1.3 Machine B — Museum plaque → Poetic Capture (full Reflect)

| State | Trigger | Outcome |
|-------|---------|---------|
| Plaque idle | Poster match | ★ score visible; “Reflect” collapsed |
| Reveal | Hover (fine pointer) | `plaque-reveal` max-width expands |
| Reflect click | Trusted click | `OPEN_CAPTURE_CANVAS` → **new tab** |
| Canvas load | Sanctuary open | Loading → media header + recall |
| Writing | Focus / content | Focus-pull on poster; staging class |
| Progressive | ≥40 chars **or** blur with content | Intent + rating + atmosphere + lingering |
| Saving | Save reflection | Sequential ADD → STATUS → NOTES → RATING |
| Ceremony | Save OK | 280ms aura ceremony → close |
| Error | Load / save fail | Retry UI or save error string |

Evidence: `src/content/overlay.ts` (`handleReflect`), `src/background/handlers/titles.ts` (tab create `?act=capture&mediaId=`), `src/ui/components/PoeticCaptureCanvas.tsx` (`RECALL_DISCLOSURE_CHARS = 40`).

### 1.4 Machine C — Book plaque (Add **or** Reflect)

Parallel actions on one chip: **Add** (wishlist-style archive, no prose) and **Reflect** (same canvas open path). In-archive state swaps UI to open/detail path. Failures re-enable the button only — no user copy.

Evidence: `src/content/bookOverlay.ts` (`handleAdd`, `handleReflect`).

### 1.5 Machine D — Popup log (full form, no progressive disclosure)

| State | Trigger | Outcome |
|-------|---------|---------|
| Overview | Open popup | Stats + recent + “Inscribe a title” |
| Auto-log | Tab title heuristic | Prefilled query → jump to `log` view |
| Search | 350ms debounce | `DISCOVERY_SEARCH` ≤5 suggestions |
| Selected | Pick suggestion | Emotions/notes/intent (all visible) |
| Saving | Save | Multi-message sequence like canvas |
| Success | OK | Full-screen overlay **1500ms** then reset |
| Error | Fail | `InlineNotice` |

**Dialect difference vs canvas:** notes are a single textarea mapped to both `notes` and `emotionalRecall`; no atmosphere / lingering Thought; intent labels use operational status copy, not sanctuary intent chips; no 40-char progressive gate.

Evidence: `src/ui/popup.tsx` (`handleSaveLog`, `extractMovieTitle`).

### 1.6 Machine E — Screenplay dock (page notes, **not** media archive)

| State | Trigger | Outcome |
|-------|---------|---------|
| Collapsed pill | Mount (default off in prefs) | “✦ Reflection dock” |
| Expanded | Toggle | Textarea keyed by `hostname+pathname` |
| Save | Save reflection | `chrome.storage.local` page store → collapse |
| Fail | Storage error | **Console only**; panel stays open |

Dock copy claims “saved to your archive” but storage is `subsume_page_reflections` — **orthogonal** to library relationships. Mental model conflict: “reflection” ≠ “inscribed title.”

Evidence: `src/content/dock.ts` (`PAGE_REFLECTIONS_STORAGE_KEY`, `saveNotes`), default `screenplayDockEnabled: false` in `storage.ts`.

### 1.7 Machine F — Sanctuary Archive / DetailModal (revisit)

Archive list → spine card → DetailModal: status, deferred rating commit, debounced notes, tags, editions, related works, expandable reflection. Remove uses confirm state (`removeConfirmId`). This is the **richest** edit SM; first-capture paths do not reach this richness without leaving the page.

---

## 2. Journey maps — top 3 flows

### Flow 1: In-page Reflect (museum plaque → canvas)

```
Browse poster page
  → [scan / match latency] Poster resolves
  → Hover plaque ★ (Reflect hidden until hover:fine)
  → Click Reflect
  → NEW TAB opens Sanctuary capture  ⚠ CONTEXT BREAK
  → “Opening the frame…”
  → Type recall
  → After 40 chars: intent + Roman I–X + meta fields
  → Save reflection (multi-RPC)
  → 280ms ceremony → canvas closes; tab remains on house
  → User must find original page tab manually  ⚠ NO RETURN PATH
```

| Step | Friction | Severity |
|------|----------|----------|
| Reflect affordance only on hover expand | Touch / coarse pointer never sees “Reflect” label | **P0** |
| New tab for capture | Breaks page immersion; Fitts cost of tab juggling | **P0** |
| No deep-link back to host URL | Post-save stranded in Sanctuary | **P1** |
| Sequential save messages | Higher failure surface; partial write risk if mid-sequence fails | **P2** |
| Silent fail if message blocked | Only logger.warn on dispatch | **P2** |

### Flow 2: Quick archive from hover card

```
Hover detected title text
  → 150ms delay + skeleton
  → Metadata + “Add to archive”
  → Click Add
  → Success flash 1.2s / OR silent fail
  → Card dismisses
  → (No path to reflect without separate surface)
```

| Step | Friction | Severity |
|------|----------|----------|
| Membership ≠ reflection | User thinks they “logged” it; no emotion/notes | **P1** |
| Remove has no confirm | One mis-click deletes from archive | **P1** |
| Add/Remove failure silent | Zero recovery affordance | **P0** |
| Hover-only discovery | Keyboard / SR users never reach card | **P2** |
| Card may occlude page chrome | High z-index fixed card; no Esc-to-dismiss documented | **P3** |

### Flow 3: Popup “Inscribe a title”

```
Click extension icon
  → Load library + prefs
  → Optional auto-switch to log if tab title parses as film
  → Search (350ms) → select
  → Emotions + notes + intent ALL at once
  → Save → 1.5s full-screen success → overview
```

| Step | Friction | Severity |
|------|----------|----------|
| No progressive disclosure | Cognitive load vs canvas thesis | **P1** |
| Field model ≠ canvas | Missing atmosphere / lingering; notes dual-mapped | **P1** |
| 1500ms success hold | Blocks next action; longer than motion budget | **P2** |
| Title heuristic false positives | Wrong query → log view; user must clear | **P2** |
| Popup width / density | Notes + sliders + pills cramped; Fitts OK, scanning hard | **P3** |

---

## 3. Fitts’s law

| Surface | Target | Size / distance | Assessment |
|---------|--------|-----------------|------------|
| Global buttons | Default chrome | `min-height: 44px` (`global.css`) | Pass |
| Popup icon / close | Header actions | 44×44 + close `::before` hit expand | Pass |
| Dock pill / save / collapse | Corner fixed | 44px min-height | Pass |
| Museum plaque | Bottom-right of poster | 44×44 min; score always hit | Pass for click shell |
| Plaque “Reflect” label | Inside expanding region | Only after hover reveal | Fail for discoverability / touch |
| Poetic rating I–X | 10 discrete buttons | Dense chip row | Borderline — small effective width |
| Book plaque Add / Reflect | Compact 12–13px type row | Often &lt;44px width each | Fail density |
| Hover card primary | Full-width action row | Adequate width, lower card | Pass once card open |
| Hover show delay | 150ms | Reduces accidental acquisition cost | Good Fitts timing tradeoff |

**Principle tension:** Fitts is respected on **chrome** but **content plaques** trade target size for restraint. Museum plaque compensates with 44×44 hit box; book plaque and rating chips do not.

---

## 4. Feedback latency

| Interaction | Latency | Source | Verdict |
|-------------|---------|--------|---------|
| Hover card show | 150ms intentional | `HoverCardManager.SHOW_DELAY_MS` | Good (anti-jitter) |
| Prefetch start | 50ms debounce | same | Excellent |
| Hover hide grace | 200ms | `scheduleHide` | Good bridge to card |
| Dock enter / exit | 200 / 180ms | `dock.ts` | Within ≤220ms cap |
| Modal curtain | ≤300ms | tokens + canvas | Pass UI-wiki |
| Save ceremony | 280ms | `SAVE_CEREMONY_MS` | Pass |
| Popup search | 350ms debounce | `popup.tsx` | Acceptable |
| Popup success overlay | **1500ms** hard hold | `setTimeout` after save | Too long for “done” |
| Hover success flash | **1200ms** | `handleAdd` | Acceptable as celebration; no skip |
| Dock save feedback | **0ms visible** | collapse only | Fail — no confirmation copy |
| Hover failure feedback | none | catch → console | Fail |
| Notice auto-dismiss | 7000ms | `NoticeProvider` | Generous; OK for errors |

**Rule of thumb for this product:** motion ≤300ms; status acknowledgment 300–800ms; never leave destructive or membership actions without ≤1s visual confirmation **or** explicit error.

---

## 5. Error recovery

| Failure | User signal | Recovery | Gap |
|---------|-------------|----------|-----|
| Canvas media load | Error + Try Again | Retry fetch | Strong |
| Canvas save | `poetic-save-error` text | Edit & retry | Strong |
| Popup save | InlineNotice | Dismiss + retry | Strong |
| Library load / actions | `loadError` / `actionError` | Retry patterns | Good |
| Hover add/remove | None | None | **P0** |
| Book plaque add | Button re-enabled | Retry click only | **P1** |
| Dock save | None | Retry save blindly | **P1** |
| Capture tab open fail | Logger only | User sees nothing | **P1** |
| Hover remove | Success only | No undo, no confirm | **P1** |
| Archive remove | Confirm chip | Cancel path | Good |
| Partial multi-message save | Possible inconsistent state | No transactional rollback UI | **P2** |

No global undo toast pattern on content surfaces. Sanctuary `NoticeProvider` is the right primitive but is **not wired** into content-script outcomes.

---

## 6. Progressive disclosure

| Surface | Pattern | Quality |
|---------|---------|---------|
| PoeticCaptureCanvas | Recall first → intent/rating/meta after 40 chars or blur-with-content | **Best-in-product** |
| Museum plaque | Score always; Reflect on hover | Disclosure via hover, not progressive depth |
| DetailModal | Details panel expand; draft rating until pointer-up | Strong for edit density |
| ExpandableReflection | max-height expand for long prose | Good |
| Popup log | All controls visible once title selected | **Violates canvas thesis** |
| Hover card | Full metadata dump on hover | Appropriate for “glance,” not capture |
| Onboarding | Multi-step keys | Setup-heavy (product, not this audit’s center) |

**Recommendation:** Treat canvas disclosure rules as the **single source of truth** for any “Inscribe” surface. Popup should gate intent/rating until short recall exists (or offer “Quick keep” vs “Reflect” modes).

---

## 7. Hover vs click affordances

| Pattern | Implementation | Risk |
|---------|----------------|------|
| Hover card attach | `mouseenter` / `mouseleave` only | No focus/keyboard path |
| Plaque Reflect reveal | `@media (hover: hover) and (pointer: fine)` | Touch: label never expands; must rely on aria-label alone |
| Hover → click actions | Trusted-gesture gate on buttons | Good security; still hover-gated discovery |
| Dock | Click toggle only | Correct — durable surface |
| Popup | Click / keyboard combobox | Strongest accessible capture entry |
| Prefetch on hover | Intent-based | Good; no focus prefetch parity on content |

**Principle:** Hover may **preview**; **primary verbs** (Reflect, Add, Remove) must be click/tap visible without requiring hover expansion. Museum plaque partially violates this by hiding the verb string.

---

## 8. Content-script interruption

### What works
- Closed Shadow DOM for privileged controls (`attachClosedShadow`) — page cannot spoof clicks easily.
- `isTrustedGesture` on Add / Reflect / Remove.
- Domain blacklist + per-feature prefs (`hoverCardsEnabled`, `posterOverlaysEnabled`, dock, covers).
- High-confidence gates for book plaques (mid-band intentionally quiet).
- `pagehide` teardown of managers.
- MutationObserver scan with re-process guards in `scanner.ts`.
- LIBRARY_UPDATED sync only from extension id.

### What interrupts the user
1. **Reflect → new tab** is the largest interruption: full context switch away from the work that inspired the memory.
2. Hover cards appear over page content with max z-index; no Escape handler documented on the card manager.
3. Poster wrapper injection (`subsume-poster-wrap`) can affect layout of fragile host CSS.
4. Dock (when enabled) permanently occupies bottom-right; competes with chat widgets / cookie bars (classic Fitts corner conflict).
5. Prefetch storms on title-dense pages (mitigated by debounce + cache, still background work).

### Interruption hierarchy (desired)
1. **Ambient:** detection, silent prefetch  
2. **Glance:** hover / plaque score  
3. **Commit light:** Add to archive (inline, no navigation)  
4. **Commit deep:** Reflect (prefer overlay / side panel / same-tab house panel over hard tab create)

Current product jumps 2 → 4 via **new tab**, skipping an in-page deep commit.

---

## 9. Multi-surface consistency matrix

| Concern | Hover card | Museum plaque | Book plaque | Dock | Popup | Sanctuary canvas | DetailModal |
|---------|------------|---------------|-------------|------|-------|------------------|-------------|
| Primary verb | Add / Remove | Reflect | Reflect + Add | Save page notes | Inscribe | Save reflection | Edit fields |
| Opens house tab | No | Yes | Yes | No | Optional | Is house | Is house |
| Emotional sliders | No | Via canvas | Via canvas | No | Yes | Yes | Yes |
| Progressive disclosure | N/A | N/A | N/A | No | **No** | **Yes** | Partial |
| Intent model | None | Via canvas | Add→to-watch | None | SanctuaryIntent pills | SanctuaryIntent | LibraryStatus |
| Success feedback | Flash text | Ceremony | State re-render | Collapse only | 1.5s overlay | Ceremony | Ceremony / local |
| Error feedback | Silent | Dispatch warn | Silent + enable | Silent | Notice | Inline | actionError |
| Shared copy | productCopy labels | “Reflect” | Add/Reflect | “Save reflection” | “Inscribe” | “Save reflection” | Various |
| Data sink | Library | Library + reflections | Library | **Page store** | Library | Library | Library |

**Inconsistencies that train wrong mental models**
1. Dock says “archive” but writes page-local notes.
2. Hover “Added to archive” never invites Reflect.
3. Popup success path resets to overview; canvas closes overlay but leaves orphan tab if opened from plaque.
4. Intent chips: canvas uses `INTENT_CHIP_LABELS`; popup uses `legacyStatusLabel` operational wording.
5. Default dock preference: storage `false`, contentPrefs fallback `?? true` if key missing — edge inconsistency under partial prefs.

---

## 10. Friction inventory (P0–P3)

### P0 — Ship blockers for core loop integrity
1. **Reflect primary action not visible without hover (fine pointer)** — touch / many laptops never see the verb; only score chip.  
2. **Reflect opens a new Sanctuary tab with no return path** — breaks the “on the page you already browse” thesis.  
3. **Hover add/remove failures are silent** — membership changes must always acknowledge success *or* failure.

### P1 — High friction / trust damage
4. Hover remove has **no confirm** and **no undo** (Archive list does).  
5. Popup capture **does not progressive-disclose**; diverges from canvas philosophy and field model.  
6. Dock copy claims archive but uses **separate storage** — users will look for notes in Archive and fail.  
7. Book plaque / dock save failures lack user-visible errors.  
8. Multi-message save sequences lack **atomic UX** (partial success possible).  
9. No in-page deep reflect (side sheet / extension panel) — only hard navigation.

### P2 — Polish / latency / secondary paths
10. Popup success hold **1500ms** exceeds motion system and blocks next inscription.  
11. Hover success flash 1200ms with no early dismiss.  
12. Tab-title auto-log false positives force log view.  
13. Keyboard / focus path missing for hover cards.  
14. Rating chip density (I–X) undersized vs 44px norm.  
15. Capture open dispatch failures only log.

### P3 — Minor / backlog
16. Hover card Esc / focus management not first-class.  
17. Dock corner competition with host UI.  
18. ContentPrefs dock default fallback vs storage default mismatch.  
19. Hover card metadata density (platforms + genres + overview) vs glance timing.

---

## 11. Top fixes (ordered)

### Fix 1 — In-page Reflect without abandoning the host (P0)
**What:** Prefer `chrome.sidePanel` / extension page overlay / same-tab lightweight capture sheet; if tab open remains, pass `returnUrl` and show “Back to page” after ceremony.  
**Why:** Ends the largest interruption and restores the discovery thesis.  
**Files:** `overlay.ts`, `bookOverlay.ts`, `titles.ts` `OPEN_CAPTURE_CANVAS`, `App.tsx` / canvas close.

### Fix 2 — Always-visible Reflect (and touch) (P0)
**What:** Show “Reflect” (or icon+label) at rest; use hover only for secondary chrome (score emphasis), not for verb existence. Ensure 44×44 hit target on all pointer classes.  
**Why:** Fitts + discoverability; aligns plaque with click-primary philosophy.

### Fix 3 — Shared capture contract across popup / canvas / hover (P1)
**What:** Define two explicit modes everywhere:  
- **Quick keep** → archive membership (+ optional intent)  
- **Reflect** → progressive recall → intent → rating → ceremony  

Unify field model (`emotionalRecall`, atmosphere, lingering, emotions) and labels from `productCopy` / intent constants.  
**Why:** Multi-surface consistency is the second-order product quality bar.

### Fix 4 — Error + undo surface for content scripts (P0/P1)
**What:** Minimal toast host in shadow root (reuse notice tones): success 600–800ms, error sticky until dismiss; hover Remove requires confirm or 5s undo.  
**Why:** Silent failures destroy trust faster than slow success.

### Fix 5 — Honest dock model (P1)
**What:** Either (a) link page notes to a media candidate when detection is high-confidence, or (b) rename copy to “Page notes (local)” and surface them in Sanctuary under a Page Journal section. Default off is fine; messaging must not say “archive.”  
**Why:** State machine E currently lies.

### Fix 6 — Latency budget cleanup (P2)
**What:** Popup success ≤600ms (or ceremony 280ms + soft); dock save shows “Saved” 400ms before collapse; keep hover show 150ms / hide 200ms.  
**Why:** Aligns all surfaces with the established ≤300ms motion grammar and readable feedback.

### Fix 7 — Atomic save / rollback messaging (P2)
**What:** Single background `INSCRIBE` handler that applies add+status+notes+rating transactionally (or compensating undo + user message).  
**Why:** Sequential RPCs from UI are a latent integrity bug.

---

## 12. Journey map summary (ASCII)

### Top flow friction heat

```
FLOW 1  Page Reflect
  [scan]··ok → [hover reveal]·P0 → [click]·ok → [NEW TAB]·P0 → [write]·ok → [save]·ok → [stranded]·P1

FLOW 2  Hover archive
  [hover]·ok → [add]·ok → [flash]·ok | [fail]·P0 | [no reflect]·P1 | [remove]·P1

FLOW 3  Popup inscribe
  [open]·ok → [search]·ok → [full form]·P1 → [save]·ok → [1.5s hold]·P2 → [overview]·ok
```

---

## 13. What is already excellent (keep)

1. **PoeticCaptureCanvas progressive disclosure** (40-char / blur sticky) + focus trap + PRM-aware ceremony.  
2. **Hover timing grammar** (50ms prefetch, 150ms show, 200ms hide, exit transitionend + fallback).  
3. **Trusted gestures + closed shadow** on privileged content controls.  
4. **Confidence-gated book plaques** (quiet mid-band) — interaction restraint as product design.  
5. **44px chrome targets**, curtain ≤300ms, save ceremony token alignment.  
6. **Archive remove confirm** and DetailModal draft-rating commit-on-release — thoughtful edit semantics.

---

## 14. Verdict

Subsume’s interaction design is **philosophically sharp and unevenly implemented**. The canvas is a reference-quality reflect SM; popup, hover, dock, and plaque paths are dialects that leak friction—especially **silent errors**, **hover-gated verbs**, and **new-tab Reflect**. Closing the multi-surface contract and removing the hard context switch would lift this review into the high 7s / low 8s without new product surface area.

| | |
|--|--|
| **Score** | **6.8 / 10** |
| **Top 3 frictions** | (1) Reflect opens new tab / no return · (2) Silent hover membership failures · (3) Multi-surface capture dialect split (popup vs canvas vs dock “archive”) |
| **Priority fixes** | In-page Reflect · always-visible Reflect · shared Quick keep / Reflect contract · content toasts + undo · honest dock |

---

*End of interaction design deep-dive.*
