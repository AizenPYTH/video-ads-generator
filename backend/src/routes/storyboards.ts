import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { generateStoryboardDrafts } from "../services/claude.service";
import { normalizeStoryboard } from "../services/storyboard.service";
import {
  DEVICE_TYPES,
  productAnalysisSchema,
  VIDEO_STYLES,
} from "../services/schemas";
import { DEFAULT_DEVICE, DEFAULT_STYLE } from "../utils/constants";
import { logger } from "../utils/logger";
import type { ApiResponse, StoryboardsResponse } from "../types";

const router = Router();

const storyboardsSchema = z.object({
  analysis: productAnalysisSchema,
  style: z.enum(VIDEO_STYLES).default(DEFAULT_STYLE),
  device: z.enum(DEVICE_TYPES).default(DEFAULT_DEVICE),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { analysis, style, device } = storyboardsSchema.parse(req.body);

    let drafts;
    try {
      drafts = await generateStoryboardDrafts({
        analysis,
        style,
        device,
        assets: analysis.assets,
      });
    } catch (error) {
      logger.error({ error }, "storyboard generation failed");
      throw new AppError(
        error instanceof Error
          ? `Storyboard generation failed: ${error.message}`
          : "Storyboard generation failed",
        502,
      );
    }

    const storyboards = drafts.map((draft) =>
      normalizeStoryboard(draft, { style, device, assets: analysis.assets }),
    );

    const payload: ApiResponse<StoryboardsResponse> = {
      success: true,
      data: { storyboards, selectedAnalysis: analysis },
    };
    res.json(payload);
  }),
);

export default router;
