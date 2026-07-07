# Subsume

> A Chrome extension for cinephiles who want to own their taste — not just consume it.

<!-- Add a screenshot or short GIF here of the Poetic Capture Canvas or the museum plaque hover reveal.
     This is the single highest-leverage addition to this README — a portfolio reader decides
     whether to keep reading in about 3 seconds, and a visual does that work instantly. -->

---

## Table of Contents

- [The Philosophy](#the-philosophy-a-private-cinematic-sanctuary)
- [What Makes Subsume Unique](#what-makes-subsume-unique)
- [Three Acts of Interaction](#three-acts-of-interaction)
- [Feature Overview](#comprehensive-feature-overview)
- [Architecture](#architecture--engineering-blueprints)
- [Security](#security)
- [Setup & Local Run](#setup--local-run-guide)
- [Attribution](#attribution--acknowledgements)
- [License](#license)

---

## The Philosophy: A Private Cinematic Sanctuary

Modern content discovery is built to maximize aggregate runtime, not authentic taste. Recommendations get flattened into demographic clusters — "people who watched X also watched Y" — and the individual eye that noticed the lighting, the cut, the performance, gets lost.

**Subsume** is not a tracker. It's not a notes app. It's a **private cinematic sanctuary** — built to feel like stepping into a theatre lobby: anticipation, immersion, reflection, memory.

The goal isn't feature usage or data entry. It's quality of reflection.

> *If you leave a film with a deeper emotional connection to it than when you walked in, Subsume did its job.*

---

## What Makes Subsume Unique

1. **Auteur-First Discovery** — Traditional apps sort by genre (Drama, Action). Subsume treats filmmakers and key crew — directors, cinematographers, writers, actors — as the primary artistic unit. Track Roger Deakins' lighting arc or Charlie Kaufman's thematic throughline, with your own scores layered across their full body of work.

2. **Museum Catalogue Plaques** — Discovery happens everywhere you already browse. Subsume scans posters on any webpage and injects a quiet, typographically refined rating badge (`★ 8.4 │ Reflect`) with a spring-expansion hover reveal. Every injection lives in its own isolated Shadow DOM container, so it never touches or breaks host-site CSS.

3. **Poetic Capture Canvas** — Adding something to your sanctuary starts with one question: *"What stayed with you?"* Only after you write does the interface reveal intent buckets and a rating scale. Your emotional recall is the primary artifact here — not the IMDb score.

4. **Hardcover Library Archive** — Your library isn't a grid of rows. It's an editorial archive grouped by living intent — **Keep This Memory**, **Revisit This Month**, **Wishlist** — with your own `emotionalRecall` surfaced as an italicised excerpt on each spine.

5. **Auteur Screenplay Dock** — A floating reflection notepad, isolated the same way as the plaques, that stays with you on any page for recording narrative parallels and screenplay ideas in the moment they occur to you.

6. **Zero-IPC Watchlist Acceleration** — Your watchlist lives as a synchronous, in-memory O(1) Set inside the content script, so hover cards and badge states resolve instantly — no IPC round-trip, no IndexedDB read on every hover.

7. **Two-Stage Contextual AI Prompting** — A 6.5 on IMDb might be a 10 for you. Subsume builds a taste profile from your highest-rated qualitative notes, queries an LLM of your choice (OpenAI, Anthropic, Gemini) for matches, and optionally makes a second pass to cluster results by the reference seeds you loved most.

8. **Decoupled, SOLID-First Architecture** — Background logic is split into single-responsibility domain handler maps. AI providers sit behind a polymorphic adapter interface. Every boundary is typed and defensive — built the way I'd want to hand this off to another engineer, not just the way that gets a demo working.

---

## Three Acts of Interaction

### Act I — Discovery
Subsume scans any webpage for posters and injects a museum catalogue plaque: title, rating, and a `Reflect` trigger. Hover any detected title for an instant card — no tab switching.

### Act II — Capture
`Reflect` opens the **Poetic Capture Canvas** — full-screen, the poster art blurred softly behind a single centred prompt: *"What stayed with you?"* Only once you start writing does the canvas reveal intent selectors and a 1–10 scale. Emotion before metadata, always.

### Act III — Archive
The **Hardcover Library Archive** organizes everything you've captured — each title a spine in an editorial collection, searchable and filterable by auteur-tagged crew, sortable by recency or resonance. Click a spine for the full `DetailModal` — your complete record of that encounter.

---

## Comprehensive Feature Overview

| Feature | What It Accomplishes | Technical Implementation |
| :--- | :--- | :--- |
| **Museum Catalogue Plaques** | Rating badges with hover expansion on any webpage poster | Open Shadow DOM, MutationObserver, spring CSS transitions |
| **Poetic Capture Canvas** | Emotion-first capture with progressive disclosure | Preact, URL param routing (`?act=capture`), focus-pull blur keyframes |
| **Hardcover Library Archive** | Editorial archive grouped by `sanctuaryIntent` with `emotionalRecall` excerpts | Preact, `useMemo` intent filtering, `isMountedRef` async safety |
| **Auteur Screenplay Dock** | Floating reflection notepad on any page | Shadow DOM, toggle collapse/expand, `destroy()` lifecycle |
| **Chronological Filmography Tracking** | Follow directors, DPs, actors, writers across their full body of work | TMDb Person API, IndexedDB people store |
| **Cross-Site Hover Cards** | Instant synopsis and status on any movie title | Isolated DOM injection, debounced pointer controllers, O(1) cache |
| **Contextual LLM Recommendations** | AI discovery from your actual taste profile and notes | Two-stage prompting pipeline, OpenAI / Anthropic / Gemini adapters |
| **Weekly Automated Digests** | Curated new release picks across streaming subscriptions | Chrome background alarms, dynamic rule/AI hybrid curation |
| **Google Drive Sync** | Full library backup and restore via Google Drive | OAuth 2.0, multipart Drive API upload/download |

---

## Architecture & Engineering Blueprints

> **Design authority:** UI implementation follows `CINEMATIC_JOURNAL_DESIGN_SPEC.md` and `src/shared/tokens.css`. Those sources supersede `brand.md` on conflicts (typography, tokens, motion).

```text
  ┌────────────────────────────────────────────────────────┐
  │              Any Website (Content Layer)               │
  │  MutationObserver → Image Scanner & Title Matcher       │
  │  Shadow DOM: Museum Plaques · Hover Cards · Dock        │
  └──────────────────────────┬─────────────────────────────┘
                             │ O(1) Sync Cache / IPC Message
  ┌──────────────────────────▼─────────────────────────────┐
  │               Background Service Worker                 │
  │  Domain Handler Maps (Library · LLM · Prefs · Sync)     │
  │  Polymorphic AI Adapters (OpenAI · Anthropic · Gemini)  │
  └──────────────────────────┬─────────────────────────────┘
                             │ Atomic Transactions
  ┌──────────────────────────▼─────────────────────────────┐
  │             Persistent Storage (IndexedDB)              │
  │   media · library · people · tmdbCache · alerts         │
  │   v2 schema: sanctuaryIntent · emotionalRecall          │
  │              scriptParallels · originalScreenplaySparks │
  └────────────────────────────────────────────────────────┘
```

### Clean Code & SOLID Standards
- **Single Responsibility (SRP):** Domain handler registries (`libraryHandlers`, `llmHandlers`, `syncHandlers`, `settingsHandlers`) replace monolithic switch statements. Background `index.ts` stays at 41 lines by design.
- **Open/Closed (OCP):** AI providers implement a common adapter interface — adding Ollama or DeepSeek requires zero changes to the core pipeline.
- **Strict TypeScript:** No `any` types in production code. All `unknown` inputs are narrowed at boundaries.
- **Memory Safety:** Every Shadow DOM manager (`MuseumPlaqueManager`, `AuteurScreenplayDock`) implements an explicit `destroy()` lifecycle. Every async hook uses an `isMountedRef` cancellation flag.
- **Structured Telemetry:** All diagnostic messaging routes through a typed `logger` utility.
- **Test Coverage:** 96 tests across 18 suites (Vitest).

---

## Security

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

**Anthropic browser header:** When using Anthropic, the extension sends `anthropic-dangerous-direct-browser-access: true`, which Anthropic requires for API requests originating from a browser context (MV3 service worker). Without it, direct client calls fail. The tradeoff: your API key is used client-side and is visible to anyone with access to the extension bundle or your browser profile.

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

## Setup & Local Run Guide

### Prerequisites
- Node.js 18+ & npm
- Google Chrome or Brave Browser (v120+)
- **TMDb API Key** (Free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
- **OMDb API Key** *(Optional)* (Free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx))
- **LLM API Key** *(Optional)* (OpenAI, Anthropic, or Google Gemini)

### Installation

```bash
git clone https://github.com/harshabalakrishnan16/subsume.git
cd subsume

npm install
npm run build
```

### Google Drive OAuth (Optional)

> **Required for Drive sync:** The repo ships with a placeholder OAuth client ID. Google Drive backup and restore **will not work** until you register your own client.

Replace `YOUR_CLIENT_ID_HERE` in `manifest.json` with a real **Chrome extension OAuth client ID** from [Google Cloud Console](https://console.cloud.google.com/) (APIs & Services → Credentials → Create OAuth client ID → Chrome extension). Use the extension ID shown on `chrome://extensions` when creating the client. Do not commit your production client ID if you maintain a public fork — use a local override ignored by git (see `.gitignore`).

### Loading into Chrome / Brave

1. Navigate to `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** (toggle, top right).
3. Click **Load unpacked**.
4. Select the `dist/` folder inside your project directory.
5. Click the Subsume icon → **Settings** → paste your TMDb API key.

---

## Contributing

<!-- Fill this in — even a couple lines. Reviewers scanning a portfolio README often check
     for this to gauge whether the project is meant to be a living tool or a closed showcase. -->

Issues and PRs are welcome. Please open an issue before submitting larger changes so we can align on approach first.

---

## Attribution & Acknowledgements

Subsume stands on the shoulders of incredible open-source tools and open data providers:

- **[TMDb (The Movie Database)](https://www.themoviedb.org/):** For comprehensive cinematic metadata, cast/crew hierarchies, and high-resolution poster imagery. *(Notice: This product uses the TMDb API but is not endorsed or certified by TMDb.)*
- **[OMDb API](https://www.omdbapi.com/):** For supplementary IMDb score aggregation.
- **[Preact](https://preactjs.com/) & [Vite](https://vitejs.dev/):** For ultra-fast, lightweight UI rendering and bundle optimisation.
- **[idb](https://github.com/jakearchibald/idb):** For robust Promise-based IndexedDB transaction wrapping.
- **[Lucide Icons](https://lucide.dev/):** For crisp, modern UI iconography.
- **[Newsreader](https://fonts.google.com/specimen/Newsreader) & [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts):** For the editorial typographic identity of the sanctuary.
- **[Vitest](https://vitest.dev/):** For the unit test suite (96 tests across 18 suites).

---

## License

MIT — see [`LICENSE`](./LICENSE) for the full text.

---

## Developer Signature & Contact

**Subsume** was conceived, architected, and directed by **Harsha Balakrishnan**.

I made this because I wanted it to exist. Not for a market, not for a metric — for me, and as my thanks to cinema for keeping the park alive inside of me.

Every architectural pattern, SOLID abstraction, defensive boundary, and Shadow DOM interaction was directed, reviewed, and refined by hand — AI-assisted development was the hands on the keyboard, not the eye behind the decisions.

- **GitHub:** [@harshabalakrishnan16](https://github.com/harshabalakrishnan16)
- **Email:** [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)

---

*Cinephilia is an active pursuit. Own your taste.*
