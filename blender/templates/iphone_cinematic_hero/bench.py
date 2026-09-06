"""
Render benchmark: one configuration, a few frames, time and sharpness.

    blender/bin/bpy bench.py --blend file.blend --frames 37,106,139,250 \
        --engine CYCLES --scale 100 --samples 64 --prefilter FAST \
        --filter 1.0 --out /tmp/bench/name

Sharpness is the variance of the Laplacian (higher = crisper) measured on
two crops that matter: the tagline region and the phone display region,
both at the current resolution. Numbers compare configurations rendered at
the same scale only.
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def parse(argv):
    p = argparse.ArgumentParser()
    p.add_argument("--blend", default=os.path.join(HERE, "iphone_cinematic_hero.blend"))
    p.add_argument("--frames", default="37,106,139,250")
    p.add_argument("--engine", default="CYCLES", choices=["CYCLES", "BLENDER_EEVEE"])
    p.add_argument("--scale", type=int, default=100)
    p.add_argument("--samples", type=int, default=64)
    p.add_argument("--adaptive", type=float, default=0.015)
    p.add_argument("--prefilter", default="ACCURATE", choices=["ACCURATE", "FAST", "NONE"])
    p.add_argument("--denoise", type=int, default=1)
    p.add_argument("--filter", type=float, default=1.5)
    p.add_argument("--bounces", type=int, default=8)
    p.add_argument("--motion-blur", type=int, default=0)
    p.add_argument("--persistent", type=int, default=1)
    p.add_argument("--eevee-samples", type=int, default=32)
    p.add_argument("--out", required=True)
    return p.parse_args(argv)


def laplacian_var(gray: np.ndarray) -> float:
    lap = (-4 * gray[1:-1, 1:-1] + gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:])
    return float(lap.var() * 1e4)


def sharpness(path: str) -> dict:
    image = bpy.data.images.load(path)
    w, h = image.size
    px = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
    bpy.data.images.remove(image)
    gray = px @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    # Tagline sits in the left third, just above mid-height; display is the centre column.
    text = gray[int(h * 0.42):int(h * 0.58), int(w * 0.02):int(w * 0.36)]
    centre = gray[int(h * 0.15):int(h * 0.85), int(w * 0.33):int(w * 0.67)]
    return {"text": laplacian_var(text), "centre": laplacian_var(centre)}


def main(argv):
    a = parse(argv)
    os.makedirs(a.out, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=a.blend)
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
    except Exception:
        pass
    sc = bpy.context.scene
    r = sc.render
    r.engine = a.engine
    r.resolution_percentage = a.scale
    r.filter_size = a.filter
    r.use_motion_blur = bool(a.motion_blur)
    r.use_persistent_data = bool(a.persistent)
    if a.engine == "CYCLES":
        c = sc.cycles
        c.samples = a.samples
        c.adaptive_threshold = a.adaptive
        c.use_denoising = bool(a.denoise)
        c.denoising_prefilter = a.prefilter
        c.max_bounces = a.bounces
        c.diffuse_bounces = min(c.diffuse_bounces, a.bounces)
        c.glossy_bounces = min(c.glossy_bounces, a.bounces)
        c.transmission_bounces = min(c.transmission_bounces, a.bounces)
    else:
        e = sc.eevee
        e.taa_render_samples = a.eevee_samples
        for attr, value in (("use_raytracing", True), ("use_shadows", True), ("shadow_ray_count", 2), ("shadow_step_count", 4)):
            if hasattr(e, attr):
                setattr(e, attr, value)
        if hasattr(e, "ray_tracing_options"):
            e.ray_tracing_options.resolution_scale = "1"
    frames = [int(x) for x in a.frames.split(",")]
    results = []
    for i, frame in enumerate(frames):
        sc.frame_set(frame)
        r.filepath = os.path.join(a.out, f"frame_{frame:04d}.png")
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        dt = time.time() - t0
        s = sharpness(r.filepath)
        results.append((frame, dt, s))
        print(f"RESULT frame {frame}: {dt:.1f}s  sharp text {s['text']:.2f}  centre {s['centre']:.2f}", flush=True)
    steady = [dt for _, dt, _ in results[1:]] or [results[0][1]]
    print(f"SUMMARY {os.path.basename(a.out)}: first {results[0][1]:.1f}s, steady {sum(steady)/len(steady):.1f}s/frame, mean text sharp {np.mean([s['text'] for _,_,s in results]):.2f}, centre {np.mean([s['centre'] for _,_,s in results]):.2f}")


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    main(argv)
