# Chrome Web Store — Listing Copy (Subsume)

Paste-ready fields for the Chrome Web Store Developer Dashboard. Keep tone calm and accurate; do not claim features that require API keys the user has not configured.

**Language:** English  
**Suggested category:** Productivity *(primary)* — or **Social & Communication / Fun** if that better matches the current CWS taxonomy for entertainment companions.

---

## Short description

≤132 characters (count carefully before paste):

```
Private film & TV sanctuary: capture what you watch while browsing, notes & ratings, optional AI taste—data stays on your device.
```

Character count: 128.

Alternate (if you prefer metadata-first wording):

```
Track films & shows you discover while browsing. Personal library, notes, ratings; optional AI. Client-side—no Subsume cloud.
```

---

## Detailed description

```
Subsume is a private cinematic sanctuary in your browser—not a social feed, not an ad surface.

While you browse, Subsume can quietly notice film and TV posters and titles, and offer a restrained plaque or hover card so you can reflect without leaving the page. When something stays with you, capture it with notes, emotional ratings, and living intents (memory, revisit, wishlist). Your archive is organized like a hardcover catalogue, not a spreadsheet of algorithmic scores.

What you can do
• Discover titles on the web pages you already visit, with optional domain blacklist
• Save a personal library of films and TV with notes and emotional scales
• Follow people—directors, cast, crew—and explore filmography-style context
• Optionally request AI recommendations using your own OpenAI, Anthropic, or Gemini API keys
• Optionally back up library data to Google Drive appData (you connect; you disconnect)
• Export your library; uninstall removes local extension data

How it works (honestly)
Subsume is client-side only. There is no Subsume backend that stores your taste profile. Your library and settings live in IndexedDB and chrome.storage.local on your device. Local data is not encrypted at rest—treat your browser profile as trusted. Optional API keys you paste in Settings never go to content scripts; network calls to metadata and AI providers use the background service worker.

Permissions in plain language
• Storage — keep your library and preferences on this device
• Active tab — interact with the page when you use the extension UI
• Notifications — optional digests or alerts you enable
• Alarms — schedule those digests
• Identity — optional Google sign-in for Drive backup
• Host access — TMDb, optional OMDb/LLM providers, Trakt, TVMaze, Wikidata/Wikipedia, Google APIs
• Content scripts on http/https — poster and title detection; disable per domain in Settings

Attribution
This product uses the TMDb API but is not endorsed or certified by TMDb.

Privacy
No ads. No analytics SDKs. No selling your data. Full policy:
https://harshabala.github.io/Subsume/privacy.html

Developer contact: harsha16balakrishnan@proton.me
```

---

## Single purpose statement

One sentence (CWS “single purpose”):

```
Subsume helps users keep a private film and TV library—capturing titles discovered while browsing, with notes, ratings, and optional on-device AI and Drive backup—without a Subsume cloud backend.
```

---

## Permission justifications (dashboard / review notes)

Copy into justification fields as needed. Full matrix: `store/PERMISSIONS.md`.

### storage

Stores the user’s personal media library, preferences, optional API keys, diagnostic logs, and related state in IndexedDB and `chrome.storage.local` on the device. Required for a local-first library with no Subsume server.

### activeTab

Allows the extension UI and user-initiated flows to work with the currently active tab when the user opens Subsume or triggers capture-related UI, without requesting broad tabs permission.

### notifications

Shows optional Chrome notifications for digests, alerts, or user-configured reminders about titles and library activity the user has enabled.

### alarms

Schedules periodic background work such as weekly digests and other time-based checks using `chrome.alarms`, so features do not need a persistent open page.

### identity

Used solely for optional Google OAuth via `chrome.identity` (e.g. `launchWebAuthFlow`) so the user can connect Google Drive appData backup/restore. Not used for Subsume accounts (there are none).

### host_permissions

| Host pattern | Justification |
| :--- | :--- |
| `https://api.themoviedb.org/*` | TMDb API for film/TV metadata, search, people, posters. |
| `https://www.omdbapi.com/*` | Optional OMDb metadata when the user supplies an OMDb API key. |
| `https://api.openai.com/*` | Optional OpenAI API calls with the user’s key for recommendations/digests. |
| `https://api.anthropic.com/*` | Optional Anthropic API calls with the user’s key. |
| `https://generativelanguage.googleapis.com/*` | Optional Google Gemini API calls with the user’s key. |
| `https://api.trakt.tv/*` | Trakt API for media metadata/discovery used by the extension. |
| `https://api.tvmaze.com/*` | TVMaze API for television metadata. |
| `https://query.wikidata.org/*` | Wikidata SPARQL/API queries for structured metadata. |
| `https://en.wikipedia.org/*` | Wikipedia content used to enrich title/person context. |
| `https://www.googleapis.com/*` | Google APIs for OAuth userinfo and Drive appData backup when connected. |

### content_scripts (all http/https URLs)

Content scripts match `http://*/*` and `https://*/*` so poster and title detection works on any site the user browses (streaming catalogues, reviews, articles, etc.). Scripts inject isolated UI (Shadow DOM plaques/cards/dock). Users can blacklist domains in Settings. API keys are never exposed to content scripts; message surface to the background is allowlisted. Broad matches are required for cross-site discovery; they are not used for advertising or unrelated scraping.

---

## Privacy practices answers (CWS questionnaire guidance)

Use the live Chrome Web Store “Privacy practices” form; map answers as follows. Adjust if Google renames fields.

| Question / topic | Recommended answer |
| :--- | :--- |
| **Single purpose** | See statement above. |
| **Does the extension collect user data?** | Yes, **on the user’s device** (library, notes, preferences, optional keys). No Subsume server collection. Disclose personal media library content, preferences, and optional authentication for Drive. |
| **Personally identifiable information** | Optional Google account email/identity tokens only if the user connects Drive (via Google OAuth). No Subsume account email required for core use. |
| **Health / financial / authentication** | Authentication: only optional Google OAuth for Drive—not a Subsume password system. Do not claim health/financial collection. |
| **Personal communications** | Notes/reflections the user writes about films/TV (user-generated content stored locally / optional Drive). |
| **Location / web history** | Content scripts observe page content for media detection on pages the user visits; this is not a general browsing-history product. Be accurate: disclose website content access for the declared purpose. |
| **User activity** | Local library actions and optional diagnostics on device; no third-party analytics SDK. |
| **Remote code** | **No.** All extension code is packaged in the store zip; no remote code execution. |
| **Data sold to third parties** | **No.** |
| **Data used for purposes unrelated to the single purpose** | **No.** |
| **Data used for creditworthiness / lending** | **No.** |
| **Transfer of data** | Optional: user-configured third-party APIs (TMDb, OMDb, LLMs, Trakt, TVMaze, Wikidata/Wikipedia) and optional Google Drive. Not sold. |
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

*Listing copy for Subsume · English · Align with manifest v0.1.x permissions before each upload.*
