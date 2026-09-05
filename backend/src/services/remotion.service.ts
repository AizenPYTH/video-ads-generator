import path from "node:path";
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "../utils/env";
import { REMOTION_ENTRY } from "../utils/paths";
import { logger } from "../utils/logger";
import {
  ASPECT_DIMENSIONS,
  ASPECT_RATIOS,
  ASPECT_TO_OUTPUT_KEY,
  DEVICE_SPECS,
} from "../utils/constants";
import { resolveCta } from "../utils/cta";
import { generateQrCode } from "../utils/qrcode";
import { bucketDir } from "./storage.service";
import * as ffmpeg from "./ffmpeg.service";
import type {
  AspectRatio,
  AssetRef,
  DeviceType,
  GenerationRequest,
  VideoCompositionProps,
  VideoOutputs,
} from "../types";

const ENTRY = REMOTION_ENTRY;
const COMPOSITION_IDS: Record<AspectRatio, string> = {
  "9:16": "VideoAd-9x16",
  "16:9": "VideoAd-16x9",
  "1:1": "VideoAd-1x1",
};

let bundlePromise: Promise<string> | null = null;

/** Bundling costs ~10-20s, so it happens once per process. */
export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: ENTRY,
      onProgress: (progress) => {
        if (progress % 25 === 0) logger.debug({ progress }, "bundling remotion");
      },
    }).then((serveUrl) => {
      logger.info({ serveUrl }, "remotion bundle ready");
      return serveUrl;
    });
    bundlePromise.catch(() => {
      bundlePromise = null;
    });
  }
  return bundlePromise;
}

function browserOptions() {
  return env.remotionBrowserExecutable
    ? { browserExecutable: env.remotionBrowserExecutable }
    : {};
}

/**
 * Picks the captures that suit the target device and rewrites the storyboard's
 * asset ids onto them, so a `macbook_14` ad shows the desktop crops even
 * though the storyboard was written against the mobile ids.
 */
export function assetsForDevice(
  assets: AssetRef[],
  device: DeviceType,
): AssetRef[] {
  const kind = DEVICE_SPECS[device].kind;
  const wantsDesktop = kind === "laptop" || kind === "monitor";
  const isDesktop = (asset: AssetRef): boolean =>
    asset.id.startsWith("screenshot_desktop");

  const preferred = assets.filter((asset) =>
    wantsDesktop ? isDesktop(asset) : !isDesktop(asset),
  );
  if (preferred.length === 0) return assets;

  // Re-expose the preferred captures under the canonical ids the storyboard
  // references, while keeping the originals addressable too.
  const aliased: AssetRef[] = preferred.map((asset, index) => ({
    ...asset,
    id:
      index === 0
        ? "screenshot_main"
        : `screenshot_${index}`,
  }));

  // Keep the originals addressable under their own ids, but do not fall back
  // to the other surface: a tall phone capture cropped into a laptop screen
  // reads as a mistake.
  const seen = new Set(aliased.map((asset) => asset.id));
  for (const asset of preferred) {
    if (!seen.has(asset.id)) {
      aliased.push(asset);
      seen.add(asset.id);
    }
  }
  return aliased;
}

/**
 * Async because of the QR code: it is rendered once per job here rather than
 * inside the composition, which runs in a browser and once per frame.
 */
export async function buildInputProps(
  request: GenerationRequest,
): Promise<VideoCompositionProps> {
  const assets = assetsForDevice(request.productAnalysis.assets, request.device);
  const resolved = resolveCta(
    request.device,
    request.metadata,
    request.productAnalysis,
  );

  return {
    storyboard: { ...request.storyboard, style: request.style, device: request.device },
    style: request.style,
    device: request.device,
    palette: request.productAnalysis.colorPalette,
    assets,
    productName: request.productAnalysis.name,
    cta: resolved
      ? {
          headline: resolved.headline,
          url: resolved.url,
          hint: resolved.hint,
          qrCode: await generateQrCode(resolved.target),
        }
      : null,
  };
}

export interface RenderOptions {
  jobId: string;
  request: GenerationRequest;
  /** 0..1 across the whole multi-aspect render. */
  onProgress: (fraction: number, message: string) => void;
  signal?: AbortSignal;
}

/** h264 needs even dimensions; round rather than truncate so 1:1 stays square. */
const even = (value: number): number => Math.round(value / 2) * 2;

/**
 * The compositions are authored at a 1080 short edge. Rendering at 720
 * costs 44% of the pixels per frame, which is the single largest lever on
 * peak memory after concurrency.
 */
function scaled(width: number, height: number): { width: number; height: number } {
  const factor = env.videoShortEdge / 1080;
  if (factor >= 1) return { width, height };
  return { width: even(width * factor), height: even(height * factor) };
}

async function renderOne(
  serveUrl: string,
  ratio: AspectRatio,
  inputProps: VideoCompositionProps,
  outputLocation: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const composition = await selectComposition({
    serveUrl,
    id: COMPOSITION_IDS[ratio],
    inputProps,
    ...browserOptions(),
  });

  const size = scaled(composition.width, composition.height);

  await renderMedia({
    composition: { ...composition, ...size },
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 80,
    // Remotion attaches a silent AAC track by default - 317 kb/s of nothing,
    // which was close to half the file. These compositions have no audio at
    // all, so drop the track rather than pay to encode silence. Flip this if
    // voice-over is ever added.
    muted: true,
    crf: env.videoCrf,
    x264Preset: env.x264Preset as "veryfast",
    // Each unit of concurrency is another Chrome tab holding a frame buffer.
    concurrency: env.renderConcurrency,
    chromiumOptions: { gl: "swangle" },
    ...browserOptions(),
    onProgress: ({ progress }) => onProgress(progress),
  });
}

export async function renderVideo(options: RenderOptions): Promise<{
  outputs: VideoOutputs;
  poster: string;
}> {
  const { jobId, request, onProgress } = options;
  const serveUrl = await getBundle();
  const inputProps = await buildInputProps(request);
  const dir = bucketDir("videos");
  await fs.mkdir(dir, { recursive: true });

  const files: Partial<Record<AspectRatio, string>> = {};
  const primary: AspectRatio = "9:16";

  const nativeRatios = env.renderNativeAspects ? ASPECT_RATIOS : [primary];
  const totalSteps = nativeRatios.length;

  for (const [index, ratio] of nativeRatios.entries()) {
    const filename = `${jobId}-${ratio.replace(":", "x")}.mp4`;
    const outputLocation = path.join(dir, filename);
    onProgress(index / totalSteps, `Rendering ${ratio}`);

    await renderOne(serveUrl, ratio, inputProps, outputLocation, (fraction) => {
      onProgress((index + fraction) / totalSteps, `Rendering ${ratio}`);
    });

    // Move the moov atom to the front so the browser can start playing before
    // the whole file arrives. Stream copy, so it costs about a second.
    try {
      const faststart = path.join(dir, `${jobId}-${ratio.replace(":", "x")}.web.mp4`);
      await ffmpeg.optimizeForWeb(outputLocation, faststart);
      await fs.rename(faststart, outputLocation);
    } catch (error) {
      logger.warn({ error, jobId, ratio }, "faststart remux skipped");
    }

    files[ratio] = filename;
    logger.info({ jobId, ratio, filename }, "aspect rendered");
  }

  // When native multi-aspect rendering is off, reframe the master instead.
  if (!env.renderNativeAspects) {
    const master = path.join(dir, files[primary] as string);
    for (const ratio of ASPECT_RATIOS) {
      if (ratio === primary) continue;
      // Scaled like the master: reframing to the full 1080 table would
      // upscale a 720p source, costing bytes and quality for nothing.
      const full = ASPECT_DIMENSIONS[ratio];
      const size = scaled(full.width, full.height);
      const filename = `${jobId}-${ratio.replace(":", "x")}.mp4`;
      onProgress(0.9, `Exporting ${ratio}`);
      await ffmpeg.reframe(
        master,
        path.join(dir, filename),
        size.width,
        size.height,
      );
      files[ratio] = filename;
    }
  }

  onProgress(0.97, "Generating preview frame");
  const posterName = `${jobId}.jpg`;
  const posterPath = path.join(bucketDir("posters"), posterName);
  await fs.mkdir(path.dirname(posterPath), { recursive: true });
  try {
    await ffmpeg.extractPoster(
      path.join(dir, files[primary] as string),
      posterPath,
      Math.max(0.3, request.storyboard.totalDuration * 0.15),
    );
  } catch (error) {
    logger.warn({ error, jobId }, "poster extraction failed");
  }

  const outputs = {} as VideoOutputs;
  for (const ratio of ASPECT_RATIOS) {
    outputs[ASPECT_TO_OUTPUT_KEY[ratio]] = files[ratio] as string;
  }

  return { outputs, poster: posterName };
}
