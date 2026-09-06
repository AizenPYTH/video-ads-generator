import { Router } from "express";
import { z } from "zod";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { normalizeUrl, scrapeUrl, type Capture } from "../services/playwright.service";
import { createSession, storeLogo } from "../services/session.service";
import {
  appStoreIdFrom,
  fetchImage,
  isAppStoreUrl,
  lookupApp,
} from "../services/appstore.service";
import { decodeDataUri, imageSize } from "../utils/imageSize";
import { logger } from "../utils/logger";
import type { ApiResponse, ImageAsset, UploadResponse } from "../types";

const router = Router();

const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_STORE_SCREENSHOTS = 6;

const uploadSchema = z
  .object({
    /** A website, or an App Store listing - both are just "a link" to the user. */
    url: z.string().trim().min(3).optional(),
    /** Data URIs or bare base64 PNG/JPEG, first one is the hero shot. */
    screenshots: z.array(z.string().min(64)).max(8).optional(),
  })
  .refine(
    (value) => Boolean(value.url) || (value.screenshots?.length ?? 0) > 0,
    { message: "Provide either a url or at least one screenshot" },
  );

const logoSchema = z.object({
  logo: z.string().min(64),
});

function respond(res: Parameters<Parameters<Router["post"]>[1]>[1], data: UploadResponse): void {
  const payload: ApiResponse<UploadResponse> = { success: true, data };
  res.json(payload);
}

/**
 * An App Store listing, through Apple's lookup API: the screenshots the
 * developer published, at full size, plus the icon as the logo. Returns
 * null when the listing cannot be resolved so the caller can fall back to
 * capturing the page like any other site.
 */
async function captureAppStore(url: string): Promise<{
  captures: Capture[];
  logo: ImageAsset | undefined;
  app: { name: string; publisher: string; appStoreUrl: string };
} | null> {
  const id = appStoreIdFrom(url);
  if (!id) return null;
  const listing = await lookupApp(id);
  if (!listing) return null;

  const captures: Capture[] = [];
  for (const [index, shotUrl] of listing.screenshots.slice(0, MAX_STORE_SCREENSHOTS).entries()) {
    const image = await fetchImage(shotUrl);
    if (!image) continue;
    const size = imageSize(image.buffer) ?? { width: 0, height: 0 };
    captures.push({
      id: captures.length === 0 ? "screenshot_main" : `screenshot_${captures.length}`,
      label: `App Store screenshot ${index + 1}`,
      buffer: image.buffer,
      width: size.width,
      height: size.height,
      surface: size.height >= size.width ? "mobile" : "desktop",
    });
  }
  if (captures.length === 0) return null;

  let logo: ImageAsset | undefined;
  const iconUrl = listing.iconLarge ?? listing.icon;
  if (iconUrl) {
    const icon = await fetchImage(iconUrl);
    const size = icon ? imageSize(icon.buffer) : null;
    if (icon && size) {
      logo = await storeLogo({ buffer: icon.buffer, mediaType: icon.mediaType, ...size });
    }
  }

  return {
    captures,
    logo,
    app: { name: listing.name, publisher: listing.publisher, appStoreUrl: listing.appStoreUrl },
  };
}

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

      if (isAppStoreUrl(target)) {
        const listing = await captureAppStore(target);
        if (listing) {
          const session = await createSession({
            fileType: "appstore",
            sourceUrl: target,
            metadata: null,
            captures: listing.captures,
            ...(listing.logo ? { logo: listing.logo } : {}),
            app: listing.app,
          });
          respond(res, {
            uploadId: session.id,
            fileType: "appstore",
            sourceUrl: target,
            previewUrl: session.assets[0]?.url ?? "",
            assets: session.assets,
            ...(session.logo ? { logo: session.logo } : {}),
            app: listing.app,
            pageTitle: listing.app.name,
            timestamp: session.createdAt,
          });
          return;
        }
        logger.warn({ target }, "app store lookup failed, capturing the page instead");
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

      respond(res, {
        uploadId: session.id,
        fileType: "url",
        sourceUrl: result.url,
        previewUrl: session.assets[0]?.url ?? "",
        assets: session.assets,
        pageTitle: result.metadata.title,
        timestamp: session.createdAt,
      });
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

    respond(res, {
      uploadId: session.id,
      fileType: "screenshot",
      previewUrl: session.assets[0]?.url ?? "",
      assets: session.assets,
      timestamp: session.createdAt,
    });
  }),
);

/** A logo on its own. PNG, JPEG, WebP or SVG; the ratio is read, never assumed. */
router.post(
  "/logo",
  asyncHandler(async (req, res) => {
    const { logo } = logoSchema.parse(req.body);
    const decoded = decodeDataUri(logo);
    if (!decoded || !LOGO_TYPES.has(decoded.mediaType)) {
      throw new AppError("The logo must be a PNG, JPEG, WebP or SVG image", 400);
    }
    if (decoded.buffer.byteLength > MAX_LOGO_BYTES) {
      throw new AppError("The logo is over 4 MB", 400);
    }
    const size = imageSize(decoded.buffer);
    if (!size) {
      throw new AppError("Could not read the logo's dimensions", 400);
    }
    const asset = await storeLogo({ buffer: decoded.buffer, mediaType: decoded.mediaType, ...size });
    const payload: ApiResponse<{ logo: ImageAsset }> = { success: true, data: { logo: asset } };
    res.json(payload);
  }),
);

export default router;
