# Subsume v0.3.0 — Books as a first-class medium (Phase 0–1 foundation)

Multi-medium expansion begins: **films, shows, and books** in one private sanctuary.

## Delivered

### Domain foundation (Phase 0)
- `CatalogWork`, `LibraryRelationship`, `Creator`, `Experience`, `Reflection`, book editions
- Compatibility converters from legacy `MediaItem` / `LibraryItem` / `PersonItem`
- Medium-aware status labels (Want to read / Reading / Read / Did not finish)
- Shared emotional keys with book-specific display language
- IndexedDB **v4** stores + idempotent migration (old stores preserved)
- Dual-write so movie/TV flows keep working

### Books MVP (Phase 1 foundation)
- **Open Library** provider (search, ISBN → edition → work, covers, provenance)
- **ISBN** validation, conversion, extraction
- **Page detection**: JSON-LD Book, ISBN+context, domain adapters, title/author heuristics
- **Archive filters**: All | Screen | Books
- **Search**: Books chip + Open Library results
- Message types: `SEARCH_WORKS`, `RESOLVE_PAGE_CANDIDATE`, `ADD_TO_ARCHIVE`, etc.
- Content prefs: `detectBooks`, `detectScreenWorks`, `coverOverlaysEnabled`
- Manifest hosts: `openlibrary.org`, covers CDN
- Defaults: movies, TV, and books **enabled**

### Docs
- `docs/SUBSUME_BOOKS_EXPANSION_INSTRUCTIONS.md` — full target contract
- `docs/SUBSUME_BOOKS_EXPANSION_FULL_PACKAGE.md` — complete package with as-is IA

## Not yet (later phases)
- Full reflection timeline UI / reread flows
- Author follow + creator sync
- Taste profile v2 + book recommendations + weekly dispatch
- Adaptation graph UI
- Google Books optional enrichment
- Goodreads/StoryGraph import
- Complete edition reconciliation UI

## Tests
ISBN, Open Library fixtures, book detection, migration v4, status labels, plus existing suite.

```bash
npm ci && npm run ci
```

## Install

```bash
npm run build
# Load unpacked → dist/
```

## Follow-up tranche (same release train)

- Appendable **ReflectionTimeline** in DetailModal; SET_USER_NOTES dual-writes reflections
- Abandon prompts for “Did not finish”
- Book **page plaques** (high-confidence only, max 5 resolves)
- **Google Books** optional provider + Settings key
- **Export/import v2** multi-medium (no API keys)
- Open Library **author** search/follow
- Reading **progress** (page/total) for books
- Taste profile **screen vs reading** split in LLM prompts
- Archive collection labels medium-aware
- Privacy, listing, README, onboarding, settings for multi-medium
