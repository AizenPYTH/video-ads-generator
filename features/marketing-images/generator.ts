import { existsSync } from "fs";
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
  /** Ancien champ — traité comme frameUrl si frameUrl absent */
  imageUrl?: string;
  /** URL du cadre PNG de l’entreprise (prioritaire) */
  frameUrl?: string;
  /** Buffer cadre (tests / usage interne) */
  frameBuffer?: Buffer;
  /** Utiliser un cadre (défaut true si un cadre est disponible). */
  useListingFrame?: boolean;
  /** @deprecated Utiliser useListingFrame */
  useSnowolfFrame?: boolean;
  /** Zone produit dans le cadre (sinon détection / défaut). */
  frameZone?: { x: number; y: number; w: number; h: number };
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
  customFrame: boolean;
  customLogo: boolean;
  error?: string;
};

const OUTPUT = 1024;
/**
 * Zone blanche centrale du cadre par défaut (listing-frame.png, 1024²).
 */
const DEFAULT_FRAME_ZONE = { x: 191, y: 177, w: 640, h: 719 };
/** Remplit la zone blanche avec une petite marge. */
const PRODUCT_FILL = 0.88;

function getDefaultFramePath(): string {
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
 * Rend transparente la zone blanche du cadre pour y placer le produit.
 * Si `zone` est fournie, ne perce que cette zone ; sinon tous les pixels quasi-blancs.
 */
async function punchProductHole(
  frame: Buffer,
  zone?: { x: number; y: number; w: number; h: number } | null,
): Promise<Buffer> {
  const { data, info } = await sharp(frame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const x0 = zone ? zone.x : 0;
  const y0 = zone ? zone.y : 0;
  const x1 = zone ? zone.x + zone.w : info.width;
  const y1 = zone ? zone.y + zone.h : info.height;
  const pad = zone ? 8 : 0;

  for (let py = y0 + pad; py < y1 - pad; py++) {
    for (let px = x0 + pad; px < x1 - pad; px++) {
      const i = (py * info.width + px) * info.channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
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

/**
 * Estime une zone centrale blanche dans un cadre custom.
 */
async function detectWhiteZone(
  frame: Buffer,
): Promise<{ x: number; y: number; w: number; h: number }> {
  const { data, info } = await sharp(frame)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
        count += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 1000) {
    // Pas assez de blanc → zone centrale généreuse
    return { x: 160, y: 160, w: 704, h: 704 };
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(100, maxX - minX + 1),
    h: Math.max(100, maxY - minY + 1),
  };
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
    customFrame: false,
    customLogo: false,
  };

  const config = input.template ?? {};
  const productUrl = input.productImageUrl;
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
  } catch (err) {
    log.downloadOk = false;
    log.error = err instanceof Error ? err.message : "Téléchargement échoué";
    throw new Error(log.error);
  }

  try {
    const cut = await removeNearWhiteBackground(productBuffer);
    productBuffer = cut.buffer;
    log.backgroundRemoved = cut.removed;
    log.backgroundReason = cut.reason;
  } catch (err) {
    log.backgroundRemoved = false;
    log.backgroundReason = "erreur — détourage ignoré";
    console.warn(
      "[marketing] détourage ignoré",
      err instanceof Error ? err.message : err,
    );
  }

  const customFrameUrl =
    (typeof config.frameUrl === "string" && config.frameUrl.trim()) ||
    (typeof config.imageUrl === "string" && config.imageUrl.trim()) ||
    null;

  const wantFrame = config.useListingFrame !== false && config.useSnowolfFrame !== false;

  let frameBuffer: Buffer | null = null;
  let frameZone = config.frameZone ?? DEFAULT_FRAME_ZONE;

  if (wantFrame && config.frameBuffer?.byteLength) {
    frameBuffer = config.frameBuffer;
    log.customFrame = true;
    if (!config.frameZone) {
      frameZone = await detectWhiteZone(
        await sharp(frameBuffer)
          .resize(OUTPUT, OUTPUT, { fit: "fill" })
          .png()
          .toBuffer(),
      );
    }
  } else if (wantFrame && customFrameUrl) {
    try {
      frameBuffer = await fetchImageBuffer(customFrameUrl);
      log.customFrame = true;
      if (!config.frameZone) {
        frameZone = await detectWhiteZone(
          await sharp(frameBuffer)
            .resize(OUTPUT, OUTPUT, { fit: "fill" })
            .png()
            .toBuffer(),
        );
      }
    } catch (err) {
      console.warn(
        "[marketing] cadre entreprise illisible",
        err instanceof Error ? err.message : err,
      );
      frameBuffer = null;
    }
  }

  // Pas de cadre entreprise → pas de cadre Snowwolf imposé
  if (wantFrame && !frameBuffer) {
    log.error =
      "Aucun cadre entreprise configuré. Allez dans Paramètres → Publication → Cadre d’annonce pour uploader le vôtre.";
    throw new Error(log.error);
  }

  const usableW = Math.round(frameZone.w * PRODUCT_FILL);
  const usableH = Math.round(frameZone.h * PRODUCT_FILL);
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
  const left = Math.round(frameZone.x + (frameZone.w - pw) / 2);
  const top = Math.round(frameZone.y + (frameZone.h - ph) / 2);

  let result: Buffer;

  if (frameBuffer) {
    log.frameUsed = true;
    const frameSized = await sharp(frameBuffer)
      .resize(OUTPUT, OUTPUT, { fit: "fill" })
      .png()
      .toBuffer();
    // Cadre custom : percer tout le blanc ; cadre défaut : zone mesurée
    const framePunched = await punchProductHole(
      frameSized,
      log.customFrame ? null : frameZone,
    );

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
  } else {
    // Ne devrait pas arriver (erreur plus haut) — filet de sécurité
    result = await sharp({
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
  }

  log.templateGenerated = true;
  return { buffer: result, log };
}

/** @deprecated */
export function getFramePath(): string {
  return getDefaultFramePath();
}

/** Conservé pour tests éventuels */
export function defaultFrameExists(): boolean {
  return existsSync(getDefaultFramePath());
}
