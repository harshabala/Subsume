# Manifest notes for Chrome Web Store review

This document explains permission choices in `manifest.json` so store reviewers (and maintainers) understand why each is required. Do not remove the `key` field or narrow `content_scripts` matches without a product redesign.

## `key` (stable extension ID)

The public key in `manifest.json` pins the extension ID to `ehbkfdgpbemaimepgeeflenhbbpgokoj`. That ID is required for Google OAuth redirect URIs (`https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/`). Removing or regenerating the key breaks Drive sign-in for existing installs and Google Cloud OAuth client config.

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
| `www.googleapis.com` | Google Drive appData backup API |

Users supply their own API keys where required; hosts are not scraped via content scripts.

## Other permissions

- **storage** — local journal, settings, prefs
- **activeTab** — user-gesture access to the current tab when needed
- **notifications** — optional alerts (releases, digests)
- **alarms** — scheduled digest / background refresh

## Store listing alignment

- **Short description** (manifest `description`, ≤132 chars): private film journal; capture, follow filmmakers, discover while browsing.
- **Version** for first public store candidate: **0.2.0** (kept in sync with `package.json`).
