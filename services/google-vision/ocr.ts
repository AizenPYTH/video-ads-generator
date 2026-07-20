import { accessSync, constants } from "node:fs";
import sharp from "sharp";
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { AppError } from "@/lib/errors/app-error";

let visionClient: ImageAnnotatorClient | null = null;

function getCredentials(): { credentials?: object; keyFilename?: string } {
  const jsonCredentials = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON?.trim();

  if (jsonCredentials) {
    try {
      return { credentials: JSON.parse(jsonCredentials) as object };
    } catch {
      throw AppError.internal("Invalid GOOGLE_CLOUD_CREDENTIALS_JSON");
    }
  }

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (keyFile) {
    try {
      accessSync(keyFile, constants.R_OK);
    } catch {
      throw AppError.internal(
        `Google Vision credentials file not found or unreadable: ${keyFile}`,
      );
    }
    return { keyFilename: keyFile };
  }

  throw AppError.internal(
    "Google Cloud Vision credentials not configured (GOOGLE_CLOUD_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS)",
  );
}

export function getVisionClient(): ImageAnnotatorClient {
  if (visionClient) {
    return visionClient;
  }

  visionClient = new ImageAnnotatorClient(getCredentials());
  return visionClient;
}

export interface OcrResult {
  fullText: string;
  blocks: Array<{
    text: string;
    confidence: number;
  }>;
}

function formatVisionError(error: unknown): string {
  const err = error as {
    code?: number | string;
    message?: string;
    details?: string;
  };
  const message = err?.message ?? String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("billing") ||
    lower.includes("billing to be enabled") ||
    err?.code === 7
  ) {
    return "Google Vision OCR failed: billing must be enabled on the Google Cloud project (Cloud Vision API).";
  }

  if (lower.includes("api has not been used") || lower.includes("not enabled")) {
    return "Google Vision OCR failed: enable the Cloud Vision API on the Google Cloud project.";
  }

  if (lower.includes("enoent") || lower.includes("no such file")) {
    return "Google Vision OCR failed: credentials file path is invalid.";
  }

  return `Google Vision OCR failed: ${message}`;
}

/**
 * Prétraitement Sharp : agrandissement, contraste, variante inversée si fond sombre.
 */
export async function preprocessImageForOcr(buffer: Buffer): Promise<Buffer[]> {
  const variants: Buffer[] = [];

  try {
    const meta = await sharp(buffer).rotate().metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const minSide = Math.min(width || 1, height || 1);
    const scale = minSide < 900 ? Math.min(2.5, 1200 / minSide) : 1;

    const enhanced = await sharp(buffer)
      .rotate()
      .resize({
        width: scale !== 1 ? Math.round(width * scale) : undefined,
        height: scale !== 1 ? Math.round(height * scale) : undefined,
        fit: "inside",
        withoutEnlargement: scale === 1,
      })
      .normalize()
      .sharpen({ sigma: 1.2 })
      .png()
      .toBuffer();

    variants.push(enhanced);

    const { data } = await sharp(enhanced)
      .resize(24, 24, { fit: "inside" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const mean = sum / (data.length || 1);

    if (mean < 90) {
      const inverted = await sharp(enhanced).negate().normalize().png().toBuffer();
      variants.push(inverted);
    } else if (mean > 200) {
      const contrasted = await sharp(enhanced)
        .linear(1.25, -(128 * 0.25))
        .normalize()
        .png()
        .toBuffer();
      variants.push(contrasted);
    }
  } catch {
    variants.push(buffer);
  }

  return variants.length > 0 ? variants : [buffer];
}

async function downloadImageBuffer(image: Buffer | string): Promise<Buffer> {
  if (typeof image !== "string") return image;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    const response = await fetch(image);
    if (!response.ok) {
      throw AppError.internal(
        `Google Vision OCR failed: could not download image (${response.status})`,
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw AppError.internal(
    "Google Vision OCR failed: unsupported image URI (expected https URL or Buffer)",
  );
}

async function runVisionOnBase64(content: string): Promise<OcrResult> {
  const client = getVisionClient();
  const [result] = await client.documentTextDetection({
    image: { content },
  });
  const fullText = result.fullTextAnnotation?.text?.trim() ?? "";
  const blocks =
    result.textAnnotations?.slice(1).map((annotation) => ({
      text: annotation.description ?? "",
      confidence: 1,
    })) ?? [];
  return { fullText, blocks };
}

export async function extractTextFromImage(
  image: Buffer | string,
): Promise<OcrResult> {
  if (process.env.GOOGLE_VISION_MOCK_MODE === "true") {
    return {
      fullText: "MOCK-REF-820-01779-A\nSAMPLE PCB BOARD",
      blocks: [
        { text: "MOCK-REF-820-01779-A", confidence: 0.95 },
        { text: "SAMPLE PCB BOARD", confidence: 0.9 },
      ],
    };
  }

  try {
    const rawBuffer = await downloadImageBuffer(image);
    const variants = await preprocessImageForOcr(rawBuffer);

    let best: OcrResult = { fullText: "", blocks: [] };

    for (const variant of variants) {
      const result = await runVisionOnBase64(variant.toString("base64"));
      if (result.fullText.length > best.fullText.length) {
        best = result;
      }
    }

    return best;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal(formatVisionError(error), error);
  }
}
