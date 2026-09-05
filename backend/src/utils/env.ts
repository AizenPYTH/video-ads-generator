import path from "node:path";
import dotenv from "dotenv";
import { PROJECT_ROOT } from "./paths";
import { findHeadlessShell } from "./browsers";

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Blank means unset.
 *
 * `.env.example` lists every optional key with an empty value so operators
 * can see what exists, and `dotenv` loads those as `""` rather than leaving
 * them undefined - so `??` would hand the rest of the app an empty string
 * where it expects a default. Anyone who copies the example file gets that,
 * which makes this the failure mode most likely to reach production.
 */
function str(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? fallback : trimmed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: num(process.env.PORT, 3001),
  frontendUrl: str(process.env.FRONTEND_URL, "http://localhost:5173"),
  /**
   * Base URL headless Chrome uses to load capture assets during rendering.
   * Must be reachable from the machine running the renderer.
   */
  publicBaseUrl: str(
    process.env.PUBLIC_BASE_URL,
    `http://127.0.0.1:${num(process.env.PORT, 3001)}`,
  ),
  anthropicApiKey: str(process.env.ANTHROPIC_API_KEY, ""),
  anthropicModel: str(process.env.ANTHROPIC_MODEL, "claude-opus-5"),
  anthropicFastModel: str(process.env.ANTHROPIC_FAST_MODEL, "claude-sonnet-5"),
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(PROJECT_ROOT, process.env.STORAGE_DIR)
    : path.join(PROJECT_ROOT, "storage"),
  redisUrl: process.env.REDIS_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  /**
   * Render every aspect ratio natively instead of reframing one master.
   * Off by default: three native renders means three headless Chrome
   * sessions, and on a small container that is what gets the process
   * OOM-killed. Turn it on when you have the memory to spare.
   */
  renderNativeAspects: (process.env.RENDER_NATIVE_ASPECTS ?? "false") === "true",
  /**
   * Frames rendered in parallel. Each one is a Chrome tab holding a full
   * frame buffer, so this multiplies peak memory directly. 1 is the safe
   * default; raise it only on a container with room.
   */
  renderConcurrency: num(process.env.RENDER_CONCURRENCY, 1),
  /**
   * Short edge of the output, in pixels. The compositions are authored at
   * 1080 and scaled to this at render time. 720 is 44% of the pixels of
   * 1080 and the difference is hard to see on a phone; set 1080 for full
   * resolution if the container can take it.
   */
  videoShortEdge: num(process.env.VIDEO_SHORT_EDGE, 720),
  /** x264 quality. Higher is smaller and cheaper to encode. */
  videoCrf: num(process.env.VIDEO_CRF, 28),
  /** x264 speed preset. Faster presets use less memory for motion search. */
  x264Preset: str(process.env.X264_PRESET, "veryfast"),
  /** Full Chromium used by Playwright for scraping. */
  browserExecutable: process.env.BROWSER_EXECUTABLE ?? "",
  /**
   * Remotion launches with old-style `--headless`, which modern full Chrome
   * builds no longer accept, so it needs a chrome-headless-shell binary -
   * a different executable from the scraper's. Falls back to the shell that
   * ships alongside Playwright's Chromium, so a container usually needs no
   * configuration at all.
   */
  remotionBrowserExecutable:
    process.env.REMOTION_BROWSER_EXECUTABLE || findHeadlessShell(),
  scrapeTimeoutMs: num(process.env.SCRAPE_TIMEOUT_MS, 45_000),
  jobTtlMs: num(process.env.JOB_TTL_MS, 6 * 60 * 60 * 1000),
} as const;

export const hasAnthropicKey = (): boolean => env.anthropicApiKey.length > 0;
