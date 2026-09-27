# Manifest notes for Chrome Web Store review

This document explains permission choices in `manifest.json` so store reviewers (and maintainers) understand why each is required. Do not narrow `content_scripts` matches without a product redesign.

## `key` (stable extension ID)

The public key in the repo `manifest.json` pins the **unpacked development** extension ID to `ehbkfdgpbemaimepgeeflenhbbpgokoj`, which the Drive OAuth redirect URI (`https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/`) depends on during development.

The **store package does not contain `key`**: `scripts/package-extension.mjs` strips it, because the Chrome Web Store rejects a new item whose manifest carries `key` and assigns its own ID. The store-installed extension therefore has a different ID and a different redirect URI (`https://<store-id>.chromiumapp.org/`). After the first upload:

1. Copy the item ID from the Developer Dashboard and add `https://<store-id>.chromiumapp.org/` as an authorised redirect URI on the Google Cloud Web OAuth client (keep the dev URI too).
2. Optionally copy the dashboard's public key into `manifest.json` `key` so unpacked builds share the store ID; later uploads then use `SUBSUME_KEEP_KEY=1 npm run package`.

## `identity`

Used for optional Google Drive backup via `chrome.identity.launchWebAuthFlow` and `chrome.identity.getRedirectURL()`. Subsume does not use `getAuthToken` or a manifest `oauth2` block. See `docs/GOOGLE_DRIVE_SETUP.md`.

## `content_scripts` matches (`http://*/*`, `https://*/*`)

The product injects a lightweight journal dock and title detection while the user browses film-related sites, streaming catalogs, and general web pages where titles appear. Matches cannot be limited to a fixed host list without breaking discovery on arbitrary sites. Scripts run at `document_idle` and only surface UI when relevant content is detected.

Equivalent intent to broad matching: the user is journaling cinema wherever they encounter it, not only on one platform.

## `host_permissions`

Each host is called from the extension origin (service worker / options page) for user-initiated features:

| Host | Purpose |
|------|---------|
| `api.themoviedb.org` | Title metadata, posters, credits, providers |
| `www.omdbapi.com` | Optional OMDb metadata |
| `api.trakt.tv` | Optional Trakt recommendations / trending |
| `api.tvmaze.com` | TV episode / show metadata |
| `query.wikidata.org`, `en.wikipedia.org` | People / context enrichment |
| `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com` | Optional user-supplied AI keys for recommendations |
| `openlibrary.org` | Default book catalogue (search, works, editions, authors) |
| `www.googleapis.com` | Google Drive appData snapshot backup/restore, OAuth userinfo, optional Google Books API |

Users supply their own API keys where required; hosts are not scraped via content scripts.

## Other permissions

- **storage** — local journal, settings, prefs
- **activeTab** — user-gesture access to the current tab when needed
- **notifications** — optional alerts (releases, digests)
- **alarms** — scheduled digest / background refresh

## Store listing alignment

- **Short description** (manifest `description`, ≤132 chars): private film journal; capture, follow filmmakers, discover while browsing.
- **Version** for first public store candidate: **0.3.0** (kept in sync with `package.json`; enforced by `tests/releaseDocs.test.ts`).
