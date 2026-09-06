export function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Mirrors the server's check (`new URL`, http(s) only) rather than a stricter
 * regex: a client that rejects what the API accepts - an IP literal, a bare
 * `localhost`, a staging host - just looks broken.
 */
export function isLikelyUrl(value: string): boolean {
  const candidate = normalizeUrlInput(value);
  if (!candidate) return false;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname;
  return (
    host === "localhost" ||
    IPV4.test(host) ||
    host.startsWith("[") || // bracketed IPv6
    /\.[a-z]{2,}$/i.test(host)
  );
}

export const ACCEPTED_IMAGE_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
} as const;

export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILES = 8;

export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}
