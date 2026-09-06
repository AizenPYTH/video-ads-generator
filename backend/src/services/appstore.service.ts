import { logger } from "../utils/logger";

export interface AppStoreMatch {
  name: string;
  appStoreUrl: string;
  icon: string | null;
  publisher: string;
}

export interface AppStoreListing extends AppStoreMatch {
  id: string;
  description: string;
  /** Phone screenshots, largest size Apple serves. */
  screenshots: string[];
  /** 512px artwork, when available. */
  iconLarge: string | null;
}

const TIMEOUT_MS = 8000;

interface ItunesResult {
  trackId?: unknown;
  trackName?: unknown;
  trackViewUrl?: unknown;
  artworkUrl100?: unknown;
  artworkUrl512?: unknown;
  artistName?: unknown;
  description?: unknown;
  screenshotUrls?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** The numeric id in an App Store URL, if there is one. */
export function appStoreIdFrom(url: string): string | null {
  const match = /\/id(\d{6,})(?:[/?#]|$)/.exec(url);
  return match?.[1] ?? null;
}

export function isAppStoreUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "apps.apple.com" || host.endsWith(".apps.apple.com") || host === "itunes.apple.com";
  } catch {
    return false;
  }
}

async function itunes(path: string, params: Record<string, string>): Promise<ItunesResult[]> {
  const url = new URL(`https://itunes.apple.com/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`itunes responded ${response.status}`);
  const body = (await response.json()) as { results?: unknown };
  return Array.isArray(body.results) ? (body.results as ItunesResult[]) : [];
}

function toListing(item: ItunesResult): AppStoreListing | null {
  const id = item.trackId === undefined ? null : String(item.trackId);
  const name = asString(item.trackName);
  const appStoreUrl = asString(item.trackViewUrl);
  if (!id || !name || !appStoreUrl) return null;
  const screenshots = Array.isArray(item.screenshotUrls)
    ? item.screenshotUrls.filter((value): value is string => typeof value === "string")
    : [];
  return {
    id,
    name,
    appStoreUrl,
    icon: asString(item.artworkUrl100),
    iconLarge: asString(item.artworkUrl512),
    publisher: asString(item.artistName) ?? "",
    description: asString(item.description) ?? "",
    screenshots,
  };
}

/**
 * Looks a listing up by id. Apple's lookup API is the cleanest source for
 * an app's screenshots - the ones the developer published, at full size -
 * and needs no browser. Returns null on any failure; the caller falls back
 * to scraping the page.
 */
export async function lookupApp(id: string, country = "us"): Promise<AppStoreListing | null> {
  try {
    const results = await itunes("lookup", { id, country });
    return results.map(toListing).find((listing) => listing !== null) ?? null;
  } catch (error) {
    logger.warn({ error, id }, "app store lookup failed");
    return null;
  }
}

/** Free-text search, for the editor's "find my app" helper. */
export async function searchApps(term: string, country = "us"): Promise<AppStoreMatch[]> {
  try {
    const results = await itunes("search", { term, media: "software", limit: "5", country });
    return results
      .map(toListing)
      .filter((listing): listing is AppStoreListing => listing !== null)
      .map(({ name, appStoreUrl, icon, publisher }) => ({ name, appStoreUrl, icon, publisher }));
  } catch (error) {
    logger.warn({ error, term }, "app store search failed");
    return [];
  }
}

/** Downloads an image into memory with a size cap. Null on any failure. */
export async function fetchImage(
  url: string,
  maxBytes = 12 * 1024 * 1024,
): Promise<{ buffer: Buffer; mediaType: string } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!mediaType.startsWith("image/")) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) return null;
    return { buffer: Buffer.from(bytes), mediaType };
  } catch (error) {
    logger.warn({ error, url }, "image download failed");
    return null;
  }
}
