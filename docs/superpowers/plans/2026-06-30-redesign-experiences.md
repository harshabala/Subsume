# Redesign Experiences Around Cinematic Museum Lobby & Capture Canvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Subsume interface to match the cinematic museum lobby aesthetic of the HTML mockup, introduce a 140-character progressive disclosure trigger in the Poetic Capture Canvas, and add support for capturing and displaying "Atmosphere" and "Lingering Thought" reflections.

**Architecture:** 
1. Extend `LibraryItem` and `SetUserNotesRequest` types to include optional `atmosphere` and `lingeringThought` fields, persisting them via IndexedDB in the `SET_USER_NOTES` background handler.
2. Redesign `src/ui/App.tsx` to replace the vertical sidebar with the elegant fixed top navigation bar and slide-out side menu from the mockup, keeping all secondary pages accessible in the slide-out navigation.
3. Redesign `src/ui/pages/Home.tsx` to display the "Act I: Discovery" cinematic lobby layout with the blurred simulated blog background, hero poster, and absolute positioned Museum Catalogue Plaque.
4. Redesign `src/ui/components/PoeticCaptureCanvas.tsx` to implement the full-screen modal with the 140-character threshold that progressively reveals the rating scale, intent selectors, Atmosphere, Lingering Thought inputs, and the "Commit to Sanctuary" button.
5. Update `src/ui/components/DetailModal.tsx` to display and allow editing the Atmosphere and Lingering Thought details.

**Tech Stack:** Preact, TypeScript, CSS Variables, Shadow DOM.

---

### Task 1: Type Extensions for Sanctuary Fields

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Write the failing test**

Modify `tests/types-extension.test.ts` to assert that `LibraryItem` and `SetUserNotesRequest` accept `atmosphere` and `lingeringThought`:

```typescript
import { LibraryItem, SetUserNotesRequest } from '@/shared/types';

describe('LibraryItem and SetUserNotesRequest new fields', () => {
  it('accepts atmosphere and lingeringThought on LibraryItem', () => {
    const item: LibraryItem = {
      mediaId: 'tmdb_movie_123',
      status: 'watched',
      addedAt: Date.now(),
      updatedAt: Date.now(),
      atmosphere: 'Melancholic, Ethereal',
      lingeringThought: 'The price of faith...',
    };
    expect(item.atmosphere).toBe('Melancholic, Ethereal');
    expect(item.lingeringThought).toBe('The price of faith...');
  });

  it('accepts atmosphere and lingeringThought on SetUserNotesRequest', () => {
    const req: SetUserNotesRequest = {
      mediaId: 'tmdb_movie_123',
      notes: 'Reflection prose',
      atmosphere: 'Melancholic',
      lingeringThought: 'Faith...',
    };
    expect(req.atmosphere).toBe('Melancholic');
    expect(req.lingeringThought).toBe('Faith...');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types-extension.test.ts`
Expected: Compilation failure due to missing fields.

**Step 3: Implement minimal change**

In `src/shared/types.ts`:
1. Add to `LibraryItem` interface:
   ```typescript
   atmosphere?: string;
   lingeringThought?: string;
   ```
2. Add to `SetUserNotesRequest` interface:
   ```typescript
   atmosphere?: string;
   lingeringThought?: string;
   ```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types-extension.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types.ts tests/types-extension.test.ts
git commit -m "feat: add atmosphere and lingeringThought fields to types"
```

---

### Task 2: Background Storage & Handlers Update

**Files:**
- Modify: `src/background/handlers/library.ts`

**Step 1: Write the failing test**

Modify `tests/libraryHandlers.test.ts` to assert that `SET_USER_NOTES` updates and persists `atmosphere` and `lingeringThought` fields on the `LibraryItem`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/libraryHandlers.test.ts`
Expected: FAIL or doesn't update the new fields.

**Step 3: Update `SET_USER_NOTES` message handler**

In `src/background/handlers/library.ts` under `MessageType.SET_USER_NOTES`:
```typescript
    existing.notes = req.notes.trim() || undefined;
    existing.atmosphere = req.atmosphere?.trim() || undefined;
    existing.lingeringThought = req.lingeringThought?.trim() || undefined;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/libraryHandlers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/background/handlers/library.ts
git commit -m "feat: persist atmosphere and lingeringThought in SET_USER_NOTES handler"
```

---

### Task 3: Redesign Poetic Capture Canvas

**Files:**
- Modify: `src/ui/components/PoeticCaptureCanvas.tsx`
- Modify: `src/ui/styles/poetic-sanctuary.css`
- Modify: `tests/poeticCaptureCanvas.test.tsx`

**Step 1: Update the unit tests**

Modify `tests/poeticCaptureCanvas.test.tsx` to assert:
1. Progressive disclosure elements (including Atmosphere, Lingering Thought, intent/ratings, and Commit/Save button) are hidden when notes length < 140.
2. They are revealed when notes length >= 140.
3. Saving passes `atmosphere` and `lingeringThought` fields in the `SET_USER_NOTES` payload.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/poeticCaptureCanvas.test.tsx`
Expected: FAIL

**Step 3: Implement Capture Canvas changes**

1. In `src/ui/components/PoeticCaptureCanvas.tsx`, add states:
   ```typescript
   const [atmosphere, setAtmosphere] = useState('');
   const [lingeringThought, setLingeringThought] = useState('');
   ```
2. Update the progressive controls trigger check to `emotionalRecall.length >= 140`.
3. In `handleSave`, include `atmosphere` and `lingeringThought` in the `SET_USER_NOTES` message payload:
   ```typescript
   await sendMessage<SetUserNotesRequest, Record<string, unknown>>(MessageType.SET_USER_NOTES, {
     mediaId,
     notes: emotionalRecall.trim(),
     atmosphere: atmosphere.trim() || undefined,
     lingeringThought: lingeringThought.trim() || undefined,
   });
   ```
4. Style the canvas using CSS selectors that match the mockup: dark translucent full-screen container, center column, Newsreader typography, hidden metadata-reveal transitions.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/poeticCaptureCanvas.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/components/PoeticCaptureCanvas.tsx src/ui/styles/poetic-sanctuary.css tests/poeticCaptureCanvas.test.tsx
git commit -m "feat: redesign capture canvas with 140-char progressive disclosure and new inputs"
```

---

### Task 4: Redesign Top Navigation & Sidebar Layout

**Files:**
- Modify: `src/ui/App.tsx`
- Modify: `src/ui/styles/sidebar.css`
- Modify: `src/ui/styles/layout.css`

**Step 1: Redesign Layout in `App.tsx`**

1. Replace the vertical left sidebar with a fixed top navigation bar featuring the italicized "Subsume" title on the left, "Sanctuary", "Discovery", and "Settings" tabs in the center, and a "menu" button on the right.
2. Implement a slide-out drawer (`side-nav` with class list matching the mockup) that opens when clicking the menu button. Include all navigation links (Home/Discovery, Library/Sanctuary, Recommendations, What's New, Filmmakers, Stats, Alerts, Settings, Logs).
3. Update state routing to match menu clicks.

**Step 2: Add styles in `sidebar.css` and `layout.css`**

Add style definitions for `.fixed.top-0`, `.plaque-glass`, `.focus-pull-active`, and transition behavior for the side menu drawer.

**Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build compiles successfully.

**Step 4: Commit**

```bash
git add src/ui/App.tsx src/ui/styles/sidebar.css src/ui/styles/layout.css
git commit -m "feat(ui): redesign top navigation bar and slide-out side menu layout"
```

---

### Task 5: Redesign Home / Discovery Page

**Files:**
- Modify: `src/ui/pages/Home.tsx`

**Step 1: Implement the Lobby View**

1. Introduce a container `.focus-pull-active` for the background simulated film blog (rendered only when modal is not active, or kept blurred as a backdrop).
2. Render the cinematic lobby columns:
   - Left column: The hero poster frame, with the absolute-positioned museum catalogue plaque card overlaid on the bottom right.
   - The plaque card should render the rating (e.g. 4.8), title, director names, and custom quote excerpt, followed by "Reflect" and "Archive" buttons.
   - Right column: Display "Act I: Discovery" title, "The Museum Catalogue Plaque" header, description paragraph, and "Contextual Awareness Engine v2.4" status.
3. Wire the "Reflect" button to trigger the `OPEN_CAPTURE_CANVAS` event / opening the canvas modal, and "Archive" to navigate to the Library page.

**Step 2: Verify build and compile**

Run: `npm run build`
Expected: Build compiles successfully.

**Step 3: Commit**

```bash
git add src/ui/pages/Home.tsx
git commit -m "feat(ui): redesign Home page to cinematic discovery lobby mockup"
```

---

### Task 6: Update Detail Modal with Sanctuary Fields

**Files:**
- Modify: `src/ui/components/DetailModal.tsx`

**Step 1: Implement inputs for Atmosphere and Lingering Thought**

In the notes section of the `DetailModal.tsx`:
1. Render input fields for "Atmosphere" and "Lingering Thought".
2. Bind their values to component states and trigger notes saves debounced or on blur.
3. Update `onUpdateNotes` to save notes, atmosphere, and lingeringThought together.

**Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build compiles successfully.

**Step 3: Commit**

```bash
git add src/ui/components/DetailModal.tsx
git commit -m "feat(ui): support display and editing of atmosphere and lingering thoughts in detail modal"
```
