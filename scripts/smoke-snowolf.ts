/**
 * Smoke local : détourage + génération Smart Seller.
 */
import sharp from "sharp";
import { removeNearWhiteBackground } from "../lib/images/remove-background";
import { generateMarketingImage } from "../features/marketing-images/generator";
import { prepareProductImages } from "../lib/images/dedupe";
import { validateImageBuffer } from "../lib/images/validate";

async function main() {
  const product = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 220,
            height: 280,
            channels: 3,
            background: { r: 30, g: 90, b: 180 },
          },
        })
          .png()
          .toBuffer(),
        top: 160,
        left: 190,
      },
    ])
    .png()
    .toBuffer();

  const validated = await validateImageBuffer(product, "image/png", 100);
  console.log("[smoke] validate", Boolean(validated), validated?.width);

  const cut = await removeNearWhiteBackground(product);
  console.log("[smoke] detourage", cut.removed, cut.reason);

  const { buffer, log } = await generateMarketingImage({
    productImageUrl: "https://example.com/product.png",
    productBuffer: cut.buffer,
    title: "Smoke test Smart Seller",
    price: "19.90",
    brand: "Test",
  });

  console.log("[smoke] snowolf", {
    bytes: buffer.byteLength,
    log,
    ok: buffer.byteLength > 10_000 && log.templateGenerated,
  });

  // Simule pipeline import URL : prepare + validate (sans réseau)
  const prepared = await prepareProductImages([], { max: 1, contentHash: false });
  console.log("[smoke] prepare empty", prepared.afterContentDedupe === 0);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
