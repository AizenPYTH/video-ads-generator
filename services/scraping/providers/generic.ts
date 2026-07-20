import { decodeHtmlEntities } from "@/lib/html/decode-entities";
import { extractJsonLd } from "@/lib/scraping/json-ld";
import { fetchWithScrapingBee } from "../scrapingbee";
import type { ProductPageProvider, ScrapedProduct } from "./base";

export class GenericProductProvider implements ProductPageProvider {
  readonly name = "generic";

  canHandle(): boolean {
    return true;
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    const { html } = await fetchWithScrapingBee({ url, renderJs: true });

    const jsonLd = extractJsonLd(html);
    const openGraph = extractOpenGraph(html);

    const title =
      jsonLd?.name ??
      openGraph.title ??
      extractTag(html, "title") ??
      "Unknown Product";

    const description =
      jsonLd?.description ??
      openGraph.description ??
      extractMeta(html, "description");

    const images = [
      ...(jsonLd?.image ? normalizeImages(jsonLd.image) : []),
      ...(openGraph.image ? [openGraph.image] : []),
    ];

    const offers = jsonLd?.offers;
    const price = offers?.price ? parseFloat(String(offers.price)) : openGraph.price;
    const currency = offers?.priceCurrency ?? openGraph.currency;

    const brandFromJsonLd =
      typeof jsonLd?.brand === "string"
        ? jsonLd.brand
        : typeof (jsonLd?.brand as { name?: string } | undefined)?.name === "string"
          ? (jsonLd?.brand as { name: string }).name
          : null;

    return {
      title: decodeHtmlEntities(String(title).trim()),
      description: description ? decodeHtmlEntities(String(description).trim()) : null,
      price: Number.isFinite(price) ? price : null,
      currency: currency ?? null,
      images: [...new Set(images.filter(Boolean))],
      brand: brandFromJsonLd ?? openGraph.siteName ?? null,
      sku: jsonLd?.sku ?? jsonLd?.mpn ?? null,
      condition: jsonLd?.itemCondition ?? null,
      sourceUrl: url,
      raw: { jsonLd, openGraph, provider: this.name },
    };
  }
}

function extractOpenGraph(html: string) {
  return {
    title: extractMeta(html, "og:title"),
    description: extractMeta(html, "og:description"),
    image: extractMeta(html, "og:image"),
    siteName: extractMeta(html, "og:site_name"),
    price: parseFloat(extractMeta(html, "product:price:amount") ?? "") || null,
    currency: extractMeta(html, "product:price:currency"),
  };
}

function extractMeta(html: string, name: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]*(?:property|name)="${name}"[^>]*content="([^"]*)"`, "i"),
  );
  return match?.[1] ?? null;
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? null;
}

function normalizeImages(
  image: string | string[] | Array<{ url?: string }>,
): string[] {
  if (typeof image === "string") return [image];
  if (Array.isArray(image)) {
    return image.map((item) =>
      typeof item === "string" ? item : item.url ?? "",
    ).filter(Boolean);
  }
  return [];
}
