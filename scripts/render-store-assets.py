#!/usr/bin/env python3
"""Regenerate Chrome Web Store screenshots and promo tiles for Subsume.

Usage (from repo root, after `npm run build`):
    python3 scripts/render-store-assets.py            # everything
    python3 scripts/render-store-assets.py shots      # 5 screenshots only
    python3 scripts/render-store-assets.py tiles      # promo tiles only

Screenshots are real captures of the built extension in ./dist, driven by
Playwright in a throwaway profile. The library is seeded through the extension's
own RESTORE_DEMO_LIBRARY message (the same path as the "Load sample" button).
Promo tiles are rendered from store/assets/src/*.html using those screenshots,
so run `shots` before `tiles`.

Requires: Python playwright + Pillow, and a Chromium build that can load
extensions (Playwright's "Chrome for Testing" works; Brave is a fallback).
Set SUBSUME_BROWSER to override the browser executable. Needs network access
(poster art and web fonts load from their public CDNs).
"""
import base64
import glob
import http.server
import os
import shutil
import sys
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
SHOTS = ROOT / "store" / "screenshots"
ASSETS = ROOT / "store" / "assets"
SRC = ASSETS / "src"
W, H = 1280, 800

def find_browser() -> str:
    env = os.environ.get("SUBSUME_BROWSER")
    if env:
        return env
    pat = os.path.expanduser(
        "~/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/"
        "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
    )
    found = sorted(glob.glob(pat))
    if found:
        return found[-1]
    brave = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    if os.path.exists(brave):
        return brave
    raise SystemExit("No extension-capable Chromium found; set SUBSUME_BROWSER")


def launch(p, profile, ext_dir, scale=1):
    ctx = p.chromium.launch_persistent_context(
        profile,
        executable_path=find_browser(),
        headless=False,
        viewport={"width": W, "height": H},
        device_scale_factor=scale,
        color_scheme="dark",
        args=[
            "--headless=new",
            f"--disable-extensions-except={ext_dir}",
            f"--load-extension={ext_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--hide-scrollbars",
        ],
    )
    sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event("serviceworker")
    return ctx, sw.url.split("/")[2]


def send(page, type_, payload=None):
    return page.evaluate(
        "([t,p]) => new Promise(r => chrome.runtime.sendMessage({type:t, payload:p||{}}, r))",
        [type_, payload],
    )


def settle(page, ms=1200):
    page.wait_for_timeout(ms)
    page.evaluate("document.fonts && document.fonts.ready")


def finish(src_png, dest, size):
    """Downscale a 2x / oversized capture to the exact listing size and optimise."""
    from PIL import Image

    im = Image.open(src_png).convert("RGB").resize(size, Image.LANCZOS)
    im.save(dest, optimize=True)
    if dest.stat().st_size > 900_000:  # keep the repo light
        im.quantize(colors=192, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(dest, optimize=True)
    print("wrote", dest.relative_to(ROOT), Image.open(dest).size, dest.stat().st_size // 1024, "KB")


def b64png(f):
    return "data:image/png;base64," + base64.b64encode(Path(f).read_bytes()).decode()


def serve_dir(directory):
    """Serve a directory on localhost so the content script (http/https only) runs."""

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(directory), **k)

        def log_message(self, *a, **k):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def capture_screenshots():
    SHOTS.mkdir(parents=True, exist_ok=True)
    profile = tempfile.mkdtemp(prefix="subsume-shots-")
    tmp = Path(tempfile.mkdtemp(prefix="subsume-shots-out-"))
    ext_dir = DIST
    site = tmp / "site"
    (site / "posters").mkdir(parents=True)
    srv = None
    try:
        with sync_playwright() as p:
            ctx, ext = launch(p, profile, ext_dir, scale=2)
            base = f"chrome-extension://{ext}"
            app = ctx.new_page()
            app.goto(f"{base}/ui/index.html")
            # Onboarding: real click-through, no keys entered.
            app.wait_for_selector('button:has-text("Begin")')
            app.click('button:has-text("Begin")')
            app.wait_for_selector('button:has-text("Enter without keys")')
            app.click('button:has-text("Enter without keys")')
            app.wait_for_selector('[data-testid="first-inscription-gate"]')
            # Explicit demo restore (same message the "Load sample" controls send).
            send(app, "RESTORE_DEMO_LIBRARY")
            lib = send(app, "GET_LIBRARY")["data"]
            by_title = {x["media"]["canonicalTitle"]: x for x in lib}

            # ---- 01 popup (two real popup states side by side) ----
            pop = ctx.new_page()
            pop.set_viewport_size({"width": 360, "height": 600})
            pop.goto(f"{base}/ui/popup.html")
            settle(pop, 2500)
            pop.screenshot(path=str(tmp / "pop_home.png"))
            pop.close()

            # ---- 02 library ----
            app.set_viewport_size({"width": 1760, "height": 1100})
            app.goto(f"{base}/ui/index.html?page=library")
            settle(app, 2000)
            for y in range(0, 4000, 500):  # trigger lazy-loaded posters
                app.evaluate(f"window.scrollTo(0,{y})")
                app.wait_for_timeout(250)
            app.evaluate("window.scrollTo(0,0)")
            settle(app, 1500)
            app.screenshot(path=str(tmp / "02.png"))
            finish(tmp / "02.png", SHOTS / "02-library.png", (W, H))

            # ---- 03 capture canvas ----
            mid = by_title["Parasite"]["library"]["mediaId"]
            app.set_viewport_size({"width": 1920, "height": 1200})
            app.goto(f"{base}/ui/index.html?page=library&act=capture&mediaId={mid}")
            settle(app, 3000)
            app.locator(".poetic-textarea").fill(
                "The smell that follows them up the stairs. I keep coming back to how quiet the "
                "cruelty is, and how warm the house feels until it does not."
            )
            app.evaluate(
                """(vals) => {
              const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
              document.querySelectorAll('.poetic-sanctuary-modal input[type=range]').forEach((el, i) => {
                set.call(el, vals[i]); el.dispatchEvent(new Event('input', {bubbles: true}));
              });
            }""",
                [72, 58, 84, 46],
            )
            app.locator(".poetic-sanctuary-modal button", has_text="VIII").first.click()
            settle(app, 800)
            app.screenshot(path=str(tmp / "03.png"))
            finish(tmp / "03.png", SHOTS / "03-capture.png", (W, H))

            # ---- 04 plaques on a local stand-in page ----
            titles = ["Parasite", "Everything Everywhere All at Once", "Get Out", "Free Solo", "Portrait of a Lady on Fire"]
            for i, t in enumerate(titles):
                r = ctx.request.get(by_title[t]["media"]["posterUrl"])
                (site / "posters" / f"{i}.jpg").write_bytes(r.body())
            shutil.copy(SRC / "film-page.html", site / "index.html")
            srv = serve_dir(site)
            web = ctx.new_page()
            web.set_viewport_size({"width": W, "height": H})
            errors = []
            web.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            web.on("pageerror", lambda e: errors.append(str(e)))
            web.goto(f"http://127.0.0.1:{srv.server_address[1]}/index.html")
            web.wait_for_function(
                "document.querySelectorAll('[data-subsume-poster-scanned=matched]').length >= 5", timeout=30000
            )
            settle(web, 2500)
            box = web.locator(".poster").nth(1).bounding_box()
            web.mouse.move(box["x"] + box["width"] - 40, box["y"] + box["height"] - 30)
            settle(web, 1200)
            badges = web.evaluate("document.querySelectorAll('[data-subsume-badge]').length")
            print("plaque elements in DOM:", badges, "| page errors:", errors)
            assert badges >= 3, "content script did not draw plaques"
            assert not any("import statement" in e for e in errors), errors
            web.screenshot(path=str(tmp / "04.png"))
            # ---- 01 popup: the real popup (true 360x600) over the same page, dimmed ----
            comp = ctx.new_page()
            comp.set_viewport_size({"width": W, "height": H})
            comp.set_content(
                f"""<body style="margin:0;width:{W}px;height:{H}px;position:relative;overflow:hidden;background:#181818">
                <img src="{b64png(tmp / '04.png')}" style="position:absolute;inset:0;width:{W}px;height:{H}px">
                <div style="position:absolute;inset:0;background:rgba(24,24,24,0.72)"></div>
                <img src="{b64png(tmp / 'pop_home.png')}" style="position:absolute;top:64px;right:120px;width:360px;
                height:600px;border:1px solid #303030;box-shadow:0 18px 60px rgba(0,0,0,0.6)"></body>"""
            )
            comp.wait_for_timeout(500)
            comp.screenshot(path=str(tmp / "01.png"))
            comp.close()
            finish(tmp / "01.png", SHOTS / "01-popup.png", (W, H))
            finish(tmp / "04.png", SHOTS / "04-plaques.png", (W, H))
            web.close()

            # ---- 05 settings ----
            app.set_viewport_size({"width": 1600, "height": 1000})
            app.goto(f"{base}/ui/index.html?page=settings")
            settle(app, 2000)
            app.locator("button", has_text="Browsing & overlays").first.click()
            settle(app, 1200)
            app.screenshot(path=str(tmp / "05.png"))
            finish(tmp / "05.png", SHOTS / "05-settings.png", (W, H))
            ctx.close()
    finally:
        if srv:
            srv.shutdown()
        shutil.rmtree(profile, ignore_errors=True)
        if os.environ.get("SUBSUME_KEEP_TMP"):
            print("kept", tmp)
        else:
            shutil.rmtree(tmp, ignore_errors=True)


def render_tiles():
    ASSETS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=find_browser())
        for name, (w, h) in {
            "promo-small-440x280": (440, 280),
            "promo-marquee-1400x560": (1400, 560),
        }.items():
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg.goto((SRC / f"{name}.html").as_uri())
            pg.wait_for_timeout(1500)
            out = ASSETS / f"{name}.png"
            pg.screenshot(path=str(out))
            print("wrote", out.relative_to(ROOT))
        b.close()


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("all", "shots"):
        capture_screenshots()
    if what in ("all", "tiles"):
        render_tiles()
