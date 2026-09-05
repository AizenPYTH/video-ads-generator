import path from "node:path";
import dotenv from "dotenv";
import { PROJECT_ROOT } from "./paths";
import { findHeadlessShell } from "./browsers";

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: num(process.env.PORT, 3001),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  /**
   * Base URL headless Chrome uses to load capture assets during rendering.
   * Must be reachable from the machine running the renderer.
   */
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL ??
    `http://127.0.0.1:${num(process.env.PORT, 3001)}`,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
  anthropicFastModel: process.env.ANTHROPIC_FAST_MODEL ?? "claude-sonnet-5",
  storageDir: process.env.STORAGE_DIR
    ? path.resolve(PROJECT_ROOT, process.env.STORAGE_DIR)
    : path.join(PROJECT_ROOT, "storage"),
  redisUrl: process.env.REDIS_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  /** Render every aspect ratio natively instead of cropping one master. */
  renderNativeAspects: (process.env.RENDER_NATIVE_ASPECTS ?? "true") !== "false",
  renderConcurrency: num(process.env.RENDER_CONCURRENCY, 2),
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
