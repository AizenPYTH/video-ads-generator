"""
Packs a self-contained test scene for a render farm.

    blender/bin/bpy make_farm_test.py [out.blend]

Output (default blender/out/farm-test/iphone_hero_farm_test.blend):
  - every image and font packed inside the file (nothing to upload alongside)
  - the "final" profile baked into the render settings: 1920x1080, Cycles,
    32 samples adaptive 0.05, OpenImageDenoise fast prefilter, 1.0 px filter,
    no motion blur, PNG output
  - five timeline markers on the frames to render:
        37 movement     the phone mid-turn, screen off
        61 iphone       settled, facing the camera, screen off
       106 screenshot   push-in on the first screen
       139 transition   the push between the two screens
       250 outro        logo and tagline in
  - frame_start/frame_end set to 37..250 so a farm that ignores frame lists
    still covers the range; submit the list "37,61,106,139,250" where it can.

Nothing about the animation or the look is touched: the settings written
here are the ones generate_iphone_template.py --quality final uses.
"""
from __future__ import annotations

import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
BLEND = os.path.join(HERE, "iphone_cinematic_hero.blend")
DEFAULT_OUT = os.path.abspath(os.path.join(HERE, "..", "..", "out", "farm-test", "iphone_hero_farm_test.blend"))

FRAMES = {37: "movement", 61: "iphone", 106: "screenshot", 139: "transition", 250: "outro"}


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else DEFAULT_OUT
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
    except Exception:
        pass
    scene = bpy.context.scene
    r, c = scene.render, scene.cycles

    r.engine = "CYCLES"
    r.resolution_percentage = 100
    r.filter_size = 1.0
    r.use_motion_blur = False
    r.use_persistent_data = True
    c.device = "GPU"  # farms choose their own device; harmless on CPU
    c.samples = 32
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.05
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "FAST"
    c.max_bounces = 4
    c.diffuse_bounces = 3
    c.glossy_bounces = 4
    c.transmission_bounces = 4
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGB"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 50
    r.filepath = "//farm_out/frame_####"

    scene.frame_start, scene.frame_end = min(FRAMES), max(FRAMES)
    scene.timeline_markers.clear()
    for frame, name in FRAMES.items():
        scene.timeline_markers.new(name, frame=frame)

    bpy.ops.file.pack_all()
    loose = [i.name for i in bpy.data.images if i.source == "FILE" and i.packed_file is None]
    if loose:
        raise SystemExit(f"images not packed: {loose}")
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True, copy=True)
    print(f"farm test blend: {out} ({os.path.getsize(out) / 1e6:.1f} MB)")
    print("frames:", ", ".join(f"{f} ({n})" for f, n in FRAMES.items()))
    print(f"settings: {r.resolution_x}x{r.resolution_y}, Cycles {c.samples} spp adaptive {c.adaptive_threshold}, OIDN {c.denoising_prefilter}, filter {r.filter_size}, Blender {bpy.app.version_string}")


if __name__ == "__main__":
    main()
