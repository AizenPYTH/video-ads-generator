"""
Quick stills from the template for judging a beat without a full render.

    blender/bin/bpy .../still.py 1,54,120 [scale%] [samples] [out_dir]

Loads iphone_cinematic_hero.blend, renders the frames given as seconds or
frame numbers ("2.8s" or "84") at a fraction of the resolution, and writes
<out_dir>/still-<frame>.png. Defaults: 50 %, 32 samples, blender/out.
"""
from __future__ import annotations

import os
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
BLEND = os.path.join(HERE, "iphone_cinematic_hero.blend")
DEFAULT_OUT = os.path.abspath(os.path.join(HERE, "..", "..", "out"))


def main() -> None:
    frames_arg = sys.argv[1] if len(sys.argv) > 1 else "1"
    scale = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    samples = int(sys.argv[3]) if len(sys.argv) > 3 else 32
    out_dir = sys.argv[4] if len(sys.argv) > 4 else DEFAULT_OUT
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=BLEND)
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
    except Exception:
        pass
    scene = bpy.context.scene
    fps = scene.render.fps
    frames = []
    for token in frames_arg.split(","):
        token = token.strip()
        if token.endswith("s"):
            frames.append(scene.frame_start + int(round(float(token[:-1]) * fps)))
        else:
            frames.append(int(token))

    scene.render.resolution_percentage = scale
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.use_motion_blur = False
    for frame in frames:
        scene.frame_set(frame)
        scene.render.filepath = os.path.join(out_dir, f"still-{frame:03d}.png")
        started = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"still {frame} ({(frame - scene.frame_start) / fps:.2f}s) -> {scene.render.filepath} in {time.time() - started:.1f}s", flush=True)


if __name__ == "__main__":
    main()
