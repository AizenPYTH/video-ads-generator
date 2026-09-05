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

## Quick start

```bash
# terminal 1
cd backend
cp .env.example .env          # add ANTHROPIC_API_KEY
npm install
npm run dev                   # http://localhost:3001

# terminal 2
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Vite proxies `/api` and `/media` to the backend, so dev is same-origin and
behaves like production. (`/media`, not `/assets` — Vite emits the frontend
bundle under `/assets`.)

**Without an `ANTHROPIC_API_KEY` the app still runs end to end.** Analysis
falls back to a DOM heuristic and storyboards to three built-in narrative
templates, so you can exercise capture, rendering and download offline. The
health endpoint reports which mode you are in:

```bash
curl localhost:3001/health
# {"status":"ok","queue":"memory","claude":"missing-key","nativeAspects":true}
```

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
`analysing` → `writing` → `rendering` → `done`). There is no wizard, no
routing between steps and no page that exists only to be read.

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
| `POST` | `/api/generate`                       | `{storyboard, style, device, analysis}` → `jobId`  |
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

`RENDER_NATIVE_ASPECTS=true` (the default) renders all three natively — best
quality, roughly 3× the wall clock. Set it to `false` to render 9:16 once and
reframe the other two with ffmpeg (scaled to fit over a blurred, darkened copy
of itself; cropping would cut the device frame in half).

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

- **Frontend → Vercel.** Root directory `frontend`, build `npm run build`,
  output `dist`. Set `VITE_API_URL` to the backend origin.
- **Backend → Railway or Render.** It needs a filesystem for `storage/`, a
  Chromium, and ffmpeg (bundled via `ffmpeg-static`). Set `PUBLIC_BASE_URL` to
  the backend's own public origin — headless Chrome loads capture assets
  through it during rendering, so `localhost` will silently produce blank
  screens in the video. Set `FRONTEND_URL` for CORS (comma-separated for
  several origins).
- Renders and captures are pruned after `JOB_TTL_MS` (6h default).

---

## Deliberate deviations from the brief

Three, all load-bearing:

1. **No runtime React code generation.** The brief included a prompt that asks
   Claude to emit a Remotion component per render. Its own implementation plan
   asks for a generic component taking storyboard JSON — that is what is built.
   Generating and executing model-written React on every render is
   non-deterministic and is arbitrary code execution on the server; the generic
   composition renders the same storyboard the same way every time.
2. **Native `<video>` instead of video.js / Plyr.** The preview plays our own
   MP4 from our own origin. A player library would add ~100 KB for controls the
   browser already has.
3. **`claude-opus-5` / `claude-sonnet-5`**, not `claude-opus-4-1`. Requests use
   structured outputs (`output_config.format`) with a JSON Schema, and fall
   back to parsing a free-form JSON body if the schema is rejected.

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
- No audio track. Storyboards carry a `voiceOver` field that nothing consumes
  yet.
