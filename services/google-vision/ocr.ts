import { ImageAnnotatorClient } from "@google-cloud/vision";
import { AppError } from "@/lib/errors/app-error";

let visionClient: ImageAnnotatorClient | null = null;

function getCredentials(): { credentials?: object; keyFilename?: string } {
  const jsonCredentials = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;

  if (jsonCredentials) {
    try {
      return { credentials: JSON.parse(jsonCredentials) as object };
    } catch {
      throw AppError.internal("Invalid GOOGLE_CLOUD_CREDENTIALS_JSON");
    }
  }

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (keyFile) {
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

  const client = getVisionClient();

  const request =
    typeof image === "string"
      ? { image: { source: { imageUri: image } } }
      : { image: { content: image.toString("base64") } };

  try {
    const [result] = await client.documentTextDetection(request);
    const fullText = result.fullTextAnnotation?.text?.trim() ?? "";

    const blocks =
      result.textAnnotations?.slice(1).map((annotation) => ({
        text: annotation.description ?? "",
        confidence: 1,
      })) ?? [];

    return { fullText, blocks };
  } catch (error) {
    throw AppError.internal("Google Vision OCR failed", error);
  }
}
