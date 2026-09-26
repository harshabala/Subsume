# Chrome Web Store screenshots

Five 1280x800 PNG screenshots of the built extension, ready for the Chrome Web Store (CWS) upload. Promo tiles live in [`../assets/`](../assets/).

## What is here

| File | Size | Shows |
|------|------|-------|
| `01-popup.png` | 1280x800 | The real toolbar popup at its true 360x600 size (archive counts, recent entries) composed over a dimmed copy of frame 04's page |
| `02-library.png` | 1280x800 | Archive page with the sample library: poster cards, status, reflection excerpts |
| `03-capture.png` | 1280x800 | Capture canvas, "What stayed with you?", with a note, emotion sliders and a 1-10 mark filled in |
| `04-plaques.png` | 1280x800 | Museum plaques drawn by the built content script on a local stand-in page; the second plaque is hovered to show "Reflect" |
| `05-settings.png` | 1280x800 | Settings, "Browsing & overlays" tab (no API key fields visible) |

Each PNG is under 1 MB.

## How they were made (honest notes)

All frames are captured from the real built UI (`dist/`) in a throwaway Chromium profile driven by Playwright. They are not mockups. Content comes from the extension's own sample library, restored with the same `RESTORE_DEMO_LIBRARY` message the "Load sample" buttons send. Onboarding was clicked through with no keys entered. No API keys, account, or personal data exist in the profile.

Things a reviewer should know:

- Frames use the real `dist/` output only, with no shims or alternate bundles.
- **Frame 1** composes one real popup capture (360x600, the size Chrome gives it) onto a dimmed screenshot of the frame 4 page. The popup's "Save a reflection" form is deliberately not shown: its search box and note field are `width: 100%` without `box-sizing: border-box` in `src/ui/styles/popup.css`, so they overflow the popup's right edge.
- **Frame 3**: the note text, slider positions and the "VIII" mark were typed/set by the capture script. Nothing was saved.
- **Frame 4** is NOT a real website. It is a local stand-in page (`../assets/src/film-page.html`, a fictional "Riverside Screening Room" listing) served from `127.0.0.1`. Poster images are fetched at capture time from the sample library's poster URLs and are not committed. The script asserts that plaque elements exist in the DOM and that no "Cannot use import statement" error occurs. Ratings on the plaques come from the sample library.
- Frames 2, 3 and 5 are rendered at a larger viewport at 2x and downscaled to 1280x800 so the whole layout fits.
- Sample titles are the extension's built-in catalogue, so poster art is real TMDb artwork; the TMDb attribution in the listing text applies.

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

- Result: passed. Onboarding to first reflection saved in **5.35 s** (script threshold 90 s). First Inscription Gate appeared, practice title opened the capture canvas, save closed it, the Weekly selection card appeared.
- Its "content-script failure visibility" step injects its own `role="alert"` element and then finds it, so it does not test the content script itself (the shipped content script is checked by frame 04 instead).

## Before upload

- [ ] Fix the popup form input overflow (see frame 1 note), then consider adding the form to the popup frame
- [ ] Confirm frames still match the version you ship (regenerate after UI changes)
- [ ] No secrets in frame (none present in the current set)
