/**
 * Standalone worker entry point. Only useful with REDIS_URL set (so jobs
 * arrive over Redis) and Supabase configured (so the API can read the state
 * this process writes). Otherwise the API server runs the worker inline.
 */
import { ensureStorage } from "../services/storage.service";
import { getBundle } from "../services/remotion.service";
import { startVideoWorker } from "./videoRenderJob";
import { logger } from "../utils/logger";
import { env } from "../utils/env";

async function main(): Promise<void> {
  await ensureStorage();
  if (!env.redisUrl) {
    logger.warn(
      "REDIS_URL is not set - this worker will never receive jobs. Run the API server instead.",
    );
  }
  startVideoWorker();
  await getBundle().catch((error) =>
    logger.error({ error }, "remotion bundle failed to warm"),
  );
}

void main();
