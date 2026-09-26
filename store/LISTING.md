# Chrome Web Store — Listing Copy (Subsume)

Paste-ready fields for the Chrome Web Store Developer Dashboard. Keep tone calm and accurate; do not claim features that require API keys the user has not configured.

**Language:** English  
**Suggested category:** Productivity *(primary)* — or **Social & Communication / Fun** if that better matches the current CWS taxonomy for entertainment companions.

---

## Short description

≤132 characters (count carefully before paste). Canonical plain-English pitch (Task 3 / productCopy `PLAIN_ENGLISH_PITCH`):

```
Private movie & book journal for Chrome. Save what stayed with you while you browse.
```

Character count: 87.

Alternate (if you prefer feature-forward wording):

```
Save films, shows, and books from any page. Capture what stayed with you and discover what fits your taste.
```

---

## Detailed description

```
Subsume is a private movie and book journal for Chrome. Free core forever on this device. Optional paid private backup later. Never sells your data.

Subsume is a private sanctuary for films, shows, and books in your browser—not a social feed, not an ad surface.

While you browse, Subsume can quietly notice posters, titles, and books (including ISBNs on the page), and offer a restrained plaque or hover card so you can reflect without leaving the page. When something stays with you, capture it with notes, emotional ratings, and living intents (memory, revisit, wishlist). Your archive is organized like a hardcover catalogue, not a spreadsheet of algorithmic scores.

What you can do
• Discover films, shows, and books on the web pages you already visit, with optional domain blacklist
• Save a personal library with notes and emotional scales
• Follow people—directors, cast, crew, authors—and explore their body of work
• Resolve books via Open Library by default (no key); optional Google Books key for enrichment
• Optionally request AI recommendations using your own OpenAI, Anthropic, or Gemini API keys
• Optionally save a manual backup snapshot of your library to your own Google Drive appData folder, and restore it later (no automatic or live sync)
• Export your library; uninstall removes local extension data

How it works (honestly)
Subsume is client-side only. There is no Subsume backend that stores your taste profile. Your library and settings live in IndexedDB and chrome.storage.local on your device. The API keys you paste in Settings and the Google Drive access token are encrypted with AES-GCM using a per-install key kept in the same browser profile: that guards against casual inspection of storage, not against someone using your unlocked profile or malicious code inside the extension. Your notes, ratings, and reflections are not encrypted, and neither is a Drive backup file (it is protected only by your Google account). Optional API keys never go to content scripts; network calls to metadata and AI providers use the background service worker. Book resolution may send titles, authors, or ISBNs to Open Library (not full page HTML). A local diagnostic log (secrets redacted, page origins only) stays on your device and is never sent anywhere. Settings also shows a “coming soon” row for a possible future paid backup; today it is only a local “notify me” checkbox that stores a yes/no flag on your device, with no email, account, or network call.

Permissions in plain language
• Storage — keep your library and preferences on this device
• Active tab — interact with the page when you use the extension UI
• Notifications — optional digests or alerts you enable
• Alarms — schedule those digests
• Identity — optional Google sign-in for Drive backup and restore
• Host access — TMDb, Open Library, optional OMDb/Google Books/LLM providers, Trakt, TVMaze, Wikidata/Wikipedia, Google APIs
• Content scripts on http/https — poster, title, and book detection; disable per domain in Settings

Attribution
This product uses the TMDb API but is not endorsed or certified by TMDb. Book metadata may come from Open Library; Subsume is not affiliated with the Internet Archive or Open Library.

Privacy
No ads. No analytics SDKs. No selling your data. Full policy:
https://harshabala.github.io/Subsume/privacy.html

Developer contact: harsha16balakrishnan@proton.me
```

---

## Single purpose statement

One sentence (CWS “single purpose”):

```
Subsume helps users keep a private library of films, shows, and books—capturing titles discovered while browsing, with notes, ratings, and optional AI recommendations (using the user’s own API key) and manual Google Drive backup—without a Subsume cloud backend.
```

---

## Permission justifications (dashboard / review notes)

Copy into justification fields as needed. Full matrix: `store/PERMISSIONS.md`.

### storage

Stores the user’s personal media library, preferences, optional API keys (encrypted with a per-install key), diagnostic logs, and related state in IndexedDB and `chrome.storage.local` on the device. Required for a local-first library with no Subsume server.

### activeTab

Allows the extension UI and user-initiated flows to work with the currently active tab when the user opens Subsume or triggers capture-related UI, without requesting broad tabs permission.

### notifications

Shows optional Chrome notifications for digests, alerts, or user-configured reminders about titles and library activity the user has enabled.

### alarms

Schedules periodic background work such as weekly digests and other time-based checks using `chrome.alarms`, so features do not need a persistent open page.

### identity

Used solely for optional Google OAuth via `chrome.identity` (e.g. `launchWebAuthFlow`) so the user can connect Google Drive appData backup/restore (manual snapshot, not live sync). Not used for Subsume accounts (there are none).

### host_permissions

| Host pattern | Justification |
| :--- | :--- |
| `https://api.themoviedb.org/*` | TMDb API for film/TV metadata, search, people, posters. |
| `https://www.omdbapi.com/*` | Optional OMDb metadata when the user supplies an OMDb API key. |
| `https://openlibrary.org/*` | Open Library book search, work/edition resolution (titles, authors, ISBNs—not full page HTML). |
| `https://covers.openlibrary.org/*` | Open Library cover images for books. |
| `https://www.googleapis.com/books/*` | Optional Google Books API when the user supplies a Books API key. (Also covered by the broader `www.googleapis.com/*` entry below.) |
| `https://api.openai.com/*` | Optional OpenAI API calls with the user’s key for recommendations/digests. |
| `https://api.anthropic.com/*` | Optional Anthropic API calls with the user’s key. |
| `https://generativelanguage.googleapis.com/*` | Optional Google Gemini API calls with the user’s key. |
| `https://api.trakt.tv/*` | Trakt API for media metadata/discovery used by the extension. |
| `https://api.tvmaze.com/*` | TVMaze API for television metadata. |
| `https://query.wikidata.org/*` | Wikidata SPARQL/API queries for structured metadata. |
| `https://en.wikipedia.org/*` | Wikipedia content used to enrich title/person context. |
| `https://www.googleapis.com/*` | Google APIs for OAuth userinfo and Drive appData backup/restore when connected, and the Google Books API. |

### content_scripts (all http/https URLs)

Content scripts match `http://*/*` and `https://*/*` so poster, title, and book detection works on any site the user browses (streaming catalogues, reviews, retailers, articles, etc.). Scripts inject isolated UI (Shadow DOM plaques/cards/dock). Users can blacklist domains and toggle book/screen detection in Settings. API keys are never exposed to content scripts; message surface to the background is allowlisted. Broad matches are required for cross-site discovery; they are not used for advertising or unrelated scraping.

---

## Privacy practices answers (CWS questionnaire guidance)

Use the live Chrome Web Store “Privacy practices” form; map answers as follows. Adjust if Google renames fields.

| Question / topic | Recommended answer |
| :--- | :--- |
| **Single purpose** | See statement above. |
| **Does the extension collect user data?** | Yes, **on the user’s device** (library, notes, preferences, optional keys). No Subsume server collection. Disclose personal media library content, preferences, and optional authentication for Drive. |
| **Personally identifiable information** | Optional Google account email/identity tokens only if the user connects Drive (via Google OAuth). No Subsume account email required for core use. |
| **Health / financial / authentication** | Authentication: only optional Google OAuth for Drive—not a Subsume password system. Do not claim health/financial collection. |
| **Personal communications** | Notes/reflections the user writes about films, TV, and books (user-generated content stored locally / optional manual Drive backup, unencrypted apart from Google’s own protections). |
| **Location / web history** | Content scripts observe page content for media detection on pages the user visits; this is not a general browsing-history product. Be accurate: disclose website content access for the declared purpose. |
| **User activity** | Local library actions and a local diagnostic log (secrets redacted, page origins only, never transmitted); no third-party analytics SDK. |
| **Remote code** | **No.** All extension code is packaged in the store zip; no remote code execution. |
| **Data sold to third parties** | **No.** |
| **Data used for purposes unrelated to the single purpose** | **No.** |
| **Data used for creditworthiness / lending** | **No.** |
| **Transfer of data** | Optional: user-configured third-party APIs (TMDb, OMDb, Open Library, Google Books, LLMs, Trakt, TVMaze, Wikidata/Wikipedia) and optional Google Drive. Not sold. |
| **Privacy policy URL** | `https://harshabala.github.io/Subsume/privacy.html` (or your hosted `docs/privacy.html`). |
| **Certification** | Certify that disclosures match the extension’s actual behavior. |

**Remote code clarification:** LLM APIs return model text responses consumed as data, not executable extension code. Do not load remote scripts into the extension.

---

## Store assets (quick reference)

| Asset | Requirement |
| :--- | :--- |
| Icon | 128×128 PNG (package already includes `icon128.png`) |
| Screenshots | 1280×800 or 640×400; show library, capture, and on-page plaque if possible |
| Privacy policy URL | Required for CWS; host `docs/privacy.html` |
| Support email | harsha16balakrishnan@proton.me |

---

## Category & distribution notes

- **Category:** Prefer **Productivity** for a personal library/tool framing; **Fun** or entertainment-adjacent categories only if they still fit a single-purpose media journal.
- **Regions / pricing:** Free; no in-extension payments claimed here.
- **Mature content:** Not intended as adult content; content scripts may run on any site the user visits—blacklist available.

---

*Listing copy for Subsume · English · Version 0.3.0. Re-check against `manifest.json` permissions before each upload.*
