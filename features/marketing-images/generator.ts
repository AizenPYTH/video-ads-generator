import { readFileSync, existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { removeNearWhiteBackground } from "@/lib/images/remove-background";
import { downloadProductImage } from "@/services/storage/images";

export type MarketingImageInput = {
  productImageUrl: string;
  productBuffer?: Buffer;
  storagePath?: string | null;
  title: string;
  price?: string;
  brand?: string;
  template?: MarketingTemplateConfig;
};

export type MarketingTemplateConfig = {
  accentColor?: string;
  backgroundColor?: string;
  showPrice?: boolean;
  showBrand?: boolean;
  logoText?: string;
  logoUrl?: string;
  imageUrl?: string;
  /** Utiliser le cadre d’annonce (défaut true). */
  useListingFrame?: boolean;
  /** @deprecated Utiliser useListingFrame */
  useSnowolfFrame?: boolean;
};

export type MarketingGenerationLog = {
  sourceFound: boolean;
  downloadOk: boolean;
  originalWidth?: number;
  originalHeight?: number;
  backgroundRemoved: boolean;
  backgroundReason: string;
  templateGenerated: boolean;
  frameUsed: boolean;
  customLogo: boolean;
  error?: string;
};

const OUTPUT = 1024;
/**
 * Zone blanche centrale du cadre Snowwolf (mesurée sur le PNG fourni, 1024²).
 * Le produit est centré exactement dans ce rectangle.
 */
const FRAME_ZONE = { x: 194, y: 177, w: 634, h: 693 };
/** Remplit la zone blanche avec une petite marge (coins arrondis / badges). */
const PRODUCT_FILL = 0.88;

function getFramePath(): string {
  return path.join(process.cwd(), "public", "brand", "listing-frame.png");
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
    headers: {
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; SmartSellerBot/1.0)",
    },
  });
  if (!response.ok) {
    throw new Error(`Téléchargement image échoué (HTTP ${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function resolveProductBuffer(
  url: string,
  storagePath?: string | null,
): Promise<Buffer> {
  if (storagePath) {
    try {
      return await downloadProductImage(storagePath);
    } catch {
      // fallback HTTP
    }
  }
  return fetchImageBuffer(url);
}

/**
 * Rend transparente la zone blanche centrale du cadre pour y placer le produit.
 */
async function punchProductHole(frame: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(frame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { x, y, w, h } = FRAME_ZONE;
  const pad = 8;
  for (let py = y + pad; py < y + h - pad; py++) {
    for (let px = x + pad; px < x + w - pad; px++) {
      const i = (py * info.width + px) * info.channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Blanc / quasi-blanc uniquement
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0;
      }
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export async function generateMarketingImage(
  input: MarketingImageInput,
): Promise<{ buffer: Buffer; log: MarketingGenerationLog }> {
  const log: MarketingGenerationLog = {
    sourceFound: false,
    downloadOk: false,
    backgroundRemoved: false,
    backgroundReason: "non tenté",
    templateGenerated: false,
    frameUsed: false,
    customLogo: false,
  };

  const config = input.template ?? {};
  const productUrl = input.productImageUrl || config.imageUrl;
  if (!productUrl && !input.productBuffer) {
    log.error = "Aucune image produit fournie.";
    throw new Error(log.error);
  }
  log.sourceFound = true;
  console.info("[marketing] image source trouvée", {
    urlHost: productUrl ? safeHost(productUrl) : "buffer",
    hasStoragePath: Boolean(input.storagePath),
  });

  let productBuffer: Buffer;
  try {
    if (input.productBuffer?.byteLength) {
      productBuffer = input.productBuffer;
      log.downloadOk = true;
    } else {
      productBuffer = await resolveProductBuffer(
        productUrl!,
        input.storagePath,
      );
      log.downloadOk = true;
    }
    const meta = await sharp(productBuffer).metadata();
    log.originalWidth = meta.width;
    log.originalHeight = meta.height;
    console.info("[marketing] téléchargement réussi", {
      width: meta.width,
      height: meta.height,
      bytes: productBuffer.byteLength,
    });
  } catch (err) {
    log.downloadOk = false;
    log.error = err instanceof Error ? err.message : "Téléchargement échoué";
    console.error("[marketing] téléchargement échoué", log.error);
    throw new Error(log.error);
  }

  try {
    const cut = await removeNearWhiteBackground(productBuffer);
    productBuffer = cut.buffer;
    log.backgroundRemoved = cut.removed;
    log.backgroundReason = cut.reason;
    console.info("[marketing] détourage", {
      removed: cut.removed,
      reason: cut.reason,
    });
  } catch (err) {
    log.backgroundRemoved = false;
    log.backgroundReason = "erreur — détourage ignoré";
    console.warn(
      "[marketing] détourage ignoré",
      err instanceof Error ? err.message : err,
    );
  }

  const framePath = getFramePath();
  const useFrame =
    config.useListingFrame !== false &&
    config.useSnowolfFrame !== false &&
    existsSync(framePath);

  const usableW = Math.round(FRAME_ZONE.w * PRODUCT_FILL);
  const usableH = Math.round(FRAME_ZONE.h * PRODUCT_FILL);
  const productResized = await sharp(productBuffer)
    .resize(usableW, usableH, {
      fit: "inside",
      withoutEnlargement: false,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const pMeta = await sharp(productResized).metadata();
  const pw = pMeta.width ?? usableW;
  const ph = pMeta.height ?? usableH;
  // Centrage exact dans la zone blanche
  const left = Math.round(FRAME_ZONE.x + (FRAME_ZONE.w - pw) / 2);
  const top = Math.round(FRAME_ZONE.y + (FRAME_ZONE.h - ph) / 2);

  console.info("[marketing] placement produit", {
    zone: FRAME_ZONE,
    product: { w: pw, h: ph },
    left,
    top,
  });

  let result: Buffer;

  if (useFrame) {
    log.frameUsed = true;
    const frameRaw = readFileSync(framePath);
    const frameSized = await sharp(frameRaw)
      .resize(OUTPUT, OUTPUT, { fit: "fill" })
      .png()
      .toBuffer();
    const framePunched = await punchProductHole(frameSized);

    // Produit au centre → cadre d’annonce par-dessus (badges, footer intacts)
    const base = await sharp({
      create: {
        width: OUTPUT,
        height: OUTPUT,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: productResized, top, left }])
      .png()
      .toBuffer();

    result = await sharp(base)
      .composite([{ input: framePunched, top: 0, left: 0 }])
      .png({ quality: 92 })
      .toBuffer();
    console.info("[marketing] génération avec cadre d’annonce", {
      bytes: result.byteLength,
    });
  } else {
    // Fallback SVG si le PNG manque
    result = await sharp({
      create: {
        width: OUTPUT,
        height: OUTPUT,
        channels: 4,
        background: { r: 11, g: 31, b: 54, alpha: 1 },
      },
    })
      .composite([
        {
          input: Buffer.from(`
            <svg width="${OUTPUT}" height="${OUTPUT}">
              <rect x="${FRAME_ZONE.x}" y="${FRAME_ZONE.y}" width="${FRAME_ZONE.w}" height="${FRAME_ZONE.h}" rx="24" fill="white"/>
              <text x="512" y="80" text-anchor="middle" font-family="Arial" font-size="36" font-weight="700" fill="white">Smart Seller</text>
            </svg>
          `),
          top: 0,
          left: 0,
        },
        { input: productResized, top, left },
      ])
      .png()
      .toBuffer();
  }

  log.templateGenerated = true;
  console.info("[marketing] génération du template OK", {
    bytes: result.byteLength,
    frameUsed: log.frameUsed,
  });

  return { buffer: result, log };
}
