# Subsume — Consolidated Design / Taste Findings

**Date:** 2026-07-21  
**Branch:** `feat/books-expansion`  
**Method:** 21 parallel subagents (design-review + taste skills)  
**Prior product critique:** 24/40 · re-score range **23–28/40** depending on lens

---

## Agent battery (21)

| # | Skill / lens | Score / signal |
|---|--------------|----------------|
| 1 | Impeccable critique (Nielsen) | **23/40** |
| 2 | Impeccable technical audit | 40 findings (a11y/perf/responsive) |
| 3 | Userinterface-wiki | CRITICAL + HIGH Fitts/motion |
| 4 | Design-taste-frontend | **6.5/10** |
| 5 | Frontend-design-guidelines | 30 findings |
| 6 | High-end visual design | **6/10** premium |
| 7 | Emil design-eng | 12 polish issues |
| 8 | Design-motion-principles | **7.5/10** motion |
| 9 | Find-animation-opportunities | 7 opportunities (P0 capture exit) |
| 10 | Apple design interaction | 20 findings |
| 11 | Product-review | **6.9/10** overall |
| 12 | Roast-my-product | **41/100** |
| 13 | Rams design-is | **16/30** (redesign IA/voice) |
| 14 | GPT-taste craft | 12 failures / 5 strengths |
| 15 | Stitch DESIGN.md compliance | **~68%** |
| 16 | Minimalist restraint | Noise **7.5/10** |
| 17 | Industrial brutalist (data IA) | 10 Stats/Settings/Alerts findings |
| 18 | Redesign-existing | 15 identity vs generic |
| 19 | Impeccable detector CLI | **102** findings (was ~111) |
| 20 | Copy / clarify | P0 lexicon table |
| 21 | A11y focus/keyboard | 25 findings |

**Detector delta:** Playfair/Geist gone · still 102 hits (radius 58, color 37, font 5).

---

## Scoreboard summary

| Dimension | Range | Notes |
|-----------|-------|--------|
| Usability (Nielsen) | 23/40 | Acceptable; consistency & efficiency drag |
| Product quality | ~7/10 | Soul strong; activation weak |
| Taste / premium | 6–6.5/10 | Brand real; chrome still kit-ish |
| Motion | 7.5/10 | Tokens good; 320ms + grain + capture exit |
| DESIGN.md compliance | ~68% | Radius/gold/shadow drift |
| Rams | 16/30 | Clarity & restraint fail |
| Roast | 41/100 | First-run / keys / capture gate |

---

## Consensus strengths (do not regress)

1. **Gilded Night system** — gold restraint, Newsreader + Outfit, literary text roles  
2. **Signature objects** — hardcover spines, museum plaques, poetic capture, film grain (as brand)  
3. **Archive maturity** — medium labels, filtered empty + clear, collapsed intent, openable cards  
4. **Motion tokens** — ≤300ms curtain, reduced-motion on many paths, DetailModal ceremony  
5. **productCopy** — Film / Series / Book · Add to archive / In archive (started)  
6. **IA partial win** — Archive default; explore capped at 4; Stats/Alerts in drawer  

---

# Master findings list (deduplicated)

Severity: **P0** block/critical · **P1** major · **P2** minor · **P3** polish  
**Sources:** skill codes in brackets

---

## P0 — Critical / activation / a11y blockers

| ID | Finding | Evidence | Sources |
|----|---------|----------|---------|
| **F01** | **TMDb hard gate in onboarding** — no key-free first win (books/free wire blocked) | `Onboarding.tsx` | product, roast |
| **F02** | **DetailModal: no focus trap + no restore focus** | `DetailModal.tsx` | audit, a11y, apple, guidelines |
| **F03** | **DetailModal locks input during exit** (`closing` rejects Esc/reopen) | `DetailModal.tsx` | apple |
| **F04** | **App drawer: no focus trap / inert / initial focus** | `App.tsx`, `sidebar.css` | audit, a11y |
| **F05** | **Capture 140-char gate hides intent/rating** — core loop friction | `PoeticCaptureCanvas.tsx` | product, roast |
| **F06** | **Hover card wrong-medium CTAs** — dual “Add series” + movie hardcode | `hoverCard.tsx` | copy |
| **F07** | **Form labels not associated** (Settings, Alerts, Search, People, many dossier fields) | multiple pages | audit, a11y, guidelines |
| **F08** | **Three competing status lexicons** (literary chips vs operational vs raw popup) | `constants.ts`, `statusLabels.ts`, `popup.tsx` | critique, copy |

---

## P1 — Major UX / consistency / product

| ID | Finding | Evidence | Sources |
|----|---------|----------|---------|
| **F09** | **Lexicon fog** — library / vault / ledger / repertoire / archive still mixed in errors & headers | Search/Recs errors, Filmography | critique, copy, product |
| **F10** | **Nav label ≠ page title** — Now Showing→Cinematic Programme; Premiere Alerts→Release Alerts; Creators→Filmmakers empty | pages + `App.tsx` | copy, critique |
| **F11** | **Movies vs Film / TV vs Series** split | IntentNavigation, Search, Alerts, DetailModal | copy |
| **F12** | **Intent split** — “Revisit This Month” vs “Return soon” | archive vs statusLabels V2 | copy |
| **F13** | **Archive filter IA still heavy** — medium + subtype + collection + intent + search + tags | `IntentNavigation`, `Library` | critique, gpt-taste, minimalist |
| **F14** | **Filters on partial pages = false empty** (documented but trap) | `Library.tsx` | critique, product |
| **F15** | **Discovery lobby density** — multi CTA + wire + weather + strips (one job unclear) | `Home.tsx` | critique, taste, gpt-taste, minimalist |
| **F16** | **Empty states lack primary CTA** (true Archive empty, Stats, People, Recs ledger) | `Library`, empties | product, guidelines |
| **F17** | **Demo library auto-seed** blurs ownership | `ensureDemoLibrary` | product, roast, Rams |
| **F18** | **Silent mutation failures** (Discovery add, some Alerts/Stats/Recs loads) | `Home`, etc. | product, guidelines |
| **F19** | **Dual capture products** (popup vs PoeticCapture) | popup / canvas | redesign, roast |
| **F20** | **Search titled “Search Archive”** confuses catalogue vs vault | `Search.tsx` | product, copy |
| **F21** | **Onboarding step 5 dual CTAs same action** | `Onboarding.tsx` | product, roast |
| **F22** | **Screen-biased empty copy** on Recs/Home (“reels”, “screenings”) | Recommendations, Home | copy |
| **F23** | **Low-contrast control/placeholder tokens** (`--text-control`, `--fg-subtle`) | `tokens.css` | audit |
| **F24** | **Book plaque keyboard + outline:none without ring** | `bookOverlay.ts` | audit |
| **F25** | **Content hover card pointer-only** | `hoverCard.tsx` | audit |
| **F26** | **Material Symbols / `auto_awesome` AI tell** | `App.tsx`, html | taste, high-end, redesign |
| **F27** | **PoeticCapture no enter/exit ceremony** (DetailModal has Curtain) | `PoeticCaptureCanvas` | motion, anim-opp, emil |
| **F28** | **Reflection expand 320ms + max-height layout animate** | `sanctuary.css` | wiki, motion, stitch |
| **F29** | **FilmGrain always on** — no PRM hide; GPU cost | `FilmGrain.tsx` | wiki, motion, Rams, minimalist |

---

## P2 — Craft / Fitts / motion / system

| ID | Finding | Evidence | Sources |
|----|---------|----------|---------|
| **F30** | **Hit targets < 44** — thumbs 14px, chips 32px, dock collapse, global button 40px | many CSS | wiki, apple, Fitts |
| **F31** | **`transition: all`** widespread | poetic, settings, popup, overlay, dock | emil, wiki, motion |
| **F32** | **Weak default `ease` / modal exit ease-in 300ms** | tokens, DetailModal | emil |
| **F33** | **Scale overshoot** 1.2–1.35 on sliders/onboarding dots | emotional, popup, onboarding | wiki |
| **F34** | **No `(hover: hover) and (pointer: fine)`** on card lift | sanctuary, library | emil |
| **F35** | **Escape drawer skips close animation** + 400ms fallback vs 260ms CSS | `App.tsx` | emil |
| **F36** | **Glass/blur ambient default** (nav, settings, plaques) | CSS | taste, high-end, redesign |
| **F37** | **Pure-black shadows** on poster/nav/drawer | `tokens.css` | wiki, high-end, stitch |
| **F38** | **`--accent-gold` undefined** (fallback chain) | tokens | stitch |
| **F39** | **Radius drift** 2px sanctuary · 10/20px people · DESIGN 4/8/12 | CSS | stitch, detector |
| **F40** | **Solid gold on filters** vs soft-wash DESIGN | type-filters active | stitch |
| **F41** | **`.sanctuary-btn-gold` uses border-hero not solid primary** | sanctuary.css | stitch |
| **F42** | **Uniform auto-fill card grids** (no bento/hero span) | library, home, discovery | gpt-taste, high-end |
| **F43** | **Section header monotony** on Home | Home | gpt-taste |
| **F44** | **Catalogue kickers / Act / No.001** decorative overload | Home, NewReleases | taste (user kept brochure — lower if intentional) |
| **F45** | **Roman vs Material dual icon language** | App | wiki, redesign |
| **F46** | **global h1–h6 forced sans** fights Newsreader titles | `global.css` | redesign, taste, stitch |
| **F47** | **Missing `aria-pressed` on filter/view toggles** | Search, NewReleases, Recs, People | a11y, audit |
| **F48** | **Incomplete tab pattern** (no arrow keys / aria-controls) | IntentNavigation | a11y |
| **F49** | **Dock: tiny collapse + no local PRM** | `dock.ts` | apple, wiki |
| **F50** | **Inline styles** on Search chips, Library padding | Search, Library | guidelines |
| **F51** | **Spinner loading** vs skeleton inconsistency | Stats, Recs, Alerts, People | guidelines, redesign |
| **F52** | **Recommendations card double type badge** | RecommendationMediaCard | guidelines, minimalist |
| **F53** | **Settings explanation stack** 4 deep + chip oceans | Settings | brutalist, minimalist |
| **F54** | **Alerts as cards not scan rows** | Alerts | brutalist |
| **F55** | **Diagnostics soft log** (not operator density) | SettingsDiagnostics | brutalist |
| **F56** | **Perf: no virtualization** Library/Filmography; full-viewport grain; blur tax | Library, FilmGrain | audit |
| **F57** | **Popup still multi-hue emotion chips / hardcode greens** | popup.css, hoverCard | detector, stitch |
| **F58** | **NoticeProvider no enter/exit motion** | NoticeProvider | anim-opp |
| **F59** | **Onboarding step teleport** | Onboarding | anim-opp |
| **F60** | **Em-dashes & middot monotony** in chrome | various | taste, copy |

---

## P3 — Polish

| ID | Finding | Sources |
|----|---------|---------|
| **F61** | 9px uppercase labels / weak tracking | wiki, apple, copy |
| **F62** | Tabular nums missing on scores | wiki, guidelines |
| **F63** | `text-wrap: pretty` missing on prose | wiki |
| **F64** | `type="button"` omissions | audit |
| **F65** | Heading inside Recs group button | a11y |
| **F66** | Save ceremony latency without busy state clarity | apple |
| **F67** | Atmosphere themes (french purple) vs One Gold | stitch |
| **F68** | Status rainbow tracker chips | stitch |
| **F69** | `shadowTokens.ts` text roles ≠ app tokens | stitch |
| **F70** | Dead layout CSS / dual Home style sources | gpt-taste |

---

## Cross-cutting themes (priority order)

### 1. Activation & core loop (product-critical)
F01, F05, F16, F17, F19, F21 → **Time-to-first-inscription**

### 2. Accessibility baseline
F02–F04, F07, F23–F25, F47–F48 → **Ship-blocking for keyboard/SR**

### 3. One product language
F06, F08–F12, F20, F22 → **productCopy expansion + error strings**

### 4. Chrome density / one job per screen
F13–F15, F42–F44, F53 → **Progressive disclosure, not more features**

### 5. Motion & craft system
F27–F35, F36–F41 → **Tokens, PRM, capture parity, no `transition: all`**

### 6. Fitts / content scripts
F30, F49, book/hover plaques → **44px + PRM in shadow DOM**

---

## Detector snapshot (deterministic)

| Rule | Count |
|------|------:|
| design-system-radius | 58 |
| design-system-color | 37 |
| design-system-font | 5 |
| broken-image | 2 |
| **Total** | **102** |

Top files: `people.css`, `popup.css`, `settings.css`, `poetic-sanctuary.css`, `recommendations.css`, `hoverCard.tsx`.

**Fixed since last scan:** Playfair Display, Geist Mono.  
**Still noisy:** Material Symbols, Sfmono-Regular, hardcoded success greens (`#3d8b5f` as raw or token).

---

## Recommended fix waves

| Wave | Focus | Finding IDs | Suggested commands |
|------|--------|-------------|-------------------|
| **A** | Activation | F01, F05, F16, F17, F21 | product shape / onboard |
| **B** | A11y P0–P1 | F02–F04, F07, F47–F48 | audit + harden |
| **C** | Lexicon complete | F06, F08–F12, F20 | clarify |
| **D** | Density / IA | F13–F15, F42 | distill / layout |
| **E** | Motion craft | F27–F35 | animate / polish |
| **F** | Tokens / detector | F37–F41, F57 | polish / extract |
| **G** | Fitts content | F30, F49, F24–F25 | audit |

---

## Intentionally deferred (user choice: keep literary brochure)

- Catalogue kickers / Act / No.001 poetic subtitles (**F44** demoted)  
- Full Rams “plain language everywhere” rewrite  
- High-end double-bezel / floating island nav redesign (premium 8+/10 path)  

---

## File reference (highest churn)

`App.tsx` · `Home.tsx` · `Library.tsx` · `IntentNavigation.tsx` · `DetailModal.tsx` · `PoeticCaptureCanvas.tsx` · `Onboarding.tsx` · `Settings.tsx` · `Search.tsx` · `Recommendations.tsx` · `hoverCard.tsx` · `bookOverlay.ts` · `dock.ts` · `tokens.css` · `sanctuary.css` · `popup.css` · `FilmGrain.tsx` · `productCopy.ts`

---

*Generated by parallel design/taste subagents. Primary deliverable is this list; re-run after Wave A–C for score movement.*
