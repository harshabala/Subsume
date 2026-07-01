# Subsume

> A Chrome extension for cinephiles who want to own their taste — not just consume it.

---

## 🌟 The Philosophy: A Private Cinematic Sanctuary

Modern content discovery is fundamentally broken. Giant streaming conglomerates design algorithms to maximize aggregate runtime and passive viewer retention rather than authentic, idiosyncratic taste. Recommendations are flattened into generic demographic clusters ("People who watched X also watched Y").

**Subsume** is not a movie tracker. It is not a note-taking application. It is not a productivity tool.

Subsume is a **private cinematic sanctuary**.

The application evokes the emotional experience of entering a beautiful historic theatre: anticipation, immersion, reflection, and memory. Every interaction reinforces this feeling. The objective is not to maximize feature usage or data entry — it is to maximize **quality of reflection**.

> *If users leave with a deeper emotional connection to what they watched, the product has succeeded.*

---

## 🔥 What Makes Subsume Unique

1. **Auteur-First Discovery:** Traditional apps categorize film by superficial genre tags (Drama, Action). Subsume treats **filmmakers and key crew** (directors, cinematographers, writers, actors) as primary artistic entities. You can track Roger Deakins' lighting arc or Charlie Kaufman's thematic progression with your personal scores overlaid across their entire historical body of work.

2. **Omnipresent Museum Plaque Overlays (Shadow DOM Encapsulation):** Discovery happens everywhere. Subsume scans posters across any webpage and injects **museum catalogue plaques** — quiet, typographically refined rating badges with a smooth spring-expansion hover reveal (`★ 8.4 │ Reflect`). Everything is encapsulated inside isolated **Shadow DOM containers**, guaranteeing zero CSS pollution or layout breakage regardless of host site styling.

3. **Poetic Capture Canvas (Emotion Before Metadata):** When you add something to your sanctuary, you are first asked: *"What stayed with you?"* Only after writing does the interface progressively reveal intent buckets and ratings. Your emotional recall is the primary artifact — not the IMDb score.

4. **Hardcover Library Archive with Living Intent Buckets:** Your library isn't a grid of database rows. It is an editorial hardcover archive grouped by your cinematic intent: **Keep This Memory**, **Revisit This Month**, and **Wishlist**. Each spine card surfaces your personal `emotionalRecall` as an italicised excerpt.

5. **Auteur Screenplay Dock:** A floating, Shadow DOM-isolated reflection dock persists in the corner of any page, letting you record screenplay concepts, narrative parallels, and cinematic observations in the moment — saved directly to your personal sanctuary.

6. **Zero-IPC Watchlist Acceleration:** Content scripts maintain a synchronous, in-memory O(1) Set of your watchlist. Hover cards and badge statuses resolve instantly without expensive IPC message passing or IndexedDB overhead.

7. **Two-Stage Contextual AI Prompting:** A 6.5 on IMDb might be a 10 for you. Subsume constructs a rich taste profile from your highest-rated qualitative notes, queries LLMs (OpenAI, Anthropic, Gemini) to retrieve meaningful matches, and conditionally makes a secondary call to group recommendations by loved reference seeds.

8. **Decoupled MV3 SOLID Architecture:** Built on strict Clean Code principles (Robert C. Martin). Background workflows are partitioned into single-responsibility domain handler maps. AI engines are abstracted behind a polymorphic adapter pattern. Every boundary is defensive and typed.

---

## 🏛️ Three Acts of Interaction

### Act I — Discovery
Subsume scans any webpage for visual content. When it finds a poster, it injects a museum catalogue plaque: a quiet Shadow DOM card showing the title, rating, and a `Reflect` trigger. Hovering any detected movie title reveals an instant hover card — no tab switching, no friction.

### Act II — Capture
Clicking `Reflect` opens the **Poetic Capture Canvas** — a full-screen, focus-pull experience. Your poster artwork blurs softly into the background. A single prompt — *"What stayed with you?"* — occupies the centre. Only after you begin writing does the canvas reveal intent selectors and a 1–10 rating scale. Emotion precedes metadata, always.

### Act III — Archive
Your **Hardcover Library Archive** organises everything you've captured. Each title is a spine in a quiet editorial collection grouped by living intent. Search, filter by auteur-tagged crews, sort by recency or resonance. Click any spine to enter the full `DetailModal` — your complete record of that cinematic encounter.

---

## 🛠️ Comprehensive Feature Overview

| Feature | What It Accomplishes | Technical Implementation |
| :--- | :--- | :--- |
| **Museum Catalogue Plaques** | Rating badges with hover expansion on any webpage poster | Open Shadow DOM, MutationObserver, spring CSS transitions |
| **Poetic Capture Canvas** | Emotion-first capture with progressive disclosure | Preact, URL param routing (`?act=capture`), focus-pull blur keyframes |
| **Hardcover Library Archive** | Editorial archive grouped by `sanctuaryIntent` with `emotionalRecall` excerpts | Preact, `useMemo` intent filtering, `isMountedRef` async safety |
| **Auteur Screenplay Dock** | Floating reflection notepad on any page | Open Shadow DOM, toggle collapse/expand, `destroy()` lifecycle |
| **Chronological Filmography Tracking** | Follow directors, DPs, actors, writers across their full body of work | TMDb Person API, IndexedDB people store |
| **Cross-Site Hover Cards** | Instant synopsis and status on any movie title | Isolated DOM injection, debounced pointer controllers, O(1) cache |
| **Contextual LLM Recommendations** | AI discovery from your actual taste profile and notes | Two-stage prompting pipeline, OpenAI / Anthropic / Gemini adapters |
| **Weekly Automated Digests** | Curated new release picks across streaming subscriptions | Chrome background alarms, dynamic rule/AI hybrid curation |
| **Google Drive Sync** | Full library backup and restore via Google Drive | OAuth 2.0, multipart Drive API upload/download |

---

## 📐 Architecture & Engineering Blueprints

> **Design authority:** UI implementation follows `CINEMATIC_JOURNAL_DESIGN_SPEC.md` and `src/shared/tokens.css`. Those sources supersede `brand.md` on conflicts (typography, tokens, motion).

```text
  ┌────────────────────────────────────────────────────────┐
  │              Any Website (Content Layer)               │
  │  MutationObserver → Image Scanner & Title Matcher      │
  │  Shadow DOM: Museum Plaques · Hover Cards · Dock       │
  └──────────────────────────┬─────────────────────────────┘
                             │ O(1) Sync Cache / IPC Message
  ┌──────────────────────────▼─────────────────────────────┐
  │               Background Service Worker                │
  │  Domain Handler Maps (Library · LLM · Prefs · Sync)    │
  │  Polymorphic AI Adapters (OpenAI · Anthropic · Gemini) │
  └──────────────────────────┬─────────────────────────────┘
                             │ Atomic Transactions
  ┌──────────────────────────▼─────────────────────────────┐
  │             Persistent Storage (IndexedDB)             │
  │   media · library · people · tmdbCache · alerts        │
  │   v2 schema: sanctuaryIntent · emotionalRecall         │
  │              scriptParallels · originalScreenplaySparks │
  └────────────────────────────────────────────────────────┘
```

### 🔹 Clean Code & SOLID Standards Enforced
- **Single Responsibility (SRP):** Domain handler registries (`libraryHandlers`, `llmHandlers`, `syncHandlers`, `settingsHandlers`) replace monolithic switch statements. Background `index.ts` is 41 lines.
- **Open/Closed (OCP):** AI providers implement a common adapter interface. Adding Ollama or DeepSeek requires zero changes to the core pipeline.
- **Strict TypeScript:** Zero `any` types across the production codebase. All `unknown` inputs are narrowed at boundaries.
- **Memory Safety:** All Shadow DOM managers (`MuseumPlaqueManager`, `AuteurScreenplayDock`) implement explicit `destroy()` lifecycles. All async hooks use `isMountedRef` cancellation flags.
- **Structured Telemetry:** 100% of diagnostic messaging is routed through a typed `logger` utility.

---

## 🔐 Security

Subsume is a client-side Chrome extension. There is no backend proxy — API keys and library data stay on your machine. Understand these tradeoffs before enabling LLM features or distributing a fork.

### API Keys & Local Storage

| Topic | Behavior |
| :--- | :--- |
| **Where keys live** | TMDb, OMDb, and LLM API keys are stored in **IndexedDB** (`subsume-db`) as part of `UserPreferences`. They are **not encrypted at rest**. |
| **Who is responsible** | You. Keys never leave your browser except when the extension calls the providers you configure. Treat your machine and Chrome profile as trusted. |
| **Content-script exposure** | API keys are **never** sent to content scripts. `GET_CONTENT_PREFS` returns feature toggles only (see `buildContentPrefs()`). |
| **Export/backup** | Library export excludes API keys. Only media and library records are included. |

### LLM Integration

LLM calls (OpenAI, Anthropic, Gemini) are made **directly from the background service worker** using **your** API keys. Prompts are built from your local library — not from arbitrary page DOM — but short note excerpts (≤100 chars) may be included in taste-profile prompts.

**Anthropic browser header:** When using Anthropic, the extension sends `anthropic-dangerous-direct-browser-access: true`. Anthropic requires this header for API requests originating in a browser context (MV3 service worker). Without it, direct client calls fail. The tradeoff is that your API key is used client-side and is visible to anyone with access to the extension bundle or your browser profile.

**Recommendations:**

- Use **personal API keys** for solo or portfolio use.
- Do **not** ship a public Chrome Web Store build that embeds shared or enterprise keys.
- For team or enterprise distribution, route LLM calls through a **server-side proxy** that holds keys and enforces rate limits — do not rely on client-side key storage.

### Google Drive Sync

Drive backup requires a **real Google OAuth client ID** in `manifest.json`. The committed placeholder `YOUR_CLIENT_ID_HERE` will not work until you replace it with a Chrome-extension OAuth client from [Google Cloud Console](https://console.cloud.google.com/). See [Setup → Google Drive OAuth](#google-drive-oauth-optional).

### Content Script Surface

Subsume injects on all `http://` and `https://` pages so discovery works on any site you browse. That broad surface is deliberate, but hostile pages must not be able to exfiltrate your full library or exhaust API quotas.

| Mitigation | What it does |
| :--- | :--- |
| **Message allowlist** | Content scripts may only call a small set of background messages (`GET_CONTENT_PREFS`, `RESOLVE_POSTER`, `CHECK_LIBRARY_STATUS`, etc.). `GET_LIBRARY`, `SET_USER_NOTES`, and settings/key messages are extension-UI only. |
| **Scoped library checks** | Hover cards call `CHECK_LIBRARY_STATUS` per `mediaId` when a card opens — never the full watchlist. |
| **Per-origin poster budget** | Max **10** `RESOLVE_POSTER` calls per origin per content-script session; additional resolves are skipped and logged. |
| **Poster query clamping** | Ancestor-text poster queries are capped at 60 characters and require ≥2 words before hitting TMDb. |
| **API key stripping** | `GET_CONTENT_PREFS` returns feature toggles only — no TMDb/OMDb/LLM keys in the content layer. |
| **Page reflection storage** | The Auteur Reflection Dock saves notes in `chrome.storage.local` keyed by `hostname + pathname`, not via fake `mediaId` library writes. |
| **Sync listener hardening** | `LIBRARY_UPDATED` handlers verify `sender.id === chrome.runtime.id` before mutating in-memory caches. |
| **Lifecycle teardown** | `HoverCardManager`, `MuseumPlaqueManager`, and `AuteurScreenplayDock` expose `destroy()`; the content entry point tears down on `pagehide`. |

You can blacklist domains in **Settings → Disabled Domains** to disable all content-script features on specific sites.

---

## ⚙️ Setup & Local Run Guide

### Prerequisites
- Node.js 18+ & npm
- Google Chrome or Brave Browser (v120+)
- **TMDb API Key** (Free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
- **OMDb API Key** *(Optional)* (Free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx))
- **LLM API Key** *(Optional)* (OpenAI, Anthropic, or Google Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/harshabalakrishnan16/subsume.git
cd subsume

# Install dependencies & build production bundle
npm install
npm run build
```

### Google Drive OAuth (Optional)

> **Required for Drive sync:** The repo ships with a placeholder OAuth client ID. Google Drive backup and restore **will not work** until you register your own client.

Replace `YOUR_CLIENT_ID_HERE` in `manifest.json` with a real **Chrome extension OAuth client ID** from [Google Cloud Console](https://console.cloud.google.com/) (APIs & Services → Credentials → Create OAuth client ID → Chrome extension). Use the extension ID shown on `chrome://extensions` when creating the client. Do not commit your production client ID if you maintain a public fork — use a local override ignored by git (see `.gitignore`).

### Loading into Chrome / Brave

1. Navigate to `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** via the toggle in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist/` folder inside your project directory.
5. Click the Subsume icon → Open **Settings** → Paste your TMDb API key.

---

## 🏆 Attribution & Acknowledgements

Subsume stands on the shoulders of incredible open-source tools and open data providers:

- **[TMDb (The Movie Database)](https://www.themoviedb.org/):** For comprehensive cinematic metadata, cast/crew hierarchies, and high-resolution poster imagery. *(Notice: This product uses the TMDb API but is not endorsed or certified by TMDb.)*
- **[OMDb API](https://www.omdbapi.com/):** For supplementary IMDb score aggregation.
- **[Preact](https://preactjs.com/) & [Vite](https://vitejs.dev/):** For ultra-fast, lightweight UI rendering and lightning-fast bundle optimisation.
- **[idb](https://github.com/jakearchibald/idb):** For robust Promise-based IndexedDB transaction wrapping.
- **[Lucide Icons](https://lucide.dev/):** For crisp, modern UI iconography.
- **[Newsreader](https://fonts.google.com/specimen/Newsreader) & [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts):** For the editorial typographic identity of the sanctuary.
- **[Vitest](https://vitest.dev/):** For the blazing-fast unit test suite (96 tests across 18 suites).

---

## ✍️ Developer Signature & Contact

**Subsume** was conceived, architected, and directed by **Harsha Balakrishnan**.

> *"Built through rigorous AI-assisted pair programming and advanced orchestration across cutting-edge autonomous coding agents — Antigravity (Google DeepMind), Claude (Anthropic), and Gemini Pro. Every architectural pattern, SOLID abstraction, defensive exception boundary, Shadow DOM interaction, and cinematic sanctuary philosophy was meticulously directed, evaluated, and refined. A demonstration of what a single developer equipped with agentic superpowers can architect and ship."*

- **GitHub:** [@harshabalakrishnan16](https://github.com/harshabalakrishnan16)
- **Email:** [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)

---

*Cinephilia is an active pursuit. Own your taste.*
