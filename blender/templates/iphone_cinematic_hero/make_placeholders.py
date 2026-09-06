"""
Writes the placeholder images the template ships with:

  screens/SCREEN_01.png  1170x2532  a calm app screen (list of cards)
  screens/SCREEN_02.png  1170x2532  a second screen (dashboard)
  screens/LOGO.png       1024x1024  a wordmark on transparency

Pure numpy so it runs inside the bpy virtualenv with no extra packages.
Replace any of them with real assets; generate_iphone_template.py does that
for you.
"""
from __future__ import annotations

import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "screens")


def write_png(path: str, rgba: np.ndarray) -> None:
    """Saves an HxWx4 float image through Blender so no PIL is needed."""
    import bpy

    h, w, _ = rgba.shape
    image = bpy.data.images.new(os.path.basename(path), width=w, height=h, alpha=True)
    image.colorspace_settings.name = "sRGB"
    # Blender stores rows bottom-up.
    image.pixels.foreach_set(np.flipud(rgba).astype(np.float32).ravel())
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def rounded_rect(h: int, w: int, x0: float, y0: float, x1: float, y1: float, r: float) -> np.ndarray:
    """Anti-aliased mask of a rounded rectangle in pixel coordinates."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = np.clip(xx, x0 + r, x1 - r)
    cy = np.clip(yy, y0 + r, y1 - r)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - r
    return np.clip(0.5 - d, 0, 1)


def gradient(h: int, w: int, top: tuple, bottom: tuple, diag: float = 0.35) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip((yy / h) * (1 - diag) + (xx / w) * diag, 0, 1)[..., None]
    return np.array(top, np.float32) * (1 - t) + np.array(bottom, np.float32) * t


def blend(base: np.ndarray, color: tuple, mask: np.ndarray) -> np.ndarray:
    m = mask[..., None]
    return base * (1 - m) + np.array(color, np.float32) * m


def screen_01(w: int = 1170, h: int = 2532) -> np.ndarray:
    rgb = gradient(h, w, (0.10, 0.12, 0.30), (0.05, 0.05, 0.10))
    # A header block with a title bar.
    rgb = blend(rgb, (0.97, 0.97, 1.0), rounded_rect(h, w, 90, 220, w - 90, 520, 44))
    rgb = blend(rgb, (0.15, 0.20, 0.85), rounded_rect(h, w, 140, 300, 560, 360, 30))
    rgb = blend(rgb, (0.75, 0.78, 0.88), rounded_rect(h, w, 140, 400, 820, 440, 20))
    # Cards.
    for i in range(4):
        y = 620 + i * 420
        rgb = blend(rgb, (1.0, 1.0, 1.0), rounded_rect(h, w, 90, y, w - 90, y + 340, 44))
        rgb = blend(rgb, (0.20, 0.60, 1.0) if i % 2 == 0 else (0.98, 0.45, 0.35), rounded_rect(h, w, 140, y + 60, 340, y + 260, 36))
        rgb = blend(rgb, (0.14, 0.14, 0.20), rounded_rect(h, w, 400, y + 80, 900, y + 130, 25))
        rgb = blend(rgb, (0.70, 0.72, 0.80), rounded_rect(h, w, 400, y + 170, 1010, y + 210, 20))
    # Tab bar.
    rgb = blend(rgb, (0.98, 0.98, 1.0), rounded_rect(h, w, 90, h - 260, w - 90, h - 100, 60))
    for i in range(4):
        x = 230 + i * 240
        rgb = blend(rgb, (0.15, 0.20, 0.85) if i == 0 else (0.75, 0.78, 0.88), rounded_rect(h, w, x - 40, h - 210, x + 40, h - 150, 30))
    return np.dstack([rgb, np.ones((h, w), np.float32)])


def screen_02(w: int = 1170, h: int = 2532) -> np.ndarray:
    rgb = gradient(h, w, (0.98, 0.97, 0.96), (0.90, 0.92, 0.97))
    rgb = blend(rgb, (0.12, 0.12, 0.18), rounded_rect(h, w, 90, 240, 700, 320, 40))
    rgb = blend(rgb, (0.55, 0.57, 0.65), rounded_rect(h, w, 90, 360, 500, 400, 20))
    # Hero tile with a chart.
    rgb = blend(rgb, (0.12, 0.14, 0.40), rounded_rect(h, w, 90, 480, w - 90, 1180, 56))
    xs = np.linspace(0, 1, 12)
    for i, x in enumerate(xs[:-1]):
        px = 160 + x * (w - 320)
        height = 120 + 380 * (0.5 + 0.5 * np.sin(i * 0.9) * 0.8 + 0.1 * i / 12)
        rgb = blend(rgb, (0.30, 0.75, 1.0), rounded_rect(h, w, px, 1100 - height, px + 56, 1100, 22))
    rgb = blend(rgb, (1.0, 1.0, 1.0), rounded_rect(h, w, 160, 560, 700, 620, 25))
    # Two stat tiles.
    for j, x0 in enumerate((90, w // 2 + 20)):
        x1 = w // 2 - 20 if j == 0 else w - 90
        rgb = blend(rgb, (1.0, 1.0, 1.0), rounded_rect(h, w, x0, 1260, x1, 1620, 48))
        rgb = blend(rgb, (0.12, 0.12, 0.18), rounded_rect(h, w, x0 + 60, 1340, x1 - 120, 1420, 30))
        rgb = blend(rgb, (0.20, 0.70, 0.45) if j == 0 else (0.98, 0.55, 0.20), rounded_rect(h, w, x0 + 60, 1470, x0 + 260, 1520, 25))
    # A list.
    for i in range(3):
        y = 1700 + i * 230
        rgb = blend(rgb, (1.0, 1.0, 1.0), rounded_rect(h, w, 90, y, w - 90, y + 180, 40))
        rgb = blend(rgb, (0.85, 0.87, 0.95), rounded_rect(h, w, 140, y + 40, 240, y + 140, 50))
        rgb = blend(rgb, (0.12, 0.12, 0.18), rounded_rect(h, w, 300, y + 55, 760, y + 95, 20))
        rgb = blend(rgb, (0.65, 0.67, 0.75), rounded_rect(h, w, 300, y + 115, 620, y + 145, 15))
    return np.dstack([rgb, np.ones((h, w), np.float32)])


def logo(size: int = 1024) -> np.ndarray:
    h = w = size
    rgba = np.zeros((h, w, 4), np.float32)
    # A rounded tile with a ring: reads as a mark at any size.
    tile = rounded_rect(h, w, 112, 112, w - 112, h - 112, 220)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xx - w / 2) ** 2 + (yy - h / 2) ** 2)
    ring = np.clip(0.5 - (np.abs(d - 250) - 60), 0, 1)
    dot = np.clip(0.5 - (d - 95), 0, 1)
    rgb = np.array((0.36, 0.42, 1.0), np.float32)[None, None, :] * tile[..., None]
    rgb = blend(rgb, (1.0, 1.0, 1.0), ring)
    rgb = blend(rgb, (1.0, 1.0, 1.0), dot)
    rgba[..., :3] = rgb
    rgba[..., 3] = tile
    return rgba


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    write_png(os.path.join(OUT, "SCREEN_01.png"), screen_01())
    write_png(os.path.join(OUT, "SCREEN_02.png"), screen_02())
    write_png(os.path.join(OUT, "LOGO.png"), logo())
    for name in ("SCREEN_01.png", "SCREEN_02.png", "LOGO.png"):
        print("wrote", os.path.join(OUT, name), os.path.getsize(os.path.join(OUT, name)), "bytes")


if __name__ == "__main__":
    main()
