# Reel — motion templates for products

Pick an animation. Hand it your website or your app. Your product ends up
inside — a real motion-design shot, rendered to MP4 in 9:16, 16:9 or 1:1.

Two standalone apps that deploy independently of the Next.js `smart-seller`
app in this repo:

| Path        | What it is                                                             |
| ----------- | ---------------------------------------------------------------------- |
| `backend/`  | Express + TypeScript API, Playwright capture, Remotion renderer, ffmpeg |
| `frontend/` | React 19 + Vite + Tailwind 4 — the template gallery and the editor      |

Neither is compiled by the root `tsconfig.json`, linted by the root ESLint
config, or picked up by the root Vitest config.

The architecture and the reasoning behind it are in
[`TEMPLATE_ENGINE_PLAN.md`](./TEMPLATE_ENGINE_PLAN.md).

---

## Run it on your machine

From the repo root, once:

```bash
npm run video:setup          # installs both apps + the Chromium Playwright needs
cp backend/.env.example backend/.env
```

Then two terminals:

```bash
npm run video:backend        # http://localhost:3001
npm run video:frontend       # http://localhost:5173  <- open this one
```

Vite proxies `/api` and `/media` to the backend, so dev is same-origin and
behaves like production. (`/media`, not `/assets` — Vite emits the frontend
bundle under `/assets`.)

**It runs without an `ANTHROPIC_API_KEY`.** The key only powers an optional
enrichment step (brand name and palette read off the captured page); without
it a DOM heuristic does the same job less cleverly. Capture, preview, render
and download never touch it.

### What it needs

- **Node 20+.**
- **Chromium for Playwright** — `npm run video:setup` installs it.
- **A headless-shell Chromium for Remotion** — the same install lays it
  down; the backend finds it by itself. These are two different binaries;
  see *Browsers* below.
- **ffmpeg** — bundled via `ffmpeg-static`, nothing to install.

The first render takes an extra ~20s while Remotion bundles. After that,
budget about three minutes per format for a ten-second template on a small
container.

---

## The product

```
GALLERY ──► pick a template ──► EDITOR ──► website / App Store / files
                                              │
                                              ▼
                                   captures ──► pick & order screens
                                   logo, name, colours, copy, links
                                              │
                                              ▼  (live preview the whole time)
                                   GENERATE ──► one MP4 per chosen format
```

### Templates

A template is a finished shot: camera, device, light, timing, easing,
transitions — all authored, frame-deterministic, nothing decided by a model
at render time. Two run on the WebGL engine, ten on the CSS-3D one:

| Id | Shot |
| --- | --- |
| `iphone-hero` | **3D.** A real phone on a bright studio set. Settle, a quarter orbit, a slow dolly, one screen swap, a pull-out for the mark and the link. Nothing spins. |
| `macbook-hero` | **3D.** A shut laptop on a bright desk, filmed from above. The lid opens on its hinge as the camera comes down to meet it; a push into the site; a pull-out. |
| `macbook-open` | Shut on a dark desk. The lid opens toward a descending camera, the screen lights the deck, the shot pushes in, pulls back for the sign-off. |
| `iphone-rise` | Rises from below, back to camera, and turns to face you. Floats. Squares up for the store card. |
| `macbook-orbit` | The camera walks a third of the way around an open laptop, then commits to the screen. |
| `phone-float` | In the air, tumbling slowly over its own reflection. Nothing happens fast. |
| `monitor-pushin` | A display on a desk. One patient push from off-axis to straight-on. |
| `iphone-perspective` | Lying on a surface, seen low from the side; one continuous swoop until the screen is flat to the lens. |
| `macbook-fullframe` | Starts inside the screen, edge to edge, and pulls out to reveal the machine at the end. |
| `iphone-rapid` | Front-on and fast: a screen every beat, and the phone takes the hit each time. |
| `duo` | Phone in front of a laptop; wide captures on one, tall ones on the other. |
| `logo-reveal` | The mark blooms first, then shrinks to the corner as the device scales up behind it. Ends on store badges. |

Each declares which aspects it is composed for — composed, not scaled: in
portrait the copy sits under the device, in landscape it takes a column
beside it. `macbook-fullframe` does not offer 9:16 because a wide screen
edge-to-edge in a portrait frame is not a shot.

### Slots

A template says what it takes and the editor shows exactly those controls:

```ts
slots: {
  screens: { min: 1, max: 4, surface: "desktop" },  // which captures it wants first
  logo: "optional",                                  // or "required", or "none"
  headline: true, subline: true,
  cta: true,          // end card with the link and a QR code
  accent: true,       // tints its world with the brand colours
  duration: null,     // fixed length
}
```

The content — screens in the user's order, logo, brand, copy, resolved CTA
— is the Remotion input. The same props feed the browser preview and the
server render, so what you see in the editor is the output.

### The live preview

The editor plays the template through `@remotion/player` with whatever is
in it right now — for the 3D templates that is a live WebGL scene, one per
page. Reorder screens, drop a logo, type a headline: the phone updates
without a round trip. The gallery never mounts a scene: each card is a
pre-rendered poster that plays a pre-rendered loop on hover.

### Where the screens come from

| Source | What happens |
| --- | --- |
| Website URL | Playwright captures the page on a phone viewport and a desktop one — hero plus the most visually substantial sections below the fold — and the editor pre-selects whichever surface the template wants. |
| App Store URL | The listing id is resolved through Apple's lookup API: the developer's own screenshots at full size, the icon as the logo, the name as the brand. If the lookup fails, the page is captured like any site. |
| Files | PNG, JPG or WebP, up to eight. Tall ones are treated as phone captures, wide ones as desktop. |

A logo can be uploaded on its own (PNG, JPEG, WebP, SVG). Its real
dimensions are read — WebP and SVG headers included — and it is placed
contain-fit, never stretched.

### Where the ad sends people

The last card shows one destination with a QR code. A phone template ends
on the store listing when there is one, a laptop or monitor template on the
site; each falls back to the other, and both fall back to the captured
page. Links that are not http(s) are dropped rather than printed.

---

## Endpoints

| Method | Path                                  | Does                                                    |
| ------ | ------------------------------------- | ------------------------------------------------------- |
| `GET`  | `/api/templates`                      | The library, minus the components                        |
| `POST` | `/api/upload`                         | `{url}` (site or App Store) or `{screenshots:[dataUri]}` → capture session |
| `POST` | `/api/upload/logo`                    | `{logo: dataUri}` → `ImageAsset`                          |
| `POST` | `/api/analyze`                        | `{uploadId}` → brand name and palette (optional)         |
| `GET`  | `/api/appstore?term=`                 | App Store search, proxied                                |
| `POST` | `/api/generate`                       | `{templateId, aspects, input}` → `jobId`                 |
| `GET`  | `/api/video/:jobId/status`            | progress, message, outputs keyed by aspect, poster       |
| `GET`  | `/api/video/:jobId/download/:format`  | `9x16` \| `16x9` \| `1x1` → MP4 attachment               |
| `GET`  | `/media/:bucket/:file`                | captures, uploads, renders, posters                      |
| `GET`  | `/health`                             | queue kind, Claude mode                                  |

Captured bytes stay on the server. The client only ever holds ids and URLs.
A screen handed to `/api/generate` must point at this host's `/media` or be
a data URI: headless Chrome loads whatever a screen URL says, and an
internal address is the one shape that must never reach it.

---

## Rendering

`backend/remotion/src/` is a self-contained module — it imports nothing
outside itself but `remotion`, `react` and the Three.js stack, no
`process.env`, no `node:*` — so it runs in the renderer and in the browser
alike.

```
engine3d/     the WebGL engine (Three.js + React Three Fiber + @remotion/three)
  scene/      Scene3D: the canvas synced to the Remotion frame; two quality levels
  camera/     Camera3D state (distance, yaw, pitch, fov, target, pan, roll) + CameraRig
  lighting/   LightingRig: five soft boxes baked into an environment map, a shadow
              light, a floor fogged into the backdrop, a backdrop wall
  devices/    IPhone3D (the GLB, its real display mesh), MacBook3D (body > hinge >
              display > screen, lid rotates on the hinge), Device dispatcher
  screen/     ScreenSurface: screenshots painted into a canvas texture on the
              real display mesh; fit, scroll, crossfade, bezel, Dynamic Island
engine/       the CSS-3D engine the earlier templates use, and the shared pieces
              (easing, keyframes, layout per aspect, copy, end card, placeholders)
templates/    one folder per template; templates/index.ts is the library
scenes/       reference scenes for judging motion, not in the library
```

### The 3D assets

The source model — `iphone_15_pro.glb` at the repo root, 4.7 MB from
Sketchfab — is never loaded by a browser. `backend/scripts/prepare-devices.mjs`
turns it into the 612 KB runtime asset at `backend/remotion/public/models/`
(copied to `frontend/public/models/`): it splits the front face of the outer
glass into a `Screen` mesh with planar UVs so a canvas texture lands on the
display exactly, names the parts, sets sane PBR values, converts textures to
WebP and quantizes the geometry.

```bash
cd backend && npm run assets:prepare     # after changing the source model
```

No MacBook source exists in the repo. `MacBook3D` is modelled at real
dimensions with the hierarchy a rigged asset would have, so swapping in a GLB
later replaces geometry, not animation.

### Determinism

Everything is a function of `useCurrentFrame()`: camera, device pose, lid
angle, which screenshot is on the screen. No `Date.now()`, no unseeded
random, no accumulation between frames. Remotion renders with a manual frame
loop; three things had to meet it and are commented where they live — a
canvas texture must be created at its final size (WebGL2 storage is
immutable after first upload), asynchronous arrivals (the model, the
screenshots) request a frame and only then release the render delay, and
the environment map bakes every frame rather than once.

### Gallery previews

The gallery mounts no WebGL. Each card shows a poster and plays a 540p loop
on hover or when in view, both pre-rendered:

```bash
cd backend && npm run previews:render            # all templates
cd backend && npm run previews:render iphone-hero # one
```

Output goes to `frontend/public/previews/<id>.jpg|mp4` and is committed. The
editor mounts exactly one scene, inside an error boundary that explains a
missing WebGL context or a model that failed to load in plain words.

One Remotion composition is registered per template per aspect
(`<id>--<aspect>`, e.g. `macbook-open--9x16`). The backend renders one
native composition per requested format; nothing is cropped from a master.

When a render fails, the job carries a sentence a person can act on (a
screenshot that never loaded, a renderer that ran out of memory, a full
disk) — see `backend/src/jobs/renderFailure.ts` — and the full error goes
to the log.

### Adding a template

1. Create `backend/remotion/src/templates/<id>/index.tsx` exporting
   `template: TemplateDefinition`.
2. Add it to the list in `templates/index.ts`.
3. `npm run video:sync` at the repo root.

It is then in the gallery, in Root, and in `/api/templates`. The test suite
checks every template for a legal id, at least one aspect, coherent slots
and a placeholder input that respects them.

### The frontend mirror

`frontend/src/video/` is a committed copy of `backend/remotion/src/`, made
by `scripts/sync-video.mjs`. Not a shared package: Vercel builds from
`frontend/` and cannot see `../backend`, Railway builds from `backend/` and
cannot see `../frontend`. A committed copy is the only thing that deploys
without touching either platform's settings.

```bash
npm run video:sync     # copy
npm run video:check    # exit 1 if the copy is stale
```

### Memory

Rendering is what gets a small container OOM-killed, and every lever is an
environment variable. The defaults are sized for a ~1 GB instance:

| Variable | Default | Effect |
| --- | --- | --- |
| `RENDER_CONCURRENCY` | `1` | Frames in parallel. Each is a Chrome tab holding a full frame buffer — the largest single lever. |
| `VIDEO_SHORT_EDGE` | `720` | Compositions are authored at 1080 and scaled to this. 720 is 44% of the pixels. |
| `VIDEO_CRF` | `28` | x264 quality. Higher is smaller and cheaper to encode. |
| `X264_PRESET` | `veryfast` | Faster presets use less memory for motion search. |

There is no audio track. Remotion attaches a silent AAC stream by default —
close to half the file — so `muted: true` drops it.

```bash
cd backend && npm run remotion:studio   # scrub every template by hand
```

### Browsers

Playwright and Remotion need **different** Chromium binaries: Remotion
launches with the old `--headless` flag, which modern full Chrome builds
reject.

```bash
BROWSER_EXECUTABLE=/path/to/chrome                   # Playwright (full Chromium)
REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell  # Remotion
```

Leave both blank and each tool finds its own.

---

## Queue and persistence

Both are optional and both default to something that works on a single box.

| `REDIS_URL` | `SUPABASE_URL` | Result                                                   |
| ----------- | -------------- | -------------------------------------------------------- |
| unset       | unset          | In-process serial queue, in-memory job state. The default. |
| set         | unset          | Bull queue (durable across restarts, 10-minute job timeout), in-memory state. |
| set         | set            | Bull queue plus Postgres state — the only combination that supports a separate worker service (`npm run worker`, with `DISABLE_INLINE_WORKER=true` on the API). |

Rendering is CPU-bound and a single container can only usefully render one
video at a time, so the serial in-process queue is the right default.

---

## Deploying

**The frontend goes on Vercel. The backend cannot.** It launches Chromium,
renders video for minutes at a time and writes files to disk; Vercel
functions cap at 60s / 300s with a read-only filesystem.

### Frontend → Vercel

New Project → import this repo → **Root Directory** `frontend`.
`frontend/vercel.json` supplies the rest. One environment variable, read at
build time:

```
VITE_API_URL = https://your-backend-host
```

### Backend → Railway, Render, Fly, Cloud Run

`backend/Dockerfile` builds it. Point the platform at the `backend`
directory. Required environment:

```
PUBLIC_BASE_URL=https://your-backend-host      # headless Chrome loads captures through it
FRONTEND_URL=https://your-app.vercel.app,*.vercel.app
ANTHROPIC_API_KEY=sk-ant-...                   # optional
```

`PUBLIC_BASE_URL` is the one that bites: if it still says `localhost` the
video renders with blank screens — no error, just empty devices.

`FRONTEND_URL` is a comma-separated allowlist; `*.vercel.app` covers every
preview deploy. Ports are part of an origin — write `localhost:5173`.

Attach a volume at `/app/storage` if renders should survive a restart. The
Dockerfile deliberately does not declare that path as a mount point:
Railway rejects the build outright if it finds one.

> Blank values in `.env` mean unset. `.env.example` lists every optional key
> empty so you can see what exists; the backend falls back to its defaults
> rather than handing an empty string to ffmpeg or the Anthropic client.

---

## Deprioritised, still in the tree

The URL → Claude vision → three storyboards → auto-composed video pipeline
that this replaced. `claude.service.ts`, `schemas.ts`, `coerce.ts`,
`json.ts` and `/api/storyboards` still work and still have their tests; the
analysis half is what `/api/analyze` uses for enrichment. The storyboard
half is the future "write me an ad automatically" feature, not the product.

## Known limits

- Sites that hard-block automated browsers fail capture; the editor says so
  and points at the file upload.
- The App Store lookup searches by name, so a common name can return the
  wrong app. Matches show icon and publisher for that reason, and the field
  stays editable.
- No audio.
- Only the iPhone comes from a scanned model. The MacBook is built in code
  (body, hinge, display, screen) with the real proportions and a real hinge,
  but no source GLB, so it lacks the fine detail of the phone.
- No depth of field. The camera has position, target, FOV, roll and pan;
  a focus pass was left out on purpose because it doubles render time under
  software GL for a subtle gain.
- Without a GPU the 3D templates render in software (SwiftShader/ANGLE):
  about 40 s per second of video per format at 720p on one core. A GPU
  or more cores brings that down roughly linearly.
