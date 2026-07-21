import { decodeHtmlEntities } from "@/lib/html/decode-entities";
import { extractJsonLd } from "@/lib/scraping/json-ld";
import { dedupeImageUrls } from "@/lib/images/dedupe";
import { fetchWithScrapingBee } from "../scrapingbee";
import type { ProductPageProvider, ScrapedProduct } from "./base";

export class GenericProductProvider implements ProductPageProvider {
  readonly name = "generic";

  canHandle(): boolean {
    return true;
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    const isAmazon = /amazon\.(fr|com|de|co\.uk|it|es|ca)/i.test(url);
    const { html } = await fetchWithScrapingBee({
      url,
      renderJs: true,
      premiumProxy: true,
      countryCode: isAmazon ? undefined : "fr",
      waitMs: isAmazon ? 3500 : 1500,
      blockResources: false,
    });

    const jsonLd = extractJsonLd(html);
    const openGraph = extractOpenGraph(html);

    const title =
      jsonLd?.name ??
      openGraph.title ??
      extractTag(html, "title") ??
      "Produit sans titre";

    const description =
      jsonLd?.description ??
      openGraph.description ??
      extractMeta(html, "description") ??
      extractAmazonFeatureBullets(html);

    // Priorité : JSON-LD / Open Graph = vrai produit.
    // HTML élargi seulement après filtrage des blocs « suggestions ».
    const primaryImages = [
      ...(jsonLd?.image ? normalizeImages(jsonLd.image) : []),
      ...extractOpenGraphImages(html),
      ...extractAmazonImages(html),
    ];
    const galleryHtml = stripRelatedProductSections(html);
    const secondaryImages =
      primaryImages.length >= 4
        ? []
        : [
            ...extractProductGalleryImages(galleryHtml, url),
            ...extractHtmlImages(galleryHtml, url),
          ];

    const rawImages = [...primaryImages, ...secondaryImages];
    const images = dedupeImageUrls(rawImages, { max: 8 }).map((i) => i.url);

    console.info("[scrape-images]", {
      provider: "generic",
      isAmazon,
      primary: primaryImages.length,
      secondary: secondaryImages.length,
      afterDedupe: images.length,
    });

    const offers = jsonLd?.offers;
    const priceFromJson = parseOfferPrice(offers);
    const price =
      (Number.isFinite(priceFromJson) ? priceFromJson : null) ??
      openGraph.price ??
      extractAmazonPrice(html) ??
      extractAmazonPriceLoose(html);

    const currency =
      (offers &&
      !Array.isArray(offers) &&
      typeof offers === "object" &&
      "priceCurrency" in offers
        ? String((offers as { priceCurrency?: string }).priceCurrency ?? "")
        : null) ||
      (Array.isArray(offers) &&
      offers[0] &&
      typeof offers[0] === "object" &&
      "priceCurrency" in offers[0]
        ? String((offers[0] as { priceCurrency?: string }).priceCurrency ?? "")
        : null) ||
      openGraph.currency ||
      (isAmazon ? "EUR" : null);

    const brandFromJsonLd =
      typeof jsonLd?.brand === "string"
        ? jsonLd.brand
        : typeof (jsonLd?.brand as { name?: string } | undefined)?.name ===
            "string"
          ? (jsonLd?.brand as { name: string }).name
          : null;

    const asinMatch = url.match(
      /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
    );

    return {
      title: decodeHtmlEntities(String(title).trim()),
      description: description
        ? decodeHtmlEntities(String(description).trim())
        : null,
      price: Number.isFinite(price) ? Number(price) : null,
      currency: currency ?? null,
      images,
      brand:
        brandFromJsonLd ??
        extractAmazonBrand(html) ??
        openGraph.siteName ??
        null,
      sku: jsonLd?.sku ?? asinMatch?.[1] ?? null,
      condition: jsonLd?.itemCondition ?? (isAmazon ? "NewCondition" : null),
      sourceUrl: url,
      raw: { jsonLd, openGraph, provider: this.name, isAmazon },
    };
  }
}

function parseOfferPrice(offers: unknown): number | null {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!offer || typeof offer !== "object") continue;
    const price = (offer as { price?: unknown }).price;
    if (price == null) continue;
    const n = parseFloat(String(price).replace(",", "."));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
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

/** Toutes les balises og:image (plusieurs possibles). */
function extractOpenGraphImages(html: string): string[] {
  const urls: string[] = [];
  const re =
    /<meta[^>]*(?:property|name)=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    if (m[1]) urls.push(m[1]);
  }
  const re2 =
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image(?::url)?["']/gi;
  for (const m of html.matchAll(re2)) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

/**
 * Retire les blocs « produits similaires / suggestions » pour éviter
 * de récupérer les photos des autres articles en bas de page.
 */
function stripRelatedProductSections(html: string): string {
  let cleaned = html;
  const patterns = [
    /<(?:aside|section|div)[^>]*(?:id|class)=["'][^"']*(?:related|recommand|recommend|suggest|similar|upsell|cross[-_]?sell|also[-_]?bought|also[-_]?viewed|frequently|you[-_]?may|product[-_]?recommendations?|collection[-_]?products|autres[-_]?produits|vous[-_]?aimerez|complements?|accessoires[-_]?assoc)[^"']*["'][^>]*>[\s\S]*?<\/(?:aside|section|div)>/gi,
    /<!--\s*(?:related|recommendations?|upsell)[\s\S]*?-->/gi,
  ];
  for (const re of patterns) {
    cleaned = cleaned.replace(re, " ");
  }
  return cleaned;
}

/**
 * Galerie produit principale (Shopify / Woo / Utopia-like) — avant le HTML global.
 */
function extractProductGalleryImages(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const absolute = absolutizeUrl(raw.trim(), pageUrl);
    if (absolute && !isNoiseImageUrl(absolute)) urls.push(absolute);
  };

  const galleryBlocks = [
    ...html.matchAll(
      /<(?:div|section|ul)[^>]*(?:id|class)=["'][^"']*(?:product[-_]?gallery|product[-_]?media|product[-_]?images?|media[-_]?gallery|woocommerce-product-gallery|ProductGallery|main[-_]?image)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section|ul)>/gi,
    ),
  ];

  for (const block of galleryBlocks.slice(0, 3)) {
    const chunk = block[1] ?? "";
    for (const m of chunk.matchAll(/<(?:img|source)[^>]+>/gi)) {
      const tag = m[0];
      for (const attr of [
        "data-zoom-image",
        "data-large_image",
        "data-src",
        "src",
        "srcset",
      ]) {
        const match = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
        if (!match?.[1]) continue;
        if (attr === "srcset") {
          for (const part of match[1].split(",")) {
            push(part.trim().split(/\s+/)[0]);
          }
        } else {
          push(match[1]);
        }
      }
    }
  }

  return urls;
}

function isNoiseImageUrl(url: string): boolean {
  return /sprite|grey-pixel|pixel\.gif|1x1|transparent|icon|favicon|logo|badge|payment|visa|mastercard|paypal|avatar|flag|banner|newsletter|trust[-_]?pilot/i.test(
    url,
  );
}

/**
 * Extrait img[src], data-src, data-lazy-src, srcset, picture/source.
 * Ignore les miniatures / icônes / bruit.
 */
function extractHtmlImages(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const absolute = absolutizeUrl(raw.trim(), pageUrl);
    if (absolute && !isNoiseImageUrl(absolute)) urls.push(absolute);
  };

  for (const m of html.matchAll(/<(?:img|source)[^>]+>/gi)) {
    const tag = m[0];
    // Ignorer images clairement hors produit
    if (
      /related|recommend|suggest|upsell|similar|cart|thumb[-_]?nav|swatch/i.test(
        tag,
      )
    ) {
      continue;
    }
    const attrs = [
      "src",
      "data-src",
      "data-lazy-src",
      "data-original",
      "data-zoom-image",
      "data-large_image",
      "data-srcset",
      "srcset",
    ];
    for (const attr of attrs) {
      const re = new RegExp(`${attr}=["']([^"']+)["']`, "i");
      const match = tag.match(re);
      if (!match?.[1]) continue;
      if (attr.includes("srcset") || attr === "srcset") {
        for (const part of match[1].split(",")) {
          push(part.trim().split(/\s+/)[0]);
        }
      } else {
        push(match[1]);
      }
    }
  }

  return urls;
}

function absolutizeUrl(raw: string, pageUrl: string): string | null {
  if (!raw || raw.startsWith("data:")) return null;
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return null;
  }
}

function extractMeta(html: string, name: string): string | null {
  const match = html.match(
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
  );
  if (match?.[1]) return match[1];
  const match2 = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    ),
  );
  return match2?.[1] ?? null;
}

function extractTag(html: string, tag: string): string | null {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? null;
}

function normalizeImages(
  image: string | string[] | Array<{ url?: string }>,
): string[] {
  if (typeof image === "string") return [image];
  if (Array.isArray(image)) {
    return image
      .map((item) => (typeof item === "string" ? item : (item.url ?? "")))
      .filter(Boolean);
  }
  return [];
}

function extractAmazonImages(html: string): string[] {
  const urls: string[] = [];

  // landingImage data-a-dynamic-image='{"https://...":[...]}'
  const dynamicMatch = html.match(
    /data-a-dynamic-image=["'](\{[^"']+\})["']/i,
  );
  if (dynamicMatch?.[1]) {
    try {
      const parsed = JSON.parse(
        dynamicMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
      ) as Record<string, unknown>;
      urls.push(...Object.keys(parsed));
    } catch {
      // ignore
    }
  }

  // hiRes / large image URLs in scripts
  const hiResMatches = html.matchAll(
    /"(?:hiRes|large|mainUrl)"\s*:\s*"(https:\/\/[^"]+)"/gi,
  );
  for (const m of hiResMatches) {
    if (m[1] && !m[1].includes("sprite") && !m[1].includes("grey-pixel")) {
      urls.push(m[1].replace(/\\u002F/g, "/"));
    }
  }

  // classic media-amazon image tags
  const imgMatches = html.matchAll(
    /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|jpeg|png|webp)/gi,
  );
  for (const m of imgMatches) {
    urls.push(m[0].replace(/\._[A-Z0-9,_]+_\./, "."));
  }

  return urls;
}

function extractAmazonPrice(html: string): number | null {
  const offscreen = html.match(
    /class="[^"]*a-price[^"]*"[^>]*>[\s\S]*?class="[^"]*a-offscreen[^"]*"[^>]*>([^<]+)</i,
  );
  if (offscreen?.[1]) {
    const n = parseFloat(
      offscreen[1].replace(/[^\d,.-]/g, "").replace(",", "."),
    );
    if (Number.isFinite(n) && n > 0) return n;
  }

  const apex = html.match(
    /id="[^"]*priceblock_[^"]*"[^>]*>\s*([^<]+)/i,
  );
  if (apex?.[1]) {
    const n = parseFloat(
      apex[1].replace(/[^\d,.-]/g, "").replace(",", "."),
    );
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function extractAmazonFeatureBullets(html: string): string | null {
  const section = html.match(
    /id="feature-bullets"[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
  );
  if (!section?.[1]) return null;
  const items = [...section[1].matchAll(/<span[^>]*>([^<]{10,})<\/span>/gi)]
    .map((m) => m[1].trim())
    .filter((t) => !/voir plus|see more/i.test(t));
  if (!items.length) return null;
  return items
    .slice(0, 8)
    .map((t) => `• ${t}`)
    .join("\n");
}

function extractAmazonPriceLoose(html: string): number | null {
  const patterns = [
    /"priceAmount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /"displayPrice"\s*:\s*"([^"]+)"/i,
    /data-a-color="price"[^>]*>[\s\S]*?a-offscreen[^>]*>([^<]+)</i,
    /class="a-price-whole">([^<]+)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const n = parseFloat(
      String(m[1]).replace(/[^\d,.-]/g, "").replace(",", "."),
    );
    if (Number.isFinite(n) && n > 0 && n < 100_000) return n;
  }
  return null;
}

function extractAmazonBrand(html: string): string | null {
  const byline = html.match(
    /id="bylineInfo"[^>]*>[\s\S]*?(?:Marque\s*:?\s*|Visit the\s+|Brand:\s*)([^<]+)/i,
  );
  if (byline?.[1]) return byline[1].replace(/Store/i, "").trim();
  return null;
}
