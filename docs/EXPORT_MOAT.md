# Export is complete. Re-import elsewhere is the cost.

**Decision:** Subsume never withholds or degrades export. The library is yours. The moat is that a competitor’s importer has to reconstruct how we *linked* your data — not that we hide the file.

## What export includes

`EXPORT_LIBRARY` writes `SubsumeExportV2` JSON (`schemaVersion: 2`) from IndexedDB. It never includes preferences or API keys.

| Payload | Why it is expensive to rebuild elsewhere |
| --- | --- |
| `library` / `media` | Ratings, sanctuary intents, notes, timestamps of first save |
| `reflections` / `experiences` | Prose tied to a specific work and moment — the actual journal |
| `weeklyDigest` | Weekly-selection history generated on this device |
| `relationships` | Living intent + status on the multi-medium catalog |
| `workRelations` | Cross-medium links (film ↔ book adaptation, companion, remake) |
| `works` / `bookEditions` / `creators` | Catalog identity Subsume resolved while you browsed |
| `alerts` | Watch/book alerts you configured |

Activation counters (`subsume_activation_metrics` in `chrome.storage.local`) stay on-device and are **not** in the JSON. They are builder diagnostics, not journal content.

## What a competitor importer must reverse-engineer

1. **Cross-medium `workRelations`** — `adaptation_of` / `adapted_as` / `companion_to` between a film id and a book work id. Letterboxd and Goodreads do not share this graph.
2. **Reflection timestamps vs detection events** — `reflections[].createdAt` is when *you* wrote, not when a catalog API first saw the title.
3. **Weekly selection history** — `weeklyDigest.items` plus period keys. That is a local ritual, not a social graph.
4. **Sanctuary intents** — `keep_memory` / `revisit_this_month` / `wishlist` are not Letterboxd watch/watched.

Export remains lossless for journal data. The switching cost is reconstruction of those links, not a lock.

## What we will not do

- Gate export behind a paywall
- Strip notes, ratings, or relations from the file
- Ship a fake “premium restore” that re-imports only on our servers
