/** Minimal PNG/JPEG dimension reader - avoids pulling in an image library. */
export function imageSize(
  buffer: Buffer,
): { width: number; height: number } | null {
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
