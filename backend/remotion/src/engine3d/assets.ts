import { staticFile } from "remotion";

/**
 * Runtime 3D assets. Produced by `scripts/prepare-devices.mjs` from the
 * sources at the repo root; the sources are never loaded by a browser.
 *
 * `staticFile` resolves against the Remotion public dir on the server and
 * against the site root in the Player, so the same path works in both.
 */
export const MODELS = {
  iphone: "models/iphone-15-pro.glb",
} as const;

export function modelUrl(model: keyof typeof MODELS): string {
  return staticFile(MODELS[model]);
}

/** One world unit is 100 mm. A phone stands ~1.46 units tall. */
export const MM = 0.01;
