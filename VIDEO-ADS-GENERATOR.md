# Video Ads Generator

Turn a product URL (or a handful of screenshots) into a finished video ad in
9:16, 16:9 and 1:1 — analysed by Claude, storyboarded by Claude, rendered by
Remotion.

Two standalone apps that deploy independently of the Next.js `smart-seller`
app in this repo:

| Path        | What it is                                                        |
| ----------- | ----------------------------------------------------------------- |
| `backend/`  | Express + TypeScript API, Playwright capture, Claude, Remotion, ffmpeg |
| `frontend/` | React 19 + Vite + Tailwind 4 + Zustand — one screen, one input     |

Neither is compiled by the root `tsconfig.json`, linted by the root ESLint
config, or picked up by the root Vitest config.

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

Open **http://localhost:5173**. Paste a link, press the button.

Vite proxies `/api` and `/media` to the backend, so dev is same-origin and
behaves like production. (`/media`, not `/assets` — Vite emits the frontend
bundle under `/assets`.)

**It runs without an `ANTHROPIC_API_KEY`.** Analysis falls back to a DOM
heuristic and the storyboards to three built-in narrative templates, so the
capture, render and download path all work offline — the copy is just
generic. Add the key to `backend/.env` for the real thing. The health
endpoint tells you which mode you are in:

```bash
curl localhost:3001/health
# {"status":"ok","queue":"memory","claude":"missing-key","nativeAspects":false}
```

### What it needs

- **Node 20+.**
- **Chromium for Playwright** — `npm run video:setup` installs it.
- **A headless-shell Chromium for Remotion** — downloaded automatically on
  the first render. These are two different binaries; see *Browsers* below.
- **ffmpeg** — bundled via `ffmpeg-static`, nothing to install.

The first render takes an extra ~20s while Remotion bundles and fetches its
browser. After that, budget ~2 minutes per video.

---

## The interface

One screen, one field, one button. Paste a link, get a video.

```
Paste your link ─► Opening your site
                   Looking at what it does
                   Writing the ad
                   Filming it            ─► video + three downloads
```

Everything the pipeline needs is decided for you and only surfaced
afterwards, as a change you can make to a video you can already watch:

| Decision  | Default                                          | Change it            |
| --------- | ------------------------------------------------ | -------------------- |
| Angle     | The first of the three concepts Claude wrote     | in the options panel |
| Look      | Derived from the product's own tone (`ProductAnalysis.tone`) | in the options panel |
| Device    | iPhone 15 Pro — 9:16 is the format most people want, and a phone fills that frame | in the options panel |

`useStudio` owns the whole run as one phase machine (`capturing` →
`analysing` → `writing` → `choosing` → `customizing` → `rendering` →
`done`). Four visible stages, still one page and one URL — no routing
between steps and no page that exists only to be read.

## The flow

```
URL ──► Playwright ──► 7 captures ──► Claude vision ──► ProductAnalysis
                       (mobile +      (features,
                        desktop,       palette,
                        per-section)   tone)
                                            │
                                            ▼
                                   Claude text ──► 3 storyboards
                                            │      (3 different arcs)
                                            ▼
                            normalise (durations, asset ids)
                                            │
                                            ▼
                     queue ──► Remotion ──► 9:16 · 16:9 · 1:1 MP4 + poster
```

### Endpoints

| Method | Path                                  | Does                                              |
| ------ | ------------------------------------- | ------------------------------------------------- |
| `POST` | `/api/upload`                         | `{url}` or `{screenshots:[dataUri]}` → capture session |
| `POST` | `/api/analyze`                        | `{uploadId}` → `ProductAnalysis`                   |
| `POST` | `/api/storyboards`                    | `{analysis, style, device}` → 3 storyboards        |
| `POST` | `/api/generate`                       | `{storyboard, style, device, analysis, metadata?}` → `jobId` |
| `GET`  | `/api/appstore?term=`                 | App Store search, proxied → `{matches}`            |
| `GET`  | `/api/video/:jobId/status`            | progress, message, outputs, poster                 |
| `GET`  | `/api/video/:jobId/download/:format`  | `9x16` \| `16x9` \| `1x1` → MP4 attachment         |
| `GET`  | `/media/:bucket/:file`                | captures, renders, posters                         |
| `GET`  | `/health`                             | queue kind, Claude mode, render mode               |

Captured bytes stay on the server. The client only ever holds ids and URLs, so
a seven-shot capture never round-trips through the browser as base64.

---

## Rendering

The Remotion project lives in `backend/remotion/`. It is **one generic,
data-driven composition** — the storyboard JSON is the input, not a code
generator prompt. Three compositions are registered (`VideoAd-9x16`,
`VideoAd-16x9`, `VideoAd-1x1`) sharing the same responsive component:
portrait puts the copy under the device, landscape puts it in a left column.

### The three acts

`DeviceAnimationComposition` plays the ad in three acts, and everything else
is derived from their two frame boundaries so nothing can drift apart:

| Act | Share | At 10s | What happens |
| --- | --- | --- | --- |
| Intro | 20%, capped at 2s | 0–2s | The device arrives: a phone swings in from a 48° yaw, a MacBook lid opens, a monitor settles out of a 14° turn. |
| Content | the rest | 2–7s | Screenshots crossfade inside the screen and scroll like a page under a thumb — every 1.5s on a phone, 1.2s on a laptop or monitor — while the storyboard's copy plays over the top. The device never fully stops: yaw, tilt and breath run on three coprime cycles so the idle loop never reads as a loop. |
| Outro | 30%, capped at 3s | 7–10s | The device pulls back and the screen dims; the last 1.5s is the call to action. |

A shorter or longer storyboard compresses or stretches proportionally —
`phasesFor` is pure and unit-tested at every length from 1s to 30s.

The MacBook lid is real 3D, not a crossfade: the deck is tipped 72° out of
the camera plane and the lid rotates about the hinge from −108° (folded shut,
aluminium back to camera) to +8° (open, leaning back), passing −90° where the
screen turns to face the viewer. `backface-visibility` picks the face, so the
closed lid shows its back and the open one shows the screen with no
bookkeeping.

### Where the ad sends people

The last beat is a call to action: a headline, the link, and a QR code of it.
`resolveCta` picks the one destination:

- a phone or tablet mockup goes to the store listing when there is one,
  because that is where a viewer holding a phone goes next;
- a laptop or monitor goes to the site;
- each falls back to the other, and both fall back to the page that was
  captured, so the outro is never blank.

The user supplies `productUrl` / `appStoreUrl` / `googlePlayUrl` in the
options panel, or lets `GET /api/appstore` find the App Store listing by
name. Links that are not http(s) are dropped rather than printed — a QR code
pointing at a `javascript:` URL is the case that matters. The QR code is
rendered once per job on the server (`utils/qrcode.ts`), not once per frame
in the browser.

### Memory

Rendering is what gets a small container OOM-killed, and every lever is an
environment variable. The defaults are sized for a ~1 GB instance:

| Variable | Default | Effect |
| --- | --- | --- |
| `RENDER_CONCURRENCY` | `1` | Frames in parallel. Each is a Chrome tab holding a full frame buffer, so this multiplies peak memory directly — the largest single lever. |
| `VIDEO_SHORT_EDGE` | `720` | Compositions are authored at 1080 and scaled to this. 720 is 44% of the pixels. |
| `RENDER_NATIVE_ASPECTS` | `false` | `true` renders all three aspects natively (three Chrome sessions, ~3× the wall clock). `false` renders 9:16 once and reframes the other two with ffmpeg — scaled to fit over a blurred, darkened copy of itself, because cropping would cut the device frame in half. |
| `VIDEO_CRF` | `28` | x264 quality. Higher is smaller and cheaper to encode. |
| `X264_PRESET` | `veryfast` | Faster presets use less memory for motion search. |

Concurrency 1 at 720p is roughly a fifth of the peak frame-buffer memory of
concurrency 2 at 1080p. On a bigger container, `RENDER_CONCURRENCY=2`,
`VIDEO_SHORT_EDGE=1080`, `VIDEO_CRF=20` and `RENDER_NATIVE_ASPECTS=true`
restore full quality.

There is no audio track. Remotion attaches a silent AAC stream by default —
it was running at 317 kb/s, close to half the file — so `muted: true` drops
it. Turn that off in `remotion.service.ts` if voice-over is ever added.

```bash
cd backend && npm run remotion:studio   # scrub the compositions by hand
```

### Browsers

Playwright and Remotion need **different** Chromium binaries: Remotion launches
with the old `--headless` flag, which modern full Chrome builds reject.

```bash
BROWSER_EXECUTABLE=/path/to/chrome                   # Playwright (full Chromium)
REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell  # Remotion
```

Leave both blank and each tool downloads its own.

---

## Queue and persistence

Both are optional and both default to something that works on a single box.

| `REDIS_URL` | `SUPABASE_URL` | Result                                                   |
| ----------- | -------------- | -------------------------------------------------------- |
| unset       | unset          | In-process serial queue, in-memory job state. The default. |
| set         | unset          | Bull queue (durable across restarts), in-memory state.     |
| set         | set            | Bull queue plus Postgres state — the only combination that supports a separate worker service (`npm run worker`, with `DISABLE_INLINE_WORKER=true` on the API). |

Rendering is CPU-bound and a single container can only usefully render one
video at a time, so the serial in-process queue is the right default rather
than a placeholder. `backend/supabase/001_video_jobs.sql` creates the table.

---

## Deploying

**The frontend goes on Vercel. The backend cannot.** That is not a
configuration problem to solve — the backend launches Chromium, renders
video for two to five minutes per job and writes files to disk. Vercel
functions cap at 60s (Hobby) / 300s (Pro) and have a read-only filesystem
apart from a non-persistent `/tmp`. Job state would also land on a
different instance from the one the status endpoint polls.

So: **frontend on Vercel, backend on anything that runs a container.**

### Frontend → Vercel

New Project → import this repo → set **Root Directory** to `frontend`.
`frontend/vercel.json` supplies the rest (Vite preset, `dist`, SPA
rewrite). Then one environment variable:

```
VITE_API_URL = https://your-backend-host
```

It is read at **build time**, so changing it needs a redeploy.

> Import as a **separate Vercel project** from the Next.js `smart-seller`
> app at the repo root. The root `vercel.json` belongs to that app and is
> untouched.

### Backend → Railway, Render, Fly, Cloud Run

`backend/Dockerfile` builds it. Point the platform at the `backend`
directory and let it build the Dockerfile — no start command needed.

Required environment:

```
ANTHROPIC_API_KEY=sk-ant-...
PUBLIC_BASE_URL=https://your-backend-host      # see below
FRONTEND_URL=https://your-app.vercel.app,*.vercel.app
```

`PUBLIC_BASE_URL` is the one that bites. Headless Chrome loads the capture
assets through it while rendering, so if it still says `localhost` the
video renders with blank screens — no error, just empty device frames. Set
it to the backend's own public origin.

`FRONTEND_URL` is a comma-separated allowlist. All of these work and mean
the same thing, because people write all of them:

```
https://app.vercel.app   app.vercel.app   https://app.vercel.app/
*.vercel.app             https://*.vercel.app
```

Include a `*.vercel.app` entry or every preview deploy fails CORS. A
leading `*.` matches subdomains but not the apex, so it will not let the
lookalike `notvercel.app` through. A scheme is honoured when you give one.
Ports are part of an origin — write `localhost:5173`, not `localhost`.

When a request is refused, the backend logs the rejected origin **and** the
configured allowlist, so a deploy log on its own is enough to spot the
mismatch.

Attach a volume at `/app/storage` if you want renders to survive a restart.
Without one they are regenerated on demand, which is fine.

The Dockerfile deliberately does not declare that path as a mount point.
Railway **rejects the build outright** if it finds such a declaration —

```
dockerfile invalid: docker VOLUME at Line 45 is not supported,
use Railway Volumes
```

— so you attach storage in Railway's own UI (Service → Variables → Volumes,
mount path `/app/storage`) rather than in the image. Fly attaches its own
at that path and Cloud Run ignores the declaration, so leaving it out is
right everywhere, not just on Railway.

> If Railway still reports that error, it is building an older commit.
> Check which SHA the failed deploy used — the message names the exact line
> number, which is a fast way to tell.

### What I verified, and what I did not

Verified here: the frontend built with `VITE_API_URL` set, served
statically with **no proxy**, calls `https://<that host>/api/upload`, and a
deep link still boots the SPA. The CORS allowlist has unit tests covering
exact hosts, wildcards, lookalike domains and malformed origins.

**Not verified: the Dockerfile has never been built.** There is no Docker
daemon in the environment it was written in. Every `COPY` path was checked
to exist and the entrypoint (`dist/src/server.js`) is the real build
output, but the image itself is unbuilt. Expect to iterate on the first
`docker build`.

## Not built

- **Auth.** The brief marked JWT middleware optional and there is no sign-in
  flow, so there is nothing to authenticate; jobs are anonymous and reachable
  by id. Adding it means a Supabase session on the frontend, a bearer-token
  check in front of `/api/generate` and `/api/video/:id/*`, and a `user_id`
  filter on the job store (the column is already in the migration).

## Known limits

- Sites that hard-block automated browsers (aggressive bot walls) fail capture;
  the UI says so and points at the screenshot upload path.
- Scene editing is read-only in this version. The storyboard page shows exactly
  what will render, so what you approve is what you get.
- The App Store lookup searches by name, so a common name can return the wrong
  app. The matches are shown with icon and publisher for that reason, and the
  field stays editable.
- No audio track. Storyboards carry a `voiceOver` field that nothing consumes
  yet.
