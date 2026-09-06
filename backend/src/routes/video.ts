import path from "node:path";
import { Router } from "express";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { jobStore } from "../jobs/store";
import { exists, publicUrl, resolveInBucket } from "../services/storage.service";
import { slugify } from "../utils/helpers";
import type { ApiResponse, AspectRatio, StatusResponse } from "../types";

const router = Router();

const FORMAT_ALIASES: Record<string, AspectRatio> = {
  "9:16": "9:16",
  "9x16": "9:16",
  vertical: "9:16",
  tiktok: "9:16",
  "16:9": "16:9",
  "16x9": "16:9",
  horizontal: "16:9",
  youtube: "16:9",
  "1:1": "1:1",
  "1x1": "1:1",
  square: "1:1",
  instagram: "1:1",
};

function messageFor(status: string, progress: number): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Preparing composition";
    case "rendering":
      return progress < 45
        ? "Rendering scenes"
        : progress < 80
          ? "Rendering additional formats"
          : "Finishing frames";
    case "exporting":
      return "Exporting video";
    case "completed":
      return "Your video is ready";
    case "failed":
      return "Generation failed";
    default:
      return "Working";
  }
}

router.get(
  "/:jobId/status",
  asyncHandler(async (req, res) => {
    const job = await jobStore.get(req.params.jobId as string);
    if (!job) throw new AppError("Job not found", 404);

    const payload: ApiResponse<StatusResponse> = {
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message || messageFor(job.status, job.progress),
        ...(job.outputs
          ? {
              outputs: Object.fromEntries(
                Object.entries(job.outputs).map(([aspect, filename]) => [
                  aspect,
                  publicUrl("videos", filename),
                ]),
              ) as Partial<Record<AspectRatio, string>>,
            }
          : {}),
        ...(job.poster ? { poster: publicUrl("posters", job.poster) } : {}),
        ...(job.error ? { error: job.error } : {}),
      },
    };
    res.json(payload);
  }),
);

router.get(
  "/:jobId/download/:format",
  asyncHandler(async (req, res) => {
    const job = await jobStore.get(req.params.jobId as string);
    if (!job) throw new AppError("Job not found", 404);
    if (!job.outputs) throw new AppError("This video is not ready yet", 409);

    const ratio = FORMAT_ALIASES[(req.params.format as string).toLowerCase()];
    if (!ratio) throw new AppError("Unknown format", 400);

    const filename = job.outputs[ratio];
    if (!filename) throw new AppError(`This video was not rendered in ${ratio}`, 404);
    const filePath = resolveInBucket("videos", filename);
    if (!filePath || !exists(filePath)) {
      throw new AppError("The rendered file is no longer available", 410);
    }

    const productName = slugify(job.request.productName) || "video-ad";
    const downloadName = `${productName}-${ratio.replace(":", "x")}.mp4`;
    res.download(filePath, downloadName);
  }),
);

/** Static asset delivery for captures, renders and posters. */
export function assetHandler(): Router {
  const assets = Router();
  assets.get("/:bucket/:filename", (req, res, next) => {
    const bucket = req.params.bucket as string;
    if (!["captures", "videos", "posters", "uploads"].includes(bucket)) {
      next(new AppError("Unknown asset bucket", 404));
      return;
    }
    const filePath = resolveInBucket(
      bucket as "captures",
      decodeURIComponent(req.params.filename as string),
    );
    if (!filePath || !exists(filePath)) {
      next(new AppError("Asset not found", 404));
      return;
    }
    // Content is immutable per generated id, so it can be cached hard.
    // Any origin may read it: the 3D renderer paints captures onto a canvas
    // that WebGL then uploads, and a canvas holding a cross-origin image
    // without this header is "tainted" and refused. These are public,
    // unguessable-id assets with no credentials, so `*` costs nothing.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(path.resolve(filePath), { maxAge: "1h" });
  });
  return assets;
}

export default router;
