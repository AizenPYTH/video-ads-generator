/**
 * Extrait les liens fiches produit depuis une page catalogue (catégorie / boutique / recherche).
 * Générique : eBay, Shopify, Magento/Utopya, Amazon.
 */

const MAX_CATALOG_PRODUCTS = 25;

const SKIP_PATH =
  /\/(?:collections?|categor(?:y|ies)|catalog\/category|customer|checkout|cart|search|account|login|wishlist|brand\/|marques?\/|seller|str\/)(?:\/|$)/i;

function isLikelyNavOrCategory(path: string): boolean {
  if (SKIP_PATH.test(path)) return true;
  const segments = path.replace(/^\//, "").replace(/\.html$/i, "").split("/");
  if (segments.length >= 2 && path.endsWith(".html")) {
    if (!/\/catalog\/product\/view\//i.test(path)) return true;
  }
  return false;
}

function collectFromPatterns(
  html: string,
  base: URL,
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

  const found = new Set<string>();
  const byProductId = new Map<string, string>();

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
    absolute.hash = "";
    // Garder _nkw etc. hors eBay item ; pour itm on nettoie
    if (/\/itm\//i.test(path)) {
      absolute.search = "";
    }

    // eBay item
    const itm = path.match(/\/itm\/(?:[^/]+\/)?(\d+)/i);
    if (itm && /ebay\./i.test(host)) {
      found.add(`${absolute.origin}/itm/${itm[1]}`);
      return;
    }

    // Shopify
    const product = path.match(/\/products\/([^/?#]+)/i);
    if (product) {
      found.add(`${absolute.origin}/products/${product[1]}`);
      return;
    }

    // Amazon ASIN
    const asin = path.match(
      /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
    );
    if (asin && /amazon\./i.test(host)) {
      found.add(`${absolute.origin}/dp/${asin[1]}`);
      return;
    }

    // Magento product view by id
    const magentoId = path.match(/\/catalog\/product\/view\/id\/(\d+)/i);
    if (magentoId) {
      const id = magentoId[1];
      const canonical = `${absolute.origin}/catalog/product/view/id/${id}/`;
      if (!byProductId.has(id)) byProductId.set(id, canonical);
      found.add(byProductId.get(id)!);
      return;
    }

    // Magento SEO product: /slug-produit.html (single segment)
    if (
      host === base.hostname.toLowerCase() &&
      /\.html$/i.test(path) &&
      !isLikelyNavOrCategory(path)
    ) {
      found.add(`${absolute.origin}${path}`);
    }
  };

  // Grilles produit Magento / thèmes courants
  collectFromPatterns(html, base, push, [
    /<a\b[^>]*class="[^"]*product-item-link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product-item-link[^"]*"/gi,
    /<a\b[^>]*class="[^"]*product-item-photo[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product(?:-item)?-photo[^"]*"/gi,
    /<a\b[^>]*class="[^"]*s-item__link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*s-item__link[^"]*"/gi,
    /data-(?:product-url|url)=["']([^"']+)["']/gi,
  ]);

  // data-sku + surrounding href (Utopya listing-item)
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

  // Priorité : liens de grille Magento si présents
  const magentoPreferred: string[] = [];
  for (const re of [
    /<a\b[^>]*class="[^"]*product-item-link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product-item-link[^"]*"/gi,
  ]) {
    for (const m of html.matchAll(re)) {
      try {
        const u = new URL(m[1], base);
        u.hash = "";
        u.search = "";
        if (u.hostname === base.hostname) {
          magentoPreferred.push(`${u.origin}${u.pathname}`);
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (magentoPreferred.length > 0) {
    return [...new Set(magentoPreferred)]
      .filter((u) => !u.endsWith("#") && !u.includes("/catalog/category/"))
      .slice(0, max);
  }

  // Priorité eBay : uniquement /itm/
  const ebayItems = [...found].filter((u) => /\/itm\/\d+/i.test(u));
  if (ebayItems.length > 0 && /ebay\./i.test(base.hostname)) {
    return ebayItems.slice(0, max);
  }

  return [...found].slice(0, max);
}

export { MAX_CATALOG_PRODUCTS };
