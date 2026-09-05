import { chromium, type Browser, type Page } from "playwright";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export interface Capture {
  /** Stable id referenced by storyboards, e.g. "screenshot_main". */
  id: string;
  label: string;
  buffer: Buffer;
  width: number;
  height: number;
  /** Which device families this capture suits. */
  surface: "mobile" | "desktop";
}

export interface PageMetadata {
  title: string;
  description: string;
  headings: string[];
  ctas: string[];
  siteName: string;
}

export interface ScrapeResult {
  url: string;
  metadata: PageMetadata;
  captures: Capture[];
}

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** Overlays that ruin a hero shot. Removed rather than clicked: faster and
 *  works regardless of the consent vendor's button copy. */
const OVERLAY_SELECTORS = [
  "#onetrust-consent-sdk",
  "#CybotCookiebotDialog",
  "[id*='cookie' i][class*='banner' i]",
  "[class*='cookie-consent' i]",
  "[class*='cookie-banner' i]",
  "[aria-label*='cookie' i]",
  "[data-testid*='cookie' i]",
  "[id*='gdpr' i]",
];

function launchOptions() {
  const options: Parameters<typeof chromium.launch>[0] = {
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  };
  if (env.browserExecutable) options.executablePath = env.browserExecutable;
  return options;
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  return parsed.toString();
}

async function hideOverlays(page: Page): Promise<void> {
  await page
    .evaluate((selectors: string[]) => {
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach((node) => {
          (node as HTMLElement).style.display = "none";
        });
      }
      // Kill sticky headers that would repeat in every section shot.
      document.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement;
        const position = getComputedStyle(el).position;
        if (position === "fixed" && el.getBoundingClientRect().height > 400) {
          el.style.display = "none";
        }
      });
    }, OVERLAY_SELECTORS)
    .catch(() => undefined);
}

async function readMetadata(page: Page): Promise<PageMetadata> {
  return page.evaluate(() => {
    const text = (selector: string): string =>
      document.querySelector(selector)?.textContent?.trim() ?? "";
    const attr = (selector: string, name: string): string =>
      document.querySelector(selector)?.getAttribute(name)?.trim() ?? "";

    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => node.textContent?.trim() ?? "")
      .filter((value) => value.length > 2 && value.length < 140)
      .slice(0, 18);

    const ctas = Array.from(
      document.querySelectorAll("a[href], button, [role='button']"),
    )
      .map((node) => node.textContent?.trim() ?? "")
      .filter((value) => value.length > 1 && value.length < 40)
      .slice(0, 24);

    return {
      title: document.title || text("h1"),
      description:
        attr("meta[name='description']", "content") ||
        attr("meta[property='og:description']", "content"),
      siteName:
        attr("meta[property='og:site_name']", "content") ||
        location.hostname.replace(/^www\./, ""),
      headings,
      ctas,
    };
  });
}

/** Y offsets of the most visually substantial sections below the fold. */
async function sectionOffsets(page: Page, max: number): Promise<number[]> {
  return page.evaluate((limit: number) => {
    const candidates = Array.from(
      document.querySelectorAll("section, main > div, [class*='section' i]"),
    );
    const scored = candidates
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const area = rect.width * rect.height;
        const media = node.querySelectorAll("img, svg, video, canvas").length;
        const words = (node.textContent ?? "").trim().split(/\s+/).length;
        return { top, score: area / 1000 + media * 40 + Math.min(words, 120) };
      })
      .filter((item) => item.top > window.innerHeight * 0.6 && item.score > 60)
      .sort((a, b) => a.top - b.top);

    const picked: number[] = [];
    for (const item of scored) {
      if (picked.every((existing) => Math.abs(existing - item.top) > 320)) {
        picked.push(item.top);
      }
      if (picked.length >= limit) break;
    }
    return picked;
  }, max);
}

async function captureSurface(
  browser: Browser,
  url: string,
  surface: "mobile" | "desktop",
  sectionCount: number,
): Promise<{ captures: Capture[]; metadata: PageMetadata | null }> {
  const isMobile = surface === "mobile";
  const context = await browser.newContext({
    viewport: isMobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT,
    deviceScaleFactor: isMobile ? 3 : 2,
    isMobile,
    hasTouch: isMobile,
    userAgent: isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });

  // esbuild (via tsx) rewrites named inner functions with a `__name` helper.
  // That helper does not exist inside the page, so any `page.evaluate`
  // callback containing one throws `__name is not defined`. Shim it.
  await context.addInitScript({
    content: "globalThis.__name = globalThis.__name || ((fn) => fn);",
  });

  const captures: Capture[] = [];
  let metadata: PageMetadata | null;

  try {
    const page = await context.newPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: env.scrapeTimeoutMs,
    });
    // `networkidle` alone is unreliable on analytics-heavy marketing sites.
    await page
      .waitForLoadState("networkidle", { timeout: 12_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_500);
    await hideOverlays(page);

    // Force lazy content to paint before we shoot the sections.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    await hideOverlays(page);

    metadata = await readMetadata(page);

    const viewport = isMobile ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;
    const scale = isMobile ? 3 : 2;

    const hero = await page.screenshot({ type: "png" });
    captures.push({
      id: isMobile ? "screenshot_main" : "screenshot_desktop_main",
      label: isMobile ? "Mobile hero view" : "Desktop hero view",
      buffer: hero,
      width: viewport.width * scale,
      height: viewport.height * scale,
      surface,
    });

    const offsets = await sectionOffsets(page, sectionCount);
    for (const [index, offset] of offsets.entries()) {
      await page.evaluate((y: number) => window.scrollTo(0, y), offset);
      await page.waitForTimeout(400);
      const shot = await page.screenshot({ type: "png" });
      captures.push({
        id: isMobile
          ? `screenshot_${index + 1}`
          : `screenshot_desktop_${index + 1}`,
        label: `${isMobile ? "Mobile" : "Desktop"} section ${index + 1}`,
        buffer: shot,
        width: viewport.width * scale,
        height: viewport.height * scale,
        surface,
      });
    }
  } finally {
    await context.close().catch(() => undefined);
  }

  return { captures, metadata };
}

export async function scrapeUrl(rawUrl: string): Promise<ScrapeResult> {
  const url = normalizeUrl(rawUrl);
  const browser = await chromium.launch(launchOptions());
  try {
    const mobile = await captureSurface(browser, url, "mobile", 3);
    const desktop = await captureSurface(browser, url, "desktop", 2);
    const metadata = mobile.metadata ??
      desktop.metadata ?? {
        title: new URL(url).hostname,
        description: "",
        headings: [],
        ctas: [],
        siteName: new URL(url).hostname,
      };

    logger.info(
      { url, captures: mobile.captures.length + desktop.captures.length },
      "scrape complete",
    );

    return {
      url,
      metadata,
      captures: [...mobile.captures, ...desktop.captures],
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}
