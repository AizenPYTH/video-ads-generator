import path from "node:path";
import fs from "node:fs/promises";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "../utils/env";
import { REMOTION_ENTRY, REMOTION_PUBLIC_DIR } from "../utils/paths";
import { logger } from "../utils/logger";
import { aspectKey, compositionId } from "../../remotion/src/engine/aspect";
import { bucketDir } from "./storage.service";
import * as ffmpeg from "./ffmpeg.service";
import type { AspectRatio, GenerationRequest, VideoOutputs } from "../types";

let bundlePromise: Promise<string> | null = null;

/** Bundling costs ~10-20s, so it happens once per process. */
export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: REMOTION_ENTRY,
      publicDir: REMOTION_PUBLIC_DIR,
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

export interface RenderOptions {
  jobId: string;
  request: GenerationRequest;
  /** 0..1 across the whole multi-aspect render. */
  onProgress: (fraction: number, message: string) => void;
}

async function renderOne(
  serveUrl: string,
  request: GenerationRequest,
  aspect: AspectRatio,
  outputLocation: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const composition = await selectComposition({
    serveUrl,
    id: compositionId(request.templateId, aspect),
    inputProps: request.input,
    ...browserOptions(),
  });

  await renderMedia({
    composition: { ...composition, ...scaled(composition.width, composition.height) },
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: request.input,
    imageFormat: "jpeg",
    jpegQuality: 80,
    // Remotion attaches a silent AAC track by default - 317 kb/s of nothing,
    // close to half the file. The templates have no audio, so drop it.
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

/**
 * Renders a template once per requested aspect. Each aspect is its own
 * composition - the template re-composes for the frame rather than being
 * cropped from a master - so the cost is linear in formats asked for.
 */
export async function renderTemplate(options: RenderOptions): Promise<{
  outputs: VideoOutputs;
  poster: string;
}> {
  const { jobId, request, onProgress } = options;
  const serveUrl = await getBundle();
  const dir = bucketDir("videos");
  await fs.mkdir(dir, { recursive: true });

  const outputs: VideoOutputs = {};
  const total = request.aspects.length;

  for (const [index, aspect] of request.aspects.entries()) {
    const filename = `${jobId}-${aspectKey(aspect)}.mp4`;
    const outputLocation = path.join(dir, filename);
    onProgress(index / total, `Rendering ${aspect}`);

    await renderOne(serveUrl, request, aspect, outputLocation, (fraction) => {
      onProgress((index + fraction) / total, `Rendering ${aspect}`);
    });

    // Move the moov atom to the front so the browser can start playing before
    // the whole file arrives. Stream copy, so it costs about a second.
    try {
      const faststart = path.join(dir, `${jobId}-${aspectKey(aspect)}.web.mp4`);
      await ffmpeg.optimizeForWeb(outputLocation, faststart);
      await fs.rename(faststart, outputLocation);
    } catch (error) {
      logger.warn({ error, jobId, aspect }, "faststart remux skipped");
    }

    outputs[aspect] = filename;
    logger.info({ jobId, aspect, filename }, "aspect rendered");
  }

  onProgress(0.97, "Generating preview frame");
  const posterName = `${jobId}.jpg`;
  const posterPath = path.join(bucketDir("posters"), posterName);
  await fs.mkdir(path.dirname(posterPath), { recursive: true });
  const first = request.aspects[0];
  const firstFile = first ? outputs[first] : undefined;
  if (firstFile) {
    try {
      // A third of the way in: past the entrance, before the end card.
      await ffmpeg.extractPoster(path.join(dir, firstFile), posterPath, 3.4);
    } catch (error) {
      logger.warn({ error, jobId }, "poster extraction failed");
    }
  }

  return { outputs, poster: posterName };
}
