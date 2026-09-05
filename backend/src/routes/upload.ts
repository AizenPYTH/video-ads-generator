import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { normalizeUrl, scrapeUrl, type Capture } from "../services/playwright.service";
import { createSession } from "../services/session.service";
import { decodeDataUri, imageSize } from "../utils/imageSize";
import { logger } from "../utils/logger";
import type { ApiResponse, UploadResponse } from "../types";

const router = Router();

const uploadSchema = z
  .object({
    url: z.string().trim().min(3).optional(),
    /** Data URIs or bare base64 PNG/JPEG, first one is the hero shot. */
    screenshots: z.array(z.string().min(64)).max(6).optional(),
  })
  .refine(
    (value) => Boolean(value.url) || (value.screenshots?.length ?? 0) > 0,
    { message: "Provide either a url or at least one screenshot" },
  );

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = uploadSchema.parse(req.body);

    if (body.url) {
      let target: string;
      try {
        target = normalizeUrl(body.url);
      } catch {
        throw new AppError("That does not look like a valid URL", 400);
      }

      let result;
      try {
        result = await scrapeUrl(target);
      } catch (error) {
        logger.error({ error, target }, "scrape failed");
        throw new AppError(
          `Could not load ${target}. The site may be blocking automated browsers - upload screenshots instead.`,
          502,
        );
      }

      if (result.captures.length === 0) {
        throw new AppError("No usable screenshots could be captured", 502);
      }

      const session = await createSession({
        fileType: "url",
        sourceUrl: result.url,
        metadata: result.metadata,
        captures: result.captures,
      });

      const payload: ApiResponse<UploadResponse> = {
        success: true,
        data: {
          uploadId: session.id,
          fileType: "url",
          sourceUrl: result.url,
          previewUrl: session.assets[0]?.url ?? "",
          assets: session.assets,
          pageTitle: result.metadata.title,
          timestamp: session.createdAt,
        },
      };
      res.json(payload);
      return;
    }

    const captures: Capture[] = [];
    for (const [index, raw] of (body.screenshots ?? []).entries()) {
      const decoded = decodeDataUri(raw);
      if (!decoded) {
        throw new AppError(`Screenshot ${index + 1} is not a valid image`, 400);
      }
      const size = imageSize(decoded.buffer) ?? { width: 0, height: 0 };
      captures.push({
        id: index === 0 ? "screenshot_main" : `screenshot_${index}`,
        label: index === 0 ? "Uploaded hero shot" : `Uploaded shot ${index}`,
        buffer: decoded.buffer,
        width: size.width,
        height: size.height,
        // Tall images are treated as phone captures, wide ones as desktop.
        surface: size.height >= size.width ? "mobile" : "desktop",
      });
    }

    const session = await createSession({
      fileType: "screenshot",
      metadata: null,
      captures,
    });

    const payload: ApiResponse<UploadResponse> = {
      success: true,
      data: {
        uploadId: session.id,
        fileType: "screenshot",
        previewUrl: session.assets[0]?.url ?? "",
        assets: session.assets,
        timestamp: session.createdAt,
      },
    };
    res.json(payload);
  }),
);

export default router;
