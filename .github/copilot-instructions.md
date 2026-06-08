# Project-specific instructions

## Design Context

### Users
Movie and TV enthusiasts who discover content while browsing the internet. They want a unified watchlist that acts as a personal curator across all streaming platforms. They're discerning but overwhelmed by content fragmentation.

### Brand Personality
**Intelligent • Exhaustive • Delightful**
- Voice: Confident, helpful, never pushy. Speaks as a knowledgeable friend who has done the research.
- Tone: Calm and focused. No noise, no clutter—just relevant suggestions.
- Emotional goal: The satisfaction of "I know exactly what to watch next."

### Aesthetic Direction
**Reference**: Apple Mail/Calendar meets Netflix recommendation cards
- Clean, purposeful density—like Apple apps that pack functionality without feeling busy
- Deep dark theme with subtle purple accents that feels premium, not gamified
- Content-forward design where posters and metadata breathe
- Glass morphism for overlay elements (hover cards) creates depth without competing with page content

**Anti-references**: Torrent sites, cluttered streaming aggregators, anything that feels "busy" or desperate for attention

**Theme**: Dark mode only (light mode considered only if exceptional implementation is achievable)

### Design Principles

1. **Content First** — Never let chrome compete with the movie/show being featured. The UI serves the content, not itself.

2. **Progressive Disclosure** — Show what matters now; reveal details on intent (hover → details, click → add).

3. **Frictionless Capture** — Adding content should require zero thought. Discovered something → it's in your list.

4. **Trust Through Transparency** — Always show *why* something is recommended. "Because you watched X" beats black-box algorithms.

5. **Delight in the Details** — Smooth micro-interactions, instant feedback, subtle confirmation animations. The extension should feel *alive* but never distracting.
