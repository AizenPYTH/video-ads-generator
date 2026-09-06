import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { getTemplate } from "../../remotion/src/engine/registry";
import { ASPECT_RATIOS, FPS } from "../../remotion/src/engine/aspect";
import { completeInput } from "../../remotion/src/engine/placeholders";
import { jobStore, newJob } from "../jobs/store";
import { videoQueue } from "../jobs/videoRenderJob";
import { generateId } from "../utils/helpers";
import { env } from "../utils/env";
import { resolveCta } from "../utils/cta";
import { generateQrCode } from "../utils/qrcode";
import type { ApiResponse, AspectRatio, GenerationRequest, GenerationResponse, ImageAsset } from "../types";

const router = Router();

const HEX = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

const imageAssetSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
});

const generateSchema = z.object({
  templateId: z.string().min(1),
  aspects: z.array(z.enum(ASPECT_RATIOS as [AspectRatio, ...AspectRatio[]])).min(1).max(3),
  input: z.object({
    screens: z.array(imageAssetSchema).max(12).default([]),
    logo: imageAssetSchema.nullable().default(null),
    brand: z
      .object({
        name: z.string().max(80).optional(),
        primary: z.string().regex(HEX).optional(),
        accent: z.string().regex(HEX).optional(),
      })
      .default({}),
    copy: z
      .object({
        headline: z.string().max(90).optional(),
        subline: z.string().max(140).optional(),
      })
      .default({}),
    /** Links, resolved server-side into the end card. */
    links: z
      .object({
        productUrl: z.string().optional(),
        appStoreUrl: z.string().optional(),
        googlePlayUrl: z.string().optional(),
      })
      .nullable()
      .default(null),
    durationSeconds: z.number().positive().max(60).optional(),
  }),
  productName: z.string().max(80).optional(),
});

/**
 * Headless Chrome will load whatever URL a screen points at. Only our own
 * media host and inline data URIs are allowed - a screen pointing at an
 * internal address is the one request shape that must never reach the
 * renderer.
 */
function assertLoadable(asset: ImageAsset, what: string): void {
  if (asset.url.startsWith("data:image/")) return;
  if (asset.url.startsWith(`${env.publicBaseUrl}/media/`)) return;
  throw new AppError(`${what} must be an uploaded image`, 400);
}

/** Rough wall-clock estimate; the UI uses it only to seed the progress copy. */
function estimateSeconds(durationInFrames: number, aspects: number): number {
  return Math.round(20 + (durationInFrames / FPS) * 5 * aspects);
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = generateSchema.parse(req.body);

    const template = getTemplate(body.templateId);
    if (!template) throw new AppError(`Unknown template "${body.templateId}"`, 404);

    const unsupported = body.aspects.filter((aspect) => !template.aspects.includes(aspect));
    if (unsupported.length > 0) {
      throw new AppError(
        `${template.name} is not composed for ${unsupported.join(", ")}`,
        400,
      );
    }

    const { slots } = template;
    if (body.input.screens.length < slots.screens.min) {
      throw new AppError(
        `${template.name} needs at least ${slots.screens.min} screenshot${slots.screens.min === 1 ? "" : "s"}`,
        400,
      );
    }
    if (slots.logo === "required" && !body.input.logo) {
      throw new AppError(`${template.name} needs a logo`, 400);
    }
    for (const screen of body.input.screens) assertLoadable(screen, "Every screenshot");
    if (body.input.logo) assertLoadable(body.input.logo, "The logo");

    const productName = body.productName?.trim() || body.input.brand.name?.trim() || "";
    const resolved = slots.cta
      ? resolveCta(slots.screens.surface, body.input.links ?? undefined, { name: productName })
      : null;

    const input = completeInput(template, {
      screens: body.input.screens,
      logo: body.input.logo,
      brand: {
        ...(productName ? { name: productName } : {}),
        ...(body.input.brand.primary ? { primary: normaliseHex(body.input.brand.primary) } : {}),
        ...(body.input.brand.accent ? { accent: normaliseHex(body.input.brand.accent) } : {}),
      } as Partial<GenerationRequest["input"]["brand"]> as GenerationRequest["input"]["brand"],
      copy: {
        headline: body.input.copy.headline ?? "",
        subline: body.input.copy.subline ?? "",
      },
      cta: resolved
        ? {
            headline: resolved.headline,
            url: resolved.url,
            hint: resolved.hint,
            qrCode: await generateQrCode(resolved.target),
          }
        : null,
      ...(body.input.durationSeconds && slots.duration
        ? {
            durationInFrames: Math.round(
              Math.min(slots.duration.max, Math.max(slots.duration.min, body.input.durationSeconds)) * FPS,
            ),
          }
        : {}),
    });

    const request: GenerationRequest = {
      templateId: template.id,
      aspects: body.aspects,
      input,
      productName: productName || "video-ad",
    };

    const jobId = generateId();
    await jobStore.create(newJob(jobId, request));
    await videoQueue.add(jobId, { jobId, request });

    const payload: ApiResponse<GenerationResponse> = {
      success: true,
      data: {
        jobId,
        status: "queued",
        estimatedTime: estimateSeconds(
          input.durationInFrames ?? template.durationInFrames,
          body.aspects.length,
        ),
      },
    };
    res.status(202).json(payload);
  }),
);

function normaliseHex(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

export default router;
