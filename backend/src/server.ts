import { createApp } from "./app";
import { env, hasAnthropicKey } from "./utils/env";
import { logger } from "./utils/logger";
import { ensureStorage, pruneOldFiles } from "./services/storage.service";
import { startVideoWorker } from "./jobs/videoRenderJob";
import { getBundle } from "./services/remotion.service";
import * as ffmpeg from "./services/ffmpeg.service";

const PRUNE_INTERVAL_MS = 30 * 60 * 1000;

async function main(): Promise<void> {
  await ensureStorage();

  if (!hasAnthropicKey()) {
    logger.warn(
      "ANTHROPIC_API_KEY is not set - analysis and storyboards will use built-in templates.",
    );
  }
  if (!(await ffmpeg.isAvailable())) {
    logger.warn(
      "ffmpeg is unavailable - posters and reframing will be skipped. Set FFMPEG_PATH if you have a system build.",
    );
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(
      { port: env.port, publicBaseUrl: env.publicBaseUrl },
      "video-ads backend listening",
    );
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.fatal(
        { port: env.port },
        "Port is already in use - stop the other server or set PORT.",
      );
    } else {
      logger.fatal({ error }, "server failed to start");
    }
    process.exit(1);
  });

  // Rendering runs in-process unless an external worker owns the queue.
  if (process.env.DISABLE_INLINE_WORKER !== "true") {
    startVideoWorker();
    // Warm the bundle so the first render is not 20s slower than the rest.
    void getBundle().catch((error) =>
      logger.error({ error }, "remotion bundle warmup failed"),
    );
  }

  const prune = setInterval(() => {
    void pruneOldFiles();
  }, PRUNE_INTERVAL_MS);
  prune.unref();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "shutting down");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void main();
