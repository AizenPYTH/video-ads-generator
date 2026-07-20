import { decodeHtmlEntities } from "@/lib/html/decode-entities";
import { fetchWithScrapingBee } from "../scrapingbee";
import type { ProductPageProvider, ScrapedProduct } from "./base";

const EBAY_HOSTS = ["ebay.com", "ebay.fr", "ebay.de", "ebay.co.uk", "ebay.it", "ebay.es"];

export class EbayProductProvider implements ProductPageProvider {
  readonly name = "ebay";

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return EBAY_HOSTS.some((host) => hostname.includes(host));
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    const { html } = await fetchWithScrapingBee({ url, renderJs: true });

    const title =
      extractMeta(html, "og:title") ??
      extractBetween(html, /<h1[^>]*class="[^"]*x-item-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ??
      extractBetween(html, /<title>([\s\S]*?)<\/title>/i) ??
      "Unknown eBay Item";

    const priceText =
      extractMeta(html, "product:price:amount") ??
      extractBetween(html, /itemprop="price"[^>]*content="([^"]+)"/i) ??
      extractBetween(html, /class="[^"]*x-price-primary[^"]*"[^>]*>[\s\S]*?([0-9]+[.,][0-9]+)/i);

    const currency =
      extractMeta(html, "product:price:currency") ??
      extractBetween(html, /itemprop="priceCurrency"[^>]*content="([^"]+)"/i) ??
      "EUR";

    const images = extractAll(
      html,
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi,
    );

    const description =
      extractMeta(html, "og:description") ??
      extractBetween(html, /id="desc_div"[^>]*>([\s\S]*?)<\/div>/i);

    return {
      title: decodeHtmlEntities(stripTags(title).trim()),
      description: description ? decodeHtmlEntities(stripTags(description).trim()) : null,
      price: parsePrice(priceText),
      currency,
      images: [...new Set(images)],
      brand: extractItemSpecific(html, "Brand") ?? extractItemSpecific(html, "Marque"),
      sku: extractItemSpecific(html, "MPN") ?? extractItemSpecific(html, "Numéro de pièce"),
      condition: extractItemSpecific(html, "Condition") ?? extractItemSpecific(html, "État"),
      sourceUrl: url,
      raw: { provider: this.name },
    };
  }
}

function extractMeta(html: string, property: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]*(?:property|name)="${property}"[^>]*content="([^"]*)"`, "i"),
  );
  return match?.[1] ?? null;
}

function extractBetween(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractAll(html: string, regex: RegExp): string[] {
  return [...html.matchAll(regex)].map((m) => m[1]).filter(Boolean);
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractItemSpecific(html: string, label: string): string | null {
  const regex = new RegExp(
    `${label}[^<]*</[^>]+>\\s*<[^>]+>\\s*([^<]+)`,
    "i",
  );
  return extractBetween(html, regex);
}
