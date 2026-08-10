# 18 — User Language / Voice / Copy Audit

**Date:** 2026-08-10  
**Surfaces:** Onboarding, empty states, Settings (privacy / discovery / data), errors, popup, DetailModal, Archive chips, product/shared copy, README / PRODUCT / brand intros  
**Authority:** `docs/CINEMA_VOICE.md` (product register), `src/shared/productCopy.ts`, `src/shared/statusLabels.ts`  
**Out of scope for score:** CSS token names (`--gold`, `.sanctuary-btn-gold`) except where they leak into class-name product vocabulary for maintainers.

---

## Scores

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Overall user language** | **6.4 / 10** | Strong sanctuary voice on welcome, capture, and empties; undermined by dual status lexicons, “Dispatch,” and novice opacity |
| **Voice consistency** | **5.8 / 10** | Three competing registers: picture-palace poetry, plain settings, and residual operational / telegraph words |
| Onboarding / empty poetry | 8.2 | Picture palace, house lights, inscriptions — on-brief |
| Operational clarity (novices) | 5.5 | Repertoire / ledger / programme / vault stacked without plain synonyms |
| Status / intent honesty | 4.5 | Same state labeled differently across popup, chips, DetailModal, `statusLabels` |
| Destructive / privacy honesty | 7.5 | Goodreads / web-dispatch / Drive mostly honest; destructive confirms plain |
| a11y labels vs marketing | 6.5 | Many good `aria-label`s; some still say “movie” or mirror purple prose |
| Residual “gold” in **user-facing strings** | 9.0 | No “gold” product copy found; residual is **CSS class / token** only |

**Verdict band:** Solid poetic core; fix the lexicon fork and military “dispatch” before calling voice finished.

---

## Register summary (what “good” is)

From `docs/CINEMA_VOICE.md`:

- Private picture palace / archive — not tracker, not spreadsheet  
- Calm, literary, humane; cinema lexicon *rotated, not stacked*  
- Buttons actionable; Settings and errors plain; section leads may be cinematic  
- Avoid military/telegraph: surveillance, dispatch, rescind → house-manager / curator  
- No em-dashes in **new** copy  

`brand.md` / `PRODUCT.md` correctly scope **Ferrari / Rosso Corsa** as *visual system*, not product voice. README intro is sanctuary-aligned (“not a tracker”). No user-facing “Ferrari racing” marketing speak in the extension shell — design-doc language only.

---

## Glossary of conflicting terms

| Concept | Variants in product | Risk |
|---------|---------------------|------|
| **The keep place** | Archive (nav), vault, house, sanctuary, library (routes/code), “Open the house” | Novices do not know which word is the primary noun |
| **Status: planned** | Want to watch / Want to read (`statusLabels`) · Anticipated (`archive/constants`) · Wishlist (intent) | Same work can show three different words |
| **Status: in progress** | Watching / Reading · Now showing · Return Soon / Revisit This Month | Temporal intent mixed with operational status |
| **Status: done** | Watched / Read · Screened · Keep This Memory · Projected (popup stat) | “Projected” ≠ “watched” for novices |
| **Status: abandoned** | Stopped · Did not finish · Shelved | “Shelved” sounds like storage, not DNF |
| **Intent labels** | Keep This Memory / Revisit This Month / Wishlist (`INTENT_CHIP_LABELS`) vs Keep This Memory / **Return Soon** / Wishlist (`INTENT_LABELS_V2`) | README + canvas use month; `statusLabels` V2 says Return Soon |
| **Film medium** | Film (`MEDIUM_LABEL`) · movie (code, “Deselect movie”) · Cinema (Stats legend) | Inconsistent medium noun |
| **Weekly picks** | Subsume Dispatch · web-grounded dispatch · Weekly selection · programme · digest | CINEMA_VOICE forbids “dispatch” |
| **People** | Creators · auteurs · filmography · registry | Fine if one primary UI word (Creators) holds |
| **Notes artifact** | Inscription · reflection · emotional recall · journal notes · programme notes | Dense synonym stack |
| **Gold** | Class `btn-sanctuary-gold`, tokens `--gold*` (values = red) | Not user-visible; confuses contributors; violates “no gold product story” |

---

## Sample rewrites — worst 8 strings

| # | Current | Where | Rewrite (recommended) |
|---|---------|-------|------------------------|
| 1 | `Enable weekly Subsume Dispatch` | `Settings.tsx` ~623 | **Enable weekly house picks** — plain label; keep “Dispatch” only as optional internal feature name in docs |
| 2 | `Web-grounded dispatch` | `Settings.tsx` ~640 | **Web-backed picks (optional)** · help: “May run limited web searches and attach sources. Off by default.” |
| 3 | Screen chips: `Anticipated` / `Now showing` / `Screened` / `Shelved` vs operational `Want to watch` / … | `archive/constants.ts` 5–10, 59–64 vs `statusLabels.ts` 69–81 | **Pick one surface map:** chips & DetailModal = operational medium-aware labels; reserve literary words for section leads only |
| 4 | Popup intent pills show status labels (`Watched` / `Watching` / `Want to watch`) under “Sanctuary intent” | `popup.tsx` 636–661 | Label group **Where it sits** and use **intent** chips: Keep this memory · Return soon · Wishlist — *or* drop intent and only set status |
| 5 | `title="Deselect movie"` | `popup.tsx` 610 | **Clear selection** / `aria-label="Clear selected title"` |
| 6 | `Failed to add title to your archive.` | `productCopy.ts` 83 | **Could not add this title to your archive. Try again.** |
| 7 | `formatUserError` → raw `Error.message` / `JSON.stringify` | `formatUserError.ts` 1–9 | Always map to short plain copy; log technical detail separately |
| 8 | `Tag this screening, press Enter` | `DetailModal.tsx` 1010 | **Add a tag, then press Enter** (medium-neutral) |

Honorable mention (book-hostile screen poetry): popup placeholder *“What resonance did this screening leave?”* → *“What stayed with you — a line, a scene, a page?”*

---

## Findings (P0–P3)

### P0 — Fix before next ship narrative

| ID | Finding | File:line |
|----|---------|-----------|
| P0-1 | **Dual status lexicons.** DetailModal / Archive chips use literary screen set (`Anticipated`, `Now showing`, `Screened`, `Shelved`) via `statusOptionsForMedium` → `STATUS_OPTIONS`. Popup and `legacyStatusLabel` use plain medium-aware set (`Want to watch`, `Watching`, … / book variants). Same `LibraryStatus` value, different words. | `src/ui/components/archive/constants.ts:5-10,59-64` · `src/shared/statusLabels.ts:69-87` · `src/ui/popup.tsx:454-456,640-660` · `src/ui/components/DetailModal.tsx:767-779` |
| P0-2 | **Intent vs status conflation in popup.** Pills are driven by `sanctuaryIntent` but **display** `legacyStatusLabel` strings; `aria-label` says “Sanctuary intent.” Users cannot tell intent from progress. | `src/ui/popup.tsx:636-661` |
| P0-3 | **Intent label fork.** Canvas / archive chips: `Revisit This Month`. Canonical V2 map: `Return Soon`. README still documents month form. | `src/ui/components/archive/constants.ts:35-39` · `src/shared/statusLabels.ts:94-98` · `README.md:47` |

### P1 — High impact voice / honesty

| ID | Finding | File:line |
|----|---------|-----------|
| P1-1 | **“Dispatch” is user-visible** (toggle + help). Contradicts CINEMA_VOICE (avoid military/telegraph). Section lead already says “Weekly selection.” | `src/ui/pages/Settings.tsx:608-645` · `src/shared/settingsCatalog.ts:32-36` |
| P1-2 | **Errors often passthrough raw messages** (`formatUserError`, add/remove archive helpers only if detail empty). Can surface IPC / provider jargon. | `src/ui/utils/formatUserError.ts:1-9` · `src/shared/productCopy.ts:80-89` · Settings/Home catch sites |
| P1-3 | **Stacked lexicon without plain anchor.** Discovery lobby: vault + repertoire + afterglow + inscribed + marquee in one breath. Fine as *lead*; primary CTA “Open vault” should also say Archive once. | `src/ui/pages/Home.tsx:305-393` · `src/ui/pages/Onboarding.tsx:165-190` |
| P1-4 | **Screen-default copy on multi-medium surfaces.** “Tag this screening…”, popup journal “this screening”, “Directed by” when bio is non-director, suggested tags Criterion/Silent Era only. | `DetailModal.tsx:50,1010` · `popup.tsx:632` · `PoeticCaptureCanvas.tsx:314-316` |
| P1-5 | **Em-dashes in shipped user copy** (voice rule: none in new copy). | e.g. `Onboarding.tsx:171,179,215` · `ArchiveHeader.tsx:8` · `Settings.tsx:626,959,1039,1164` · `productCopy.ts:58` (editions note uses curly quotes + em feel) |

### P2 — Consistency / a11y / residual brand

| ID | Finding | File:line |
|----|---------|-----------|
| P2-1 | Residual **gold class names** on primary Save (`btn-sanctuary-gold`) — not user text, but product code still says “gold” while brand is Rosso Corsa. | `Settings.tsx:1208` · `Alerts.tsx:327,530` · `sanctuary.css` `.sanctuary-btn-gold` |
| P2-2 | CSS class `rescind` on unfollow confirm (military residue; label itself is plain “Unfollow”). | `FilmographyView.tsx:237` · `sanctuary.css` `.filmography-filter-btn.rescind` |
| P2-3 | **a11y vs marketing:** “Search titles to inscribe”, “Journal notes” OK; “Deselect movie” fails medium-neutrality; Roman-numeral ratings (I–X) hard for SR without `aria-label` on each. | `popup.tsx:522,610` · `PoeticCaptureCanvas.tsx:383-393` |
| P2-4 | Emotion slider poetry is medium-aware and beautiful (`Awe · the sublime frame`) but long for AT / small popup; neutral fallback exists and is clearer. | `statusLabels.ts:100-128` |
| P2-5 | Empty / error poetry is strong but activation still abstract (“leave the first inscription”) vs concrete “Open IMDb / Goodreads and wait for a plaque.” | `EmptyStateProjection.tsx:14-15` · `Library.tsx:289-310` |
| P2-6 | Docs voice mix: PRODUCT/brand “Ferrari-adapted” is fine for implementers; ensure store listing / README “Feature Overview” engineer lines (“Zero-IPC…”, “SOLID-First”) stay out of in-product chrome (they currently do). | `README.md:51-55` · `PRODUCT.md:7` |

### P3 — Polish

| ID | Finding | File:line |
|----|---------|-----------|
| P3-1 | “Try Again” title case vs `TRY_AGAIN_LABEL` “Try again”. | `Library.tsx:364` · `PoeticCaptureCanvas.tsx:303` · `productCopy.ts:39` |
| P3-2 | Popup stat “Projected” for watched count — opaque without legend. | `popup.tsx:391-393` |
| P3-3 | Settings description meta-copy: “with no jargon without a plain description” is awkward. | `Settings.tsx:470-472` |
| P3-4 | `failedToRemoveFromArchiveMessage` says “item”; add uses “title” — align noun. | `productCopy.ts:81-89` |
| P3-5 | Goodreads / Drive / web-search privacy notes are **honest** (device-local CSV, app-data Drive, search intents not full notes) — keep pattern; lift similar plain honesty to Dispatch rename. | `Settings.tsx:646-650,1099-1169` |

---

## Surface-by-surface notes

### Onboarding
- Welcome (“Your private picture palace”, pillars Discover / Capture / Archive) is **on-register** and novice-clear.  
- Key steps stay mostly plain; “catalogue key”, “quieter marquee”, “private curator”, “Enter the house” carry cinema without blocking setup.  
- Errors plain (`Paste a TMDb token…`, validation messages).  
- Em-dashes and stacked metaphors are the main voice debt.

### Empty states
- Defaults and Archive medium variants are coherent literary voice.  
- Filtered empty + “Clear filters” is honest and scannable.  
- Load errors mix “Vault unreachable” / “Could not open the archive” — two metaphors for one failure (prefer **Archive** in titles, poetry in body only).

### Settings privacy / discovery / data
- Credentials: “Keys stay in your browser” — good.  
- Web-grounded cost & privacy note — excellent honesty.  
- Goodreads: one-shot, local parse, no LLM — excellent.  
- Drive: app-data only — good.  
- Naming: **Dispatch** is the outlier; section chrome already wants “Weekly selection.”

### Errors
- User-facing fallbacks often fine; pipeline still rethrows raw `err.message`.  
- Prefer productCopy helpers + `formatUserError` that never stringify objects to the toast.

### Popup
- Strong sanctuary CTAs: Inscribe a title, Open the house, Load the highlight reel.  
- Status stats mix Archive / Projected / Anticipated — teach or simplify.  
- Intent/status bug is the highest product-language risk on this surface.

### DetailModal
- “Dossier”, “Programme notes”, “Where to screen”, “Your verdict”, “What stayed with you after the credits?” — cinematic and mostly clear.  
- Status select inherits literary screen labels; books correctly use operational book labels.  
- Destructive: Archive remove lives on spine card (“Remove from archive?” / Remove / Cancel) — plain and honest.  
- Editions honesty note is model-grade microcopy.

### brand / PRODUCT / README
- README philosophy section is the gold standard for external voice (and correctly rejects “tracker”).  
- PRODUCT tone line aligns Cinema Black + scarce Rosso Corsa with sanctuary voice.  
- No Ferrari *racing* user copy; keep Ferrari language in design docs only.

### Residual “gold”
- **No user-facing string** containing “gold” found under `src/ui` product copy.  
- Residual: `btn-sanctuary-gold`, `--accent-gold*`, comments “Gold family — keep intent chips…”. Rename classes to `btn-sanctuary-primary` in a follow-up for contributor voice hygiene.

---

## Top fixes (ordered)

1. **Unify status + intent glossary**  
   - Single source: `statusLabels.ts` operational medium-aware labels for **all** chips, selects, popup, hover.  
   - Single intent set: prefer `INTENT_LABELS_V2` (`Return Soon`) *or* keep month form everywhere and delete V2 wording from docs.  
   - Popup: show intent labels under an intent legend, or only status — not both confused.

2. **Rename Dispatch in UI** to “Weekly house picks” / “Weekly selection”; keep `dispatchEnabled` as code id if needed. Kill user-facing “web-grounded dispatch.”

3. **Sanitize errors** through one helper that never shows JSON or provider stack fragments; align add/remove archive failure nouns.

4. **Medium-neutral microcopy** on shared surfaces (tags, journal placeholders, deselect, “Directed by” only when director role known).

5. **Em-dash pass** on user-visible strings; commas / middots per CINEMA_VOICE.

6. **Rename `btn-sanctuary-gold` → primary** and drop “rescind” class name (optional hygiene sprint).

---

## Top 3 (executive)

1. **Lexicon fork on status/intent** — same state, multiple words across popup vs Archive vs V2; highest confusion risk.  
2. **“Dispatch” still ships** — violates cinema voice guide; Settings already has better “Weekly selection” language.  
3. **Poetry without plain anchors on multi-medium paths** — vault/house/repertoire + screen-default “screening” copy taxes novices and book users.

---

## Score line (for index)

**User language: 6.4/10 · Voice consistency: 5.8/10 · Path:** `docs/design-reviews/2026-08-10/18-user-language-voice.md`
