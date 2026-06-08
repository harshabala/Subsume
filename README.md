# Subsume

> A Chrome extension for cinephiles who want to own their taste — not just consume it.

 
<!-- screenshot -->

## What It Does

Modern content discovery is fundamentally broken, optimized by giant streaming platforms for passive viewer engagement and aggregate runtime rather than authentic, idiosyncratic taste. Subsume restores agency to cinephiles by acting as a highly personal, intelligent layer laid seamlessly over the entire web. By scanning the pages you visit, Subsume tracks what you watch, maps your unique artistic sensibilities, and surfaces personalized recommendations based on filmmaker arcs and genuine aesthetic affinities—never flattened generic metrics.

## Feature Overview

| Feature | What It Does | Why It Exists | Technical Approach |
| :--- | :--- | :--- | :--- |
| **Filmography & Crew Tracking** | Follow any director, DP, actor, or writer and see their full filmography in one place. | Because taste is often auteur-driven, not genre-driven; cinephiles discover and contextualize art through the lens of individual creators. | TMDb person API, IndexedDB people store, automatic filmography sync. |
| **In-Page Rating Overlay** | Compact badges appear directly on movie posters across any website showing scores and library status. | Discovery happens on blogs, Letterboxd, Google search—not just inside a dedicated, isolated app. | Shadow DOM injection, CDN pattern matching, MutationObserver with debounced image scanning. |
| **Personal Ratings & Notes** | Rate anything out of 10 and write qualitative notes after watching. | Aggregate scores flatten taste; your highly personal 7 might be someone else's 10. | `LibraryItem` schema with `userRating` and `notes` fields, responsive DetailModal UI. |
| **Personalized LLM Discovery** | AI recommendations built from your actual watch history and ratings, not generic demographic profiles. | A 6.2 on IMDb might be a 9 for you; recommendations need to understand *why* you liked something. | `WatchProfile` context builder, two-stage LLM prompting, dynamic seed grouping. |
| **Filmmaker Filmography View** | Every title a filmmaker has ever made, with your ratings overlaid on their entire body of work. | Understanding an artist means seeing their full chronological arc and how their craft evolved over time. | `fetchPersonFilmography` with concurrent movie and TV credit resolution and library caching. |
| **Cross-site Hover Cards** | Hover over any detected title on any webpage for instant metadata, ratings, and library status. | IMDb is just one website; movie titles appear everywhere, and breaking your flow to copy-paste search is a minor tragedy. | Isolated Shadow DOM container, O(1) Set-based watchlist lookup, debounced display controllers. |

## Additional Features

### Weekly Digest
The Home page surfaces a **Weekly Picks** digest of new releases from the past 7 days on your subscribed platforms. Picks are rule-based by default (genre + TMDb rating), or AI-curated when LLM is enabled and you have 3+ watched titles. A background alarm regenerates the digest every 7 days and can notify you when new picks are ready.

### Watch Alerts
The **Alerts** page lets you create saved searches for new releases—filter by type, genre, streaming platform, and keyword. A daily background check scans recent TMDb releases and surfaces matches in the dashboard. Alerts are included in library export/import.

### Poster Overlays & Catalog Detection
On supported sites, Subsume scans poster images and injects compact rating badges via Shadow DOM. **Catalog detection** identifies streaming browse pages (Netflix, Prime Video, etc.) and batch-matches visible titles for faster overlay coverage. Toggle overlays and detection sensitivity in Settings.

### OMDb / IMDb Ratings
An optional **OMDb API key** in Settings enriches titles with IMDb ratings alongside TMDb scores. Without it, only TMDb ratings are shown.

## Architecture

### How It's Built

```
  ┌─────────────────────────────────────────┐
  │           Any Website (Content Layer)    │
  │  MutationObserver → Image Scanner       │
  │  Text Highlighter → Hover Cards         │
  │  Poster Badge Overlay (Shadow DOM)      │
  └──────────────┬──────────────────────────┘
                 │ chrome.runtime.sendMessage
  ┌──────────────▼──────────────────────────┐
  │        Background Service Worker        │
  │  Message Router → TMDb Client           │
  │  LLM Providers → Context Builder        │
  │  Storage Layer (IndexedDB via idb)      │
  └──────────────┬──────────────────────────┘
                 │ IndexedDB
  ┌──────────────▼──────────────────────────┐
  │         Persistent Storage              │
  │  media · library · people · tmdbCache   │
  └─────────────────────────────────────────┘
                 │
  ┌──────────────▼──────────────────────────┐
  │       Options Dashboard (Preact)        │
  │  Library · Filmmakers · Recommendations │
  │  New Releases · Settings · Stats        │
  └─────────────────────────────────────────┘
```

The extension is designed around a decoupled, highly responsive architecture built to handle hundreds of movie items and dynamic UI elements without slowing down host pages:
- **MV3 service worker with IndexedDB** (rather than the limited `chrome.storage.local`) allows the extension to easily scale beyond 500 items, support complex queries (like filtering by creator or status), and store cached API responses.
- **Shadow DOM** is utilized for all injected UI elements (poster overlays, hover cards), guaranteeing zero host-page CSS pollution or style leaking regardless of the website visited.
- **O(1) in-memory Set** inside content scripts keeps track of the user's watchlist, allowing instant, synchronous hover and badge checks while completely bypassing IPC and IndexedDB overhead on every scroll or mouse movement.
- **Bearer token authorization** is enforced for all TMDb API calls, keeping private keys securely out of URL query strings and safely enclosed in request headers.
- **Two-stage LLM prompting** dynamically builds a rich taste profile context from highly rated films, uses it to request tailored recommendations, and then conditionally makes a second call to group suggested films by loved reference seeds.
- **5-minute in-memory profile cache** with mutation-triggered invalidation prevents redundant, expensive database aggregation and LLM calls during rapid navigation or dashboard switching.

## Product Decisions Worth Explaining

### Why Shadow DOM for everything injected
Injecting custom HTML into arbitrary third-party pages (like Letterboxd, IMDb, or personal blogs) is a recipe for broken styling. Host pages often have aggressive global CSS rules or CSS-in-JS resets that hijack generic classes. Using Shadow DOM encapsulation isolates Subsume's styles completely, ensuring the poster badges and hover cards render consistently and beautifully everywhere without breaking the surrounding page layout.

### Why two LLM calls instead of one
A single, massive prompt asking an LLM to both generate recommendations and structure them in context of the user's favorite seeds frequently results in quality degradation and hallucinated connections. By separating the pipeline, the first call focuses entirely on high-quality recommendation retrieval. The second call groups them logically by loved titles—but only if the user has rated 3+ films and 4+ recommendations have successfully resolved. This conditional execution conserves API tokens and avoids introducing unnecessary latency for new users.

### Why filmmaker tracking instead of just genre filters
Traditional platforms categorize film by generic, aggregate genre tags (e.g., "Drama", "Sci-Fi"). However, true cinephiles think, discover, and consume content through filmmakers and creative collaborators (auteurs). They want to track every Tarkovsky film, explore the cinematography of Roger Deakins, or follow the scripts of Charlie Kaufman. Subsume treats filmmakers and crew as primary entities, overlaying personal ratings across their entire historical body of work to enable genuine artistic exploration.

### The detection sensitivity trade-off
Automated movie poster detection must balance magic with non-intrusiveness. Setting the sensitivity too low (only scanning known TMDb CDN poster patterns) yields zero false positives but misses custom image paths on blogs. Setting it too high (using loose ancestor text matches) risks injecting movie badges onto unrelated decorative images. Subsume defaults to medium sensitivity—leveraging CDN pattern matching combined with strict, debounced alt-text heuristics—making it feel magical on Letterboxd while remaining completely silent on Gmail or spreadsheet interfaces.

## Setup

### Requirements
- Node 18+
- Chrome 120+
- TMDb API key (free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
- OMDb API key (free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)) — optional, for IMDb ratings
- One of: OpenAI, Anthropic, or Google Gemini API key — optional, for AI recommendations

### Install & Run

```bash
git clone https://github.com/[username]/subsume
cd subsume
npm install
npm run build
```

Load in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked" and select the `dist/` folder in the project directory
4. Click the Subsume extension icon in your toolbar → Settings → paste your TMDb API key

### Development

```bash
npm run dev     # watch mode
npx tsc --noEmit  # type check
```

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Content Scripts** | TypeScript, Preact, Shadow DOM |
| **Options Dashboard** | Preact, TypeScript, Vite |
| **Background Worker** | TypeScript, MV3 Service Worker |
| **Storage** | IndexedDB (`idb` wrapper) |
| **Build** | Vite, Rollup |
| **External APIs** | TMDb v3, OMDb, OpenAI/Anthropic/Gemini |
| **Auth** | Bearer token (all API keys) |

## Project Status

This is a portfolio project demonstrating AI-assisted, product-led engineering. It is fully functional, optimized for performance, and ready to be loaded and run locally in Chrome.

Current limitations:
- No CI/CD automated release pipeline
- Requires manual configuration of TMDb (and optional OMDb / LLM) API keys

## License

MIT
