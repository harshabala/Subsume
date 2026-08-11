#!/usr/bin/env python3
"""Generate Subsume Chrome toolbar icons (Cinema Black + Rosso Corsa spiral).

Requires: Pillow
Usage: python3 scripts/generate-extension-icons.py
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "assets" / "icons"
ROSSO = (218, 41, 28)
WHITE = (255, 255, 255)


def draw_icon(size: int) -> Image.Image:
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = max(1, s // 32)
    radius = max(2, s // 6)
    draw.rounded_rectangle(
        [margin, margin, s - 1 - margin, s - 1 - margin],
        radius=radius,
        fill=(18, 18, 18, 255),
    )
    draw.rounded_rectangle(
        [margin, margin, s - 1 - margin, s - 1 - margin],
        radius=radius,
        outline=(48, 48, 48, 255),
        width=max(1, s // 128),
    )
    cx, cy = s / 2, s / 2
    stroke = max(1, int(s * 0.055))
    turns = 2.35
    max_r = s * 0.32
    steps = max(80, s * 3)
    points = []
    for i in range(steps + 1):
        t = i / steps
        angle = t * turns * 2 * math.pi - math.pi / 2
        r = max_r * (0.08 + 0.92 * (t**0.85))
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    for i in range(len(points) - 1):
        draw.line([points[i], points[i + 1]], fill=ROSSO + (255,), width=stroke)
    r0 = stroke / 2
    for p in (points[0], points[-1]):
        draw.ellipse([p[0] - r0, p[1] - r0, p[0] + r0, p[1] + r0], fill=ROSSO + (255,))
    if s >= 32:
        tri_s = s * 0.09
        tri = [
            (cx - tri_s * 0.55, cy - tri_s * 0.85),
            (cx - tri_s * 0.55, cy + tri_s * 0.85),
            (cx + tri_s * 0.95, cy),
        ]
        draw.polygon(tri, fill=WHITE + (255,))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(512).convert("RGB").save(OUT / "icon-master.png", "PNG", optimize=True)
    for size in (128, 48):
        icon = draw_icon(size)
        bg = Image.new("RGB", (size, size), (18, 18, 18))
        bg.paste(icon, (0, 0), icon.split()[3])
        bg.save(OUT / f"icon{size}.png", "PNG", optimize=True)
    icon16 = Image.new("RGB", (16, 16), (18, 18, 18))
    d = ImageDraw.Draw(icon16)
    d.rounded_rectangle([0, 0, 15, 15], radius=3, fill=(18, 18, 18), outline=(48, 48, 48))
    cx, cy = 7.5, 7.5
    pts = []
    for i in range(48):
        t = i / 47
        ang = t * 2.1 * 2 * math.pi - math.pi / 2
        r = 1.2 + 4.2 * (t**0.9)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    d.line(pts, fill=ROSSO, width=1)
    icon16.save(OUT / "icon16.png", "PNG", optimize=True)
    print("Wrote icons to", OUT)


if __name__ == "__main__":
    main()
