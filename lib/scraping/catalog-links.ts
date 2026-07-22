/**
 * Extrait les liens fiches produit depuis une page catalogue (catégorie / boutique / recherche).
 */

const MAX_CATALOG_PRODUCTS = 25;

const SKIP_PATH =
  /\/(?:collections?|categor(?:y|ies)|catalog\/category|customer|checkout|cart|search|account|login|wishlist|brand\/|marques?\/)(?:\/|$)/i;

function isLikelyNavOrCategory(path: string): boolean {
  if (SKIP_PATH.test(path)) return true;
  // Magento category SEO pages often look like /apple/iphone.html (multi-segment)
  // Real product pages on Utopya are usually /slug-produit.html (single segment).
  const segments = path.replace(/^\//, "").replace(/\.html$/i, "").split("/");
  if (segments.length >= 2 && path.endsWith(".html")) {
    // Keep Magento nested product paths rare; treat multi-level .html as category/nav
    // unless it's catalog/product/view
    if (!/\/catalog\/product\/view\//i.test(path)) return true;
  }
  return false;
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
  /** Prefer SEO .html URLs when we also see /catalog/product/view/id/N */
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
    absolute.search = "";

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

    // Magento / Utopya SEO product: /slug-produit.html (single path segment)
    if (
      host === base.hostname.toLowerCase() &&
      /\.html$/i.test(path) &&
      !isLikelyNavOrCategory(path)
    ) {
      found.add(`${absolute.origin}${path}`);
    }
  };

  // Priorité Magento : liens produit de la grille (évite le menu)
  const magentoLinkPatterns = [
    /<a\b[^>]*class="[^"]*product-item-link[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product-item-link[^"]*"/gi,
    /<a\b[^>]*class="[^"]*product-item-photo[^"]*"[^>]*href=["']([^"']+)["']/gi,
    /<a\b[^>]*href=["']([^"']+)["'][^>]*class="[^"]*product(?:-item)?-photo[^"]*"/gi,
  ];
  for (const re of magentoLinkPatterns) {
    for (const m of html.matchAll(re)) {
      push(m[1]);
    }
  }

  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    push(m[1]);
    if (found.size >= max * 4) break;
  }

  // JSON embedded product URLs (Shopify collections often include these)
  for (const m of html.matchAll(
    /"(?:url|permalink|productUrl|href)"\s*:\s*"(https?:[^"]+\/(?:products|itm|catalog\/product)\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }
  for (const m of html.matchAll(
    /"(?:url|permalink)"\s*:\s*"(\/products\/[^"]+)"/gi,
  )) {
    push(m[1]);
  }

  // Si on a des product-item-link Magento, privilégier ceux-là (plus fiables)
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
    const uniq = [...new Set(magentoPreferred)].filter(
      (u) => !u.endsWith("#") && !u.includes("/catalog/category/"),
    );
    return uniq.slice(0, max);
  }

  return [...found].slice(0, max);
}

export { MAX_CATALOG_PRODUCTS };
