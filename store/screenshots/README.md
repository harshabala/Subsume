# Chrome Web Store screenshots

Five 1280x800 PNG screenshots of the built extension, ready for the Chrome Web Store (CWS) upload. Promo tiles live in [`../assets/`](../assets/).

## What is here

| File | Size | Shows |
|------|------|-------|
| `01-popup.png` | 1280x800 | Toolbar popup: archive counts and recent entries (left), and the "Save a reflection" form with a searched title selected (right) |
| `02-library.png` | 1280x800 | Archive page with the sample library: poster cards, status, reflection excerpts |
| `03-capture.png` | 1280x800 | Capture canvas, "What stayed with you?", with a note, emotion sliders and a 1-10 mark filled in |
| `04-plaques.png` | 1280x800 | Museum plaques on poster images of a web page; the second plaque is hovered to show "Reflect" |
| `05-settings.png` | 1280x800 | Settings, "Browsing & overlays" tab (no API key fields visible) |

Each PNG is under 1 MB.

## How they were made (honest notes)

All frames are captured from the real built UI (`dist/`) in a throwaway Chromium profile driven by Playwright. They are not mockups. Content comes from the extension's own sample library, restored with the same `RESTORE_DEMO_LIBRARY` message the "Load sample" buttons send. Onboarding was clicked through with no keys entered. No API keys, account, or personal data exist in the profile.

Things a reviewer should know:

- **Frame 1** is a composite of two real popup captures on a dark canvas. The right-hand popup was rendered at 720px tall (Chrome caps real popups at 600px) so the whole form fits. The popup's page needs a one-line harness shim (see "Findings" below).
- **Frame 3**: the note text, slider positions and the "VIII" mark were typed/set by the capture script. Nothing was saved.
- **Frame 4** is NOT a real website. It is a local stand-in page (`../assets/src/film-page.html`, a fictional "Riverside Screening Room" listing) served from `127.0.0.1`. Poster images are fetched at capture time from the sample library's poster URLs and are not committed. The plaques are drawn by Subsume's real content script recognising the "Title (Year)" alt text. This page was used because no third-party site should be shown or scraped. Ratings on the plaques come from the sample library.
- Frames 2, 3 and 5 were rendered at a larger viewport (1760x1100 or 1920x1200 or 1600x1000, at 2x) and downscaled to 1280x800 so the whole layout fits in the frame.
- Sample titles are the extension's built-in Indian and world cinema catalogue, so the poster art is real TMDb artwork. Confirm you are comfortable with that before upload, and the TMDb attribution in the listing text applies.

## Findings while capturing (product bugs, not fixed here because this task was assets-only)

1. **Popup renders blank.** `src/ui/popup.html` mounts into `#app` but `src/ui/popup.tsx` renders into `#popup-root`. The capture script injects a tiny shim that renames the id in the harness only.
2. **Content script does not run in the shipped `dist/`.** `dist/content.js` is emitted as an ES module with `import` statements, and Chrome loads manifest content scripts as classic scripts ("Cannot use import statement outside a module"). So plaques and hover cards never appear in the built extension. For frame 4 the script builds the same `src/content/index.ts` as a single IIFE (`scripts/store-assets-content.vite.config.mjs`) and swaps it into a temp copy of `dist/`. The repo build is untouched. Fixing the build is needed before the plaque frame is true of the shipped extension.
3. In the popup form the search field and note box run past the right edge of the 360px popup (visible in frame 1, right panel).

## Regenerate

From the repo root (needs network for poster art and web fonts, Python `playwright` and `Pillow`, and an extension-capable Chromium; Playwright's Chrome for Testing is auto-detected, or set `SUBSUME_BROWSER`):

```bash
npm run build
python3 scripts/render-store-assets.py shots   # this folder
python3 scripts/render-store-assets.py tiles   # ../assets/ (uses 02-library.png)
python3 scripts/render-store-assets.py         # both
```

## Required sizes (CWS)

| Asset | Size (px) | Notes |
|-------|-----------|--------|
| Screenshots | **1280x800** or **640x400** | 1 to 5 |
| Store icon | **128x128** | `src/assets/icons/` |
| Small promo tile | **440x280** | `../assets/` |
| Marquee promo tile | **1400x560** | `../assets/` |

## Verification

`python3 scripts/test_cold_install_activation.py` was re-run against the final build. This is an **automated run, not a human-timed one**: the script clicks through onboarding on a fast machine with no reading time.

- Result: passed. Onboarding to first reflection saved in **6.16 s** (script threshold 90 s). First Inscription Gate appeared, practice title opened the capture canvas, save closed it, the Weekly selection card appeared.
- Its "content-script failure visibility" step injects its own `role="alert"` element and then finds it, so it does not test the content script itself (see finding 2).

## Before upload

- [ ] Resolve or accept the findings above
- [ ] Confirm frames still match the version you ship (regenerate after UI changes)
- [ ] No secrets in frame (none present in the current set)
