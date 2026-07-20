import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { removeNearWhiteBackground } from "@/lib/images/remove-background";
import { detectWatermarkHint } from "@/lib/images/watermark-hint";
import { generateMarketingImage } from "@/features/marketing-images/generator";

describe("snowolf marketing + background", () => {
  it("removes near-white background", async () => {
    const product = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 80,
              height: 80,
              channels: 3,
              background: { r: 10, g: 80, b: 160 },
            },
          })
            .png()
            .toBuffer(),
          top: 60,
          left: 60,
        },
      ])
      .png()
      .toBuffer();

    const result = await removeNearWhiteBackground(product);
    expect(result.removed).toBe(true);
  });

  it("generates Smart Seller png from buffer using brand frame", async () => {
    const buf = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 20, g: 100, b: 180 },
      },
    })
      .png()
      .toBuffer();

    const { buffer, log } = await generateMarketingImage({
      productImageUrl: "https://example.com/p.png",
      productBuffer: buf,
      title: "Test produit",
      price: "12.00",
    });

    expect(log.templateGenerated).toBe(true);
    expect(log.downloadOk).toBe(true);
    expect(log.frameUsed).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(20_000);
    const meta = await sharp(buffer).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(1024);
  });

  it("flags utopia-like watermark hint without removing it", () => {
    const hint = detectWatermarkHint({
      url: "https://utopia.example/cdn/product.jpg",
    });
    expect(hint.suspected).toBe(true);
  });
});
