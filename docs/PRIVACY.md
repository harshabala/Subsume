# Privacy Policy for Subsume

**Effective date:** July 1, 2026

This privacy policy describes how **Subsume**, a Chrome browser extension developed by **Harsha Balakrishnan** (“we,” “us,” or “the developer”), handles information when you install and use the extension.

Subsume is a private cinematic sanctuary: a client-side tool for tracking films and television you care about, recording notes and emotional ratings, and optionally enriching metadata or recommendations through third-party services you choose. There is **no Subsume backend server**. Your library lives on your device unless you explicitly enable optional cloud backup.

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
| Encryption at rest | Local data is **not** encrypted at rest by Subsume. Protect access to your browser profile and device. |

---

## Information the extension processes

Subsume processes data **on your device** and, when you enable features that require it, sends limited requests to third-party APIs. Categories include:

### Personal media library

Titles you save (films and TV shows), status (for example watched, wishlist, or sanctuary intents), ratings, emotional scales, free-text notes and reflections, people you follow (directors, cast, crew), alerts, and related preferences.

### Preferences and settings

Feature toggles, theme choices, disabled domains (content-script blacklist), platform/streaming preferences, digest settings, and similar configuration stored locally.

### Optional API keys

If you supply them in Settings, Subsume stores keys you provide for services such as TMDb, OMDb, and large language model providers (OpenAI, Anthropic, and/or Google Gemini). These keys are stored in local extension storage (including IndexedDB as part of user preferences). **They are not encrypted at rest.** They are used only to call the providers you configure, from the extension’s background context.

**API keys are never sent to content scripts.** Content scripts receive feature toggles and limited library lookup results only, not credentials.

### Optional Google Drive backup

If you connect Google Drive, Subsume may back up library-related data to Google Drive **appData** (application-specific storage associated with the extension’s OAuth client). Connection uses Chrome’s identity / OAuth flow. You can disconnect Drive in Settings. Drive is optional; the extension works without it.

### Page context for discovery (content scripts)

To detect posters and titles while you browse, content scripts may run on **http** and **https** pages. They inspect page content for media titles and poster images so Subsume can show quiet overlays (for example rating plaques or hover cards). You can disable Subsume on specific domains via **Settings → Disabled Domains**. Uninstalling the extension removes the scripts entirely.

Content scripts do not receive your API keys. Sensitive library export and settings operations are restricted to the extension UI and background service worker, not arbitrary page scripts.

---

## How data is stored

| Location | What is stored |
| :--- | :--- |
| **IndexedDB** (on your device) | Media records, library entries, people, caches, preferences (including optional API keys), and related sanctuary data. |
| **`chrome.storage.local`** (on your device) | Preferences, diagnostic logs, page-reflection dock notes keyed by page path, and similar small state. |
| **Google Drive appData** (optional) | Backup of library data when you connect and use Drive backup/restore. |

Local storage is **not encrypted at rest** by Subsume. Anyone with access to your user account, unlocked device, or Chrome profile may be able to read extension data. Use device encryption, a strong OS login, and browser profile hygiene as appropriate for your risk tolerance.

When you uninstall Subsume, Chrome removes the extension’s local storage. Optional Drive appData may remain in your Google account until you delete it through Google’s tools or disconnect and clear backups as applicable.

---

## Network requests and third parties

Subsume does not send your library to a Subsume-operated server. Network traffic goes only to services you use (or that the extension is built to query for public metadata), including:

| Service | Purpose |
| :--- | :--- |
| **[TMDb](https://www.themoviedb.org/)** (The Movie Database) | Film/TV metadata, posters, people, search, and related catalogue data. Requires your TMDb API key when configured. |
| **OMDb** (optional) | Supplemental title metadata when you provide an OMDb API key. |
| **OpenAI / Anthropic / Google Gemini** (optional) | AI recommendations or digests using **your** API keys, from the background service worker. Prompt material may include short excerpts of your notes and taste profile built from your local library—not arbitrary full page DOM dumps. |
| **Trakt** | Public or API-backed media metadata/discovery where used by the extension. |
| **TVMaze** | Television metadata. |
| **Wikidata / Wikipedia** | Structured and encyclopedic metadata for titles or people. |
| **Google APIs** | OAuth identity and Google Drive appData backup when you connect Drive. |

Each third party processes requests under **its own** privacy policy and terms. Subsume does not control those services. Review their policies before enabling optional integrations or providing API keys.

This product uses the TMDb API but is not endorsed or certified by TMDb.

---

## What we do not do

- We do **not** sell your personal data.
- We do **not** show advertisements in the extension.
- We do **not** embed third-party analytics, advertising, or tracking SDKs.
- We do **not** operate a Subsume cloud account that aggregates all users’ libraries.
- We do **not** send API keys to content scripts or to host pages.

Diagnostic logging, if enabled or used for troubleshooting, stays in local extension storage (with secret redaction where implemented) and is not a third-party analytics product.

---

## Your controls

You can:

1. **Export** your library from the extension (exports are designed to exclude API keys; media and library records are included).
2. **Disable domains** so content scripts do not run their discovery UI on sites you blacklist.
3. **Disconnect Google Drive** to stop optional backup via the extension’s Settings.
4. **Clear or change API keys** in Settings; stop using optional LLM or OMDb features at any time.
5. **Uninstall** the extension to remove it and its local Chrome extension data from the browser.
6. **Contact** the developer at the email above with privacy questions.

---

## Permissions (plain language)

Chrome may show that Subsume requests permissions such as:

- **Storage** — save your library and settings on the device.
- **Active tab** — work with the page you are viewing when you use extension UI.
- **Notifications** — optional digests or alerts you enable.
- **Alarms** — schedule periodic tasks such as digests.
- **Identity** — sign in to Google for optional Drive backup.
- **Host access** — call the metadata and AI endpoints listed above.
- **Content scripts on web pages** — detect titles/posters for discovery overlays; controllable via domain blacklist.

Detailed justifications for Chrome Web Store review are maintained in the project’s store documentation.

---

## Children’s privacy

Subsume is **not directed at children under 13**. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided personal information through the extension in a way that concerns you, contact us at the email above and we will take reasonable steps to address the issue.

---

## Data retention

- **On device:** Data remains until you delete it within the extension, clear site/extension data, or uninstall.
- **Drive appData (optional):** Retained in your Google account according to your use of backup and Google’s policies until you delete it or disconnect as applicable.
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

*Subsume — a private cinematic sanctuary on your device.*  
Developer: Harsha Balakrishnan · [harsha16balakrishnan@proton.me](mailto:harsha16balakrishnan@proton.me)
