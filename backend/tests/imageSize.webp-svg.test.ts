import { describe, expect, it } from "vitest";
import { imageSize } from "../src/utils/imageSize";

describe("imageSize: the formats a logo arrives in", () => {
  it("reads an SVG's width/height attributes", () => {
    const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="320" height="80"><rect/></svg>');
    expect(imageSize(svg)).toEqual({ width: 320, height: 80 });
  });

  it("falls back to an SVG's viewBox", () => {
    const svg = Buffer.from('<svg viewBox="0 0 512 128"></svg>');
    expect(imageSize(svg)).toEqual({ width: 512, height: 128 });
  });

  it("rejects an SVG with neither", () => {
    expect(imageSize(Buffer.from("<svg></svg>"))).toBeNull();
  });

  it("reads a VP8X (extended) WebP header", () => {
    // RIFF....WEBPVP8X + 10-byte chunk: flags(1) reserved(3) width-1(3) height-1(3)
    const b = Buffer.alloc(30);
    b.write("RIFF", 0, "ascii");
    b.writeUInt32LE(22, 4);
    b.write("WEBP", 8, "ascii");
    b.write("VP8X", 12, "ascii");
    b.writeUInt32LE(10, 16);
    b.writeUIntLE(639, 24, 3);
    b.writeUIntLE(479, 27, 3);
    expect(imageSize(b)).toEqual({ width: 640, height: 480 });
  });

  it("reads a VP8L (lossless) WebP header", () => {
    const b = Buffer.alloc(30);
    b.write("RIFF", 0, "ascii");
    b.write("WEBP", 8, "ascii");
    b.write("VP8L", 12, "ascii");
    b[20] = 0x2f;
    const width = 300 - 1;
    const height = 150 - 1;
    b.writeUInt32LE(width | (height << 14), 21);
    expect(imageSize(b)).toEqual({ width: 300, height: 150 });
  });

  it("still reads PNG", () => {
    const png = Buffer.alloc(33);
    png.writeUInt32BE(0x89504e47, 0);
    png.write("IHDR", 12, "ascii");
    png.writeUInt32BE(1024, 16);
    png.writeUInt32BE(768, 20);
    expect(imageSize(png)).toEqual({ width: 1024, height: 768 });
  });
});
