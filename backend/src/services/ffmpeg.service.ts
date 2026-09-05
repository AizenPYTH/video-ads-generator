import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

/**
 * `ffmpeg-static` ships a binary so the service does not depend on a system
 * ffmpeg; PATH is still honoured when an operator sets FFMPEG_PATH.
 */
export const ffmpegPath: string =
  process.env.FFMPEG_PATH ?? (ffmpegStatic as unknown as string) ?? "ffmpeg";

export class FfmpegError extends Error {
  constructor(
    message: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "FfmpegError";
  }
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (error) =>
      reject(new FfmpegError(`ffmpeg failed to start: ${error.message}`, stderr)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new FfmpegError(`ffmpeg exited with code ${code}`, stderr));
    });
  });
}

export async function isAvailable(): Promise<boolean> {
  try {
    await run(["-hide_banner", "-version"]);
    return true;
  } catch (error) {
    logger.warn({ error, ffmpegPath }, "ffmpeg is not available");
    return false;
  }
}

/** Single frame at ~15% in, used as the video poster in the UI. */
export async function extractPoster(
  input: string,
  output: string,
  atSeconds: number,
): Promise<void> {
  await run([
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    atSeconds.toFixed(2),
    "-i",
    input,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    output,
  ]);
}

/**
 * Re-frames a rendered video into a different aspect ratio: the source is
 * scaled to fit and laid over a blurred, zoomed copy of itself. Cropping would
 * cut the device frame in half; a flat bar would look unfinished.
 */
export async function reframe(
  input: string,
  output: string,
  width: number,
  height: number,
): Promise<void> {
  const filter = [
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=luma_radius=min(h\\,w)/20:luma_power=2,eq=brightness=-0.12[bg]`,
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[out]`,
  ].join(";");

  await run([
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-filter_complex",
    filter,
    "-map",
    "[out]",
    "-c:v",
    "libx264",
    "-preset",
    env.x264Preset,
    "-crf",
    String(env.videoCrf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output,
  ]);
}

/** Rewrites the moov atom to the front so the browser can stream the file. */
export async function optimizeForWeb(
  input: string,
  output: string,
): Promise<void> {
  await run([
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
}
