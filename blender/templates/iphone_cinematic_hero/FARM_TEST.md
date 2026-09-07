# Farm test: five frames on blender.farm

Goal: compare image quality, sharpness and time per frame between the local
CPU render and blender.farm, on five representative frames, without a full
render.

## What to upload

```bash
./blender/bin/bpy blender/templates/iphone_cinematic_hero/make_farm_test.py
# -> blender/out/farm-test/iphone_hero_farm_test.blend  (5.6 MB, self-contained)
```

One file. Every image and font is packed inside; nothing else to send. The
render settings baked in are exactly the `final` profile:

| Setting | Value |
| --- | --- |
| Engine | Cycles, device GPU (the farm's choice) |
| Frame | 1920×1080, 100 % |
| Samples | 32, adaptive, threshold 0.05 |
| Denoise | OpenImageDenoise, albedo + normal, fast prefilter |
| Pixel filter | 1.0 px |
| Motion blur | off |
| Bounces | 4 total (diffuse 3, glossy 4, transmission 4) |
| Output | PNG RGB 8-bit, `//farm_out/frame_####` |
| Blender | 5.0.1 (the file was saved by the bpy 5.0.1 module) |

Timeline markers name the five frames. Frames to render, as a list:

```
37,61,106,139,250
```

| Frame | Beat | What to look at |
| --- | --- | --- |
| 37 | movement | mid-turn, titanium edges, floor reflection, screen off |
| 61 | iphone | settled front view, glass reflections, contact shadow |
| 106 | screenshot | push-in, the display and Dynamic Island, text on screen |
| 139 | transition | the push between the two screens, two images live at once |
| 250 | outro | logo, tagline, CTA on the focus plane, small phone with DoF |

If the farm only takes a range, `frame_start`..`frame_end` is 37..250 (214
frames): set the list, or the range 37-250 with a step, or submit five jobs
of one frame each. Do not let it render the whole range.

## Submitting

The farm is not reachable from this development environment (its domains
are refused by the network egress proxy, along with extensions.blender.org
where its add-on lives), and no blender.farm API key exists in the project.
Submit from a machine with normal internet access:

1. Create/sign in to a blender.farm account, install their add-on or use
   the web uploader.
2. Upload `iphone_hero_farm_test.blend`. If the add-on inspects references,
   it will find none: everything is packed.
3. Choose Blender 5.0 (or the newest 4.x if 5.0 is not offered; the scene
   uses light linking and slotted actions, both fine from 4.4 up), Cycles,
   GPU, output PNG, frames `37,61,106,139,250`.
4. Note the per-frame render time the farm reports.
5. Download the five PNGs into `blender/out/farm-test/farm/`.

## Comparing

The local reference renders of the same five frames, same settings, are in
`blender/out/farm-test/local_reference/` (CPU, four cores; times in
`/tmp/farm-local.log` when produced in this environment).

```bash
./blender/bin/bpy blender/templates/iphone_cinematic_hero/compare_farm.py \
  --farm blender/out/farm-test/farm \
  --farm-times '{"37": 4.1, "61": 3.9, "106": 5.2, "139": 5.0, "250": 4.4}'
```

The report gives, per frame, local and farm seconds, Laplacian-variance
sharpness of the whole frame and of the text crop, and the mean absolute
pixel difference (0–255; below ~2 the two are the same picture up to noise).
It also writes `blender/out/farm-test/compare/frame_NNNN.png`: local | farm
| difference ×4, to look at side by side.

What to expect: identical framing and look (same file, same settings; Cycles
is deterministic up to the noise pattern and the denoiser's floating-point
path), sharpness within a few percent, and a per-frame time that depends only
on the farm's GPU: an RTX 4090-class card renders this frame in roughly 2–4 s
against 80–85 s here.
