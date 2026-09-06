"""
Renders the "iPhone Cinematic Hero" template with your content.

    blender/bin/bpy blender/templates/iphone_cinematic_hero/generate_iphone_template.py \
        --screen1 path/to/first.png --screen2 path/to/second.png \
        --logo path/to/logo.png --tagline "Do more, faster." \
        --cta "Download on the App Store" \
        --out blender/out/my-ad --quality preview

What it does, in order:
  1. opens iphone_cinematic_hero.blend (never modified)
  2. points the SCREEN_01 / SCREEN_02 images at your files and fits them to
     the display (cover: no stretching, centred crop)
  3. points the LOGO image at your file and keeps its aspect ratio
  4. sets the tagline and CTA strings (empty string hides the object)
  5. renders the frame range as PNGs, then assembles an MP4 with ffmpeg

Quality profiles:
  preview  640x360, Cycles 16 spp, fast denoise      judge motion and light quickly
  final    1920x1080 native, Cycles 32 spp adaptive, fast denoise, 1 px filter,
           no motion blur (the moves are slow; blur only costs sharpness)

The renderer is picked at start: any GPU Blender can see (OptiX, CUDA, HIP,
Metal, oneAPI) is used, otherwise the CPU; --engine eevee switches to EEVEE
for machines with a GPU, where it is near real time and very close in look.

Nothing here touches a keyframe: the animation is the template's.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
BLEND = os.path.join(HERE, "iphone_cinematic_hero.blend")
DEFAULT_OUT = os.path.abspath(os.path.join(HERE, "..", "..", "out", "iphone_cinematic_hero"))

QUALITY = {
    # scale is a percentage of the template's 1920x1080.
    "preview": {"scale": 33, "samples": 16, "adaptive": 0.1, "prefilter": "FAST", "bounces": 3, "filter": 1.0, "eevee_samples": 16, "crf": 20},
    "final": {"scale": 100, "samples": 32, "adaptive": 0.05, "prefilter": "FAST", "bounces": 4, "filter": 1.0, "eevee_samples": 48, "crf": 16},
}

# Cycles compute backends, best first. The first one with a device wins.
GPU_BACKENDS = ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--screen1", help="image for the first screen (SCREEN_01)")
    parser.add_argument("--screen2", help="image for the second screen (SCREEN_02)")
    parser.add_argument("--logo", help="logo image with transparency (LOGO)")
    parser.add_argument("--tagline", help="short line next to the logo; '' hides it")
    parser.add_argument("--cta", help="call to action under the tagline; '' hides it")
    parser.add_argument("--out", default=DEFAULT_OUT, help="output directory (frames/ and the mp4)")
    parser.add_argument("--name", default="iphone_cinematic_hero", help="mp4 basename")
    parser.add_argument("--quality", choices=sorted(QUALITY), default="preview")
    parser.add_argument("--engine", choices=["cycles", "eevee"], default="cycles", help="eevee is near real time on a GPU and close in look; cycles is the reference")
    parser.add_argument("--samples", type=int, help="override the profile's Cycles samples")
    parser.add_argument("--cpu", action="store_true", help="ignore any GPU")
    parser.add_argument("--frames", help="frame range to render, e.g. 1-300 or 84-156 (default: whole template)")
    parser.add_argument("--step", type=int, default=1, help="render every Nth frame (timing checks)")
    parser.add_argument("--fps", type=int, help="override output fps for the mp4 (default: the scene's)")
    parser.add_argument("--no-video", action="store_true", help="skip the ffmpeg assembly")
    parser.add_argument("--light", type=float, help="global light multiplier (TEMPLATE_CONTROLLER.light_intensity)")
    parser.add_argument("--threads", type=int, help="CPU threads for Cycles (default: all)")
    return parser.parse_args(argv)


# --------------------------------------------------------------------------
# Content replacement
# --------------------------------------------------------------------------


def replace_image(name: str, path: str) -> bpy.types.Image:
    """Points the named template image at a new file and reloads it."""
    path = os.path.abspath(path)
    if not os.path.isfile(path):
        raise SystemExit(f"{name}: file not found: {path}")
    image = bpy.data.images[name]
    image.filepath = path
    image.source = "FILE"
    image.reload()
    if image.size[0] == 0 or image.size[1] == 0:
        raise SystemExit(f"{name}: {path} is not an image Blender can read")
    image.colorspace_settings.name = "sRGB"
    return image


def fit_screen(name: str) -> None:
    """
    Scales the screen's mapping so the image covers the display without
    stretching. The display's aspect is known from the template; the image's
    from the file. Cover = scale the smaller ratio up, crop the excess evenly.
    """
    mat = bpy.data.materials["SCREEN_MAT"]
    mapping = mat.node_tree.nodes[f"{name}_FIT"]
    image = bpy.data.images[name]
    display_w = bpy.data.objects["iPhone_Screen"]["display_size_mm"][0]
    display_h = bpy.data.objects["iPhone_Screen"]["display_size_mm"][1]
    display_aspect = display_w / display_h
    image_aspect = image.size[0] / image.size[1]
    # Content coordinates run 0..1 across the display; scale them so the
    # image's shorter relative edge fills.
    if image_aspect > display_aspect:
        sx, sy = display_aspect / image_aspect, 1.0
    else:
        sx, sy = 1.0, image_aspect / display_aspect
    mapping.inputs["Scale"].default_value = (sx, sy, 1.0)
    mapping.inputs["Location"].default_value = ((1 - sx) / 2, (1 - sy) / 2, 0.0)
    print(f"{name}: {image.size[0]}x{image.size[1]} fitted (scale {sx:.3f}, {sy:.3f})")


LOGO_MAX_WIDTH = 0.16  # metres at the overlay depth: about a third of the frame


def fit_logo() -> None:
    """
    Keeps the logo's own aspect on every keyframe of its scale. The plane is
    anchored on its left edge, so only the width changes; a very wide mark
    is shrunk so it never runs past a third of the frame.
    """
    logo = bpy.data.objects["LOGO"]
    image = bpy.data.images["LOGO"]
    aspect = image.size[0] / image.size[1]
    old = float(logo.get("aspect", 1.0))
    logo["aspect"] = aspect
    for fc in _fcurves(logo):
        if fc.data_path != "scale":
            continue
        for kp in fc.keyframe_points:
            height = kp.co.y / old if fc.array_index == 0 else kp.co.y
            shrink = min(1.0, LOGO_MAX_WIDTH / (height * aspect))
            new = height * shrink * (aspect if fc.array_index == 0 else 1.0)
            for point in (kp.co, kp.handle_left, kp.handle_right):
                point.y = new if fc.array_index in (0, 1) else point.y
    print(f"LOGO: {image.size[0]}x{image.size[1]} aspect {aspect:.3f}")


def _fcurves(animated) -> list:
    anim = animated.animation_data
    if anim is None or anim.action is None:
        return []
    try:
        for layer in anim.action.layers:
            for strip in layer.strips:
                bag = strip.channelbag(anim.action_slot, ensure=False)
                if bag is not None:
                    return list(bag.fcurves)
    except AttributeError:
        pass
    return list(anim.action.fcurves)


def set_text(name: str, body: str | None) -> None:
    if body is None:
        return
    obj = bpy.data.objects[name]
    obj.data.body = body
    obj.hide_render = body.strip() == ""
    print(f"{name}: {body!r}" if body.strip() else f"{name}: hidden")


# --------------------------------------------------------------------------
# Render
# --------------------------------------------------------------------------


def pick_device(scene: bpy.types.Scene, allow_gpu: bool) -> str:
    """
    Enables the best compute backend Blender can actually see and returns a
    label for the log. Never assumes: it asks Cycles for its device list.
    """
    prefs = bpy.context.preferences.addons["cycles"].preferences
    if allow_gpu:
        for backend in GPU_BACKENDS:
            try:
                prefs.compute_device_type = backend
                prefs.refresh_devices()
            except Exception:
                continue
            gpus = [d for d in prefs.devices if d.type != "CPU"]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type != "CPU"
                scene.cycles.device = "GPU"
                return f"GPU {backend}: " + ", ".join(d.name for d in gpus)
    prefs.compute_device_type = "NONE"
    scene.cycles.device = "CPU"
    return f"CPU ({os.cpu_count()} threads)"


def configure(scene: bpy.types.Scene, args: argparse.Namespace) -> tuple[int, int]:
    preset = QUALITY[args.quality]
    r = scene.render
    r.resolution_percentage = preset["scale"]
    r.filter_size = preset["filter"]
    r.use_motion_blur = False
    r.use_persistent_data = True
    c = scene.cycles
    c.samples = args.samples or preset["samples"]
    c.use_adaptive_sampling = True
    c.adaptive_threshold = preset["adaptive"]
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = preset["prefilter"]
    c.max_bounces = preset["bounces"]
    c.diffuse_bounces = min(c.diffuse_bounces, preset["bounces"])
    c.glossy_bounces = min(c.glossy_bounces, preset["bounces"])
    c.transmission_bounces = min(c.transmission_bounces, preset["bounces"])
    if args.engine == "eevee":
        r.engine = "BLENDER_EEVEE"
        e = scene.eevee
        e.taa_render_samples = preset["eevee_samples"]
        for attr, value in (("use_raytracing", True), ("use_shadows", True)):
            if hasattr(e, attr):
                setattr(e, attr, value)
        device = "GPU/GL (EEVEE)"
    else:
        r.engine = "CYCLES"
        device = pick_device(scene, allow_gpu=not args.cpu)
    print(f"engine {r.engine} on {device}; {r.resolution_x * r.resolution_percentage // 100}x{r.resolution_y * r.resolution_percentage // 100}, {c.samples} spp" if r.engine == "CYCLES" else f"engine EEVEE; {r.resolution_x * r.resolution_percentage // 100}x{r.resolution_y * r.resolution_percentage // 100}, {scene.eevee.taa_render_samples} samples")
    if args.threads:
        scene.render.threads_mode = "FIXED"
        scene.render.threads = args.threads
    if args.light is not None:
        bpy.data.objects["TEMPLATE_CONTROLLER"]["light_intensity"] = args.light
    start, end = scene.frame_start, scene.frame_end
    if args.frames:
        a, _, b = args.frames.partition("-")
        start = int(a)
        end = int(b) if b else start
    return start, end


def render_frames(scene: bpy.types.Scene, start: int, end: int, step: int, frames_dir: str) -> list[str]:
    os.makedirs(frames_dir, exist_ok=True)
    total = len(range(start, end + 1, step))
    written = []
    began = time.time()
    for i, frame in enumerate(range(start, end + 1, step), 1):
        path = os.path.join(frames_dir, f"frame_{frame:04d}.png")
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            written.append(path)
            continue  # resume after an interruption
        scene.frame_set(frame)
        scene.render.filepath = path
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        elapsed = time.time() - began
        remaining = (elapsed / i) * (total - i)
        print(f"[{i}/{total}] frame {frame} in {time.time() - t0:.1f}s, ~{remaining / 60:.1f} min left", flush=True)
        written.append(path)
    return written


def assemble(frames_dir: str, out_path: str, fps: int, start: int, step: int, crf: int = 16) -> None:
    """
    H.264 High profile, 4:2:0, CRF-driven with a bitrate ceiling: what
    TikTok, Reels and Shorts ingest without re-encoding artefacts. CRF 16
    keeps text edges and UI lines intact; the dark set compresses well.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ffmpeg not found; frames are in", frames_dir)
        return
    # A contiguous numbering for ffmpeg, whatever the step. The concat
    # demuxer resolves paths relative to the list, so names only.
    listing = os.path.join(frames_dir, "frames.txt")
    names = sorted(n for n in os.listdir(frames_dir) if n.startswith("frame_") and n.endswith(".png"))
    with open(listing, "w", encoding="utf-8") as fh:
        for name in names:
            fh.write(f"file '{name}'\nduration {step / fps}\n")
    cmd = [
        ffmpeg, "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", listing,
        # 4:2:0 needs even dimensions; a percentage of 1920x1080 can land on odd ones.
        "-vf", "fps=%d,scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p" % (fps // step if step > 1 else fps),
        "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level", "4.2",
        "-crf", str(crf), "-maxrate", "24M", "-bufsize", "48M",
        "-x264-params", "aq-mode=3:deblock=-1,-1",
        "-movflags", "+faststart",
        out_path,
    ]
    subprocess.run(cmd, check=True)
    print("video:", out_path, os.path.getsize(out_path), "bytes")


def main(argv: list[str]) -> None:
    args = parse_args(argv)
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    try:
        bpy.ops.preferences.addon_enable(module="cycles")
    except Exception:
        pass
    scene = bpy.context.scene

    if args.screen1:
        replace_image("SCREEN_01", args.screen1)
    if args.screen2:
        replace_image("SCREEN_02", args.screen2)
    fit_screen("SCREEN_01")
    fit_screen("SCREEN_02")
    if args.logo:
        replace_image("LOGO", args.logo)
        fit_logo()
    set_text("TEXT_TAGLINE", args.tagline)
    set_text("TEXT_CTA", args.cta)

    start, end = configure(scene, args)
    frames_dir = os.path.join(args.out, "frames")
    print(f"rendering {args.quality}: frames {start}-{end} step {args.step} at {scene.render.resolution_percentage}% / {scene.cycles.samples} spp -> {frames_dir}")
    render_frames(scene, start, end, args.step, frames_dir)
    if not args.no_video:
        assemble(frames_dir, os.path.join(args.out, f"{args.name}.mp4"), args.fps or scene.render.fps, start, args.step, QUALITY[args.quality]["crf"])


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    main(argv)
