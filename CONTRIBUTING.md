# Contributing to Subsume

First off, thank you for considering contributing to Subsume! It's people like you that make Subsume such a great tool for cinephiles.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/harshabala/Subsume.git
   ```
2. Ensure you have Node.js 18+ installed.
3. Run `npm install` to install dependencies.
4. Run `npm run dev` to start the build in watch mode.

To load the extension into Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory from your cloned repository.

## Testing

Please ensure all tests pass before submitting a pull request:
```bash
npm run test
```

## Pre-Ship Checklist

Before merging UI, security, or capture-flow changes, confirm:

- [ ] **Google Drive OAuth** — production client ID lives in `src/shared/googleDriveOAuth.ts` (not a manifest placeholder). The manifest `key` pins extension ID `ehbkfdgpbemaimepgeeflenhbbpgokoj` for the registered redirect URI. Forks need their own Web OAuth client; see `docs/GOOGLE_DRIVE_SETUP.md`. Broad `content_scripts` matches are intentional and documented in `store/MANIFEST_NOTES.md`.
- [ ] **`emotionalRecall` capture flow** — Poetic Capture Canvas persists `emotionalRecall` via `SET_USER_NOTES`; run `npm run test -- tests/captureToLibrary.test.ts tests/poeticCaptureCanvas.test.tsx tests/libraryHandlers.test.ts`.
- [ ] **`sendMessage` error handling** — Typed IPC rejects `success: false`, missing responses, and `chrome.runtime.lastError`; run `npm run test -- tests/sendMessage.test.ts`.
- [ ] **Security regression tests** — Message allowlist, API-key stripping, and poster budget caps still pass:
  ```bash
  npm run test -- tests/messageRouter.test.ts tests/contentPrefs.test.ts tests/posterBudget.test.ts tests/screenplayDock.test.ts
  ```

## Pull Request Process

1. Ensure any new code includes appropriate tests and documentation.
2. Update the README.md with details of changes to the interface, new features, or setup instructions if applicable.
3. Ensure your commits are descriptive and follow standard conventional commit formats.
4. Open a Pull Request against the `main` branch.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
