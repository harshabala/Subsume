# PART 2 — TARGET ARCHITECTURE AND IMPLEMENTATION CONTRACT

*Everything below is the approved direction, reviewed and corrected. This is the work order.*

---

# Subsume - Books Expansion and Multi-Medium Product Specification

**Document type:** Product decision, target information architecture, and coding-agent implementation contract  
**Baseline:** `SUBSUME_CURRENT_INFORMATION_ARCHITECTURE.md`  
**Baseline product version:** 0.2.0  
**Target direction:** Multi-medium Subsume, beginning with books  
**Prepared:** 2026-07-20  
**Suggested repo location:** `docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md`

---

## 0. How to use this document

This document is the approved direction for expanding Subsume from movies and television into books without turning it into a generic media tracker.

The coding agent should:

1. Treat the existing information architecture document as the immutable description of the current product.
2. Use this document as the target architecture and delivery contract.
3. Implement the work in phases. Do not attempt all future-state capabilities in one unreviewable change.
4. Preserve all existing movie and TV data through explicit IndexedDB migrations.
5. Keep the extension local-first and private.
6. Use provider data only to identify and enrich real works. Never allow an LLM to invent catalog records.
7. Add tests for every migration, identity rule, detector, and scheduled workflow described here.

Where this document says **MUST**, it is a release requirement.  
Where it says **SHOULD**, deviation requires a documented reason.  
Where it says **FUTURE**, do not implement it in the first books release.

## 0.1 Product-owner confirmations (reviewed and locked, 2026-07-21)

This document was reviewed against the baseline architecture and the following decisions are confirmed as final. They are also reflected inline at the relevant sections below; this list exists so the agent can check status at a glance.

| Decision | Answer | Where reflected |
|---|---|---|
| Book detection scope | Anywhere on the web (news, blogs, essays) — not just retailer/library pages | §6.3 Stage D called out as a primary workstream, not a fallback |
| Screen taste vs. book taste | Kept separate (parallel `MediumTasteProfile`s); adaptation links are discovery metadata only, never shared taste math | §9.7, §4.13 |
| Weekly dispatch | Separate catalog-based run per medium (screen, books), Thursday 7 PM local default, opt-in | §10 (unchanged, confirmed correct as written) |
| `enabledMedia` defaults | Movies, TV, and books **all on by default at install** | §14.1 |
| Icon | Already finalized by Harsha (includes the book). Coding agent only exports sizes and wires it in — does not redesign it | §3.3, §24 item 15 |

Everything else in this document stands as originally written and reviewed. Treat the whole document, including this preface, as the single implementation contract — there is no separate addendum to cross-reference.

---

# 1. Executive product decision

## 1.1 Decision

**Books should be included in Subsume as a first-class medium inside the same product.**

Do not create:

- a separate extension,
- a separate brand,
- a bolt-on "Books mode" with a duplicate library,
- or a collage-like product that merely places a book tracker next to a movie tracker.

Subsume should become:

> **A private sanctuary for works that take hold of you, on the screen and on the page.**

The shared unit is not "content" and not necessarily "story." Documentaries, essays, memoirs, histories, and nonfiction books may absorb a person without being fictional narratives. The broad product concept is therefore **works and the user's relationship to them**.

## 1.2 Why this fits the existing product

The current product already has the correct medium-agnostic bones:

- catalog metadata is separate from the user's relationship,
- capture begins with emotional recall rather than public ratings,
- the archive is private and editorial rather than social,
- qualitative notes feed a personalized taste model,
- the browser itself is a discovery surface,
- and the product is designed around what stayed with the user.

Books are not a side feature. They are another expression of the same core job.

## 1.3 What must remain distinct

A book and its film or television adaptation are **not the same catalog item**.

The user may:

- love the novel and dislike the adaptation,
- abandon the book but admire the film,
- read a translated edition,
- re-read the book years later,
- or encounter an adaptation that only loosely draws from the source.

Therefore:

- every book, film, and television work has its own identity,
- each has its own status, rating, reflections, and experience history,
- and cross-medium relationships are represented through explicit links such as `adaptation_of`, `based_on`, or `inspired_by`.

Do not merge a book and adaptation into a single library record.

---

# 2. Product thesis and differentiation

## 2.1 Updated product promise

> Discover a work while browsing. Save the encounter before it disappears. Record what it did to you. Let Subsume learn your taste from your own reactions, not from the crowd.

## 2.2 Primary user jobs

1. **Recognize**
   - Detect a movie, show, documentary, or book on an arbitrary page.
   - Distinguish a genuine work mention from an unrelated phrase.

2. **Capture**
   - Add it with one action.
   - Mark the user's current relationship: planned, in progress, completed, or abandoned.
   - Capture an immediate thought without forcing a full review.

3. **Return**
   - Add later reflections, quotations entered by the user, rating changes, or completion details.
   - Preserve the sequence of the user's thoughts rather than overwriting the first reaction.

4. **Understand**
   - Reveal patterns in what the user responds to across works and media.
   - Keep screen taste, reading taste, and cross-medium taste related but separately interpretable.

5. **Discover**
   - Generate source-grounded recommendations based on the user's ratings, reflections, dislikes, abandonment signals, creators, themes, and moods.
   - Avoid treating popularity or aggregate critic scores as the user's taste.

6. **Follow**
   - Follow authors and other creators, not only filmmakers.
   - Surface new works and meaningful news on a user-controlled cadence.

## 2.3 Competitive boundary

Subsume should not compete by reproducing every feature of Goodreads, StoryGraph, Letterboxd, Trakt, or LibraryThing.

| Existing category | Typical strength | Subsume must not copy blindly | Subsume advantage |
|---|---|---|---|
| Social book networks | Friends, reviews, community, public shelves | Feeds, follower counts, review popularity | Private relationship and reflection |
| Reading trackers | Progress, goals, streaks, charts | Gamified pressure and productivity framing | Memory, taste, and meaning |
| Film trackers | Lists, ratings, watch history | Aggregate score fixation | Emotional capture across screen and page |
| Library catalog tools | Edition-level catalog depth | Librarian-grade manual complexity in the core flow | Automatic in-browser recognition |
| Generic AI recommenders | Conversational suggestions | Unverified titles and vague reasons | Catalog-validated, source-cited recommendations tied to user evidence |

## 2.4 Explicit non-positioning

Subsume is not:

- a social network,
- a public review platform,
- a reading streak app,
- a streaming availability optimizer,
- a bookstore,
- an ebook reader,
- a quote-scraping tool,
- a universal knowledge-management app,
- or an objective judge of artistic quality.

The LLM is a **taste interpreter and fit judge**, not an authority on whether a work is good.

---


## 2.5 Baseline gap analysis

The current architecture is strong enough to expand, but the following gaps must be corrected rather than patched around.

| Current gap | Why it becomes a problem | Required correction |
|---|---|---|
| `MediaType` is only `movie \| tv` | Books leak conditionals into every handler and component | Introduce a shared `WorkMedium` and exhaustive medium adapters |
| `MediaItem` is TMDb-shaped | Book metadata is forced into poster/runtime/streaming fields | Replace it conceptually with `CatalogWork` plus discriminated medium details |
| One `mediaId` represents catalog identity | ISBNs identify editions, while users think about works | Add book work/edition separation and canonical ID redirects |
| `LibraryItem` contains one mutable note set | Initial thoughts are overwritten by later reflection | Add appendable `Reflection` records |
| One relationship record implies one experience | Rereads, rewatches, and rating changes cannot be represented | Add `Experience` records while keeping a current relationship summary |
| `PersonItem` is TMDb-person-centric | Authors, translators, and illustrators do not fit | Generalize to provider-namespaced `Creator` records |
| Web detection assumes posters and film titles | Book pages expose ISBN, author, JSON-LD, and covers | Add a book-specific evidence pipeline and adapter registry |
| Status keys and labels are screen-specific | `watched` cannot represent reading | Use generic machine states with medium-specific labels |
| `WatchProfile` is screen-only | Book and cross-medium taste cannot be separated | Add medium profiles plus a cautious cross-medium profile |
| Recommendation output trusts LLM title generation | Book metadata is especially ambiguous across editions | Validate every candidate against a catalog provider |
| Weekly digest model does not distinguish search capability | A normal LLM cannot truthfully claim recent web research | Add provider capabilities and separate catalog/web-grounded flows |
| Provider fields lack field-level provenance | Conflicting book metadata cannot be debugged or reconciled | Store source provenance and confidence |
| Existing emotional fields use cinema-only labels | The same underlying emotion can work, but the copy cannot | Keep shared keys and vary display language by medium |
| Existing alerts are premiere-oriented | Books require releases, translations, editions, and adaptations | Generalize to `ReleaseAlert` |
| Current migration plan ends at v3 | A direct destructive rename risks existing archives | Use staged schema migration, compatibility aliases, and delayed cleanup |

## 2.6 Disposition of the current cinema-coupled assumptions

| Baseline assumption | Decision | Target treatment |
|---|---|---|
| Medium is only movie/TV | **Generalize** | `WorkMedium = movie \| tv \| book` |
| Primary metadata is TMDb-shaped | **Duplicate by medium behind one interface** | TMDb for screen, Open Library plus optional Google Books for books |
| Discovery means posters and film titles | **Duplicate by medium** | Screen detector plus book JSON-LD/ISBN/title-author detector |
| People are film crew | **Generalize** | Creator and role union |
| Emotional axes use cinema metaphors | **Keep keys, duplicate labels** | Shared values, medium-specific display copy |
| Status copy is screening language | **Generalize machine state, duplicate labels** | Planned/in-progress/completed/abandoned |
| Runtime, streaming, premieres are universal | **Keep only for screen** | `ScreenWorkDetails` |
| IDs are video-provider namespaces | **Generalize** | Add work, edition, ISBN, and creator namespaces |
| Seed catalog is film/TV | **Duplicate by medium** | Small book seed set or empty book state, reviewed separately |
| Product listing is a film journal | **Generalize** | Screen-and-page sanctuary copy |
| Capture uses screenplay metaphors | **Duplicate by medium** | Shared reflection core plus screen/book prompts |
| Stats and recommendation language is watched/screened/house | **Generalize** | Work, completed, Archive, Sanctuary Stats |
| Catalog and user relationship are separate | **Keep** | Preserve and strengthen |
| Local-first storage and export | **Keep** | Expand schema and privacy controls |
| Content-script allowlist | **Keep** | Add minimal generic work messages only |

## 2.7 Scope guardrail

The architecture becomes capable of additional media, but the product does not become an open-ended "track anything" system.

The only approved media after this work are:

```text
movie | tv | book
```

Adding podcasts, games, music, articles, or academic papers requires a separate product decision based on whether the same emotional-memory job still holds and whether the medium can be detected and identified reliably.

---

# 3. Brand, name, icon, and voice

## 3.1 Keep the name

**Subsume remains the correct name.**

It describes being absorbed, taken in, or overtaken by a work. That idea applies naturally to cinema and reading.

## 3.2 Updated one-line description

Recommended default:

> **A private sanctuary for films, shows, and books that stay with you.**

More conceptual alternative for long-form surfaces:

> **For works that take hold of you, on the screen and on the page.**

Use the first version in store and onboarding contexts because it is immediately understandable.

## 3.3 Icon direction

**Locked. Do not redesign.** Harsha has already produced the updated icon, including the book. The coding agent's job here is packaging only:

- generate/export the required sizes (16 px, 32 px, 48 px, 128 px, and any store-listing sizes) from the source file Harsha provides,
- update `manifest.json` icon references,
- update any store-listing kit assets in `store/` that reference the old icon,
- and verify legibility at 16 px, but do not alter the design to "fix" legibility — flag it back to Harsha instead of changing it unilaterally.

## 3.4 Voice system

Move from a cinema-only voice to a **shared sanctuary voice with medium-specific vocabulary**.

### Shared concepts

- Work
- Encounter
- Archive
- Reflection
- Creator
- Remember
- Return
- Discover
- Stayed with you
- Took hold of you

### Screen-specific vocabulary

- Watch
- Watching
- Watched
- Frame
- Scene
- Performance
- Direction
- Adaptation
- Screen

### Book-specific vocabulary

- Read
- Reading
- Read
- Page
- Passage
- Prose
- Voice
- Translation
- Edition

### Clarity rule

Operational actions must remain plain:

- `Want to watch`
- `Watching`
- `Watched`
- `Stopped`
- `Want to read`
- `Reading`
- `Read`
- `Did not finish`

Poetic language may appear as supporting copy, not as the only label for a state-changing action.

---

# 4. Target domain model

## 4.1 Core architectural decision

Replace the cinema-bound conceptual model:

```text
MediaItem + LibraryItem + PersonItem
```

with:

```text
CatalogWork + LibraryRelationship + Creator + WorkRelation
```

and add appendable user history:

```text
Experience + Reflection
```

The implementation may retain compatibility aliases during migration, but new code must use the target concepts.

## 4.2 Logical entity relationship

```text
CatalogWork 1 ───────── 0..1 LibraryRelationship
     │                           │
     │                           ├──── 0..n Experience
     │                           └──── 0..n Reflection
     │
     ├──── 0..n WorkExternalId
     ├──── 0..n CreatorCredit ───── Creator
     ├──── 0..n WorkRelation ────── CatalogWork
     └──── 0..n BookEdition         (book only)

ReleaseAlert
RecommendationDigest
RecommendationCandidate
TasteProfile
UserPreferences
```

## 4.3 `CatalogWork`

```ts
type WorkMedium = 'movie' | 'tv' | 'book';

interface CatalogWork {
  id: string;
  medium: WorkMedium;

  canonicalTitle: string;
  originalTitle?: string;
  subtitle?: string;

  firstReleaseYear?: number;
  description?: string;
  genres: string[];
  subjects?: string[];
  languages?: string[];

  images: {
    primary?: string;
    backdrop?: string;
    alternates?: string[];
  };

  externalIds: WorkExternalId[];
  creatorCredits: CreatorCredit[];

  screenDetails?: ScreenWorkDetails;
  bookDetails?: BookWorkDetails;

  sourceProvenance: SourceProvenance[];
  sourceConfidence: 'high' | 'medium' | 'low';
  createdAt: number;
  updatedAt: number;
  lastEnrichedAt?: number;
}
```

### Rules

- `medium` is mandatory and discriminates all medium-specific behavior.
- Shared fields must not be named after one medium. Use `images.primary`, not `posterUrl`.
- `firstReleaseYear` means the first publication year for books and initial release year for screen works.
- Public provider ratings may remain in metadata but must not be treated as the user's score.
- A work may have incomplete metadata and still be valid if it has a trustworthy identity and title.

## 4.4 Screen-specific details

```ts
interface ScreenWorkDetails {
  screenType: 'movie' | 'tv';
  runtimeMinutes?: number;
  episodeRuntimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  releaseDate?: string;
  streamingAvailability?: StreamingInfo[];
  productionCountries?: string[];
  originalLanguage?: string;
}
```

Existing movie and television fields migrate here with no user-visible data loss.

## 4.5 Book work and edition separation

An ISBN identifies a particular edition and format, not the underlying intellectual work. Subsume must therefore separate the book work from its editions.

```ts
interface BookWorkDetails {
  authors: string[];
  firstPublishedYear?: number;
  series?: {
    name: string;
    position?: number;
  };
  primarySubjects?: string[];
  adaptationWorkIds?: string[];
  defaultEditionId?: string;
}

interface BookEdition {
  id: string;
  workId: string;

  title: string;
  subtitle?: string;
  authors: string[];
  contributors?: CreatorCredit[];

  isbn10?: string[];
  isbn13?: string[];
  providerIds: WorkExternalId[];

  publisher?: string;
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  format?: 'hardcover' | 'paperback' | 'ebook' | 'audiobook' | 'other';

  coverUrl?: string;
  description?: string;

  sourceProvenance: SourceProvenance[];
  sourceConfidence: 'high' | 'medium' | 'low';
}
```

### Identity rule

- The library relationship attaches to the **book work**.
- The user may optionally select the edition they read through `preferredEditionId`.
- Different ISBNs must not automatically produce duplicate library entries.
- The same translated text in a different language can be stored as another edition of the work when provider linkage is trustworthy.
- When provider linkage is unavailable, Subsume may temporarily create a provisional work and later merge it through an explicit reconciliation process.

## 4.6 Book ID namespaces

Add safe ID patterns:

```text
openlibrary_work_<OL...W>
openlibrary_edition_<OL...M>
googlebooks_volume_<id>
isbn13_<13digits>
isbn10_<10chars>
book_fingerprint_<stablehash>
```

Rules:

1. Prefer `openlibrary_work_*` for canonical book work identity when available.
2. Keep Google Books volume ID as an external identifier, not the preferred work ID.
3. `isbn*` IDs are edition identities and must not be used as the final work ID when a work mapping exists.
4. `book_fingerprint_*` is a fallback generated from normalized title + primary author + earliest publication year.
5. Store redirects after merges:

```ts
interface CatalogIdRedirect {
  oldId: string;
  canonicalId: string;
  reason: 'provider_resolution' | 'duplicate_merge' | 'migration';
  createdAt: number;
}
```

Every lookup must resolve redirects before accessing user data.

## 4.7 `LibraryRelationship`

Replace cinema-specific `mediaId` semantics with:

```ts
type RelationshipStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

interface LibraryRelationship {
  workId: string;
  status: RelationshipStatus;

  addedAt: number;
  updatedAt: number;
  statusChangedAt?: number;

  currentRating?: number;       // 1-10, allow 0.5 increments
  userTags?: string[];
  sanctuaryIntent?: SanctuaryIntent;

  preferredEditionId?: string;  // book only
  currentExperienceId?: string;

  emotionalSnapshot?: EmotionalSnapshot;
  latestReflectionExcerpt?: string;

  legacy?: {
    mediaId?: string;
    notes?: string;
    emotionalRecall?: string;
    qualitativeNotes?: string;
  };
}
```

### Status labels by medium

| Machine status | Movie/TV label | Book label |
|---|---|---|
| `planned` | Want to watch | Want to read |
| `in_progress` | Watching | Reading |
| `completed` | Watched | Read |
| `abandoned` | Stopped | Did not finish |

Do not use `watched` as a machine status for books.

## 4.8 Sanctuary intent

Use a shared intent model:

```ts
type SanctuaryIntent =
  | 'keep_memory'
  | 'return_soon'
  | 'wishlist';
```

Labels:

- `keep_memory` - Keep This Memory
- `return_soon` - Return Soon
- `wishlist` - Wishlist

Default mapping:

| Relationship status | Default intent |
|---|---|
| `completed` | `keep_memory` |
| `in_progress` | `return_soon` |
| `planned` | `wishlist` |
| `abandoned` | `keep_memory` |

An abandoned work is valuable negative taste evidence and should not default back to a wishlist.

## 4.9 Experiences

The current single record cannot properly represent rewatching, rereading, changing ratings, or progress. Introduce experiences.

```ts
type ExperienceKind = 'watch' | 'read';

interface Experience {
  id: string;
  workId: string;
  kind: ExperienceKind;

  startedAt?: number;
  completedAt?: number;
  abandonedAt?: number;

  status: RelationshipStatus;
  rating?: number;

  editionId?: string;       // book only
  format?: 'theatrical' | 'streaming' | 'physical' | 'ebook' | 'audiobook' | 'other';

  progress?: {
    unit: 'percent' | 'page' | 'chapter' | 'episode';
    value: number;
    total?: number;
  };

  createdAt: number;
  updatedAt: number;
}
```

MVP behavior:

- Create one experience automatically when a work first enters `in_progress` or `completed`.
- Support a simple `Read again` / `Watch again` action only after the core books release is stable.
- The schema must support multiple experiences even if the initial UI does not fully expose them.

## 4.10 Reflections

This is a required correction to the current architecture.

The user explicitly needs to:

- write an immediate thought,
- return later,
- add more,
- preserve what they felt at different points,
- and avoid overwriting the original note.

```ts
type ReflectionKind =
  | 'first_impression'
  | 'progress_note'
  | 'completion_reflection'
  | 'later_reflection'
  | 'quotation'
  | 'idea_spark';

interface Reflection {
  id: string;
  workId: string;
  experienceId?: string;

  kind: ReflectionKind;
  body: string;
  title?: string;

  spoiler?: boolean;
  progressSnapshot?: Experience['progress'];

  userEnteredQuote?: {
    text: string;
    locationLabel?: string; // page/chapter supplied by user
  };

  createdAt: number;
  updatedAt: number;
}
```

Rules:

- Reflections are appendable.
- Editing a reflection updates that entry only.
- The archive card may show the latest or pinned excerpt.
- Existing `emotionalRecall`, `qualitativeNotes`, and `notes` migrate into one or more reflections.
- Do not automatically scrape or store copyrighted book text.
- A user may manually save a short quotation for private use.

## 4.11 Emotional model

Keep the underlying shared emotional keys:

```ts
interface EmotionalSnapshot {
  awe?: number;
  melancholy?: number;
  tension?: number;
  warmth?: number;
  atmosphere?: string;
  lingeringThought?: string;
}
```

Use medium-specific display language.

| Key | Screen display | Book display | Neutral fallback |
|---|---|---|---|
| `awe` | The sublime frame | The world it opened | Sense of wonder |
| `melancholy` | Sorrow in the cut | What lingered between the lines | Melancholy |
| `tension` | The held breath | The pull to turn the page | Tension |
| `warmth` | Afterglow and return | The company it kept | Warmth |

Do not add a large number of mandatory book-specific sliders. Prose, pacing, ideas, characters, world-building, and voice should initially be inferred as optional taste facets from ratings and reflections, then shown back to the user for confirmation.

## 4.12 Creators

Generalize `PersonItem` into `Creator`.

```ts
type CreatorRole =
  // Screen
  | 'director'
  | 'screenwriter'
  | 'cinematographer'
  | 'actor'
  | 'composer'
  | 'producer'
  | 'editor'

  // Books
  | 'author'
  | 'translator'
  | 'illustrator'
  | 'book_editor'
  | 'narrator'

  // Shared/fallback
  | 'creator'
  | 'other';

interface Creator {
  id: string;
  name: string;
  roles: CreatorRole[];
  biography?: string;
  profileImageUrl?: string;
  knownForWorkIds: string[];
  followedAt?: number;
  lastSyncedAt?: number;
  externalIds: WorkExternalId[];
}
```

A creator ID must be provider-namespaced:

```text
tmdb_person_<id>
openlibrary_author_<OL...A>
wikidata_person_<Q...>
creator_fingerprint_<stablehash>
```

Do not assume the same human from two providers is identical until an explicit external ID match or high-confidence reconciliation exists.

## 4.13 Work relations

```ts
type WorkRelationType =
  | 'adaptation_of'
  | 'adapted_as'
  | 'based_on'
  | 'inspired_by'
  | 'remake_of'
  | 'sequel_to'
  | 'prequel_to'
  | 'series_member'
  | 'companion_to'
  | 'same_universe';

interface WorkRelation {
  id: string;
  fromWorkId: string;
  toWorkId: string;
  relation: WorkRelationType;
  sourceUrl?: string;
  sourceProvider?: string;
  confidence: 'verified' | 'high' | 'medium' | 'user_asserted';
  createdAt: number;
}
```

For the first books release:

- support reading and displaying `adaptation_of` and `adapted_as`,
- populate only from structured provider data or a user-confirmed match,
- and do not let an LLM silently create permanent relations.

---

# 5. Book metadata strategy

## 5.1 Provider decision

### Default primary source: Open Library

Use Open Library as the default book catalog backbone because it provides:

- work-level and edition-level identities,
- author identities,
- search APIs,
- cover APIs,
- no mandatory user API key,
- and a model that aligns with the required work-versus-edition separation.

### Optional enrichment and fallback: Google Books

Use Google Books when the user supplies a Google Books API key for:

- broader volume search,
- ISBN resolution fallback,
- descriptions,
- page counts,
- categories,
- language,
- cover alternatives,
- and newest-publication queries.

Google Books volume IDs are edition/volume identifiers and must not become the only cross-edition identity.

### Optional relation enrichment: Wikidata

Use Wikidata for:

- adaptation links,
- author/creator identity bridging,
- original language,
- publication dates,
- and cross-medium relationships.

Wikidata must remain enrichment, not the sole catalog source.

## 5.2 Provider priority by task

| Task | First | Second | Third |
|---|---|---|---|
| ISBN resolution | Open Library edition lookup | Google Books `isbn:` query | Provisional ISBN edition |
| Title + author search | Open Library Search | Google Books search | Manual add |
| Work identity | Open Library Work ID | Provider reconciliation | Stable fingerprint |
| Cover | Selected edition cover | Open Library cover | Google Books image |
| Author identity | Open Library Author ID | Wikidata | Fingerprint |
| Adaptation relation | Wikidata / structured source | User confirmation | LLM suggestion pending confirmation |
| New books | Google Books newest query | Open Library recent publication search | Search-enabled LLM discovery |

## 5.3 Source provenance

Every externally sourced field must be traceable.

```ts
interface SourceProvenance {
  provider: 'tmdb' | 'omdb' | 'openlibrary' | 'googlebooks' | 'wikidata' | 'user' | 'other';
  providerRecordId?: string;
  sourceUrl?: string;
  fields: string[];
  fetchedAt: number;
}
```

This supports:

- conflict resolution,
- refresh logic,
- debugging,
- and transparent recommendation citations.

## 5.4 Metadata conflict rules

1. User-edited values win for display but retain provider provenance.
2. Selected edition metadata wins for page count, publisher, format, language, and cover.
3. Work-level title and author should prefer Open Library work data when confidence is high.
4. Never merge solely because titles match.
5. Strong merge signals:
   - same Open Library work ID,
   - edition linked to same work,
   - matching ISBN,
   - matching title + primary author + publication window with corroborating provider IDs.
6. Weak signals requiring user confirmation:
   - title only,
   - same title with different author,
   - translated title without provider linkage,
   - omnibus editions,
   - retellings,
   - and heavily revised editions.

---

# 6. Detection on arbitrary web pages

## 6.1 Detection goal

On any normal HTTP or HTTPS page, Subsume should identify likely books in addition to movies and television works, then let the user add or open them without leaving the page.

The detector must prioritize precision over aggressive coverage. A wrong plaque damages trust more than a missed title.

## 6.2 Shared candidate model

```ts
type DetectionEvidenceType =
  | 'json_ld'
  | 'microdata'
  | 'isbn'
  | 'open_graph'
  | 'domain_adapter'
  | 'title_author_text'
  | 'image_context'
  | 'url_pattern';

interface DetectionCandidate {
  medium: WorkMedium;
  title: string;
  authorOrCreator?: string[];
  year?: number;
  isbn10?: string[];
  isbn13?: string[];

  imageUrl?: string;
  sourcePageUrl: string;

  confidence: number; // 0-1
  evidence: Array<{
    type: DetectionEvidenceType;
    value?: string;
    weight: number;
  }>;

  providerHint?: string;
}
```

## 6.3 Book detection pipeline

Process in this order.

### Stage A - Structured data

Parse page-local structured data without network calls:

1. JSON-LD with:
   - `@type: Book`
   - `@type: Audiobook`
   - `@type: BookSeries`
   - `mainEntity` containing `Book`
2. Schema.org properties:
   - `name`
   - `author`
   - `isbn`
   - `image`
   - `datePublished`
   - `publisher`
   - `bookFormat`
3. Microdata using equivalent schema properties.
4. Open Graph and product metadata when paired with book context.

Structured `Book` + valid ISBN is a high-confidence candidate.

### Stage B - ISBN extraction

Detect ISBN-10 and ISBN-13 from:

- visible text,
- metadata,
- structured data,
- and known product page attributes.

Requirements:

- normalize hyphens and spaces,
- validate the ISBN checksum,
- convert valid ISBN-10 to ISBN-13,
- reject numbers embedded inside unrelated longer sequences,
- and require nearby book-context terms unless the domain adapter already identifies a book page.

### Stage C - Domain adapters

Create a registry, not one-off conditionals scattered through the scanner.

```ts
interface BookDomainAdapter {
  id: string;
  hostPatterns: string[];
  detect(document: Document, url: URL): DetectionCandidate[];
}
```

Initial adapters SHOULD cover high-value page types, not every site:

- Open Library
- Google Books
- Goodreads public book pages
- StoryGraph public book pages
- Hardcover public book pages
- Amazon book product pages
- major publisher book pages
- common Indian retail book product pages where stable structured data exists
- Wikipedia pages clearly representing a book

Rules:

- prefer structured metadata over brittle CSS selectors,
- never require login cookies,
- never scrape private user libraries,
- and isolate every adapter behind fixtures and tests.

### Stage D - Title and author heuristics

**Product decision (confirmed):** detection must work on arbitrary pages — news articles, blog posts, essays — not only on retailer/library product pages. This is the primary reason someone would use Subsume for books at all, so Stage D is not a fallback bolted onto Stage C. Treat it as its own workstream with its own fixture-based test suite from day one, built against real article pages (book reviews, "best books of the year" lists, essays that mention a title in passing), not just synthetic examples. It is also the noisiest stage — a passing mention of a title in prose is a much weaker signal than a Goodreads product page with a `Book` schema block — so the confidence thresholds in §6.4 matter more here than anywhere else in the pipeline, and this is the stage most likely to need iteration after the first release.

Detect patterns such as:

- `Book Title by Author Name`
- headings followed by author links,
- product title + author + ISBN blocks,
- review pages with a single clear subject,
- article metadata that explicitly names the reviewed book.

A title alone is insufficient for an intrusive overlay.

### Stage E - Cover context

For an image that appears to be a book cover:

- use `alt`, `aria-label`, nearby heading, caption, and link destination,
- search by title + author,
- and only resolve when the provider match is strong.

Do not add OCR in the first books release.

## 6.4 Confidence thresholds

Recommended behavior:

| Confidence | Behavior |
|---|---|
| `>= 0.85` | Show normal Subsume plaque/hover action |
| `0.65-0.84` | Show a subtle candidate action, require confirmation |
| `< 0.65` | Do not annotate page; allow manual popup search |

Confidence is not only provider search score. It combines page evidence and catalog resolution confidence.

## 6.5 Resolver sequence

```text
candidate
  -> normalize
  -> identify medium
  -> validate identifiers
  -> provider lookup
  -> score provider matches
  -> resolve to canonical work
  -> deduplicate against current page candidates
  -> check library status
  -> render action
```

For books:

```text
ISBN
  -> edition lookup
  -> work lookup
  -> save edition
  -> save work
  -> attach relationship to work
```

## 6.6 Scanner performance and safety

- Parse structured data once per document state.
- Debounce MutationObserver work.
- Cache normalized candidate fingerprints per page.
- Apply per-origin lookup budgets.
- Do not send full page HTML to the background worker.
- Send only minimal candidate fields.
- Never send page content to an LLM during automatic detection.
- Respect disabled domains and all existing content-script security boundaries.
- Teardown every observer, overlay, and listener on `pagehide`.

---

# 7. Capture experience

## 7.1 Shared interaction principle

The first question remains:

> **What stayed with you?**

It works for movies, television, documentaries, fiction, essays, memoirs, and nonfiction.

The medium changes the supporting prompts, not the core emotional act.

## 7.2 Quick-add from a page

When a high-confidence work is detected, the hover card should support:

1. Add to Subsume
2. Set status
3. Add a one-line first impression
4. Open full capture

### Screen quick states

- Want to watch
- Watching
- Watched
- Stopped

### Book quick states

- Want to read
- Reading
- Read
- Did not finish

## 7.3 Full book capture

Recommended sections:

### A. Relationship

- Status
- Edition read, optional
- Reading format, optional
- Started/finished dates, optional
- Progress when reading

### B. Immediate reflection

Primary prompt:

> What stayed with you?

Optional contextual prompts:

- What pulled you in?
- What pushed you away?
- Was it the voice, the ideas, the characters, or the world?
- Is there a passage you want to carry with you?
- What are you still thinking about?

Do not display all prompts at once. Use one main prompt and reveal optional prompts progressively.

### C. Rating

- 1-10
- 0.5 increments allowed
- unrated is valid
- rating should not be visually compared to public provider scores while the user is choosing it

### D. Emotional spectrum

Reuse the shared axes with book-specific labels.

### E. Later additions

- Add reflection
- Add progress note
- Add quotation
- Add idea spark
- Mark spoiler
- Pin an excerpt to the archive card

## 7.4 Abandonment is first-class

For `Did not finish`, optionally ask:

- What made you stop?
- Would you try it again in another mood?
- Was the issue pacing, voice, subject, length, or something else?

Store the answer as a reflection and negative taste signal. Never shame the user or treat abandonment as failure.

**Keep this prompt set even under implementation time pressure.** It is cheap to build and it is the detail that makes "did not finish" feel like care rather than a tracking failure — do not cut it to a bare status toggle.

## 7.5 Copyright-safe quotation behavior

- Allow only user-entered quotations.
- Do not scrape full ebook pages.
- Do not automatically copy highlighted text from protected reader applications in v1.
- Do not send saved quotations to external LLMs unless the user explicitly enables it.
- Provide a visible privacy note near the first quote save action.

---

# 8. Information architecture and navigation

## 8.1 Keep the primary navigation

| Key | New label | Notes |
|---|---|---|
| `library` | Archive | Unified across media |
| `home` | Discovery | Unified recommendations and encounters |
| `settings` | Settings | Provider, privacy, detection, backup |

Do not create separate top-level `Movies` and `Books` applications.

## 8.2 Archive filters

At the top of Archive:

```text
All | Screen | Books
```

Secondary filters:

- Status
- Intent
- Rating
- Creator
- Genre/subject
- Year
- Tags
- Unrated
- Has reflections
- Adaptations

The user's last-used medium filter may be remembered locally.

## 8.3 Explore navigation changes

| Current | Target |
|---|---|
| Search | Search |
| Recommendations | For You |
| Now Showing | New & Noted |
| Filmmakers | Creators |
| House Stats | Sanctuary Stats |
| Premiere Alerts | Release Alerts |

## 8.4 Search

Global search must:

- search all enabled media,
- show medium badges,
- let the user narrow to Screen or Books,
- group duplicate book editions under one work,
- and avoid showing five editions as five unrelated results.

Search result anatomy for a book:

- cover,
- title and subtitle,
- primary author,
- first publication year,
- selected/default edition detail,
- current library status,
- and an edition chooser only when needed.

## 8.5 Archive cards

Generalize component names:

| Current | Target |
|---|---|
| `HardcoverSpineCard` | `ArchiveSpineCard` |
| `SanctuaryMediaCard` | `SanctuaryWorkCard` |
| `FilmographyView` | `CreatorWorksView` |
| `DetailModal` | `WorkDetailModal` |

`ArchiveSpineCard` should have medium variants:

- screen variant uses frame/poster composition,
- book variant uses cover/page materiality,
- both share typography, spacing, reflection excerpt, rating, status, and intent.

Do not make every screen item look like a literal hardcover book merely because the archive metaphor uses spines.

## 8.6 Work detail

Shared structure:

1. Identity and image
2. Current relationship
3. Rating
4. Experience history
5. Reflections
6. Emotional snapshot
7. Creator credits
8. Related works
9. Provider metadata and source links

Book additions:

- author,
- translator/illustrator when available,
- first publication,
- selected edition,
- language,
- publisher,
- page count,
- format,
- ISBN,
- series,
- adaptations.

## 8.7 Popup

Popup states:

1. **Current page has one confident work**
   - show resolved work and quick capture.

2. **Current page has multiple works**
   - show compact candidate list grouped by Screen and Books.

3. **Current page has uncertain candidates**
   - show confirmation/search.

4. **No work detected**
   - global search box and recent items.

5. **Reading/product page with multiple editions**
   - resolve to work, show detected edition as default.

## 8.8 Onboarding

Updated onboarding:

1. Explain Subsume as screen + page.
2. Let user enable:
   - Movies and television
   - Books
   Both default on.
3. TMDb setup:
   - required only for screen discovery.
4. Open Library:
   - available without a user key.
5. Google Books:
   - optional user API key for better fallback and enrichment.
   - **State this plainly in the onboarding copy, do not just list it as a checkbox:** "Open Library works immediately with no signup. Adding a free Google Books key (about 2 minutes) improves cover art, recent releases, and description quality." Open Library is noticeably thinner than TMDb on recent titles and non-English catalog depth, so the books experience will feel bare on first run unless the user understands why the extra key is worth the two minutes.
6. LLM:
   - optional provider and API key.
7. Web-aware recommendations:
   - separate opt-in because they may incur search-tool cost and send a taste summary externally.
8. Content detection:
   - hover cards,
   - cover/poster overlays,
   - disabled domains,
   - sensitivity.
9. Privacy summary:
   - local-first,
   - exactly what leaves the browser,
   - API keys are stored locally but cannot be made truly secret in a client-only extension.

---

# 9. Recommendation and taste architecture

## 9.1 Principle

Subsume recommendations must answer:

> **How likely is this particular user to value this work, and why?**

They must not answer:

> Is this work generally acclaimed?

Aggregate ratings may be displayed as optional context but should not drive personal fit by default.

## 9.2 LLM role

The LLM should:

- interpret the user's own ratings and reflections,
- infer tentative taste facets,
- compare candidates,
- explain fit,
- identify uncertainty,
- and surface both strong matches and thoughtful stretches.

The LLM must not:

- invent titles,
- invent publication or release dates,
- fabricate adaptation relationships,
- create unverified creator records,
- or silently treat critic consensus as user preference.

## 9.3 Taste profile v2

```ts
interface TasteProfileV2 {
  generatedAt: number;
  profileVersion: number;

  screen: MediumTasteProfile;
  books: MediumTasteProfile;
  crossMedium: CrossMediumTasteProfile;

  privacyMode: 'ratings_only' | 'summarized_reflections' | 'full_selected_reflections';
}

interface MediumTasteProfile {
  positiveSeeds: TasteSeed[];
  negativeSeeds: TasteSeed[];
  abandonedSeeds: TasteSeed[];
  creatorSignals: CreatorSignal[];
  genreSignals: WeightedSignal[];
  inferredFacets: InferredTasteFacet[];
  confidence: number;
}

interface CrossMediumTasteProfile {
  recurringThemes: WeightedSignal[];
  emotionalPreferences: WeightedSignal[];
  narrativePreferences: WeightedSignal[];
  aversions: WeightedSignal[];
  adaptationSignals: WeightedSignal[];
  confidence: number;
}
```

## 9.4 Evidence weighting

Suggested priority:

1. Explicit high/low rating
2. Written reflection
3. Abandonment reason
4. Rewatch/reread behavior
5. Completion
6. Creator follow
7. User tags
8. Planned/wishlist status
9. Aggregate metadata

A `planned` item is weak positive evidence. It must not be treated as equivalent to a 9/10 completed work.

Negative and abandonment evidence must be retained. A taste model built only from liked works becomes generic.

## 9.5 Candidate pipeline

Use a four-stage system.

### Stage 1 - Candidate generation

Generate only real provider-backed candidates from:

- related works from metadata providers,
- creator bibliography/filmography,
- genre and subject search,
- new releases,
- adaptation graph,
- user-specified discovery query,
- and search-enabled LLM web discovery when enabled.

### Stage 2 - Catalog validation

Every candidate must resolve to `CatalogWork`.

Reject candidates that cannot be matched with adequate confidence.

### Stage 3 - Taste reranking

Provide the LLM:

- a minimized taste profile,
- candidate metadata,
- relevant seed evidence,
- and instructions to score personal fit.

### Stage 4 - Explanation

Every recommendation must contain:

- fit score or confidence,
- concise reason,
- one or more user-evidence references,
- caution or mismatch where relevant,
- provider source,
- and web citations when web search was used.

## 9.6 Recommendation output

```ts
interface PersonalizedRecommendation {
  id: string;
  workId: string;
  medium: WorkMedium;

  fitScore: number;       // 0-100
  confidence: 'high' | 'medium' | 'low';

  reason: string;
  evidence: Array<{
    sourceWorkId?: string;
    sourceCreatorId?: string;
    sourceReflectionId?: string;
    explanation: string;
  }>;

  possibleMismatch?: string;
  discoveryMode: 'catalog' | 'web_grounded' | 'cross_medium';
  citations?: RecommendationCitation[];

  generatedAt: number;
}
```

## 9.7 Cross-medium recommendations

Cross-medium recommendations are a differentiator, but must be controlled.

Examples:

- recommend a novel because the user loved the moral ambiguity and atmosphere of a film,
- recommend a documentary because the user valued a nonfiction book's subject and method,
- recommend an adaptation of a loved book,
- or recommend the source novel behind a highly rated film.

Rules:

- keep `screen`, `books`, and `cross-medium` recommendation tabs or chips,
- let the user disable cross-medium suggestions,
- never assume liking a story implies liking its adaptation,
- and clearly explain the bridge.

## 9.8 Cold start

When insufficient history exists:

1. Ask the user to rate or select up to five known works.
2. Allow a mixed screen/book set.
3. Ask one optional contrast:
   - "A popular work you did not enjoy."
4. Generate a provisional profile.
5. Label early recommendations as low-confidence.

Do not require a long preference questionnaire before the user can use the archive.

## 9.9 Feedback loop

Each recommendation supports:

- Save
- Not for me
- Already know it
- Wrong reason
- More like this
- Less like this

Store feedback separately from ratings. A user may reject a recommendation without disliking the underlying work.

---

# 10. Weekly discovery and news cadence

## 10.1 Product decision

Offer a configurable weekly **Subsume Dispatch**.

Default:

- Thursday
- 7:00 PM in the user's local timezone
- disabled until the user explicitly enables it

The dispatch may contain:

- personalized new releases,
- one or two overlooked older works,
- author or filmmaker news,
- adaptation announcements,
- award or festival developments,
- a cross-medium bridge,
- and a short explanation tied to the user's taste.

## 10.2 Scheduling in Manifest V3

Use `chrome.alarms`, not `setInterval`.

The schedule is best-effort:

- if Chrome is closed or the service worker is suspended, run on the first available opportunity after the due time,
- do not promise exact delivery at 7:00 PM,
- and never create duplicate dispatches for the same period.

Persist:

```ts
interface DigestScheduleState {
  enabled: boolean;
  weekday: number;
  localTime: string;
  timezone: string;

  nextDueAt?: number;
  lastAttemptAt?: number;
  lastSuccessfulRunAt?: number;
  lastCompletedPeriodKey?: string; // e.g. 2026-W30
  failureCount: number;
}
```

On:

- install,
- startup,
- preference change,
- and successful run,

reconcile the alarm and persisted schedule.

## 10.3 Two dispatch capability levels

### A. Catalog-based dispatch

Works with any configured LLM, including models without web search.

Inputs:

- provider-backed newest releases,
- followed creator catalogs,
- adaptation relations already in the catalog,
- and the user's taste profile.

Label it:

> Based on your archive and connected catalogs

### B. Web-grounded dispatch

Requires an LLM/API configuration that explicitly supports web search.

Potential provider capabilities include:

- OpenAI Responses API web search,
- Anthropic server-side web search,
- Gemini grounding with Google Search.

The adapter must declare capabilities:

```ts
interface LlmProviderCapabilities {
  structuredOutput: boolean;
  webSearch: boolean;
  webCitations: boolean;
  maxSearchesConfigurable: boolean;
}
```

Do not pretend a plain completion model searched the web.

## 10.4 Web-grounded workflow

1. Build a privacy-minimized taste brief.
2. Generate bounded search intents.
3. Search recent information.
4. Require publication dates and source URLs.
5. Resolve every recommended work into the catalog.
6. Deduplicate repeated news.
7. Reject unverifiable claims.
8. Store citations with the dispatch.
9. Notify the user only after a valid dispatch is saved.

## 10.5 Cost controls

Before enabling web-grounded dispatch, show:

- provider,
- selected model,
- maximum searches per dispatch,
- estimated upper-bound request count,
- and that provider charges may apply.

Defaults:

- maximum 5 searches,
- maximum 8 recommended works,
- maximum 5 news items,
- one retry on transient failure,
- no automatic retry loop that can create unexpected spend.

## 10.6 Privacy controls

Default payload:

- ratings,
- statuses,
- creator follows,
- compact tags,
- machine-generated summaries of reflections stored locally.

Do not send full private reflections by default.

Modes:

1. Ratings only
2. Ratings + locally summarized reflections
3. Selected full reflections

The user must explicitly choose mode 3.

## 10.7 Notification behavior

Use one notification:

> Your Subsume Dispatch is ready

Do not expose private reflection content in the operating-system notification.

Click opens the saved digest inside Subsume.

---

# 11. Alerts

## 11.1 Generalize alerts

Rename `WatchAlert` to `ReleaseAlert`.

```ts
type ReleaseAlertMedium = 'movie' | 'tv' | 'book' | 'all';

interface ReleaseAlert {
  id: string;
  medium: ReleaseAlertMedium;

  creatorIds?: string[];
  workIds?: string[];
  genresOrSubjects?: string[];
  keywords?: string[];

  alertTypes: Array<
    | 'new_release'
    | 'adaptation'
    | 'translation'
    | 'new_edition'
    | 'news'
  >;

  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

MVP book alerts:

- new work by followed author,
- adaptation of a saved book,
- new translation or edition only when provider data can support it reliably.

Do not promise publication alert completeness.

---

# 12. Messages and handlers

## 12.1 Rename safely

Do not perform a single disruptive rename across the codebase without compatibility.

Introduce new message types and temporarily map old ones.

### Catalog

```text
GET_WORK_DETAILS
GET_CATALOG_WORKS
SEARCH_WORKS
RESOLVE_PAGE_CANDIDATE
GET_RELATED_WORKS
GET_BOOK_EDITIONS
SET_PREFERRED_EDITION
```

### Library relationship

```text
ADD_TO_ARCHIVE
UPDATE_RELATIONSHIP_STATUS
SET_CURRENT_RATING
GET_ARCHIVE
GET_ARCHIVE_PAGE
CHECK_ARCHIVE_STATUS
REMOVE_FROM_ARCHIVE
```

### Experience and reflection

```text
CREATE_EXPERIENCE
UPDATE_EXPERIENCE
ADD_REFLECTION
UPDATE_REFLECTION
DELETE_REFLECTION
GET_REFLECTIONS
```

### Creators

```text
SEARCH_CREATOR
FOLLOW_CREATOR
UNFOLLOW_CREATOR
GET_CREATOR_WORKS
SYNC_CREATOR_WORKS
GET_ALL_CREATORS
```

### Recommendation and dispatch

```text
BUILD_TASTE_PROFILE
GET_PERSONALIZED_RECOMMENDATIONS
GET_SUBSUME_DISPATCH
REGENERATE_SUBSUME_DISPATCH
GET_LLM_PROVIDER_CAPABILITIES
```

### Alerts

```text
CREATE_RELEASE_ALERT
GET_RELEASE_ALERTS
UPDATE_RELEASE_ALERT
DELETE_RELEASE_ALERT
```

## 12.2 Compatibility aliases

During migration:

- `GET_TITLE_DETAILS` may delegate to `GET_WORK_DETAILS`
- `ADD_TO_LIST` may delegate to `ADD_TO_ARCHIVE`
- `PersonItem` APIs may delegate to Creator APIs
- old payloads using `mediaId` must be normalized to `workId`

Log deprecated calls in development builds.

## 12.3 Content-script allowlist

Allow only minimal page-safe operations:

```text
GET_CONTENT_PREFS
RESOLVE_PAGE_CANDIDATE
GET_WORK_DETAILS
ADD_TO_ARCHIVE
REMOVE_FROM_ARCHIVE
CHECK_ARCHIVE_STATUS
OPEN_WORK_DETAIL
OPEN_CAPTURE_CANVAS
```

Do not expose:

- full archive,
- reflections,
- taste profile,
- API keys,
- dispatch,
- exports,
- creator follow list,
- or diagnostics

to arbitrary web origins.

## 12.4 Broadcasts

```ts
ARCHIVE_UPDATED {
  action: 'add' | 'update' | 'remove';
  workId: string;
  relationship?: LibraryRelationship;
}

CREATORS_UPDATED {
  action: 'sync' | 'follow' | 'unfollow';
  creatorId: string;
}

WORK_CANONICALIZED {
  oldWorkId: string;
  canonicalWorkId: string;
}
```

Verify `sender.id === chrome.runtime.id` before accepting broadcasts.

---

# 13. Persistence and migration

## 13.1 IndexedDB target

Increment `subsume-db` from v3 to a new reviewed version, suggested v4 for the first domain migration.

Target stores:

| Store | Key | Notes |
|---|---|---|
| `works` | `id` | Replaces/generalizes `media` |
| `book_editions` | `id` | Book edition records |
| `relationships` | `workId` | Replaces/generalizes `library` |
| `experiences` | `id` | Watch/read sessions |
| `reflections` | `id` | Appendable user writing |
| `creators` | `id` | Generalizes `people` |
| `work_relations` | `id` | Adaptation and related-work graph |
| `id_redirects` | `oldId` | Canonicalization |
| `preferences` | existing keys | Expanded prefs |
| `alerts` | `id` | Generalized release alerts |

Recommended indexes:

### `works`

- `by-medium`
- `by-canonical`
- `by-year`

### `book_editions`

- `by-work`
- `by-isbn10`
- `by-isbn13`

### `relationships`

- `by-status`
- `by-intent`
- `by-added`
- `by-updated`

### `experiences`

- `by-work`
- `by-started`
- `by-completed`

### `reflections`

- `by-work`
- `by-experience`
- `by-created`
- `by-kind`

### `creators`

- `by-followed`
- `by-name`
- `by-role`

### `work_relations`

- `by-from`
- `by-to`
- `by-relation`

## 13.2 Migration rules

### Existing `MediaItem`

For every movie/TV media record:

- copy to `CatalogWork`,
- preserve ID,
- set `medium` from old `type`,
- map `posterUrl` to `images.primary`,
- map `backdropUrl` to `images.backdrop`,
- move runtime/streaming fields to `screenDetails`,
- convert provider IDs to `externalIds`,
- preserve all metadata not yet normalized under a temporary legacy field only if required.

### Existing `LibraryItem`

- `mediaId` -> `workId`
- `to-watch` -> `planned`
- `watching` -> `in_progress`
- `watched` -> `completed`
- `abandoned` -> `abandoned`
- migrate `userRating` -> `currentRating`
- preserve tags
- migrate intent keys:
  - `revisit_this_month` -> `return_soon`
- create one initial `Experience` when enough lifecycle evidence exists
- migrate notes into reflections

### Reflection migration

Suggested mapping:

- `emotionalRecall` -> `first_impression`
- `qualitativeNotes` -> `later_reflection`
- `notes` -> `later_reflection` only if it is not duplicate text
- `scriptParallels` -> one `later_reflection` with a structured heading
- `originalScreenplaySparks` -> `idea_spark`
- `lingeringThought` remains in emotional snapshot and may also become a reflection if it contains substantive unique text

### Existing `PersonItem`

- prefix IDs as `tmdb_person_*` if not already namespaced
- convert `role` to `roles[]`
- map `filmographyIds` to `knownForWorkIds`
- preserve follows and sync timestamps

### Existing `WatchAlert`

- convert type movie/tv/both to medium
- map premiere alert to `new_release`

## 13.3 Migration safety

MUST:

- run in a single versioned upgrade transaction where possible,
- be idempotent,
- preserve the old store until migration validation completes,
- include a post-migration integrity check,
- record migration version and completion timestamp,
- and export a local recovery snapshot before destructive cleanup.

Do not delete old stores in the same release that first migrates them. Remove them only after at least one stable release and a tested rollback strategy.

## 13.4 Export and import

New export shape:

```ts
interface SubsumeExportV2 {
  schemaVersion: 2;
  exportedAt: number;

  works?: CatalogWork[];
  bookEditions?: BookEdition[];
  relationships?: LibraryRelationship[];
  experiences?: Experience[];
  reflections?: Reflection[];
  creators?: Creator[];
  workRelations?: WorkRelation[];
  alerts?: ReleaseAlert[];
  digests?: RecommendationDigest[];

  preferencesSafe?: ExportablePreferences;
}
```

Never export API keys in normal backup files.

Import must support:

- legacy v1 export,
- current pre-books export,
- and v2 multi-medium export.

Deduplicate before committing imported book records.

---

# 14. Preferences

## 14.1 Proposed additions

```ts
interface UserPreferences {
  enabledMedia: {
    movie: boolean; // default true
    tv: boolean;    // default true
    book: boolean;  // default true — confirmed: books on by default at install, same as movie/TV
  };

  // Existing screen providers
  tmdbApiKey?: string;
  omdbApiKey?: string;

  // Book providers
  googleBooksApiKey?: string;
  openLibraryEnabled: boolean;

  // Detection
  detectScreenWorks: boolean;
  detectBooks: boolean;
  coverOverlaysEnabled: boolean;
  posterOverlaysEnabled: boolean;

  // Recommendation
  crossMediumRecommendationsEnabled: boolean;
  recommendationPrivacyMode:
    | 'ratings_only'
    | 'summarized_reflections'
    | 'full_selected_reflections';

  // Dispatch
  dispatchEnabled: boolean;
  dispatchWeekday: number;
  dispatchLocalTime: string;
  dispatchTimezone: string;
  dispatchWebSearchEnabled: boolean;
  dispatchMaxSearches: number;

  // Existing keys/theme/sync...
}
```

## 14.2 Safe content preferences

Content scripts may receive only:

- enabled media,
- detection toggles,
- overlays toggles,
- detection sensitivity,
- domain disabled status.

They must never receive:

- Google Books key,
- LLM key,
- full notes,
- ratings history,
- taste profile,
- or archive contents.

---

# 15. External permissions and hosts

Review and add only required hosts.

Likely book endpoints:

```text
https://openlibrary.org/*
https://covers.openlibrary.org/*
https://www.googleapis.com/books/*
https://www.wikidata.org/*
https://query.wikidata.org/*
```

Search-enabled LLM hosts should remain provider-specific and enabled only when configured.

Requirements:

- document every new host in the privacy policy,
- explain why broad web-page access is required for in-page detection,
- avoid adding retailer domains as host permissions when page-local content scripts already have access through existing match patterns,
- and keep provider calls in the background service worker.

---

# 16. Security and privacy

## 16.1 Local-first contract

Default user data remains local:

- archive relationships,
- ratings,
- progress,
- reflections,
- quotations,
- taste profile,
- and saved digests.

Only minimal data should leave the browser for:

- metadata lookup,
- optional backup,
- optional LLM recommendations,
- and optional web-grounded dispatch.

## 16.2 API-key reality

A Chrome extension with no backend cannot make a user API key perfectly secret from a determined local user or compromised extension context.

Therefore:

- keep keys out of content scripts,
- never log them,
- redact them from diagnostics,
- do not include them in exports,
- limit provider hosts,
- use extension-origin requests only,
- and state clearly in settings that keys are stored locally on the device and are not encrypted with a user-held secret.

Do not make false "bank-grade encryption" claims.

## 16.3 Page data minimization

Automatic detection may transmit only:

- title,
- author/creator,
- year,
- valid ISBN,
- image URL where required,
- and source page URL/domain for provenance.

Do not transmit:

- full article text,
- browsing history,
- comments,
- login identity,
- or arbitrary DOM contents.

## 16.4 LLM minimization

Before any LLM call:

1. build the smallest usable taste brief,
2. strip page URLs unless needed,
3. exclude full private reflections by default,
4. exclude quotations by default,
5. include opaque work IDs plus necessary titles,
6. and show the user which privacy mode is active.

## 16.5 Diagnostics

Diagnostics may show:

- provider,
- endpoint category,
- response status,
- latency,
- quota/rate-limit status,
- candidate confidence,
- and redacted payload shape.

Diagnostics must not show:

- API keys,
- full reflections,
- full quotations,
- OAuth tokens,
- or raw provider authorization headers.

---

# 17. Design system implications

## 17.1 Keep the sanctuary

The existing Gilded Night / Cinematic Sanctuary system can expand naturally.

The design should feel like one private place with different materials:

- screen works: light, frame, projection, stillness,
- books: paper, margin, cover, binding, depth,
- shared: black, warm gold, ivory, restrained motion, editorial spacing.

## 17.2 Do not create two themes

Avoid:

- a cinema-black theme and a separate brown-library theme,
- tab bars that look like two apps,
- literal film reels everywhere,
- or literal books everywhere.

Use medium variants inside the same token system.

## 17.3 Accessibility

- Meet WCAG AA contrast for all operational text.
- Do not use gold for long body text.
- Do not rely on cover/poster imagery to communicate medium.
- Provide visible medium labels/icons.
- Respect reduced motion.
- Ensure overlays are keyboard accessible.
- Keep focus inside modals.
- Provide alt text for covers and posters.

---

# 18. Phased delivery plan

## Phase 0 - Domain foundation

**Goal:** Make the architecture medium-capable without changing the visible product dramatically.

Deliver:

- `CatalogWork` and `WorkMedium`
- generic status mapping
- Creator abstraction
- new storage schema and migration
- reflections store
- experiences store
- compatibility adapters for current movie/TV flows
- renamed generic shared components internally
- all existing tests green
- migration and rollback tests

Exit criteria:

- existing user sees the same movie/TV library after migration,
- no movie/TV feature regresses,
- old exports still import,
- and new domain types no longer hard-code `movie | tv` in shared core paths.

## Phase 1 - Books MVP

**Goal:** Detect, search, save, track, and reflect on books.

Deliver:

- Open Library integration
- optional Google Books key and fallback
- book work/edition stores
- ISBN parsing/checksum/conversion
- structured-data book detector
- initial domain adapters
- book search with edition grouping
- book quick-add and full capture
- statuses: Want to read, Reading, Read, Did not finish
- progress
- appendable reflections
- book archive cards and details
- All / Screen / Books archive filters
- export/import v2
- privacy and onboarding updates

Non-goals in Phase 1:

- Goodreads import
- StoryGraph import
- barcode camera scanning
- OCR cover recognition
- social features
- reading goals/streaks
- automatic ebook-reader integration
- complete edition reconciliation UI
- audiobook progress sync
- public reviews

## Phase 2 - Creators, recommendations, and dispatch

Deliver:

- author search/follow
- author work sync
- TasteProfileV2
- book recommendations
- cross-medium recommendations
- recommendation feedback
- provider capability registry
- catalog-based weekly dispatch
- web-grounded dispatch for supported LLM providers
- citations and cost controls
- generalized release alerts

Exit criteria:

- every recommended title resolves to a catalog work,
- every web claim has a stored source,
- plain LLM providers never claim to search,
- and dispatch jobs are idempotent.

## Phase 3 - Story graph and deeper memory

Deliver:

- adaptation relations
- related-work view
- reread/rewatch UI
- reflection timeline
- rating history
- edition reconciliation and merge UI
- optional imports from user exports of other services
- richer statistics
- translation and edition alerts

## FUTURE - Evaluate separately

- comics/manga-specialized metadata
- academic paper support
- podcasts
- games
- music
- in-reader highlighting
- mobile companion
- shared/private circles
- backend account sync

Do not generalize the product to every medium merely because the schema can.

---

# 19. Detailed engineering workstreams

## 19.1 Workstream A - Types and naming

- Add discriminated union for medium.
- Introduce generic work types.
- Remove `MediaType = movie | tv` assumptions from shared code.
- Keep compatibility aliases during migration.
- Add exhaustive TypeScript switches for every medium.
- Fail builds when a new medium is not handled.

## 19.2 Workstream B - Storage

- Add new stores and indexes.
- Build migration utilities.
- Add ID redirect resolution.
- Add post-migration integrity report.
- Update export/import.
- Add backup recovery fixture.

## 19.3 Workstream C - Book providers

Create adapters:

```ts
interface BookCatalogProvider {
  id: 'openlibrary' | 'googlebooks';

  search(query: BookSearchQuery): Promise<BookSearchResult[]>;
  resolveIsbn(isbn: string): Promise<BookResolution | null>;
  getWork(id: string): Promise<CatalogWork | null>;
  getEdition(id: string): Promise<BookEdition | null>;
  getAuthorWorks?(creatorId: string): Promise<CatalogWork[]>;
}
```

Add:

- request timeouts,
- abort signals,
- retry only on safe transient errors,
- rate-limit handling,
- provider health diagnostics,
- caching,
- and source provenance.

## 19.4 Workstream D - Candidate resolution

- Normalize ISBN/title/author.
- Score provider matches.
- Add deterministic thresholds.
- Add provisional records.
- Add duplicate merge rules.
- Log reasons for rejection.
- Never resolve a book solely from generic page title text.

## 19.5 Workstream E - Content script

- Add structured-data parser.
- Add ISBN detector.
- Add adapter registry.
- Add book cover candidate scanner.
- Add medium-aware overlay.
- Maintain lookup budgets.
- Add fixtures for retail, review, list, publisher, and knowledge pages.

## 19.6 Workstream F - UI

- Add medium filter.
- Add book cards.
- Add edition chooser.
- Add progress.
- Add reflections timeline.
- Generalize detail modal.
- Generalize creators.
- Update copy and empty states.
- Update onboarding and settings.

## 19.7 Workstream G - Taste and LLM

- Add provider capability registry.
- Build minimized profile.
- Add catalog-only recommendation path.
- Add structured output schemas.
- Validate every recommendation.
- Add feedback.
- Add cost and privacy controls.
- Store citations.

## 19.8 Workstream H - Scheduling

- Add alarms permission if not present.
- Add schedule reconciler.
- Persist schedule state.
- Ensure idempotency.
- Handle browser downtime.
- Add notifications.
- Add manual `Generate now`.
- Add test clock abstraction.

## 19.9 Workstream I - Docs and store

Update:

- README
- privacy policy
- Chrome Web Store description
- onboarding copy
- screenshots
- permissions explanation
- API key setup
- export schema docs
- design spec
- voice guide
- release notes

---

# 20. Acceptance criteria

## 20.1 Identity

- Adding two ISBNs for paperback and hardcover of the same provider-linked work creates one archive relationship and two editions.
- Adding a film and its source novel creates two work records and two independent relationships.
- A translated edition may be selected without duplicating the work when provider linkage is reliable.
- Invalid ISBN checksums are rejected.
- Old movie/TV IDs continue to resolve.

## 20.2 Detection

- A page with Schema.org `Book` and valid ISBN is detected.
- A page with a random 13-digit number is not detected as a book.
- A list article with ten books does not exceed the lookup budget.
- A title that is both a film and a book remains ambiguous until creator/author/context resolves it.
- Low-confidence candidates do not receive intrusive overlays.
- Disabled domains remain completely untouched.

## 20.3 Capture

- A user can add a book and write a first impression in the popup.
- A user can later add a second reflection without overwriting the first.
- A user can mark reading progress.
- A user can mark Did not finish and record why.
- Rating remains optional.
- Book and screen status labels are correct.

## 20.4 Archive

- All, Screen, and Books filters work.
- Book editions are grouped under one work.
- Search supports title, author, ISBN, tags, and reflection text.
- The work detail shows provenance and selected edition.
- Adaptation links do not merge ratings or notes.

## 20.5 Recommendations

- Every recommendation maps to a real `workId`.
- A recommended work is not already completed unless the reason is reread/rewatch.
- Negative and abandoned items influence fit.
- The explanation cites specific user evidence without exposing private text unnecessarily.
- Aggregate provider ratings do not dominate ranking.
- Cross-medium suggestions can be disabled.

## 20.6 Dispatch

- Only one digest is created per weekly period.
- A missed scheduled time runs at the next browser opportunity.
- A provider without web-search support receives catalog-only behavior.
- Web-grounded items store citations.
- Search count respects the configured maximum.
- Failed runs do not generate repeated billable retries.
- OS notifications contain no private note content.

## 20.7 Privacy

- Content scripts cannot retrieve API keys or reflections.
- Exports contain no API keys.
- Logs redact credentials and private text.
- Automatic detection never sends full HTML to a provider.
- Full reflections are not sent to an LLM under the default mode.
- Quotes are excluded from LLM calls by default.

---

# 21. Required test plan

## 21.1 Unit tests

- ISBN-10 validation
- ISBN-13 validation
- ISBN-10 to ISBN-13 conversion
- title normalization
- author normalization
- work fingerprint stability
- medium-specific status labels
- old-to-new status migration
- intent migration
- reflection migration deduplication
- recommendation schema validation
- capability routing
- weekly period key generation
- digest idempotency

## 21.2 Provider contract tests

Use recorded fixtures for:

- Open Library search
- Open Library edition -> work
- Open Library author works
- Open Library missing cover
- Google Books ISBN search
- Google Books ambiguous title
- provider timeout
- rate limit
- malformed metadata

Do not make normal CI depend on live third-party APIs.

## 21.3 Detector fixture tests

At minimum:

- JSON-LD book product page
- Open Library work page
- Google Books volume page
- publisher page
- retailer page
- book review article
- list of books
- Wikipedia book page
- page with film and source-book mentions
- page with random ISBN-like number
- dynamic SPA page
- disabled domain

## 21.4 Migration tests

Fixtures:

- empty v3 database
- populated movie/TV v3 database
- records with all legacy note fields
- followed filmmakers
- alerts
- malformed optional fields
- interrupted migration recovery
- re-running migration

## 21.5 End-to-end tests

- install -> onboarding -> enable books
- detect -> add -> quick thought
- open Archive -> continue reflection
- set reading progress -> complete -> rate
- add another edition -> no duplicate
- follow author -> view works
- generate catalog recommendation
- enable dispatch -> simulate alarm -> save digest
- import legacy export
- export v2 -> restore into clean profile

---

# 22. Product analytics without surveillance

The product has no backend. Do not add remote behavioral analytics by default.

Use local diagnostics and optional user-exportable metrics:

- detection candidates found
- successful resolutions
- rejected low-confidence candidates
- provider error counts
- average resolution latency
- archive counts by medium/status
- recommendation saves/rejections
- dispatch success/failure
- migration integrity result

If remote telemetry is ever introduced, it requires a separate product decision, explicit consent, a privacy update, and strict data minimization.

---

# 23. Key product risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Product becomes a generic tracker | Loss of identity | Keep reflection, memory, and personal taste as the center |
| Book metadata creates duplicates | Broken trust and archive clutter | Work/edition separation, redirects, reconciliation |
| Page detector becomes noisy | Users disable extension | Precision thresholds and structured evidence first |
| LLM invents titles or facts | Severe trust failure | Catalog validation and citations |
| Weekly search creates surprise cost | User anger | Explicit opt-in, limits, cost disclosure |
| Private notes leave browser | Privacy failure | Minimal profile modes and explicit controls |
| Refactor breaks movie library | Existing-user damage | Compatibility layer, migration fixtures, staged cleanup |
| Too much poetic copy obscures actions | Usability failure | Plain operational labels, poetic supporting language |
| Books scope explodes into every format | Delivery failure | Clear MVP and non-goals |
| Provider outage blocks capture | Broken core workflow | Provisional manual records and cached catalog |

---

# 24. Decisions the coding agent must not reopen without product review

1. Subsume remains one product.
2. Books are a first-class medium.
3. Book and adaptation are separate works.
4. Book work and edition are separate entities.
5. The user relationship attaches to the work.
6. Reflections are appendable records, not one mutable note blob.
7. Automatic detection never sends full page content to an LLM.
8. Open Library is the default book backbone.
9. Google Books is optional enrichment/fallback.
10. LLM recommendations must resolve to catalog works.
11. Web-aware discovery requires explicit provider capability and user opt-in.
12. Aggregate ratings do not define personal fit.
13. Existing movie/TV data must migrate without loss.
14. No social feed, streaks, or public reviews in the books MVP.
15. The icon is finalized by Harsha (already includes the book). Do not redesign it — only re-export sizes and wire it into the manifest and store kit.

---

# 25. Recommended implementation sequence for the coding agent

Use small, reviewable pull requests.

## PR 1 - Domain types and compatibility

- Add `WorkMedium`, `CatalogWork`, generic status
- Add compatibility conversion helpers
- No storage migration yet
- Exhaustive type tests

## PR 2 - Storage v4 and migration

- Add stores/indexes
- Migrate current media/library/people/alerts
- Add reflections/experiences
- Add integrity report and recovery snapshot
- Preserve old stores

## PR 3 - Generic movie/TV UI and handlers

- Move existing flows onto new concepts
- Keep visible behavior unchanged
- Remove direct dependency on legacy stores

## PR 4 - Open Library provider and ISBN utility

- Provider adapter
- ISBN utilities
- work/edition resolution
- caching, provenance, fixtures

## PR 5 - Book search and manual add

- Global book search
- result grouping
- edition selection
- provisional manual record

## PR 6 - Page detection

- structured data
- ISBN
- adapter registry
- confidence model
- book overlay/hover card

## PR 7 - Book capture and archive

- statuses
- progress
- reflections
- emotional labels
- book cards/detail
- medium filters

## PR 8 - Export/import, settings, onboarding, privacy

- v2 export
- legacy import
- provider setup
- detection preferences
- documentation

## PR 9 - Creators

- author identities
- follow/sync
- creator page
- role variants

## PR 10 - Taste profile and recommendations

- v2 profile
- candidate validation
- catalog-only recommendations
- cross-medium mode
- feedback

## PR 11 - Dispatch and web-aware adapters

- alarms
- capability registry
- citations
- privacy and cost controls
- notifications
- idempotency tests

## PR 12 - Adaptation graph

- relations
- provider/user confirmation
- related-work UI
- no automatic merging

Each PR must include:

- implementation,
- tests,
- migration impact where applicable,
- updated relevant documentation,
- and no unrelated visual redesign.

---

# 26. Suggested updated product copy

## Store short description

> Save films, shows, and books from any page. Capture what stayed with you and discover what fits your taste.

## Store long-description opening

> Subsume is a private sanctuary for films, shows, documentaries, and books that take hold of you. It recognizes works while you browse, lets you save an immediate thought, and helps you return later to build a deeper record of what you watched, read, felt, and remembered.

## Empty Archive

> Nothing has taken hold yet.  
> Save a film, show, or book from any page, or begin with a search.

## Empty Books filter

> No books here yet.  
> When a title catches you, save it before the moment passes.

## First reflection

> What stayed with you?

## Later reflection

> What has changed since you first wrote about it?

## Recommendation framing

> Chosen for your taste, not the crowd's score.

## Dispatch

> A weekly selection shaped by what you have loved, left, and kept thinking about.

---

# 27. Research basis and technical references

The architecture above reflects the following verified constraints and product patterns as of 2026-07-20.

## Book identity and metadata

- International ISBN Agency, "What is an ISBN?"  
  https://www.isbn-international.org/index.php/content/what-isbn/10
- International ISBN Agency, ISBN assignment and edition/format rules  
  https://www.isbn-international.org/node/88
- Open Library developer APIs  
  https://openlibrary.org/developers/api
- Open Library Search API  
  https://openlibrary.org/dev/docs/api/search
- Open Library Covers API  
  https://openlibrary.org/dev/docs/api/covers
- Google Books API usage and identification requirements  
  https://developers.google.com/books/docs/v1/using
- Google Books Volume resource  
  https://developers.google.com/books/docs/v1/reference/volumes
- Schema.org Book  
  https://schema.org/Book
- Schema.org ISBN  
  https://schema.org/isbn

## Browser scheduling and notifications

- Chrome Extensions `chrome.alarms`  
  https://developer.chrome.com/docs/extensions/reference/api/alarms
- Chrome Extensions `chrome.notifications`  
  https://developer.chrome.com/docs/extensions/reference/api/notifications

## Search-capable LLM adapters

- OpenAI API quickstart and web-search tool  
  https://platform.openai.com/docs/quickstart
- Anthropic API pricing and web-search tool behavior  
  https://docs.anthropic.com/en/docs/about-claude/pricing
- Gemini API grounding with Google Search  
  https://ai.google.dev/gemini-api/docs/google-search

## Product landscape

- Goodreads product overview  
  https://www.goodreads.com/about/us
- The StoryGraph product overview  
  https://thestorygraph.com/
- LibraryThing product overview  
  https://www.librarything.com/

These sources inform implementation constraints, not a requirement to imitate their products.

---

# 28. Final product principle

Subsume should not expand from "a movie tracker" into "a tracker for more things."

It should deepen into a product about the private relationship between a person and the works that enter their inner life.

The book expansion is successful when:

- a book found on an ordinary web page can be recognized and saved,
- the first thought is preserved,
- later reflections accumulate rather than replace it,
- editions do not fragment the archive,
- adaptations remain distinct but meaningfully connected,
- and recommendations feel like they understand the user's own history rather than repeating the internet's consensus.

That is the product to build.

---

*End of specification.*
</user_query>