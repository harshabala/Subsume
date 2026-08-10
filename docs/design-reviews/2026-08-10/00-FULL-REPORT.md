# Subsume — Full Multi-Skill Design & Code Review Report

**Date:** 2026-08-10  
**Subject:** Subsume Chrome MV3 extension after Ferrari design system + P0 / open-issues A–H wave  
**Branch:** `fix/design-p0-review-wave` @ `a5471b5`  
**Base:** `main` @ `e8a5287` (Ferrari Phase 1 on main; P0 wave **not yet merged**)  
**Method:** **28 parallel specialized subagents** (design · interaction · language · icons · product · code/security)  
**Loadable build:** `~/Desktop/Subsume-dev` (prefer source on branch as truth)  
**Prior baseline:** `docs/design-reviews/2026-08-04/` (mean craft ≈ **6.5 / 10**)

---

## 1. Executive summary

### One-line verdict

**Hygiene shipped; identity and activation still open.** The P0 review wave closed the paint bugs that tanked the Aug 4 scores. Craft is up ~1.1 points. Full “updated design” is **not finished** — dual brand, icons, type, user lexicon, and first-run activation still cap the product.

### Headline numbers

| Band | Score | Notes |
|------|------:|-------|
| **Craft mean (design skills /10)** | **≈ 7.1** | Was ≈ 6.5 on 2026-08-04 → **+0.6** |
| **Hygiene / P0 wave completeness** | **9.2 / 10** | All claimed P0 + A–H still hold; ready to merge after CI |
| **Ferrari DESIGN.md compliance** | **~64% / 6.4** | Was ~58% / 5.8 → **+6 pp** |
| **Security posture (CSO daily)** | **7.5 / 10** | 0 critical; 2 high (API keys storage + keys in URL) |
| **Security review (OWASP-style)** | **7.2 / 10** | Drive tokens, open Shadow dock, weak media validation |
| **Bug risk (10 = clean)** | **6.5 / 10** | DetailModal debounce flush + accordion always-mount |
| **Icons system** | **4.5 / 10** | Weakest visual system dimension |
| **User language / voice consistency** | **6.4 / 5.8** | Lexicon fork + “Dispatch” |
| **Product roast (weighted)** | **57 / 110** | Needs significant work — activation death |
| **Rams (Design Is)** | **16 / 30 → REDESIGN** | Unchanged recommendation |

### Ship / don’t ship

| Decision | Recommendation |
|----------|----------------|
| **Merge `fix/design-p0-review-wave` → main** | **Yes** — hygiene is real and verified (after `npm run typecheck && npm test && npm run build`) |
| **Call design “done”** | **No** — Option A identity, icons, language fork, activation still open |
| **Another pure token remap** | **No** — lock type/identity first |

---

## 2. Full scoreboard (28 agents)

### A. Design & visual craft

| # | Skill | Score | Δ vs Aug 4 | Report |
|---|--------|------:|------------|--------|
| 01 | Impeccable | **7.5** | +1.1 | [01-impeccable.md](./01-impeccable.md) |
| 02 | Apple Design | **7.0** | +0.3 | [02-apple-design.md](./02-apple-design.md) |
| 03 | Emil Kowalski | **7.4** | +1.2 | [03-emil-kowalski.md](./03-emil-kowalski.md) |
| 04 | Frontend design guidelines | **7.6** | +0.9 | [04-frontend-design-guidelines.md](./04-frontend-design-guidelines.md) |
| 05 | Motion design principles | **8.3** | +0.7 | [05-design-motion-principles.md](./05-design-motion-principles.md) |
| 06 | High-end visual design | **6.0** | +0.5 | [06-high-end-visual-design.md](./06-high-end-visual-design.md) |
| 07 | Userinterface wiki | **8.0** | +0.5 | [07-userinterface-wiki.md](./07-userinterface-wiki.md) |
| 08 | Design taste (anti-slop) | **6.2** | +0.7 | [08-design-taste-frontend.md](./08-design-taste-frontend.md) |
| 09 | Brand design | **7.0** | +0.5 | [09-brand-design.md](./09-brand-design.md) |
| 13 | Frontend-design (marketplace) | **5.5** | 0 | [13-frontend-design-marketplace.md](./13-frontend-design-marketplace.md) |
| 14 | Redesign existing projects | **7.1** | +0.3 | [14-redesign-existing-projects.md](./14-redesign-existing-projects.md) |
| 15 | Design-is (Dieter Rams) | **16/30 REDESIGN** | 0 | [15-design-is-rams.md](./15-design-is-rams.md) |
| 16 | Ferrari DESIGN.md compliance | **~64% / 6.4** | +6pp / +0.6 | [16-ferrari-design-md-compliance.md](./16-ferrari-design-md-compliance.md) |

**Craft mean (numeric /10, excl. Rams):** ≈ **7.1**

### B. Motion & interaction

| # | Skill | Score | Report |
|---|--------|------:|--------|
| 05 | Motion principles | **8.3** | [05](./05-design-motion-principles.md) |
| 11 | Find animation opportunities (alive) | **8.0** | [11](./11-find-animation-opportunities.md) |
| 12 | Improve animations plan | **7.5** | [12](./12-improve-animations.md) |
| 21 | Animation vocabulary | **6.0** | [21](./21-animation-vocabulary.md) |
| 27 | Accessibility | **7.2** | [27](./27-accessibility.md) |
| 28 | Interaction design | **6.8** | [28](./28-interaction-design.md) |

### C. Language, icons, product

| # | Skill | Score | Report |
|---|--------|------:|--------|
| 10 | Product review | **7.3** | [10](./10-product-review.md) |
| 18 | User language & voice | **6.4** (consistency **5.8**) | [18](./18-user-language-voice.md) |
| 19 | Icons system | **4.5** | [19](./19-icons-system.md) |
| 20 | Roast my product | **57/110** | [20](./20-roast-my-product.md) |

### D. Code review, bugs, security

| # | Skill | Score | Report |
|---|--------|------:|--------|
| 17 | P0 wave verification | **9.2** completeness | [17](./17-p0-wave-verification.md) |
| 22 | Find bugs (risk; 10=clean) | **6.5** | [22](./22-find-bugs.md) |
| 23 | Security review | **7.2** | [23](./23-security-review.md) |
| 24 | Code standards | **7.4** | [24](./24-code-review-standards.md) |
| 25 | CSO daily | **7.5** (0 crit / 2 high) | [25](./25-cso-daily.md) |
| 26 | GHA security | **8.5** | [26](./26-gha-security.md) |

---

## 3. Delta vs 2026-08-04

| Theme | Aug 4 | Aug 10 | Status |
|-------|------:|-------:|--------|
| Translucent primary CTAs (`--border-hero` fills) | P0 open | **Closed** | Solid `--primary` |
| Residual gold chroma `hsla(45…)` / `#c9a84c` | P0 open | **Closed** | Zero under `src/` |
| `transition: all` | P1 open | **Closed** | Zero under `src/` |
| Dock hard open/close | P1 open | **Closed** | Enter/exit classes |
| Modal exit ease-in / longer than enter | P1 open | **Closed** | Curtain close + ease-out family |
| Popup PRM incomplete | P1 open | **Closed** | Nuclear reduce block |
| brand.md / PRODUCT.md drift | P0 open | **Mostly closed** | Aligned; README / cinematic still lag |
| Dual identity | P0 open | **Still open** | Option A named, not fully shipped |
| DESIGN.md geometry | P1 open | **Partial** | Spacing ladder + radius-none partial |
| Product activation | Wave 4 | **Still open** | Largest product lever |
| Icons | Generic | **Still weak** | 4.5/10 |
| Craft mean | ~6.5 | **~7.1** | Hygiene-driven lift |

---

## 4. Consensus themes (cross-skill)

### P0 — Fix first (repeated across skills)

1. **Ship the branch** — `fix/design-p0-review-wave` is local-only; all hygiene value is stranded until merge + CI green.  
2. **Activation death** — 5-step key ceremony → empty Archive default; no forced first inscription; demo opt-in only (product, roast, interaction, Rams #4).  
3. **DetailModal data loss** — pending notes/progress debounces cleared without flush on unmount (`DetailModal.tsx` ~301–311) — **High** bug confidence.  
4. **Identity still dual** — Ferrari paint + Criterion theatre chrome/copy; monofont Inter flattens luxury; Rams still **REDESIGN**.

### P1 — High leverage next

5. **Icons system rewrite** — Material Symbols + emoji ratings + gold toolbar spiral + stroke free-for-all (icons 4.5).  
6. **User language lexicon fork** — Archive Anticipated/Screened vs popup Want to watch/Watched; kill user-facing “Dispatch.”  
7. **Type decision** — Restore editorial dual-type (Option A soul) *or* real monofont display scale — not Inter cosplay italics.  
8. **Primary scarcity + red-channel policy** — Rosso still on nav/chips/range; danger/abandoned compete with brand red.  
9. **A11y** — modal shell `inert`; dock keyboard (Esc, focus restore, named textarea); Rosso text-on-dark chip contrast; 40–44px targets.  
10. **Motion consistency** — popup suggestion re-stagger on every keystroke; plaque `max-width` thrash; ungated touch hover on content surfaces.

### P2 — Polish

11. Gold **class names** (`.sanctuary-btn-gold`, `--gold*` aliases) — values correct, vocabulary lies.  
12. Docs authority: README still credits Newsreader/Outfit; `CINEMATIC_JOURNAL_DESIGN_SPEC.md` / DESIGN_AGENT_BRIEF lag.  
13. Animation vocabulary mismatch (Curtain vs Dolly names).  
14. GHA action SHA pins + explicit `permissions` on CI.  
15. System light theme residual surfaces.

### Protect (do not sand down)

- Poetic Capture Canvas, hardcover spines, film grain (optional), curtain ceremony  
- Motion ceiling ≤300ms + broad `prefers-reduced-motion`  
- Solid Rosso primary CTAs + white on-primary (post-wave)  
- Closed Shadow + trusted-gesture pattern on plaques (keep; dock is the weak open-shadow path)  
- Free-source discovery fallbacks; local-first privacy story  

---

## 5. Domain deep dives (compiled)

### 5.1 Visual design & brand

**What worked:** Token-first Ferrari remap is real — Cinema Black `#181818`, Rosso Corsa `#da291c`, White Canvas light, Inter stacks, Shadow DOM parity, theme labels. P0 wave made CTAs solid and killed gold ghosts.

**What still fails luxury / taste:**
- Inter for both editorial and UI (high-end 6.0, marketplace 5.5, taste 6.2)
- SaaS card grammar: border + dark shadow + `translateY` hover
- Material Symbols as chrome language
- Eyebrow / section-number slop (`Catalogue No. 03`, `Index 00`)
- `DESIGN.md` still reads like Ferrari.com marketing, not Subsume Option A journal

**Compliance:** DESIGN.md ≈ **64%** — palette strong; button type/geometry, shadow philosophy, display scale, scarcity still weak.

### 5.2 Interaction & motion

**Strengths:** Motion principles **8.3** — dock expand/collapse, dossier accordion, notice exit, onboarding step enter, alerts form, popup PRM, no `transition: all`.

**Frictions (interaction 6.8):**
1. Reflect opens a **new Sanctuary tab** with no return path → breaks on-page immersion  
2. Silent hover add/remove failures (console only)  
3. Multi-surface capture dialect: popup ≠ poetic canvas ≠ dock (page-local) ≠ hover  

**Motion leftovers:** popup suggestion re-stagger; plaque width animation; content hover unguarded; vocabulary naming drift.

### 5.3 Accessibility

**7.2 / 10.** Focus-visible broadly present; drawer trap + `inert` good; solid white-on-Rosso CTAs ~4.9:1.

**Gaps:** page behind modals not `inert`; dock keyboard model incomplete; red-on-dark selection chips ~3.7:1; dense 28–32px controls.

### 5.4 User language & voice

**6.4 overall / 5.8 consistency.**

| Conflict | Surfaces |
|----------|----------|
| Anticipated / Screened / Shelved | Archive chips |
| Want to watch / Watched / … | Popup + `statusLabels` |
| “Dispatch” | Still user-facing in places (voice guide forbids) |
| Vault / house / repertoire / programme | Theatre stack vs plain Settings |
| Multi-medium still screen-biased | Book paths inherit film metaphors |

Gold **user-facing** strings are largely clean; residual “gold” is class/token names only.

### 5.5 Icons

**4.5 / 10 — lowest craft dimension.**

| Source | Verdict |
|--------|---------|
| Material Symbols Outlined | Generic SaaS; poor brand fit |
| Ad-hoc SVG | Mixed strokes 1–2.5 |
| Emoji (⭐ 🍅) | Fail optical system |
| Toolbar PNGs (gold spiral) | Fail vs Rosso system |
| Empty projector SVG | Strong exception |

**Fix direction:** ~14 monoline house icons; kill emoji ratings; remaster toolbar; drop Google icon font dependency.

### 5.6 Product / activation

**Product 7.3 · Roast 57/110.**

Core loop (plaque → Reflect → Poetic Capture → Archive) is distinctive and strong.  
Risk is **never completing one inscription**, not missing features.

**Minimum activation redesign:**
1. Collapse FTUE to ≤2 steps; defer OMDb/LLM  
2. Land new users on Discovery with *Inscribe your first title*  
3. Empty Archive: three concrete CTAs + one-line plaque how-to  
4. Force first inscription <90s  

### 5.7 Code quality & bugs

**Standards 7.4 · Bug risk 6.5.**

| Severity | Finding | Location |
|----------|---------|----------|
| **High** | Debounced notes/progress cleared without flush on unmount → data loss | `DetailModal.tsx` ~301–311 |
| **Medium** | Dossier accordion always mounts children → IPC every modal open | `DetailModal.tsx` ~759–765 |
| **Medium** | Dock `saveNotes` always `toggle()` → can re-expand if user collapsed mid-save | `dock.ts` ~483–487 |

Maintainability: duplicate PRM helpers; dual token sources (`tokens.css` ⇄ `shadowTokens`); magic timings (350ms modal fallback over 300ms ceiling).

### 5.8 Security

| Source | Score | Top issues |
|--------|------:|------------|
| CSO daily | 7.5 | Plaintext API keys in IDB; OMDb/Books `apikey=` / `key=` in URL |
| OWASP-style | 7.2 | Drive OAuth tokens in `chrome.storage.local` (implicit grant); open Shadow dock without trusted gesture; weak `isValidMediaItem` |
| GHA | 8.5 | Tag-pinned actions; CI missing explicit `permissions` |

**Strengths:** Message origin allowlist; content prefs strip keys; closed shadow + trusted gesture on plaques; no `externally_connectable`; export excludes secrets; LLM output as data not code.

---

## 6. Prioritized roadmap (post-report)

### Wave 0 — Ship (½ day)

1. Run full CI on `fix/design-p0-review-wave`  
2. Fix High bug: DetailModal debounce flush on unmount  
3. Push branch + open PR → merge to main  

### Wave 1 — Activation (1–2 days) — product score lever

1. Collapse onboarding; land Discovery  
2. Empty Archive action trio + plaque how-to  
3. Guided first inscription  

### Wave 2 — Identity lock (3–5 days) — craft ceiling

1. Decide dual-type **or** monofont display system (Option A execute)  
2. Rewrite `DESIGN.md` as Subsume journal system (not Ferrari.com dump)  
3. Align README + cinematic specs  
4. Red-channel policy in tokens (brand vs danger vs abandoned)  
5. Rename `*-gold` classes (aliases OK one release)  

### Wave 3 — Icons + language (2–3 days)

1. House icon set; kill emoji ratings; remaster toolbar  
2. Unify status/intent lexicon across popup/archive/dock  
3. Kill “Dispatch”; plain anchors under poetic lines  

### Wave 4 — A11y + motion + security hygiene (2–3 days)

1. Modal `inert`; dock keyboard model; chip contrast; hit targets  
2. Popup re-stagger; plaque max-width; content hover gates  
3. Encrypt or isolate secrets; Drive token hardening; dock trusted gestures; GHA SHA pins  

---

## 7. Progress estimate (updated)

| Scope | % done |
|--------|--------|
| Ferrari Phase 1 token plan | **100%** (on main) |
| P0 + A–H hygiene wave | **~100%** coded · **0%** merged |
| Overall design update (Option A) | **~72–75%** |
| Full DESIGN.md Ferrari fidelity | **~64%** |
| Activation / first inscription | **~10%** |
| Icons system | **~30%** |
| User language coherence | **~55%** |
| Security hardening (beyond baseline) | **~70%** |

**Overall “updated extension design” package: ~72%**  
(With branch merge: code-complete hygiene → still ~75% of full craft+product bar.)

---

## 8. How to read this corpus

1. Start here (`00-FULL-REPORT.md`) for decisions.  
2. Use [00-INDEX.md](./00-INDEX.md) as navigation.  
3. Open individual skill files for **file:line** evidence.  
4. Compare to `../2026-08-04/` for deltas.  
5. Execution plans with exact ms: [12-improve-animations.md](./12-improve-animations.md).  
6. Security detail: [23](./23-security-review.md) + [25](./25-cso-daily.md).  

**Corpus size:** 28 skill reports + this full report + index under `docs/design-reviews/2026-08-10/`.

---

## 9. Agent inventory

| ID range | Agents | Mode |
|----------|--------|------|
| 01–09, 13–16 | Design / brand / luxury / Rams / Ferrari compliance | Read-write reports |
| 05, 11–12, 21, 27–28 | Motion / interaction / a11y | Read-write reports |
| 10, 18–20 | Product / language / icons / roast | Read-write reports |
| 17, 22–26 | Verification / bugs / security / standards / GHA / CSO | Read-write reports |

**Total subagents: 28** · Parallel max · Target HEAD `a5471b5`.

---

*Generated 2026-08-10 by multi-agent design review panel. Individual scores are agent judgments against skill criteria; mean craft is an unweighted average of /10 design scores excluding Rams and non-/10 scales.*
