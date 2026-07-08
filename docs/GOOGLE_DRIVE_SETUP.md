# Google Drive backup (Web OAuth + launchWebAuthFlow)

Subsume signs in with **`chrome.identity.launchWebAuthFlow`** and the OAuth 2.0 implicit grant. Works in **Chrome, Brave, Edge, Vivaldi**, and other Chromium browsers.

The OAuth **client_id** lives in `src/shared/googleDriveOAuth.ts` (Web application client, no secret).

## Google Cloud setup

1. **Google Drive API** enabled on your project.
2. **Data access** scopes:
   - `https://www.googleapis.com/auth/drive.appdata`
   - `https://www.googleapis.com/auth/userinfo.email` (for “Connected as …” in Settings)
3. **Credentials → OAuth client → Web application**
   - **Authorized redirect URI** (exact):

     `https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/`

4. OAuth consent screen: add yourself as a **test user** if the app is in Testing.

## Build & load

```bash
npm run build
```

Load **`dist/`** from `chrome://extensions`. After code changes, remove + reload for a clean service worker.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `bad request` / `invalid_request` | OAuth client must be **Web application** (not Chrome extension type). Enable implicit grant if your project still allows it, or add yourself as a **test user** on the consent screen. Redirect URI must be exactly `https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/` (stable ID from manifest `key`). Settings → Data shows your live redirect if different. |
| Sign-in tab closes with no connection | User cancelled, or wrong client_id / redirect URI |
| No email after connect | Add `userinfo.email` scope on consent screen |

We do **not** use `chrome.identity.getAuthToken()` or a manifest `oauth2` block.