/**
 * Extrait les liens fiches produit depuis une page catalogue (catégorie / boutique / recherche).
 */

const MAX_CATALOG_PRODUCTS = 25;

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

  const found = new Set<string>();

  const push = (href: string | undefined) => {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    let absolute: URL;
    try {
      absolute = new URL(href, base);
    } catch {
      return;
    }
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return;

    const host = absolute.hostname.toLowerCase();
    const path = absolute.pathname;

    // eBay item
    const itm = path.match(/\/itm\/(\d+)/i);
    if (itm && /ebay\./i.test(host)) {
      found.add(`${absolute.origin}/itm/${itm[1]}`);
      return;
    }

    // Shopify / boutique product
    const product = path.match(/\/products\/([^/?#]+)/i);
    if (product) {
      found.add(`${absolute.origin}/products/${product[1]}`);
      return;
    }

    // Amazon ASIN
    const asin = path.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (asin && /amazon\./i.test(host)) {
      found.add(`${absolute.origin}/dp/${asin[1]}`);
    }
  };

  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    push(m[1]);
    if (found.size >= max * 3) break;
  }

  // JSON embedded product URLs (Shopify collections often include these)
  for (const m of html.matchAll(
    /"(?:url|permalink|productUrl|href)"\s*:\s*"(https?:[^"]+\/(?:products|itm)\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(
    /"(?:url|permalink)"\s*:\s*"(\/products\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }

  return [...found].slice(0, max);
}

export { MAX_CATALOG_PRODUCTS };
