# Subsume

> A Chrome extension for cinephiles who want to own their taste — not just consume it.

---

## 🌟 The Philosophy: Active Ownership vs. Passive Curation

Modern content discovery is fundamentally broken. Giant streaming conglomerates design algorithms to maximize aggregate runtime and passive viewer retention rather than authentic, idiosyncratic taste. Recommendations are flattened into generic demographic clusters ("People who watched X also watched Y").

**Subsume** restores true artistic agency to the viewer. It acts as an intelligent, highly personal cinematic layer seamlessly laid over the entire web. Whether you are reading an auteur retrospective on a personal blog, scanning Letterboxd lists, or searching Google, Subsume tracks your watch history, maps your unique aesthetic affinities, and surfaces intelligent recommendations rooted in filmmaker craft and narrative evolution.

---

## 🔥 What Makes Subsume Unique

1. **Auteur-First Discovery:** Traditional apps categorize film by superficial genre tags (Drama, Action). Subsume treats **filmmakers and key crew** (directors, cinematographers, writers, actors) as primary artistic entities. You can track Roger Deakins' lighting arc or Charlie Kaufman's thematic progression with your personal scores overlaid across their entire historical body of work.
2. **Omnipresent Web Overlay (Shadow DOM Encapsulation):** Discovery happens everywhere. Subsume scans posters across any webpage and injects sleek rating badges and hover cards. Because everything is encapsulated inside isolated **Shadow DOM containers**, Subsume guarantees zero CSS pollution or layout breakage regardless of host site styling.
3. **Zero-IPC Watchlist Acceleration:** To prevent frame drops during rapid scrolling, content scripts maintain a synchronous, in-memory $O(1)$ Set of your watchlist. Hover cards and badge statuses resolve instantly without expensive IPC message passing or IndexedDB overhead.
4. **Two-Stage Contextual AI Prompting:** A 6.5 on IMDb might be a 10 for you. Subsume constructs a rich taste profile from your highest-rated qualitative notes, queries LLMs (OpenAI, Anthropic, Gemini) to retrieve meaningful matches, and conditionally makes a secondary call to group recommendations by loved reference seeds.
5. **Decoupled MV3 SOLID Architecture:** Built on strict Clean Code principles. Background workflows are partitioned into single-responsibility domain handler maps, while AI engines are abstracted behind a polymorphic strategy pattern.

---

## 🛠️ Comprehensive Feature Overview

| Feature | What It Accomplishes | Why It Exists | Technical Implementation |
| :--- | :--- | :--- | :--- |
| **Chronological Filmography Tracking** | Follow any director, DP, actor, or writer and explore their complete body of work. | True cinephiles contextualize cinema through the evolving craft of individual artists. | TMDb Person API, IndexedDB people store, concurrent TV/Movie credit resolution. |
| **In-Page Rating Badges** | Sleek score overlay badges appear directly on movie posters across any webpage. | You shouldn't have to break your reading flow to switch tabs and check ratings. | Shadow DOM injection, CDN regex matching, MutationObserver debounced scanning. |
| **Qualitative Library & Notes** | Rate titles out of 10 and capture personal reflections post-watch. | Numerical aggregates flatten nuance. Your deeply personal 7 is unique to you. | `LibraryItem` IndexedDB schema, responsive `DetailModal` UI. |
| **Contextual LLM Recommendations** | Tailored AI discovery generated from your actual watch history and notes. | Recommendations must understand *why* an aesthetic resonated with you. | Two-stage prompting pipeline, dynamic seed grouping, 5-min memory cache. |
| **Cross-Site Hover Cards** | Hover over movie titles anywhere on the web for instant synopsis and status. | Movie titles appear on blogs, news sites, and forums. Copy-paste searching is friction. | Isolated DOM injection, debounced pointer controllers, zero-latency caching. |
| **Weekly Automated Digests** | Surfaces a curated weekly pick list of new releases across your streaming subscriptions. | Keeps you effortlessly up to date with festival winners and platform drops. | Chrome background alarms, dynamic rule/AI hybrid curation. |

---

## 📐 Architecture & Engineering Blueprints

```text
  ┌────────────────────────────────────────────────────────┐
  │              Any Website (Content Layer)               │
  │  MutationObserver → Image Scanner & Title Matcher      │
  │  Shadow DOM Container → Badges & Hover Cards           │
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
  │     media · library · people · tmdbCache · alerts      │
  └────────────────────────────────────────────────────────┘
```

### 🔹 Clean Code & SOLID Standards Enforced
*   **Single Responsibility Principle (SRP):** Message routing is strictly partitioned across domain handler registries (`libraryHandlers`, `llmHandlers`, `preferencesHandlers`), eliminating monolithic switch statements.
*   **Open/Closed Principle (OCP):** AI providers implement a common execution interface. Adding new local models (Ollama) or cloud models requires zero changes to core pipeline logic.
*   **Structured Telemetry:** 100% of diagnostic messaging is routed through a typed `logger` utility with dedicated domain exception classes (`LLMError`, `StorageError`).
*   **Flawless Packaging Hooks:** Custom Vite closure hooks guarantee flat asset packaging matching MV3 manifest expectations 1-to-1.

---

## ⚙️ Setup & Local Run Guide

### Prerequisites
*   Node.js 18+ & npm
*   Google Chrome or Brave Browser (v120+)
*   **TMDb API Key** (Free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
*   **OMDb API Key** *(Optional)* (Free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx))
*   **LLM API Key** *(Optional)* (OpenAI, Anthropic, or Google Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/harshabala/subsume.git
cd subsume

# Install dependencies & build production bundle
npm install
npm run build
```

### Loading into Chrome / Brave

1. Open your browser and navigate to `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** via the toggle in the top right corner.
3. Click **Load unpacked** in the top left.
4. Select the exported `dist/` folder inside your project directory.
5. Click the Subsume extension icon in your toolbar → Open **Settings** → Paste your TMDb API key.

---

## 🏆 Attribution & Acknowledggments

Subsume stands on the shoulders of incredible open-source tools and open data providers:

*   **[TMDb (The Movie Database)](https://www.themoviedb.org/):** For providing comprehensive cinematic metadata, cast/crew hierarchies, and high-resolution poster imagery. *(Notice: This product uses the TMDb API but is not endorsed or certified by TMDb).*
*   **[OMDb API](https://www.omdbapi.com/):** For supplementary IMDb score aggregation.
*   **[Preact](https://preactjs.com/) & [Vite](https://vitejs.dev/):** For ultra-fast, lightweight UI rendering and lightning-fast bundle optimization.
*   **[idb](https://github.com/jakearchibald/idb):** For robust Promise-based IndexedDB transaction wrapping.
*   **[Lucide Icons](https://lucide.dev/):** For crisp, modern UI iconography.

---

## ✍️ Developer Signature & Contact

**Subsume** was conceived, architected, and directed by **Harsha Balakrishnan**.

> *“Built through rigorous AI-assisted pair programming and advanced orchestration across cutting-edge autonomous coding agents. Every architectural pattern, SOLID abstraction, defensive exception boundary, and Shadow DOM UI interaction was meticulously evaluated, refined, and directed to demonstrate what a single developer equipped with agentic superpowers can architect and ship.”*

*   **GitHub:** [@harshabala](https://github.com/harshabala)
*   **Project Repository:** [github.com/harshabala/subsume](https://github.com/harshabala)
*   **Email Contact:** [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)

---
*Cinephilia is an active pursuit. Own your taste.*
