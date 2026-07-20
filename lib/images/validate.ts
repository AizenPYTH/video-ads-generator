/**
 * Validation d'images téléchargées : MIME, taille, dimensions, anti-placeholder.
 */
import sharp from "sharp";

export type ValidatedImage = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  score: number;
};

const MIN_BYTES = 2_000;
const MIN_DIMENSION = 80;
const MAX_UNIFORMITY = 0.92;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function mimeFromBuffer(buffer: Buffer, headerMime?: string | null): string | null {
  const header = (headerMime ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (IMAGE_MIME.has(header)) {
    return header === "image/jpg" ? "image/jpeg" : header;
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "image/gif";
  }
  return null;
}

/**
 * Détecte une image quasi uniforme (placeholder blanc / vide).
 * Échantillonne des pixels RGBA et mesure la variance.
 */
export async function isNearlyBlankOrUniform(
  buffer: Buffer,
): Promise<boolean> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    const pixelCount = info.width * info.height;
    if (pixelCount < 4) return true;

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let transparent = 0;

    for (let i = 0; i < data.length; i += channels) {
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a < 16) {
        transparent += 1;
        continue;
      }
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
    }

    const opaque = pixelCount - transparent;
    if (opaque < pixelCount * 0.15) return true;

    const meanR = sumR / opaque;
    const meanG = sumG / opaque;
    const meanB = sumB / opaque;

    let variance = 0;
    for (let i = 0; i < data.length; i += channels) {
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a < 16) continue;
      const dr = data[i] - meanR;
      const dg = data[i + 1] - meanG;
      const db = data[i + 2] - meanB;
      variance += dr * dr + dg * dg + db * db;
    }
    variance /= opaque * 3;

    // Variance très basse = couleur quasi uniforme
    if (variance < 40) return true;

    // Blanc / gris très clair dominant
    const brightness = (meanR + meanG + meanB) / 3;
    if (brightness > 245 && variance < 120) return true;
    if (brightness < 8 && variance < 80) return true;

    // Uniformité relative
    const maxChannel = Math.max(meanR, meanG, meanB) || 1;
    const minChannel = Math.min(meanR, meanG, meanB);
    const channelUniformity = 1 - (maxChannel - minChannel) / 255;
    if (channelUniformity > MAX_UNIFORMITY && variance < 200) return true;

    return false;
  } catch {
    return true;
  }
}

export async function validateImageBuffer(
  buffer: Buffer,
  headerMime?: string | null,
  urlScore = 0,
): Promise<ValidatedImage | null> {
  if (buffer.byteLength < MIN_BYTES) return null;

  const contentType = mimeFromBuffer(buffer, headerMime);
  if (!contentType) return null;

  try {
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) return null;

    if (await isNearlyBlankOrUniform(buffer)) return null;

    const areaScore = Math.min(width * height, 4_000_000) / 1000;
    const bytesScore = Math.min(buffer.byteLength, 2_000_000) / 1000;

    return {
      buffer,
      contentType,
      width,
      height,
      bytes: buffer.byteLength,
      score: urlScore + areaScore + bytesScore,
    };
  } catch {
    return null;
  }
}

export async function fetchAndValidateImage(
  url: string,
  options?: { timeoutMs?: number; urlScore?: number },
): Promise<ValidatedImage | null> {
  const timeoutMs = options?.timeoutMs ?? 15_000;
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; SmartSellerBot/1.0; +https://smartseller.app)",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return validateImageBuffer(
      buffer,
      response.headers.get("content-type"),
      options?.urlScore ?? 0,
    );
  } catch {
    return null;
  }
}
