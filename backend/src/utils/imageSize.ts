/**
 * Minimal PNG / JPEG / WebP / SVG dimension reader - avoids pulling in an
 * image library. Logos arrive in all four, and a logo whose size we do not
 * know is a logo that gets stretched to its slot.
 */
export function imageSize(
  buffer: Buffer,
): { width: number; height: number } | null {
  const webp = webpSize(buffer);
  if (webp) return webp;
  const svg = svgSize(buffer);
  if (svg) return svg;

  if (
    buffer.length > 24 &&
    buffer.readUInt32BE(0) === 0x89504e47 &&
    buffer.toString("ascii", 12, 16) === "IHDR"
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1] as number;
      const length = buffer.readUInt16BE(offset + 2);
      // SOF0..SOF15, excluding the DHT/DAC/DRI markers in that range.
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

export function decodeDataUri(
  input: string,
): { buffer: Buffer; mediaType: string } | null {
  const match = input.match(/^data:(image\/[a-z+]+);base64,(.+)$/s);
  if (!match) {
    // Bare base64 is accepted too; assume PNG.
    if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length > 64) {
      return { buffer: Buffer.from(input, "base64"), mediaType: "image/png" };
    }
    return null;
  }
  return {
    buffer: Buffer.from(match[2] as string, "base64"),
    mediaType: match[1] as string,
  };
}

function webpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 ") {
    // Lossy: a 3-byte start code then 14-bit width and height.
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    if (buffer[20] !== 0x2f) return null;
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function svgSize(buffer: Buffer): { width: number; height: number } | null {
  const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
  if (!/<svg[\s>]/i.test(head)) return null;
  const tag = /<svg\b[^>]*>/i.exec(head)?.[0] ?? "";
  const attr = (name: string): number | null => {
    const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);
    if (!match) return null;
    const value = Number.parseFloat(match[1] as string);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const width = attr("width");
  const height = attr("height");
  if (width && height) return { width: Math.round(width), height: Math.round(height) };
  const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    const [, , w, h] = parts;
    if (w && h && w > 0 && h > 0) return { width: Math.round(w), height: Math.round(h) };
  }
  return null;
}
