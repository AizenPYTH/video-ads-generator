"""
Compares farm-rendered frames with the local reference: sharpness, pixel
difference, and a side-by-side sheet per frame.

    blender/bin/bpy compare_farm.py --farm path/to/farm/frames \
        --local blender/out/farm-test/local_reference \
        [--farm-times '{"37": 4.1, "61": 3.9, ...}'] [--local-times /tmp/farm-local.log] \
        [--out blender/out/farm-test/compare]

Frames are matched by the number in their file name (frame_0106.png, 0106.png,
anything with 3-4 digits). The report prints, per frame: local and farm
render time, Laplacian-variance sharpness of the whole frame and of the
text crop, mean absolute difference between the two images (0-255), and
writes <out>/frame_NNNN.png with local | farm | 4x difference.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def load_gray_rgb(path: str) -> tuple[np.ndarray, np.ndarray]:
    image = bpy.data.images.load(path)
    w, h = image.size
    px = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
    bpy.data.images.remove(image)
    return px @ np.array([0.2126, 0.7152, 0.0722], np.float32), px


def save_rgb(path: str, rgb: np.ndarray) -> None:
    h, w, _ = rgb.shape
    image = bpy.data.images.new(os.path.basename(path), width=w, height=h)
    rgba = np.dstack([np.clip(rgb, 0, 1), np.ones((h, w), np.float32)])
    image.pixels.foreach_set(rgba[::-1].astype(np.float32).ravel())
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def laplacian_var(gray: np.ndarray) -> float:
    lap = -4 * gray[1:-1, 1:-1] + gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:]
    return float(lap.var() * 1e4)


def index_frames(folder: str) -> dict[int, str]:
    found = {}
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith((".png", ".exr", ".jpg", ".jpeg", ".tif", ".tiff")):
            continue
        m = re.search(r"(\d{3,4})(?!.*\d)", name)
        if m:
            found[int(m.group(1))] = os.path.join(folder, name)
    return found


def parse_times(source: str | None) -> dict[int, float]:
    """Either a JSON mapping frame -> seconds or a log with 'frame N: 12.3s' lines."""
    if not source:
        return {}
    if os.path.isfile(source):
        text = open(source, encoding="utf-8").read()
        try:
            return {int(k): float(v) for k, v in json.loads(text).items()}
        except ValueError:
            return {int(m.group(1)): float(m.group(2)) for m in re.finditer(r"frame\s+(\d+)\D+?([\d.]+)\s*s", text)}
    return {int(k): float(v) for k, v in json.loads(source).items()}


def main(argv):
    p = argparse.ArgumentParser()
    p.add_argument("--farm", required=True)
    p.add_argument("--local", default=os.path.abspath(os.path.join(HERE, "..", "..", "out", "farm-test", "local_reference")))
    p.add_argument("--farm-times")
    p.add_argument("--local-times")
    p.add_argument("--out", default=os.path.abspath(os.path.join(HERE, "..", "..", "out", "farm-test", "compare")))
    a = p.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    farm, local = index_frames(a.farm), index_frames(a.local)
    farm_t, local_t = parse_times(a.farm_times), parse_times(a.local_times)
    common = sorted(set(farm) & set(local))
    if not common:
        raise SystemExit(f"no common frames: farm {sorted(farm)} local {sorted(local)}")

    print(f"{'frame':>5} | {'local s':>8} | {'farm s':>7} | {'sharp local':>11} | {'sharp farm':>10} | {'text local':>10} | {'text farm':>9} | {'mean diff':>9}")
    for frame in common:
        gl, rl = load_gray_rgb(local[frame])
        gf, rf = load_gray_rgb(farm[frame])
        if gl.shape != gf.shape:
            print(f"{frame:>5} | size mismatch local {gl.shape[::-1]} farm {gf.shape[::-1]}")
            continue
        h, w = gl.shape
        tl = gl[int(h * 0.42):int(h * 0.58), int(w * 0.02):int(w * 0.36)]
        tf = gf[int(h * 0.42):int(h * 0.58), int(w * 0.02):int(w * 0.36)]
        diff = np.abs(rl - rf)
        print(f"{frame:>5} | {local_t.get(frame, float('nan')):8.1f} | {farm_t.get(frame, float('nan')):7.1f} | {laplacian_var(gl):11.2f} | {laplacian_var(gf):10.2f} | {laplacian_var(tl):10.2f} | {laplacian_var(tf):9.2f} | {diff.mean() * 255:9.2f}")
        sheet = np.concatenate([rl, rf, np.clip(diff * 4, 0, 1)], axis=1)
        save_rgb(os.path.join(a.out, f"frame_{frame:04d}.png"), sheet)
    print("sheets in", a.out, "(local | farm | difference x4)")


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    main(argv)
