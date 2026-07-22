/**
 * Extrait les liens / cartes produit depuis une page catalogue (catégorie / boutique / recherche).
 * Générique : eBay, Shopify, Magento/Utopya, Amazon.
 */

const MAX_CATALOG_PRODUCTS = 25;

const SKIP_PATH =
  /\/(?:collections?|categor(?:y|ies)|catalog\/category|customer|checkout|cart|search|account|login|wishlist|brand\/|marques?\/|seller|str\/)(?:\/|$)/i;

export type CatalogProductCard = {
  url: string;
  title: string | null;
  image: string | null;
  sku: string | null;
  brand: string | null;
  price: number | null;
};

function isLikelyNavOrCategory(path: string): boolean {
  if (SKIP_PATH.test(path)) return true;
  const segments = path.replace(/^\//, "").replace(/\.html$/i, "").split("/");
  if (segments.length >= 2 && path.endsWith(".html")) {
    if (!/\/catalog\/product\/view\//i.test(path)) return true;
  }
  return false;
}

function absoluteUrl(href: string, base: URL): URL | null {
  try {
    const absolute = new URL(href, base);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return null;
    }
    absolute.hash = "";
    return absolute;
  } catch {
    return null;
  }
}

function normalizeProductUrl(href: string, base: URL): string | null {
  const absolute = absoluteUrl(href, base);
  if (!absolute) return null;

  const host = absolute.hostname.toLowerCase();
  const path = absolute.pathname;

  const itm = path.match(/\/itm\/(?:[^/]+\/)?(\d+)/i);
  if (itm && /ebay\./i.test(host)) {
    return `${absolute.origin}/itm/${itm[1]}`;
  }

  const product = path.match(/\/products\/([^/?#]+)/i);
  if (product) {
    return `${absolute.origin}/products/${product[1]}`;
  }

  const asin = path.match(
    /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
  );
  if (asin && /amazon\./i.test(host)) {
    return `${absolute.origin}/dp/${asin[1]}`;
  }

  const magentoId = path.match(/\/catalog\/product\/view\/id\/(\d+)/i);
  if (magentoId) {
    return `${absolute.origin}/catalog/product/view/id/${magentoId[1]}/`;
  }

  if (
    host === base.hostname.toLowerCase() &&
    /\.html$/i.test(path) &&
    !isLikelyNavOrCategory(path)
  ) {
    return `${absolute.origin}${path}`;
  }

  return null;
}

function pickBestImage(block: string, base: URL): string | null {
  const img =
    block.match(
      /<img\b[^>]*class="[^"]*product-image-photo[^"]*"[^>]*src=["']([^"']+)["']/i,
    ) ||
    block.match(
      /<img\b[^>]*src=["']([^"']+)["'][^>]*class="[^"]*product-image-photo[^"]*"/i,
    ) ||
    block.match(/<img\b[^>]*src=["']([^"']*\/media\/catalog\/product\/[^"']+)["']/i);

  if (img?.[1]) {
    const u = absoluteUrl(img[1], base);
    if (u) return u.toString();
  }

  const srcset = block.match(/srcset=["']([^"']+)["']/i);
  if (srcset?.[1]) {
    const first = srcset[1].split(",")[0]?.trim().split(/\s+/)[0];
    if (first) {
      const u = absoluteUrl(first, base);
      if (u) return u.toString();
    }
  }

  return null;
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Magento / Utopya : une carte par `product-item-link` (titre + image + sku autour).
 * Évite de re-fetcher chaque fiche produit.
 */
export function extractCatalogProductCards(
  html: string,
  pageUrl: string,
  options?: { max?: number },
): CatalogProductCard[] {
  const max = options?.max ?? MAX_CATALOG_PRODUCTS;
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }

  const cards: CatalogProductCard[] = [];
  const seen = new Set<string>();
  const seenSku = new Set<string>();

  const linkPatterns = [
    /<a\b[^>]*class="[^"]*product-item-link[^"]*"[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product-item-link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
  ];

  for (const re of linkPatterns) {
    for (const m of html.matchAll(re)) {
      const href = m[1];
      const titleRaw = (m[2] || "").replace(/<[^>]+>/g, "");
      const url = normalizeProductUrl(href, base);
      if (!url) continue;
      if (/\/catalog\/product\/view\//i.test(url)) continue;
      if (seen.has(url)) continue;

      const idx = m.index ?? 0;
      const before = html.slice(Math.max(0, idx - 4500), idx);
      const skuMatches = [...before.matchAll(/data-sku=["']([^"']+)["']/gi)];
      const sku = skuMatches.at(-1)?.[1]?.trim() ?? null;
      if (sku && seenSku.has(sku)) continue;

      const brandMatches = [
        ...before.matchAll(/data-brand=["']([^"']+)["']/gi),
      ];
      const brand = brandMatches.at(-1)?.[1]?.trim() ?? null;
      const image = pickBestImage(before + m[0], base);
      // Prefer image from the nearest product photo before the title link
      const nearestPhoto = before.lastIndexOf("product-image-photo");
      const imageWindow =
        nearestPhoto >= 0
          ? before.slice(Math.max(0, nearestPhoto - 200), nearestPhoto + 400)
          : before;
      const imageNear = pickBestImage(imageWindow, base) ?? image;
      const title = titleRaw ? decodeBasicEntities(titleRaw) : null;
      if (!title && !image) continue;

      seen.add(url);
      if (sku) seenSku.add(sku);
      cards.push({
        url,
        title,
        image: imageNear,
        sku,
        brand,
        price: null,
      });
      if (cards.length >= max) return cards;
    }
  }

  return cards;
}

function collectFromPatterns(
  html: string,
  push: (href: string | undefined) => void,
  patterns: RegExp[],
) {
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      push(m[1]);
    }
  }
}

export function extractCatalogProductLinks(
  html: string,
  pageUrl: string,
  options?: { max?: number },
): string[] {
  const max = options?.max ?? MAX_CATALOG_PRODUCTS;
  let base: URL;
  try {
    base = new URL(pageUrl);
  } catch {
    return [];
  }

  // Priorité : cartes Magento (titre/image) — URLs propres
  const cards = extractCatalogProductCards(html, pageUrl, { max });
  if (cards.length > 0) {
    return cards.map((c) => c.url);
  }

  const found = new Set<string>();

  const push = (href: string | undefined) => {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    const normalized = normalizeProductUrl(href, base);
    if (normalized) found.add(normalized);
  };

  collectFromPatterns(html, push, [
    /<a\b[^>]*class="[^"]*product-item-link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product-item-link[^"]*"/gi,
    /<a\b[^>]*class="[^"]*product-item-photo[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product(?:-item)?-photo[^"]*"/gi,
    /<a\b[^>]*class="[^"]*s-item__link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*s-item__link[^"]*"/gi,
    /data-(?:product-url|url)=["']([^"']+)["']/gi,
  ]);

  for (const m of html.matchAll(
    /class="[^"]*product-item[^"]*"[^>]*>[\s\S]{0,1200}?<a\b[^>]*href=["']([^"']+)["']/gi,
  )) {
    push(m[1]);
  }

  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    push(m[1]);
    if (found.size >= max * 5) break;
  }

  for (const m of html.matchAll(
    /"(?:url|permalink|productUrl|href|itemUrl)"\s*:\s*"(https?:[^"]+\/(?:products|itm|catalog\/product)\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(
    /"(?:url|permalink)"\s*:\s*"(\/(?:products|itm)\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }

  const ebayItems = [...found].filter((u) => /\/itm\/\d+/i.test(u));
  if (ebayItems.length > 0 && /ebay\./i.test(base.hostname)) {
    return ebayItems.slice(0, max);
  }

  return [...found].slice(0, max);
}

export { MAX_CATALOG_PRODUCTS };
