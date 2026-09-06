import type { CallToAction, ProductMetadata, ScreenSurface } from "../types";

/**
 * Accepts what people actually paste - `example.com`, `www.example.com/`,
 * `https://apps.apple.com/...` - and returns an absolute URL, or null if
 * there is no host in there at all.
 *
 * Anything that is not http(s) is rejected rather than coerced: a `mailto:`
 * or a `javascript:` link has no business being printed as a destination in
 * a video, and a QR code pointing at one is worse.
 */
export function normaliseUrl(raw: string | undefined | null): string | null {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;

  // `example.com:8080` and `mailto:hi@example.com` are both "word colon
  // something", so a bare scheme test would read the host of the first as a
  // scheme and drop the URL. Digits after the colon mean a port, not a scheme.
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/.exec(trimmed);
  const hasScheme = scheme !== null && !/^\d+([/?#]|$)/.test(scheme[2] ?? "");
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // A bare word with no dot is a typo, not a host.
  if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;

  return url.toString().replace(/\/$/, "");
}

/** Strips the scheme and any trailing slash - the URL is read, not clicked. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export interface ResolvedCta extends Omit<CallToAction, "qrCode"> {
  /** Absolute URL, i.e. what a QR code should encode. */
  target: string;
}

/**
 * Picks the one link the ad should close on.
 *
 * A template built around a phone ends on a store listing when there is
 * one, because that is where a viewer holding a phone goes next; one built
 * around a laptop or monitor ends on the site. Each falls back to the other
 * rather than showing nothing, and both fall back to the page we captured,
 * so an ad always closes on something actionable.
 */
export function resolveCta(
  surface: ScreenSurface,
  metadata: ProductMetadata | undefined,
  analysis: { name?: string; sourceUrl?: string },
): ResolvedCta | null {
  const appStore = normaliseUrl(metadata?.appStoreUrl);
  const playStore = normaliseUrl(metadata?.googlePlayUrl);
  const store = appStore ?? playStore;
  const site = normaliseUrl(metadata?.productUrl) ?? normaliseUrl(analysis.sourceUrl);

  const handheld = surface === "mobile";
  const target = handheld ? (store ?? site) : (site ?? store);
  if (!target) return null;

  const appName = metadata?.appName?.trim() || analysis.name?.trim() || "";
  const headline =
    target === appStore
      ? "Available on the App Store"
      : target === playStore
        ? "Get it on Google Play"
        : appName
          ? `Visit ${appName}`
          : "Visit the website";

  return {
    headline,
    url: displayUrl(target),
    hint: target === store ? "Scan to download" : "Scan to open",
    target,
  };
}
