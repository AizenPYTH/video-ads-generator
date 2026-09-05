import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import {
  DEVICE_TYPES,
  productAnalysisSchema,
  storyboardSchema,
  VIDEO_STYLES,
} from "../services/schemas";
import { retargetStoryboard } from "../services/storyboard.service";
import { jobStore, newJob } from "../jobs/store";
import { videoQueue } from "../jobs/videoRenderJob";
import { generateId } from "../utils/helpers";
import { env } from "../utils/env";
import type { ApiResponse, GenerationRequest, GenerationResponse } from "../types";

const router = Router();

/**
 * Links are trusted as free text here and normalised at render time - a
 * rejected URL should cost the ad its closing card, never the whole render.
 */
const metadataSchema = z
  .object({
    productUrl: z.string().optional(),
    appStoreUrl: z.string().optional(),
    googlePlayUrl: z.string().optional(),
    appName: z.string().optional(),
  })
  .optional();

const generateSchema = z.object({
  storyboard: storyboardSchema,
  style: z.enum(VIDEO_STYLES),
  device: z.enum(DEVICE_TYPES),
  analysis: productAnalysisSchema,
  metadata: metadataSchema,
});

/** Rough wall-clock estimate; the UI uses it only to seed the progress copy. */
function estimateSeconds(totalDuration: number): number {
  const aspects = env.renderNativeAspects ? 3 : 1;
  return Math.round(20 + totalDuration * 4 * aspects);
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = generateSchema.parse(req.body);

    const request: GenerationRequest = {
      storyboard: retargetStoryboard(
        body.storyboard as GenerationRequest["storyboard"],
        body.style,
        body.device,
      ),
      style: body.style,
      device: body.device,
      productAnalysis: body.analysis as GenerationRequest["productAnalysis"],
      ...(body.metadata ? { metadata: body.metadata } : {}),
    };

    const jobId = generateId();
    await jobStore.create(newJob(jobId, request));
    await videoQueue.add(jobId, { jobId, request });

    const payload: ApiResponse<GenerationResponse> = {
      success: true,
      data: {
        jobId,
        status: "queued",
        estimatedTime: estimateSeconds(request.storyboard.totalDuration),
      },
    };
    res.status(202).json(payload);
  }),
);

export default router;
