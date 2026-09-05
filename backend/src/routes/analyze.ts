import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { analyzeProduct } from "../services/claude.service";
import { getSession, primaryScreenshots } from "../services/session.service";
import type { AnalysisResponse, ApiResponse } from "../types";

const router = Router();

const analyzeSchema = z.object({
  uploadId: z.string().min(1),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { uploadId } = analyzeSchema.parse(req.body);
    const session = getSession(uploadId);
    if (!session) {
      throw new AppError(
        "That upload has expired. Capture the product again.",
        404,
      );
    }

    const screenshots = await primaryScreenshots(session, 3);
    if (screenshots.length === 0) {
      throw new AppError("The captured screenshots are no longer on disk", 410);
    }

    const analysis = await analyzeProduct({
      screenshot: screenshots[0] as string,
      extraScreenshots: screenshots.slice(1),
      ...(session.sourceUrl ? { url: session.sourceUrl } : {}),
      metadata: session.metadata,
      assets: session.assets,
    });

    const payload: ApiResponse<AnalysisResponse> = {
      success: true,
      data: { analysis },
    };
    res.json(payload);
  }),
);

export default router;
