import iconv from "iconv-lite";

export type DetectedEncoding = "utf-8" | "utf-16le" | "windows-1252";

export function detectAndDecodeCsv(buffer: ArrayBuffer | Buffer | string): {
  text: string;
  encoding: DetectedEncoding;
  delimiter: "," | ";";
} {
  if (typeof buffer === "string") {
    return {
      text: buffer.replace(/^\uFEFF/, ""),
      encoding: "utf-8",
      delimiter: detectDelimiter(buffer),
    };
  }

  const bytes = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(buffer);

  let encoding: DetectedEncoding = "utf-8";
  let text: string;

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
    text = bytes.toString("utf16le").replace(/^\uFEFF/, "");
  } else if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = "utf-8";
    text = bytes.toString("utf8").replace(/^\uFEFF/, "");
  } else {
    const asUtf8 = bytes.toString("utf8");
    const replacementCount = (asUtf8.match(/\uFFFD/g) ?? []).length;
    if (replacementCount > 0 || looksLikeWindows1252(bytes)) {
      encoding = "windows-1252";
      text = iconv.decode(bytes, "win1252");
    } else {
      encoding = "utf-8";
      text = asUtf8;
    }
  }

  return {
    text: text.replace(/^\uFEFF/, ""),
    encoding,
    delimiter: detectDelimiter(text),
  };
}

function looksLikeWindows1252(bytes: Buffer): boolean {
  // Presence of common French accent bytes in 1252 without valid UTF-8 multibyte
  let high = 0;
  for (let i = 0; i < Math.min(bytes.length, 4000); i++) {
    if (bytes[i] >= 0x80 && bytes[i] <= 0x9f) high++;
  }
  return high > 2;
}

export function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}
