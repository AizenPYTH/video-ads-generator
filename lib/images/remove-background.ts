/**
 * Détourage local gratuit : fond quasi blanc → transparent.
 * Pas de suppression de filigrane / logo.
 */
import sharp from "sharp";

export type BackgroundRemovalResult = {
  buffer: Buffer;
  removed: boolean;
  reason: string;
  width: number;
  height: number;
};

/**
 * Rend transparentes les zones proches du blanc (produits sur fond studio).
 * Si le fond n'est pas majoritairement clair, laisse l'image intacte.
 */
export async function removeNearWhiteBackground(
  input: Buffer,
): Promise<BackgroundRemovalResult> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width < 32 || height < 32) {
    return {
      buffer: input,
      removed: false,
      reason: "image trop petite",
      width,
      height,
    };
  }

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const total = info.width * info.height;
  let bright = 0;

  // Échantillon pour décider si le fond est clair
  const step = Math.max(1, Math.floor(total / 2000));
  for (let i = 0; i < total; i += step) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    if (r > 230 && g > 230 && b > 230) bright += 1;
  }
  const samples = Math.ceil(total / step);
  const brightRatio = bright / samples;

  if (brightRatio < 0.18) {
    return {
      buffer: input,
      removed: false,
      reason: "fond non clair — détourage ignoré",
      width,
      height,
    };
  }

  const threshold = 248;
  const softness = 12;
  for (let i = 0; i < total; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const min = Math.min(r, g, b);
    if (min >= threshold) {
      data[o + 3] = 0;
    } else if (min >= threshold - softness) {
      const t = (threshold - min) / softness;
      data[o + 3] = Math.round(255 * t);
    }
  }

  const out = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();

  return {
    buffer: out,
    removed: true,
    reason: "fond clair détouré",
    width: info.width,
    height: info.height,
  };
}
