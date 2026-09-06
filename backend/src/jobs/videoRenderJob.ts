import { createQueue, type JobQueue } from "./queue";
import { jobStore } from "./store";
import { renderTemplate } from "../services/remotion.service";
import { logger } from "../utils/logger";
import { clamp, nowIso } from "../utils/helpers";
import type { GenerationRequest, JobStatus } from "../types";

export interface RenderJobPayload {
  jobId: string;
  request: GenerationRequest;
}

export const videoQueue: JobQueue<RenderJobPayload> =
  createQueue<RenderJobPayload>("video-render");

/**
 * Progress is reported on a fixed budget so the bar never jumps backwards:
 * 0-10 setup, 10-92 the Remotion renders, 92-100 export and poster.
 */
function progressFor(fraction: number): { progress: number; status: JobStatus } {
  const progress = clamp(Math.round(10 + fraction * 82), 0, 99);
  const status: JobStatus = fraction >= 0.95 ? "exporting" : "rendering";
  return { progress, status };
}

let started = false;

export function startVideoWorker(): void {
  if (started) return;
  started = true;

  videoQueue.process(async ({ data }) => {
    const { jobId, request } = data;
    logger.info({ jobId }, "render job started");

    await jobStore.update(jobId, {
      status: "processing",
      progress: 5,
      message: "Preparing composition",
      startedAt: nowIso(),
    });

    try {
      let lastReported = -1;
      const { outputs, poster } = await renderTemplate({
        jobId,
        request,
        onProgress: (fraction, message) => {
          const { progress, status } = progressFor(fraction);
          // Bull/Supabase writes are not free; only report real movement.
          if (progress === lastReported) return;
          lastReported = progress;
          void jobStore.update(jobId, { progress, status, message });
        },
      });

      await jobStore.update(jobId, {
        status: "completed",
        progress: 100,
        message: "Done",
        outputs,
        poster,
        completedAt: nowIso(),
      });
      logger.info({ jobId }, "render job completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ jobId, error }, "render job failed");
      await jobStore.update(jobId, {
        status: "failed",
        message: "Generation failed",
        error: message,
        completedAt: nowIso(),
      });
    }
  });

  logger.info({ queue: videoQueue.kind }, "video worker listening");
}
