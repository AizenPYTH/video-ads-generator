# Blender templates

Premium ad templates built and rendered in Blender, driven entirely from
Python. Nothing here depends on the web app; it is the rendering side of the
product, one template at a time.

## Running Blender here

There is no Blender binary in this environment and the download site is
blocked, so Blender runs as the official `bpy` Python module (Blender 5.0.1
for Python 3.11) inside its own virtualenv. `setup.sh` installs it plus the
Mesa libraries EEVEE needs to run without a display; `bin/bpy` runs a script
inside it.

```bash
./blender/setup.sh                       # once; idempotent
./blender/bin/bpy some_script.py         # python with bpy, headless
```

Both Cycles (CPU, OpenImageDenoise) and EEVEE (llvmpipe over EGL) render.
The templates use Cycles: real reflections, soft shadows and depth of field
are what the look is made of. There is no GPU in this environment (checked:
Cycles lists only the CPU, no /dev/dri); the numbers below are four CPU
cores, and the generator picks up a GPU by itself where one exists.

## Template: iPhone Cinematic Hero

`templates/iphone_cinematic_hero/`

| File | Role |
| --- | --- |
| `build_template.py` | Builds `iphone_cinematic_hero.blend` from scratch: model, screen system, materials, studio, lights, camera, animation. Deterministic. |
| `iphone_cinematic_hero.blend` | The template. Open it in Blender to tune; rebuild to regenerate. |
| `generate_iphone_template.py` | Loads the template, swaps SCREEN_01 / SCREEN_02 / LOGO / text, renders, assembles the MP4. |
| `make_placeholders.py` | Writes the placeholder screens and logo in `screens/`. |
| `still.py` | Renders single frames for judging a beat. |

### The model

`iphone_15_pro.glb` at the repository root (Sketchfab, 4.7 MB, eight meshes,
PBR with textures). It is the only iPhone in the repository; there is no
`ASSETS1/` folder on any branch. The builder imports it, renames the parts
(`iPhone_Frame`, `iPhone_FrameEdge`, `iPhone_Glass`, `iPhone_CameraBump`,
…), scales it to metres and cuts the flat front of the glass into its own
mesh, `iPhone_Screen`, with planar UVs. The panel, its corner radius and the
Dynamic Island are drawn in the shader from real millimetre measurements,
so the screenshot lands on the display and nowhere else.

### The screen system

`SCREEN_MAT` on `iPhone_Screen` is an emissive panel under a glass coat.
Two images, `SCREEN_01` and `SCREEN_02` (relative paths into `screens/`),
share it through named value nodes the animation drives:

- `SCREEN_BRIGHTNESS` — the display wakes at 2.7 s.
- `SCREEN_ZOOM` — the first screen settles from 1.07× to 1× as it wakes.
- `SCREEN_PROGRESS` — the push transition at 4.05–5.0 s: the second screen
  slides in from the right, the first drifts left at a third of the speed
  and dims. Not a fade.
- `SCREEN_01_FIT` / `SCREEN_02_FIT` — mapping nodes the generator sets so
  any image covers the display without stretching.

Replace an image by pointing `bpy.data.images["SCREEN_01"]` at a new file;
the generator does this and refits.

### Scene structure

Collections `DEVICE`, `CAMERA`, `LIGHTS`, `ENVIRONMENT`, `SCREENS`, `LOGO`,
`TEXT`, `CONTROLS`.

- `TEMPLATE_CONTROLLER` (in `CONTROLS`) is the parent of `DEVICE_ROOT`: move,
  scale or rotate it to offset the whole phone without touching keyframes.
  Its custom properties `light_intensity` (drives every light) and
  `rim_boost` (drives the two rim lights, animated) are read by drivers on
  the lights' power.
- `DEVICE_ROOT` carries the phone's animation; `DEVICE_PIVOT` under it holds
  the millimetre-to-metre scale and centring; `FOCUS` under it is the
  camera's depth-of-field target.
- `CAMERA` (65 mm, f/2.8–5, nine blades) tracks `CAMERA_TARGET`; both are
  keyframed independently of the phone; a deterministic noise modifier adds
  a handheld drift to the camera position.
- Lights: `KEY` (0.9×1.3 m area, warm, upper left), `FILL` (large, cool,
  right), `TOP_STRIP` (the highlight that travels across the glass),
  `RIM_LEFT` / `RIM_RIGHT` (thin strips behind the phone for the titanium
  edges, light-linked to the phone so they never paint the floor),
  `BACKGROUND_WASH` (a soft area light on the cyclorama for separation).
- `STUDIO_CYC`: floor, 0.5 m cove, wall, in graphite with a soft gloss so
  the phone has a floor reflection and a contact shadow.
- `LOGO`, `TEXT_TAGLINE`, `TEXT_CTA` hang from `OVERLAY_RIG`, a camera child
  whose driver scales it to the camera-to-focus distance: they sit in the
  frame like a title card and always on the focus plane, so depth of field
  never softens them.

### Timeline (30 fps, 300 frames)

| Time | Beat |
| --- | --- |
| 0.0–0.5 s | Set alone; the phone rises into frame from below, tilted. |
| 0.5–1.8 s | It turns to face the camera on Bezier curves, overshooting 7° past front. |
| 1.8–2.8 s | Settles to front; the camera starts forward. |
| 2.7–4.0 s | Push-in; the display wakes with the first screen. |
| 4.05–5.0 s | Push transition to the second screen; small phone and camera move. |
| 5.2–6.5 s | Pull back; the phone drifts to the right third. |
| 6.5–7.5 s | Slow yaw; rim lights breathe up 1.7× on the edges. |
| 7.5–8.6 s | Logo and tagline settle in on the left. |
| 8.5–10.0 s | CTA; last drift; exposure to black over the final half second. |

### Rendering

```bash
# stills at chosen times (seconds or frame numbers), 50 %, 32 samples
./blender/bin/bpy blender/templates/iphone_cinematic_hero/still.py 0.3s,3.5s,8.3s 50 32

# the deliverable with your content
./blender/bin/bpy blender/templates/iphone_cinematic_hero/generate_iphone_template.py \
  --screen1 a.png --screen2 b.png --logo logo.png \
  --tagline "Do more, faster." --cta "Download on the App Store" \
  --quality final --out blender/out/demo
```

Two profiles, both Cycles with OpenImageDenoise, no motion blur (the moves
are slow enough that blur only costs sharpness):

| Profile | Frame | Samples | Denoise | Filter | Encode | CPU, 4 cores | GPU (RTX-class, est.) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `preview` | 640×360 | 16, adaptive 0.1 | fast prefilter | 1.0 px | H.264 CRF 20 | ~5 s/frame, 25 min for 10 s | ~0.3 s/frame |
| `final` | 1920×1080 native | 32, adaptive 0.05 | fast prefilter | 1.0 px | H.264 High 4.2, CRF 16, 24 Mb/s cap, 4:2:0 | ~85 s/frame, 7 h for 10 s | ~2–4 s/frame |

The device is detected at start, never assumed: the first of OptiX, CUDA,
HIP, Metal, oneAPI with a device is used, otherwise the CPU, and the log
says which. `--engine eevee` renders with EEVEE: on a GPU it is near real
time and, on this scene, very close to Cycles in look (tested side by side);
without a GPU it runs on software GL and gains nothing. `--samples N`
overrides the profile, `--frames 84-156` renders a slice, `--step 3` every
third frame; frames already on disk are skipped, so an interrupted render
resumes.

Why it is sharp now (measured on 1080p frames, Laplacian variance of the
tagline crop): the logo and text used to sit at a fixed 0.66 m from the lens
while the focus plane drifted to 0.74 m in the outro, 4–9 px of defocus.
They now hang from `OVERLAY_RIG`, a camera child whose driver scales it to
the camera-to-focus distance, so they keep their exact place in the frame
and stay on the focus plane: text sharpness 22.6 → 74 at the same settings.
Screens and logo are sampled at their native resolution with linear
filtering (no downscale anywhere in the pipeline); the render filter went
from 1.5 px to 1.0 px. 128 → 32 samples with the fast denoiser prefilter is
indistinguishable on this scene and 3× faster.

Screens can be any resolution: the shader maps them to the display by UV,
so a 1179×2556 capture is sampled 1:1 at the push-in (the display is about
1190 px tall in 1080p). The logo keeps its file resolution and alpha.
