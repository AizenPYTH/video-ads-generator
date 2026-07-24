import { decodeHtmlEntities } from "@/lib/html/decode-entities";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { dedupeImageUrls } from "@/lib/images/dedupe";
import { resolveUtopyaCookies } from "@/lib/scraping/utopya-cookies";
import { fetchWithScrapingBee } from "../scrapingbee";
import type {
  ProductPageProvider,
  ScrapedProduct,
  ScrapeOptions,
} from "./base";
import {
  extractUtopyaProduct,
  isUtopyaUrl,
} from "./utopya-extract";

export class UtopyaProductProvider implements ProductPageProvider {
  readonly name = "utopya";

  canHandle(url: string): boolean {
    return isUtopyaUrl(url);
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedProduct> {
    const cookies = resolveUtopyaCookies(options?.cookies);

    const { html } = await fetchWithScrapingBee({
      url,
      renderJs: true,
      premiumProxy: true,
      countryCode: "fr",
      // Un peu plus court pour le parallélisme catalogue
      waitMs: cookies ? 2200 : 1500,
      blockResources: false,
      cookies,
      waitFor: cookies
        ? ".product_pricebloc .price, .price-wrapper, .box-no-log"
        : undefined,
    });

    const extracted = extractUtopyaProduct(html, url);
    const title =
      extracted.title?.trim() ||
      decodeHtmlEntities(
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ??
          "Produit sans titre",
      );

    const itemSpecifics = { ...extracted.itemSpecifics };
    if (!itemSpecifics.Type) {
      const inferred = inferProductTypeFromTitle(title);
      if (inferred) itemSpecifics.Type = inferred;
    }

    const images = dedupeImageUrls(extracted.images, { max: 6 }).map(
      (i) => i.url,
    );

    console.info("[scrape-utopya]", {
      title: title.slice(0, 60),
      price: extracted.price,
      loginRequired: extracted.priceLoginRequired,
      images: images.length,
      attrs: Object.keys(extracted.attributes),
      hasCookies: Boolean(cookies),
    });

    return {
      title,
      description: extracted.description,
      price: extracted.price,
      currency: "EUR",
      images,
      brand: extracted.brand,
      sku: extracted.sku,
      condition: "NewCondition",
      itemSpecifics,
      sourceUrl: url,
      raw: {
        provider: this.name,
        attributes: extracted.attributes,
        ean: extracted.ean,
        priceLoginRequired: extracted.priceLoginRequired,
        priceWarning: extracted.priceWarning,
      },
    };
  }
}
