#!/usr/bin/env node
/**
 * Pre-renders what the gallery shows for each template: a poster JPEG and
 * a short, small MP4 with placeholder content. The gallery then never
 * runs WebGL - ten live 3D scenes on one page is a fan, a poster and a
 * 540p loop is nothing.
 *
 *   node scripts/render-previews.mjs [templateId ...]     (from backend/)
 *
 * Output: ../frontend/public/previews/<id>.jpg and <id>.mp4 (1:1 where the
 * template offers it, else its first aspect).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, "..");
const OUT = path.resolve(backend, "..", "frontend", "public", "previews");
const PREVIEW_SHORT_EDGE = 540;

const { TEMPLATES } = await import(path.join(backend, "remotion", "src", "templates", "index.ts"));
const { placeholderInput } = await import(path.join(backend, "remotion", "src", "engine", "placeholders.ts"));
const { compositionId, ASPECT_DIMENSIONS } = await import(path.join(backend, "remotion", "src", "engine", "aspect.ts"));
const { findHeadlessShell } = await import(path.join(backend, "src", "utils", "browsers.ts"));

const wanted = process.argv.slice(2);
const targets = wanted.length ? TEMPLATES.filter((t) => wanted.includes(t.id)) : TEMPLATES;
if (targets.length === 0) throw new Error(`no templates match ${wanted.join(", ")}`);

fs.mkdirSync(OUT, { recursive: true });
const serveUrl = await bundle({
  entryPoint: path.join(backend, "remotion", "src", "index.ts"),
  publicDir: path.join(backend, "remotion", "public"),
});
const browserExecutable = findHeadlessShell();
const browser = browserExecutable ? { browserExecutable } : {};
const even = (v) => Math.round(v / 2) * 2;

for (const template of targets) {
  const aspect = template.aspects.includes("1:1") ? "1:1" : template.aspects[0];
  const inputProps = placeholderInput(template);
  const composition = await selectComposition({ serveUrl, id: compositionId(template.id, aspect), inputProps, ...browser });
  const full = ASPECT_DIMENSIONS[aspect];
  const factor = PREVIEW_SHORT_EDGE / Math.min(full.width, full.height);
  const size = { width: even(full.width * factor), height: even(full.height * factor) };
  const started = Date.now();

  await renderStill({
    composition: { ...composition, ...size },
    serveUrl, inputProps, imageFormat: "jpeg", jpegQuality: 88,
    frame: Math.round(composition.durationInFrames * 0.38),
    output: path.join(OUT, `${template.id}.jpg`),
    chromiumOptions: { gl: "swangle" }, ...browser, overwrite: true,
  });
  await renderMedia({
    composition: { ...composition, ...size },
    serveUrl, inputProps, codec: "h264", crf: 30, x264Preset: "veryfast", muted: true,
    imageFormat: "jpeg", jpegQuality: 75, concurrency: 2,
    outputLocation: path.join(OUT, `${template.id}.mp4`),
    chromiumOptions: { gl: "swangle" }, ...browser,
  });
  console.log(`${template.id}: poster + preview (${aspect}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
process.exit(0);
