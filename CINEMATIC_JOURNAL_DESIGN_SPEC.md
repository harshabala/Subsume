# 🎬 Subsume: Personal Cinematic Journal & Auteur Script Notebook
## Master Architectural & UX Design Specification (v2.0 Pivot)

> **Document Status:** Formal Design Specification & Multi-Agent Brainstorming Lock  
> **Target Audience:** Autonomous AI Coding Agents (Claude, Codex, Gemini), Lead Architects, and UI/UX Engineers  
> **Repository Finder Path:** `/Users/harshabalakrishnan/Documents/Projects/Subsume/CINEMATIC_JOURNAL_DESIGN_SPEC.md`

---

## 1. 🌟 Executive Summary & Pivot Rationale

### 1.1 The Problem
Subsume v1.0 successfully solved auteur filmography tracking and in-page rating overlay injection. However, its user interface and experience suffered from utilitarian "spreadsheet syndrome"—presenting plain data tables, rigid status tags (`completed`, `backlog`), and uninspired DOM badges. It felt like an accounting tracker rather than an emotional companion for art.

### 1.2 The v2.0 Identity Pivot
Subsume v2.0 pivots the application into a **Breathtaking Personal Cinematic Journal & Living Wishlist**. When a cinephile browses any third-party webpage (Netflix, Prime Video, Letterboxd, Wikipedia, film blogs), the extension acts as a magical, living canvas:
1. **Understand Humanity's Baseline:** Instantly perceive what consensus humanity has rated a visual work (TMDb / IMDb numerical baseline).
2. **Capture Personal Extrapolations:** Record profound qualitative extrapolations—how the work felt, philosophical reflections, dialogue echoes, and cross-script parallels.
3. **Living Intent Buckets:** Replace lifeless status dropdowns with living intent buckets: **🔥 Watching This Month**, **✨ Wishlist**, and **📖 Auteur Journal (Watched)**.
4. **Auteur Screenplay Notebook:** A configurable floating web dock designed for voracious cinephiles to capture original screenplay concepts and story arcs sparked by the visual media visible on screen.

---

## 2. 🎨 Visual Design System & "Delight" Aesthetics

To achieve visual excellence that wows users at first glance, v2.0 enforces a strict **Sleek Dark Glassmorphism** aesthetic token system.

### 2.1 Color Palette & Design Tokens (HSL Tailored)

```css
:root {
  /* Core Canvas & Backgrounds */
  --bg-canvas: hsl(230, 20%, 7%);
  --bg-glass: hsla(230, 25%, 14%, 0.75);
  --bg-glass-hover: hsla(230, 25%, 20%, 0.85);
  --border-glass: hsla(230, 30%, 35%, 0.25);
  --border-active: hsla(280, 85%, 65%, 0.6);

  /* Typography */
  --font-primary: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-editorial: 'Newsreader', 'Playfair Display', Georgia, serif;
  --text-main: hsl(0, 0%, 98%);
  --text-muted: hsl(230, 15%, 65%);
  --text-dim: hsl(230, 15%, 45%);

  /* Living Intent Bucket Gradients */
  --intent-month-grad: linear-gradient(135deg, hsl(15, 90%, 60%), hsl(45, 95%, 55%)); /* Fiery Ember */
  --intent-wish-grad: linear-gradient(135deg, hsl(260, 85%, 65%), hsl(310, 85%, 60%)); /* Mystic Violet */
  --intent-journal-grad: linear-gradient(135deg, hsl(180, 85%, 45%), hsl(210, 90%, 55%)); /* Deep Cyan */

  /* Glass Effects */
  --blur-strong: blur(20px);
  --shadow-float: 0 16px 40px -12px hsla(0, 0%, 0%, 0.65);
}
```

### 2.2 Micro-Animations & Interaction Rhythm
*   **Pill Hover Expansion:** In-page action pills transition smoothly from compact rating dots into glowing `+ Journal` pills using `cubic-bezier(0.16, 1, 0.3, 1)` (spring physics).
*   **Modal Backdrop Reveal:** Quick-capture overlay modals animate in via a 200ms silky opacity fade combined with a `translateY(8px) -> translateY(0)` float.
*   **Card Intent Glow:** Magazine cards in the dashboard emit a subtle 3px glowing HSL border pulse when assigned to **Watching This Month**.

---

## 3. 🖥️ Component Layout Blueprints

### 3.1 In-Page Action Pill (`src/content/overlay.ts`)
*   **Placement:** Top-left corner of detected movie/series posters on host webpages (Letterboxd, Netflix browse grids, Google Search).
*   **Visual State:**
    *   *Idle:* Sleek Glassmorphic capsule showing `★ 8.4` (TMDb score).
    *   *Hover:* Expands smoothly to show `★ 8.4 │ + Journal`.
*   **Encapsulation:** Injected into an open `attachShadow({ mode: 'open' })` root with reset stylesheets to eliminate host CSS leaking.

### 3.2 In-Page Quick-Capture Modal (`src/ui/components/QuickCaptureModal.tsx`)
*   **Trigger:** Clicking the `+ Journal` action pill or pressing a configurable keyboard shortcut (`Alt + J`).
*   **Layout Structure:**
    ```text
    ┌─────────────────────────────────────────────────────────┐
    │  [Poster]   DUNE: PART TWO (2024)                 [✕]   │
    │             Denis Villeneuve • Sci-Fi                   │
    ├─────────────────────────────────────────────────────────┤
    │  🌐 Humanity's Rating:  ★ 8.5 TMDb  │  ★ 8.8 IMDb       │
    ├─────────────────────────────────────────────────────────┤
    │  🎯 Select Intent Bucket:                               │
    │  (•) 🔥 Watching This Month  ( ) ✨ Wishlist  ( ) 📖 Watched │
    ├─────────────────────────────────────────────────────────┤
    │  ✍️ Your Extrapolation & Notes (Out of 10):             │
    │  [ ★★★★★★★★★☆ 9.2 ]                                     │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │ Masterpiece of scale. The sound design echoes...  │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                     [ Save to Journal ] │
    └─────────────────────────────────────────────────────────┘
    ```

### 3.3 Configurable Floating Auteur Dock (`src/content/dock.ts`)
*   **Purpose:** A dedicated reflection dock for voracious cinephiles who have seen almost everything and want to analyze parallel script arcs or draft screenplay concepts.
*   **Configurability:** Disabled by default. Toggled via Options Dashboard -> Settings -> **Enable Auteur Reflection Dock**.
*   **Position:** Fixed floating orb in the bottom-right viewport corner (`bottom: 24px; right: 24px; z-index: 999999`).
*   **Dock Expanded Surface:**
    *   Displays titles currently visible on the host webpage viewport.
    *   Provides dedicated inputs: **Script Parallels (Dialogue/Arc Echoes)** and **Original Screenplay Sparks**.

### 3.4 Living Magazine Card Library (`src/ui/pages/Library.tsx`)
*   **Layout:** Responsive 4-column CSS Grid (`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`).
*   **Card Anatomy:** Full-bleed movie poster with a bottom Glassmorphic gradient overlay containing title, release year, director badge, personal score pill, and qualitative excerpt.

---

## 4. 🗄️ Data Schema Upgrades (IndexedDB `idb`)

To cleanly support intent buckets and screenplay reflections without breaking existing v1.0 user libraries, `src/background/storage.ts` will introduce schema migration `v2`.

### 4.1 Updated `LibraryItem` Interface (`src/shared/types.ts`)

```typescript
export type IntentBucket = 'watching_this_month' | 'wishlist' | 'watched';

export interface LibraryItem {
  id: string; // TMDb ID (e.g., 'movie:693134')
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number;
  directorNames: string[];
  
  // v2.0 Intent & Rating Core
  intentBucket: IntentBucket;
  userRating?: number; // 1.0 to 10.0
  qualitativeNotes?: string; // Journal reflections
  
  // v2.0 Auteur Screenplay Notebook Extensions
  scriptParallels?: string[]; // e.g. ["Echoes dialogue from Stalker (1979)"]
  originalScreenplaySparks?: string; // Inspired story ideas
  
  addedAt: number;
  updatedAt: number;
  watchedAt?: number;
}
```

---

## 5. 🏗️ SOLID Architectural Mapping & IPC Flows

```text
  [Host Webpage] --(Click '+ Journal')--> [In-Page Shadow DOM Modal]
                                                 │
                                    chrome.runtime.sendMessage()
                                                 ▼
  [IndexedDB Store] <--(StorageAdapter)-- [Background Message Router]
```

### 5.1 SOLID Principles Enforced
*   **Single Responsibility Principle (SRP):** `src/content/dock.ts` manages exclusively viewport dock tracking. `src/content/overlay.ts` manages exclusively poster image pill injection.
*   **Open/Closed Principle (OCP):** Storage adapters implement an abstract `MediaRepository` interface. Adding future remote cloud sync requires zero edits to UI components.

---

## 6. 📋 Multi-Agent Brainstorming Decision Log

| Decision ID | Architectural Area | Evaluated Alternatives | Selected Option | Rationale & Trade-Offs |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Visual Design UI System | 1. Editorial Notebook<br>2. Cyber Neon Grid<br>3. Sleek Glassmorphism | **Sleek Dark Glassmorphism** | Delivers maximum modern visual WOW factor. Harmonious dark backgrounds let movie poster art pop. |
| **DEC-02** | Webpage Capture Trigger | 1. Toolbar Drawer Only<br>2. Encapsulated IFrames<br>3. Native Action Pills + Dock | **Native Action Pills + Configurable Dock** | Zero-friction capture directly on Letterboxd/Netflix. Floating Dock satisfies advanced auteur script ideation. |
| **DEC-03** | Client Data Persistence | 1. Cloud-First REST Engine<br>2. `chrome.storage.local`<br>3. High-Speed IndexedDB | **High-Speed Client IndexedDB (`idb`)** | Guarantees synchronous $O(1)$ hover checks without network lag. Total offline privacy for personal journal notes. |

---

## 7. 🔒 Multi-Agent Brainstorming Final Disposition

Following the strict exit criteria of the `/multi-agent-brainstorming` skill:
*   **Understanding Lock:** Confirmed by Lead User.
*   **Reviewer Objections:** Evaluated (Skeptic RAM concerns addressed via debounced MutationObservers; User Advocate friction concerns addressed via configurable Dock toggles).
*   **Final Disposition:** **`APPROVED`**

> *This markdown specification represents 100% of the architectural, aesthetic, and functional blueprints required for implementation.*
