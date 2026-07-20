import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  isNearlyBlankOrUniform,
  validateImageBuffer,
} from "@/lib/images/validate";

async function solidPng(
  color: { r: number; g: number; b: number },
  size = 200,
): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

async function noisyPng(size = 200): Promise<Buffer> {
  // Damier contrasté : clairement non uniforme
  const raw = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      const dark = (Math.floor(x / 20) + Math.floor(y / 20)) % 2 === 0;
      raw[i] = dark ? 20 + (x % 40) : 200 + (y % 40);
      raw[i + 1] = dark ? 80 + (y % 50) : 40 + (x % 30);
      raw[i + 2] = dark ? 160 : 30 + ((x + y) % 50);
    }
  }
  return sharp(raw, {
    raw: { width: size, height: size, channels: 3 },
  })
    .png()
    .toBuffer();
}

describe("validateImageBuffer", () => {
  it("rejects nearly blank / uniform white images", async () => {
    const white = await solidPng({ r: 255, g: 255, b: 255 });
    expect(await isNearlyBlankOrUniform(white)).toBe(true);
    expect(await validateImageBuffer(white, "image/png")).toBeNull();
  });

  it("rejects tiny images", async () => {
    const tiny = await solidPng({ r: 40, g: 120, b: 200 }, 32);
    // Even if colorful, below MIN_DIMENSION
    const result = await validateImageBuffer(tiny, "image/png");
    expect(result).toBeNull();
  });

  it("accepts a varied product-like image", async () => {
    const image = await noisyPng(240);
    const result = await validateImageBuffer(image, "image/png", 100);
    expect(result).not.toBeNull();
    expect(result!.width).toBeGreaterThanOrEqual(80);
    expect(result!.contentType).toBe("image/png");
  });
});
