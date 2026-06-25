# 🎬 Subsume v2.1: Private Cinematic Sanctuary & Poetic Theatre Architecture
## Master Architectural, Aesthetic & UX Design Specification

> **Document Status:** Formal Design Specification & Master Product Lock (v2.1 Philosophy Upgrade)  
> **Target Audience:** Autonomous AI Coding Agents (Claude, Codex, Gemini), Lead Architects, and UI/UX Engineers  
> **Repository Finder Path:** `/Users/harshabalakrishnan/Documents/Projects/Subsume/CINEMATIC_JOURNAL_DESIGN_SPEC.md`  
> **Superseding Clause:** *This specification supersedes all utilitarian or decorative SaaS implementation details wherever there is conflict. Every engineering and UI decision must justify its existence by making contemplation and reflection more meaningful.*

---

## 1. 🌟 Core Philosophy: The Private Cinematic Sanctuary

Subsume is **not** a movie tracker.  
Subsume is **not** a note-taking application.  
Subsume is **not** a productivity tool.  

**Subsume is a private cinematic sanctuary.**

The application evokes the timeless emotional cadence of entering a historic theatre: **anticipation, immersion, reflection, and memory**. The objective is never to maximize feature counts, administrative data entry, or percentage of metadata captured. The sole objective is to maximize **quality of reflection**. If a viewer leaves with a more profound emotional connection to the art they experienced, the product has succeeded.

> **Primary Product Goal:** *Become the most beautiful, sacred place on a user's computer to think about cinema.*  
> **The Litmus Test:** *Does this design decision make the user want to spend more time reflecting?*

---

## 2. 🎭 The Three Acts: Theatre Interaction Architecture

The interface behaves like a grand theatre, guiding the cinephile through three distinct emotional phases of engagement.

```text
       ACT I: DISCOVERY                 ACT II: IMMERSION                 ACT III: MEMORY
 ┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
 │   The Theatre Lobby      │     │  The Darkened Auditorium │     │    The Hardcover Archive │
 │ Premium · Quiet Luxury   │ ──> │ UI Disappears            │ ──> │ Resurfacing Timeless     │
 │ One Hero Visual Moment   │     │ Typography & Whitespace  │     │ Thoughts & Taste Arcs    │
 └──────────────────────────┘     └──────────────────────────┘     └──────────────────────────┘
```

### 🔹 Act I — Discovery (The Theatre Lobby)
While browsing third-party discovery and streaming hubs (Letterboxd, MUBI, Criterion, Netflix, Wikipedia, personal blogs), Subsume overlays feel premium, luxurious, and quiet. Rather than noisy decorative SaaS badges, action triggers resemble fine museum catalogue plaques.

### 🔹 Act II — Immersion (The Darkened Auditorium)
Once the viewer initiates capture and begins writing, **the interface disappears**. Unnecessary decoration fades out. Visual competition is eliminated. Generous whitespace and editorial serif typography dominate the viewport. The user's own reflection becomes the protagonist.

### 🔹 Act III — Memory (The Hardcover Archive)
When returning months or years later, the library dashboard feels like opening an treasured hardcover notebook. The interface exists purely to allow personal thoughts, emotional recall, and evolving auteur affinities to resurface—never to showcase UI controls.

---

## 3. 🎨 Visual Design System: Luxury Through Restraint

Premium products achieve true luxury through **restraint and contrast**, not by stacking visual noise.

### 3.1 The "One Hero Moment" Rule
**Avoid stacking:** glass + blur + glow + gradients + shadows + floating animations simultaneously.  
Instead, every single screen is permitted **exactly one hero visual moment** (e.g., one dramatic focus pull, one gentle curtain fade, or one pristine velvet blur). Everything else remains quiet.

### 3.2 Editorial Typography & Hierarchy
Inspired by the **Criterion Collection, MUBI, literary journals, and screenplay formatting**. Typography carries hierarchy over container decoration.

```css
:root {
  /* Sanctuary Palette — Deep Velvet & Warm Parchment Accents */
  --bg-sanctuary: hsl(240, 18%, 5%); /* Deep Obsidian Auditorium */
  --bg-plaque: hsla(240, 15%, 11%, 0.85); /* Museum Plaque Glass */
  --border-restraint: hsla(0, 0%, 100%, 0.08); /* Whisper Border */
  
  /* Editorial Typography */
  --font-editorial: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
  --font-ui: 'Outfit', 'Inter', -apple-system, sans-serif;
  
  /* Literary Text Hierarchy */
  --text-reflection: hsl(0, 0%, 96%); /* High-contrast Hero Reflection */
  --text-artwork: hsl(0, 0%, 82%);
  --text-title: hsl(240, 10%, 70%);
  --text-meta: hsl(240, 10%, 50%);
  --text-control: hsl(240, 10%, 32%); /* Quiet UI Controls */

  /* Cinematic Motion Easing (Slow Dolly & Focus Pulls) */
  --ease-focus-pull: cubic-bezier(0.25, 1, 0.5, 1);
  --duration-curtain: 450ms;
}
```

### 3.3 Visual Priority Order
1. **User Reflections** *(Highest Priority — Editorial Serif, Comfortable Line-Height)*
2. **Cinematic Artwork** *(Unobstructed Poster Framing)*
3. **Film Title & Auteur Attribution**
4. **Supporting Metadata** *(TMDb Baseline Consensus)*
5. **Interface Controls** *(Lowest Priority — Muted & Receded)*

---

## 4. ✍️ Conversational Capture & Emotion Flow

To eliminate administrative cognitive friction, capture flows abandon rigid form fields in favor of intimate conversational prompts and progressive disclosure.

### 4.1 The Emotion Before Metadata Cadence
**Utilitarian Flow *(Banished)*:** `Movie -> Rating (1-10) -> Status Dropdown -> Notes -> Save`  
**Sanctuary Cadence *(Enforced)*:** `Movie -> Feeling -> Reflection -> Memory -> Metadata`

### 4.2 Act II Capture Blueprint (`src/ui/components/PoeticCaptureCanvas.tsx`)

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     STALKER (1979)                                      │
│     Directed by Andrei Tarkovsky                        │
│                                                         │
│     "What stayed with you?"                             │
│                                                         │
│     [ The water dripping in the Zone. The feeling       │
│       that faith is an architectural space rather       │
│       than a belief. When Writer sits in the grass... ] │
│                                                         │
│                                                         │
│     ─── Continue writing or rest ───                    │
│                                                         │
│     (•) Keep this memory   ( ) Revisit this month       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

*   **Progressive Disclosure:** Numerical ratings out of 10, living intent buckets (`watched`, `revisit_this_month`, `wishlist`), and screenplay cross-references (`scriptParallels`) appear gently **only after** the user has expressed their initial qualitative memory.

---

## 5. 🎞️ Cinematic Motion Philosophy

Animation communicates emotional weight. Constant pulsing, continuous glowing, and bouncy spring physics are strictly prohibited.
*   **The Slow Dolly:** Viewport modal arrivals transition via a 450ms slow opacity rise accompanied by a subtle 4px upward drift.
*   **The Focus Pull:** When typing begins in the reflection textarea, surrounding poster artwork and title metadata blur smoothly (`filter: blur(8px); opacity: 0.4`), placing 100% visual focus on the written prose.
*   **The Curtain Close:** Dismissing overlays fades out quietly over 300ms without abrupt snapping.

---

## 6. 🗄️ Data Storage & SOLID Engineering Architecture

Client-first **IndexedDB (`idb`)** persistence guarantees zero-latency $O(1)$ hover checks on host pages while safeguarding total offline contemplation privacy.

### 6.1 Upgraded `LibraryItem` Sanctuary Schema (`src/shared/types.ts`)

```typescript
export type SanctuaryIntent = 'keep_memory' | 'revisit_this_month' | 'wishlist';

export interface LibraryItem {
  id: string; // e.g. 'movie:27205' (Inception)
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseYear: number;
  directorNames: string[];
  
  // Poetic Reflection Core
  sanctuaryIntent: SanctuaryIntent;
  emotionalRecall?: string; // "What stayed with you?" hero text
  qualitativeNotes?: string; // Extended contemplative prose
  userRating?: number; // Optional 1.0 - 10.0 numerical extrapolation
  
  // Auteur Screenplay Archive
  scriptParallels?: string[]; // Screenplay dialogue/arc echoes
  originalScreenplaySparks?: string; // Creative ideas sparked by the film
  
  addedAt: number;
  updatedAt: number;
  contemplatedAt?: number;
}
```

### 6.2 SOLID & Service Worker Partitioning
*   **Single Responsibility Principle (SRP):** Content injection scripts (`src/content/`) are strictly partitioned from domain storage message routers (`src/background/handlers/*`).
*   **Open/Closed Principle (OCP):** AI provider adapters (`src/background/llm.ts`) execute polymorphically, allowing future LLM engines to enrich reflective prompts without altering UI canvases.

---

## 7. 📋 Philosophy Verification Litmus Gate

Before committing any future code slice, autonomous coding agents must verify all five criteria:
- [x] **Does this interface disappear when the user begins writing?**
- [x] **Is there no more than ONE hero visual effect on this screen?**
- [x] **Does typography carry hierarchy over visual decoration?**
- [x] **Is the user asked for feeling/recall BEFORE numerical ratings or status?**
- [x] **Does this feature deepen personal reflection rather than mere productivity?**

---

## 8. ✍️ Developer Signature & Architectural Direction

**Subsume v2.1** was conceived, architected, and directed by **Harsha Balakrishnan**.

> *“Built through rigorous AI-assisted pair programming and advanced orchestration across cutting-edge autonomous coding agents. Every architectural pattern, SOLID abstraction, defensive exception boundary, and Poetic Theatre UI interaction was meticulously evaluated, refined, and directed to demonstrate what a single developer equipped with agentic superpowers can architect and ship.”*

*   **GitHub Profile:** [@harshabala](https://github.com/harshabala)
*   **Project Repository:** [github.com/harshabala/subsume](https://github.com/harshabala)
*   **Email Contact:** [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)

---
*Cinema is a sacred sanctuary. Protect your contemplation.*
