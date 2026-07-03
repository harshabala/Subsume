# Subsume — Design Agent Brief (v0.1.5)

**Purpose:** Give this document to your design/coding agent so it can propose the right UI/UX before final implementation.  
**Repo:** `/Users/harshabalakrishnan/Documents/Projects/Subsume`  
**GitHub:** https://github.com/harshabala/Subsume  
**Current version:** 0.1.5 (`main` branch)  
**Load in Chrome:** `~/Desktop/Subsume-Dev` (symlink → `dist/`) or `Documents/Projects/Subsume/dist`

---

## 1. Product in plain language

Subsume is a **Chrome extension for film lovers**. It helps you:

1. **Discover** films while browsing (IMDb, Netflix, Letterboxd, etc.)
2. **Capture** how a film made you *feel* (not just star ratings)
3. **Archive** everything in a private “sanctuary” library

**Design north star:** A private historic cinema — anticipation, immersion, reflection, memory. Not a productivity app.

---

## 2. Two surfaces (this is the consistency problem)

| Surface | What it is | Size | Role today |
|--------|------------|------|------------|
| **Toolbar popup** | Click extension icon | ~360×520px | Quick stats, **Log a Movie** form, emotional sliders, aura preview |
| **Full app** | Opens in new tab (`ui/index.html`) | Full browser window | Sanctuary library, Discovery feed, Search, Settings, etc. |

**User’s intent:** Popup = fast actions while browsing. Full app = richer metadata and reflection.

**Gap today:** Emotional sliders (awe/melancholy/tension/warmth) exist **only in the popup**. The full app still uses the older **Poetic Capture Canvas** (text-first, no sliders, no soundwave chart). They feel like two different products.

---

## 3. What exists in code (verified)

### Popup (NEW — design agent work, integrated v0.1.5)
- `src/ui/popup.tsx` — two views: Overview + Log Movie
- `src/ui/styles/popup.css` — obsidian theme, sliders, aura gradient
- Tab title auto-detect (IMDb, Letterboxd, Netflix, Wikipedia)
- Search via free APIs (`DISCOVERY_SEARCH`)
- Saves: `awe`, `melancholy`, `tension`, `warmth` (0–100), notes, sanctuary intent

### Full app pages
| Page | Nav label | File | What it does |
|------|-----------|------|--------------|
| Discovery | Discovery (top nav) | `src/ui/pages/Home.tsx` | Feed, search, stats, hero plaque |
| Sanctuary | Sanctuary (top nav) | `src/ui/pages/Library.tsx` | Hardcover spine archive |
| Settings | Settings | `src/ui/pages/Settings.tsx` | Theme, APIs, prefs |
| Search Archive | Drawer | `src/ui/pages/Search.tsx` | Title search |
| Recommendations | Drawer | `src/ui/pages/Recommendations.tsx` | AI/rule picks |
| What’s New | Drawer | `src/ui/pages/NewReleases.tsx` | Programme |
| Filmmakers | Drawer | `src/ui/pages/People.tsx` | Crew tracking |
| Stats | Drawer | `src/ui/pages/Stats.tsx` | Analytics |
| Alerts | Drawer | `src/ui/pages/Alerts.tsx` | Watch alerts |
| Logs | Drawer | `src/ui/pages/Logs.tsx` | Debug logs |

### Shared reflection UI (full app only)
- `src/ui/components/PoeticCaptureCanvas.tsx` — full-screen “What stayed with you?” capture
- `src/ui/components/DetailModal.tsx` — title detail sheet
- `src/ui/components/archive/HardcoverSpineCard.tsx` — library cards (shows `emotionalRecall` text, **not** sliders)

### Data layer (works)
- `src/shared/types.ts` — `LibraryItem` has `awe`, `melancholy`, `tension`, `warmth`
- `src/background/handlers/utils.ts` — validates 0–100
- `src/background/handlers/library.ts` — persists to IndexedDB

### Design system (source of truth)
- `src/shared/tokens.css` — **Gilded Night** (dark) + **Parchment** (light)
- `brand.md` — palette reference
- `CINEMATIC_JOURNAL_DESIGN_SPEC.md` — typography, motion, sanctuary patterns
- Fonts in app: **Newsreader** (editorial) + **Outfit** (UI)

### Browsing layer (content scripts — separate from popup)
- Museum plaque overlays on posters
- Hover cards on titles
- Auteur Screenplay Dock

---

## 4. What exists in the HTML mockup but NOT in the extension

Reference file (Open Design): `subsume-cinephile-extension-2.html`

| Mockup feature | In extension? |
|----------------|---------------|
| Emotional sliders in popup | ✅ Yes |
| Dynamic aura color-mix background | ✅ Yes (popup only) |
| Tab context auto-fill | ✅ Yes |
| Full **Diary dashboard** with movie card grid | ❌ No |
| **SVG soundwave** chart (average emotions) | ❌ No |
| **Film grain** shader overlay | ❌ No |
| **Cinema atmosphere** presets (sunset/emerald/french) | ❌ No |
| **Gallery Light** theme toggle in mockup UI | ❌ No (Settings has Parchment instead) |
| Delete card → recalculate chart | ❌ No |
| Empty state “projection” card | ⚠️ Partial (popup empty only) |

**Fonts in mockup:** Playfair Display + Plus Jakarta Sans  
**Fonts in extension:** Newsreader + Outfit  
→ Design agent must decide: keep extension fonts or align mockup fonts.

---

## 5. End-to-end user flows (current)

### Flow A — Browse & quick log (popup)
```
Visit IMDb film page → Click Subsume icon
  → Popup detects title → Opens Log view
  → Search/select film → Adjust 4 sliders + notes
  → Save → Success overlay → Overview (stats updated)
```

### Flow B — Deep reflection (full app)
```
Open Sanctuary app → Discovery or Sanctuary
  → Click Reflect on hero OR open library spine
  → Poetic Capture Canvas (text only, no sliders)
  → Save notes + intent + rating
```

### Flow C — Content script (any site)
```
See poster → Museum plaque → Reflect
  → Opens full app capture canvas (?act=capture&mediaId=...)
```

**Inconsistency:** Flow A saves emotional spectrum; Flows B/C do not expose the same UI.

---

## 6. Questions for the product owner (Harsha)

Answer these in plain language — no code needed. Copy section 6 answers back to the implementation agent.

### A. Popup vs full app scope

**Q1.** After logging a film in the **popup**, where should the user go to see the full emotional profile?

- [ ] A) Stay in popup — overview is enough  
- [ ] B) Full app **Sanctuary** library — each spine/card shows emotion dots or mini chart  
- [ ] C) Full app **new “Diary” page** — like the HTML mockup grid + soundwave  
- [ ] D) Full app **Detail modal** only — click any title to see sliders + chart  

**Q2.** Should the **Poetic Capture Canvas** (full-screen reflect) use the **same 4 sliders** as the popup?

- [ ] Yes — one unified reflection form everywhere  
- [ ] No — popup = quick sliders; full canvas = long-form writing only  
- [ ] Hybrid — sliders in popup; canvas adds atmosphere + lingering thought fields  

**Q3.** Should **content script “Reflect”** (on posters) open:

- [ ] A) Popup log form (fast)  
- [ ] B) Full app capture canvas (immersive)  
- [ ] C) User preference in Settings  

### B. Visual identity

**Q4.** Which visual direction wins?

- [ ] **Gilded Night** (current extension — gold + obsidian, Newsreader/Outfit)  
- [ ] **Gilded Obsidian & Celluloid** (mockup — Playfair/Jakarta, stronger grain, atmospheres)  
- [ ] Merge — keep extension structure, import mockup colors/motion/grain only  

**Q5.** Do you want **film grain overlay** on the full app?

- [ ] Yes, subtle always-on  
- [ ] Yes, only on Discovery/Sanctuary hero areas  
- [ ] No — too noisy for daily use  

**Q6.** Do you want **Cinema atmosphere presets** (sunset / emerald / french noir)?

- [ ] Yes — in Settings alongside Parchment/Gilded Night  
- [ ] Yes — but only as accent themes, not full re-skin  
- [ ] No — stick to dark + light + system  

### C. Discovery vs Sanctuary

**Q7.** What should **Discovery (Home)** prioritize?

- [ ] Trending feed + search (current)  
- [ ] Personal emotional diary + soundwave of your last 30 logs  
- [ ] Both — feed on top, “your emotional weather” section below  

**Q8.** Should logged films with emotional data appear on **Discovery** immediately after popup save?

- [ ] Yes — “Recently reflected” strip  
- [ ] No — only in Sanctuary  

### D. Popup behavior

**Q9.** Popup primary action when archive is empty:

- [ ] “Log a Movie” (current)  
- [ ] Auto-open Log view if tab looks like a film page (current partial behavior)  
- [ ] Onboarding mini-tour first  

**Q10.** After saving in popup, should we:

- [ ] Return to overview (current)  
- [ ] Open full app to that title’s detail page  
- [ ] Stay on log form for batch logging  

### E. Metadata richness (full app only)

**Q11.** In full app detail view, which extra blocks matter most? (rank 1–5)

- [ ] Streaming availability  
- [ ] Director / crew (filmmakers)  
- [ ] Emotional spectrum chart (4 metrics over time)  
- [ ] Your notes + emotional recall excerpt  
- [ ] Similar films / recommendations  

**Q12.** Should **Stats** page show aggregate emotional trends (average awe per month, etc.)?

- [ ] Yes — core feature  
- [ ] Nice to have later  
- [ ] No  

---

## 7. Questions for the DESIGN agent (technical deliverables)

The design agent should answer these with **concrete specs** (screens, component list, CSS tokens), not just prose.

### Must deliver

1. **Information architecture diagram** — popup views + full app pages + how they link  
2. **Component map** — which mockup widgets become which Preact files (table format)  
3. **Unified reflection spec** — single source of truth for: notes, 4 sliders, intent, rating, atmosphere  
4. **Token delta** — list any new CSS variables vs `tokens.css` (don't invent parallel systems)  
5. **Motion spec** — transitions for popup ↔ full app, theme switch, save success  
6. **A11y checklist** — focus rings, combobox, slider labels, contrast ratios (WCAG AA)  
7. **Responsive rules** — popup fixed 360px; full app breakpoints  
8. **Empty/loading/error states** for each new screen  
9. **Explicit “do not port” list** — mockup fluff that doesn't belong in MV3 extension  

### Files the design agent may touch (implementation phase)

```
src/ui/popup.tsx
src/ui/styles/popup.css
src/ui/pages/Home.tsx
src/ui/pages/Library.tsx
src/ui/components/PoeticCaptureCanvas.tsx
src/ui/components/DetailModal.tsx
src/ui/components/archive/HardcoverSpineCard.tsx
src/shared/tokens.css
src/ui/App.tsx (navigation only)
```

### Files the design agent must NOT break

```
src/background/*          — data handlers
src/content/*             — page overlays
manifest.json             — permissions
src/shared/messages.ts    — IPC contract
```

---

## 8. Suggested target architecture (recommendation for design agent)

```
┌─────────────────────────────────────────────────────────────┐
│  POPUP (quick capture)                                       │
│  • Detect tab title                                        │
│  • Search + select title                                   │
│  • 4 emotional sliders + aura preview                      │
│  • Short notes + intent pill                               │
│  • Save → IndexedDB                                        │
│  • CTA: "Open in Sanctuary" → deep link to DetailModal   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FULL APP                                                    │
│  Discovery — feed + "Recently reflected" + emotional weather │
│  Sanctuary — spine cards show emotion badges                 │
│  Detail — full metadata + slider history + notes             │
│  Capture canvas — same sliders OR deep link from popup       │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. MCP / “can the agent see the app?”

- **This coding agent (terminal):** Can build, test, read files, push git. Cannot *see* your screen unless browser MCP is connected.
- **Chrome DevTools MCP** (if enabled in Cursor): Can open `chrome://extensions`, load unpacked `dist/`, inspect popup DOM, screenshot, check contrast.
- **For Harsha (human):** Reload extension → click icon on IMDb page → that's the fastest visual check.

**To enable visual verification:** Cursor Settings → MCP → ensure `chrome-devtools` server is on → agent can drive Chrome.

---

## 10. Build & test commands (for agents)

```bash
cd /Users/harshabalakrishnan/Documents/Projects/Subsume
npm install
npm run build          # outputs to dist/
npm test               # 190 tests
```

Reload extension in Chrome after every build.

---

## 11. Handoff back to implementation agent

When design work is done, return:

1. Answers to **Section 6** (product questions)  
2. Figma/HTML spec OR updated mockup with **component annotations**  
3. **File-by-file change list** with priority P0/P1/P2  
4. Screenshots or screen recording of expected behavior  
5. Explicit note on font decision (Newsreader vs Playfair)

Implementation agent (Claude in Cursor) will then merge into `main`, run tests, and push.

---

*Generated: 2026-07-02 · Subsume v0.1.5*