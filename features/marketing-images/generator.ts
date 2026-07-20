import sharp from "sharp";

export type MarketingImageInput = {
  productImageUrl: string;
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
};

const DEFAULT_TEMPLATE: MarketingTemplateConfig = {
  accentColor: "#1e3a5f",
  backgroundColor: "#ffffff",
  showPrice: true,
  showBrand: true,
  logoText: "SNOWOLF",
};

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 1200;

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOverlaySvg(
  title: string,
  price: string | undefined,
  brand: string | undefined,
  config: MarketingTemplateConfig,
): Buffer {
  const accent = config.accentColor ?? DEFAULT_TEMPLATE.accentColor!;
  const showPrice = config.showPrice ?? true;
  const showBrand = config.showBrand ?? true;
  const logoText = config.logoText ?? "SNOWOLF";

  const priceLine = showPrice && price
    ? `<text x="60" y="1080" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="${accent}">${escapeXml(price)} €</text>`
    : "";

  const brandLine = showBrand && brand
    ? `<text x="60" y="1020" font-family="Arial, sans-serif" font-size="32" fill="#666666">${escapeXml(brand)}</text>`
    : "";

  const svg = `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}">
      <rect x="0" y="0" width="${OUTPUT_WIDTH}" height="120" fill="${accent}" />
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">${escapeXml(logoText)}</text>
      <rect x="0" y="${OUTPUT_HEIGHT - 160}" width="${OUTPUT_WIDTH}" height="160" fill="white" opacity="0.95" />
      <text x="60" y="${OUTPUT_HEIGHT - 60}" font-family="Arial, sans-serif" font-size="28" fill="#333333">${escapeXml(title.slice(0, 60))}</text>
      ${brandLine}
      ${priceLine}
    </svg>
  `;

  return Buffer.from(svg);
}

export async function generateMarketingImage(
  input: MarketingImageInput,
): Promise<Buffer> {
  const config = { ...DEFAULT_TEMPLATE, ...input.template };
  const productBuffer = await fetchImageBuffer(input.productImageUrl);

  const productResized = await sharp(productBuffer)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT - 280, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();

  const overlay = buildOverlaySvg(
    input.title,
    input.price,
    input.brand,
    config,
  );

  const result = await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: config.backgroundColor ?? "#ffffff",
    },
  })
    .composite([
      { input: productResized, top: 120, left: 0 },
      { input: overlay, top: 0, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return result;
}
