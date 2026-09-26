# Privacy Policy for Subsume

**Effective date:** July 1, 2026 · **Last updated:** September 26, 2026

This privacy policy describes how **Subsume**, a Chrome browser extension developed by **Harsha Balakrishnan** (“we,” “us,” or “the developer”), handles information when you install and use the extension.

Subsume is a private multi-medium sanctuary: a client-side tool for tracking films, television, and books you care about, recording notes and emotional ratings, and optionally enriching metadata or recommendations through third-party services you choose. There is **no Subsume backend server**. Your library lives on your device unless you explicitly enable optional cloud backup.

---

## Contact

For privacy questions or requests, contact:

**Harsha Balakrishnan**  
Email: [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)

---

## Summary

| Topic | Practice |
| :--- | :--- |
| Subsume servers | None. The extension does not operate a Subsume backend or account system. |
| Where your library lives | On your device (IndexedDB and `chrome.storage.local`), unless you enable optional Google Drive appData backup. |
| Selling data | We do not sell personal data. |
| Advertising | No ads; no advertising SDKs. |
| Analytics | No third-party analytics SDKs. |
| Encryption at rest | API keys you enter and the Google Drive access token are **encrypted with AES-GCM** using a per-install key stored in the same browser profile (see “How data is stored”). This is a limited safeguard, not full protection. Your notes, ratings, reflections, and the rest of your library are **not** encrypted by Subsume. Protect access to your browser profile and device. |

---

## Information the extension processes

Subsume processes data **on your device** and, when you enable features that require it, sends limited requests to third-party APIs. Categories include:

### Personal media library

Titles you save (films, TV shows, and books), status (for example watched, wishlist, reading progress, or sanctuary intents), ratings, emotional scales, free-text notes and reflections, people you follow (directors, cast, crew, authors), alerts, and related preferences.

### Preferences and settings

Feature toggles, theme choices, disabled domains (content-script blacklist), platform/streaming preferences, digest settings, and similar configuration stored locally.

### Optional API keys

If you supply them in Settings, Subsume stores keys you provide for services such as TMDb, OMDb, optional Google Books, and large language model providers (OpenAI, Anthropic, and/or Google Gemini). These keys are stored in your device’s IndexedDB as part of user preferences. Before being written, each key is encrypted with WebCrypto AES-GCM using a random per-install key that Subsume keeps in `chrome.storage.local` **in the same browser profile**. This helps against casual inspection of stored data and against other extensions or sync tooling reading raw values. It does **not** protect against someone who can use your unlocked browser profile or device, or against malicious code running inside the extension itself, because the key needed to decrypt sits alongside the data. Keys are decrypted in the background context only when needed to call the providers you configure.

**API keys are never sent to content scripts.** Content scripts receive feature toggles and limited library lookup results only, not credentials.

### Optional Google Drive backup

If you connect Google Drive, Subsume may back up library-related data to Google Drive **appData** (application-specific storage associated with the extension’s OAuth client). Connection uses Chrome’s identity / OAuth flow. Backup is a **manual snapshot**: it runs only when you press Backup or Restore in Settings. There is no automatic or continuous sync, and Subsume does not merge changes between devices. The snapshot is the same JSON export described under “Your controls” (it excludes API keys), uploaded to a single file in your Drive appData folder, and it contains your notes, ratings, and reflections in **unencrypted** form; it is protected only by your Google account. Sign-in uses Google’s OAuth implicit grant via `chrome.identity`; the resulting short-lived access token is stored on your device encrypted with the same per-install AES-GCM scheme described above (with the same limits). If Google returns your account email, Subsume also stores it locally to show “Connected as…”. Subsume does not currently have an in-app “disconnect” button: the access token is short-lived (about an hour), stops working when it expires, and is replaced when you reconnect; uninstalling removes it and the stored email from your device. You can revoke Subsume’s access at any time in your Google Account’s third-party access settings. Drive is optional; the extension works without it.

### Page context for discovery (content scripts)

To detect posters, titles, and books while you browse, content scripts may run on **http** and **https** pages. They inspect page content for media titles, poster or cover images, structured book data, and ISBNs so Subsume can show quiet overlays (for example rating plaques or hover cards). You can turn book or screen detection off in **Settings → Books & detection**, and disable Subsume on specific domains via **Settings → Disabled Domains**. Uninstalling the extension removes the scripts entirely.

When a book candidate is found, the extension may send **titles, authors, and/or ISBNs** to Open Library (and optionally Google Books if you supply a key) for resolution. **Full page HTML is not sent** to those providers—only the identifiers needed to match a work or edition.

Content scripts do not receive your API keys. Sensitive library export and settings operations are restricted to the extension UI and background service worker, not arbitrary page scripts.

---

## How data is stored

| Location | What is stored |
| :--- | :--- |
| **IndexedDB** (on your device) | Media records, library entries, people, caches, preferences (optional API keys are stored AES-GCM encrypted), and related sanctuary data. |
| **`chrome.storage.local`** (on your device) | Small state, diagnostic logs (see below), page-reflection dock notes keyed by page path, the per-install encryption key, the encrypted Drive access token, and the connected Google account email if any. |
| **Google Drive appData** (optional) | Backup of library data when you connect and use Drive backup/restore. |

**What is and is not encrypted.** Only the API keys (TMDb, OMDb, LLM primary and secondary, Google Books) and the Google Drive access token are encrypted by Subsume, with AES-GCM and a per-install key held in the same profile. Everything else, including your library, notes, ratings, reflections, and preferences other than those keys, is stored **unencrypted** in IndexedDB and `chrome.storage.local`. Anyone with access to your user account, unlocked device, or Chrome profile may be able to read that data, and may be able to recover the API keys as well. Use device encryption, a strong OS login, and browser profile hygiene as appropriate for your risk tolerance.

### Diagnostic logs

Subsume keeps a local diagnostic log (up to 500 entries) in `chrome.storage.local` to help troubleshoot problems. Entries contain a timestamp, severity, source, and a short message or detail. Before saving, Subsume redacts recognizable secrets (API-key patterns, bearer tokens, JWTs, secret-like query parameters, encrypted-key blobs) and masks email addresses; where Subsume records a web page address for diagnostics it records the origin (scheme and host) only, not the full path or query. Redaction is pattern-based and best-effort. Diagnostic logs are **never transmitted** by Subsume to the developer or any third party; they leave your device only if you copy them out yourself.

When you uninstall Subsume, Chrome removes the extension’s local storage. Optional Drive appData may remain in your Google account until you delete it through Google’s tools.

---

## Network requests and third parties

Subsume does not send your library to a Subsume-operated server. Network traffic goes only to services you use (or that the extension is built to query for public metadata), including:

| Service | Purpose |
| :--- | :--- |
| **[TMDb](https://www.themoviedb.org/)** (The Movie Database) | Film/TV metadata, posters, people, search, and related catalogue data. Requires your TMDb API key when configured. |
| **OMDb** (optional) | Supplemental title metadata when you provide an OMDb API key. |
| **[Open Library](https://openlibrary.org/)** | Default book catalogue: search, work/edition resolution, covers. No user API key required. May receive ISBNs, titles, and authors for lookups—not full page HTML. |
| **Google Books** (optional) | Optional book enrichment (covers, descriptions, recent titles) when you provide a Google Books API key. Lookups use the same limited identifiers (ISBN/title/author), not full page HTML. |
| **OpenAI / Anthropic / Google Gemini** (optional) | AI recommendations or digests using **your** API keys, from the background service worker. Prompt material may include short excerpts of your notes and taste profile built from your local library—not arbitrary full page DOM dumps. |
| **Trakt** | Trending/discovery and media metadata (title or search queries) using the extension’s Trakt application key; no Trakt account or login. |
| **TVMaze** | Television metadata (show and title queries). |
| **Wikidata / Wikipedia** | Structured and encyclopedic metadata for titles or people (SPARQL queries and page summaries by name). |
| **Google APIs / Google sign-in** | Google OAuth sign-in, account email lookup, and Drive appData backup/restore when you connect Drive; Google Books API when a Books key is configured. |
| **Image hosts** (`image.tmdb.org`, `covers.openlibrary.org`) | Poster, cover, and author-photo images are loaded from these hosts for display, including inside the small overlays Subsume draws on pages you visit. Those hosts can see your IP address and the image requested. |

Each third party processes requests under **its own** privacy policy and terms. Subsume does not control those services. Review their policies before enabling optional integrations or providing API keys.

This product uses the TMDb API but is not endorsed or certified by TMDb. Book data may come from Open Library; Subsume is not affiliated with the Internet Archive or Open Library.

---

## What we do not do

- We do **not** sell your personal data.
- We do **not** show advertisements in the extension.
- We do **not** embed third-party analytics, advertising, or tracking SDKs.
- We do **not** operate a Subsume cloud account that aggregates all users’ libraries.
- We do **not** send API keys to content scripts or to host pages.

Diagnostic logging stays in local extension storage (with best-effort secret redaction, as described above) and is never sent anywhere by Subsume.

---

## Your controls

You can:

1. **Export** your library from the extension. Export payloads are multi-medium (media, library, works, editions, relationships) and are **designed to exclude API keys and preference secrets** — never include TMDb, OMDb, Google Books, or LLM keys.
2. **Import Goodreads CSV** (optional): if you use Settings → Import Goodreads CSV, the file is parsed **on your device** to seed archive rows. The CSV is **not** sent to an LLM or to a Subsume server. This is a one-shot import, not continuous Goodreads sync.
3. **Disable domains** so content scripts do not run their discovery UI on sites you blacklist.
4. **Stop using Google Drive backup** by not pressing Backup/Restore, and revoke Subsume’s access in your Google Account settings. Uninstalling removes the stored token and email from your device. Deleting the backup file itself is done through your Google account’s app-data management.
5. **Clear or change API keys** in Settings; stop using optional LLM, OMDb, or Google Books features at any time. Turn off book detection or Open Library under **Books & detection**.
6. **Uninstall** the extension to remove it and its local Chrome extension data from the browser.
7. **Backup-waitlist toggle:** Settings shows a “coming soon” row for a possible future paid encrypted backup. Ticking “Notify me on this device” only saves a yes/no flag and timestamp in your local preferences. No email or account is collected, and nothing is sent over the network. No such product exists today.
8. **Contact** the developer at the email above with privacy questions.

---

## Permissions (plain language)

Chrome may show that Subsume requests permissions such as:

- **Storage** — save your library and settings on the device.
- **Active tab** — work with the page you are viewing when you use extension UI.
- **Notifications** — optional digests or alerts you enable.
- **Alarms** — schedule periodic tasks such as digests.
- **Identity** — sign in to Google for optional Drive backup.
- **Host access** — call the metadata, AI, and Google endpoints listed above (TMDb, OMDb, Open Library, Trakt, TVMaze, Wikidata, Wikipedia, Google Books/Google APIs, OpenAI, Anthropic, Google Gemini).
- **Content scripts on web pages** — detect titles, posters, covers, and book identifiers for discovery overlays; controllable via detection toggles and domain blacklist.

Detailed justifications for Chrome Web Store review are maintained in the project’s store documentation.

---

## Children’s privacy

Subsume is **not directed at children under 13**. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided personal information through the extension in a way that concerns you, contact us at the email above and we will take reasonable steps to address the issue.

---

## Data retention

- **On device:** Data remains until you delete it within the extension, clear site/extension data, or uninstall.
- **Drive appData (optional):** Retained in your Google account under Google’s policies until you delete it (for example by revoking Subsume’s access and deleting its app data in your Google Account).
- **Third-party APIs:** Retention of request logs is governed by those providers, not by Subsume.

---

## International use

Processing occurs on your device and, when features are used, via third-party services that may operate in various countries. By using Subsume, you understand that optional API and Drive traffic may cross borders according to those providers’ infrastructure.

---

## Changes to this policy

We may update this privacy policy when the extension’s practices change. The **effective date** at the top will be revised. Material changes should be reflected in the policy hosted for the Chrome Web Store listing. Continued use after an update constitutes acceptance of the revised policy where permitted by law.

---

## Legal note

This policy is provided to describe Subsume’s actual architecture: a client-side Chrome extension without a Subsume backend. It is not legal advice. If you redistribute a fork, update contact details, OAuth clients, and this policy to match your deployment.

---

*Subsume — a private sanctuary for screen and page, on your device.*  
Developer: Harsha Balakrishnan · [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)
