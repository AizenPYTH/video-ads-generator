/**
 * Classifie une URL d’import : fiche produit unique vs catalogue (boutique / catégorie / recherche).
 */

import { coerceImportUrl } from "@/lib/scraping/coerce-url";

export type UrlImportKind = "product" | "catalog" | "unknown";

export type ClassifiedUrl = {
  kind: UrlImportKind;
  reason: string;
  hostname: string;
  pathname: string;
};

const EBAY_HOST =
  /(?:^|\.)ebay\.(?:com|fr|de|co\.uk|it|es|ca|com\.au)$/i;
const AMAZON_HOST =
  /(?:^|\.)amazon\.(?:fr|com|de|co\.uk|it|es|ca)$/i;

export function classifyImportUrl(rawUrl: string): ClassifiedUrl {
  let parsed: URL;
  try {
    parsed = new URL(coerceImportUrl(rawUrl));
  } catch {
    return {
      kind: "unknown",
      reason: "URL invalide",
      hostname: "",
      pathname: "",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;
  const pathLower = pathname.toLowerCase();

  if (EBAY_HOST.test(hostname)) {
    if (/\/itm\/\d+/i.test(pathLower) || /\/p\/\d+/i.test(pathLower)) {
      return {
        kind: "product",
        reason: "Fiche produit eBay",
        hostname,
        pathname,
      };
    }
    if (
      /\/sch\//i.test(pathLower) ||
      /\/b\//i.test(pathLower) ||
      /\/str\//i.test(pathLower) ||
      /\/usr\//i.test(pathLower) ||
      /\/seller\//i.test(pathLower) ||
      /\/sns\//i.test(pathLower) ||
      /_nkw=/i.test(parsed.search) ||
      /\/shop\//i.test(pathLower)
    ) {
      return {
        kind: "catalog",
        reason: "Recherche, catégorie ou boutique eBay",
        hostname,
        pathname,
      };
    }
    return {
      kind: "unknown",
      reason: "Page eBay non reconnue — utilisez un lien /itm/… ou une liste",
      hostname,
      pathname,
    };
  }

  if (AMAZON_HOST.test(hostname)) {
    if (/\/(?:dp|gp\/product|product)\/[a-z0-9]{10}/i.test(pathLower)) {
      return {
        kind: "product",
        reason: "Fiche produit Amazon",
        hostname,
        pathname,
      };
    }
    if (
      /\/s(?:\/|\?|$)/i.test(pathLower + parsed.search) ||
      /\/b\/?/i.test(pathLower) ||
      /\/stores\//i.test(pathLower)
    ) {
      return {
        kind: "catalog",
        reason: "Recherche ou boutique Amazon",
        hostname,
        pathname,
      };
    }
  }

  // Shopify / marchands (Utopya, etc.)
  if (/\/products\/[^/?#]+/i.test(pathLower)) {
    return {
      kind: "product",
      reason: "Fiche produit boutique",
      hostname,
      pathname,
    };
  }

  // Magento fiche produit explicite
  if (/\/catalog\/product\/view\//i.test(pathLower)) {
    return {
      kind: "product",
      reason: "Fiche produit Magento",
      hostname,
      pathname,
    };
  }

  if (
    /\/collections\//i.test(pathLower) ||
    /\/collection\//i.test(pathLower) ||
    /\/categories?\//i.test(pathLower) ||
    /\/category\//i.test(pathLower) ||
    /\/catalogue\b/i.test(pathLower) ||
    /\/catalog\b/i.test(pathLower) ||
    /\/categorie/i.test(pathLower) ||
    /\/boutique\b/i.test(pathLower) ||
    /\/shop\b/i.test(pathLower) ||
    /\/search/i.test(pathLower) ||
    /\/marques?\//i.test(pathLower) ||
    /\/brand\//i.test(pathLower)
  ) {
    return {
      kind: "catalog",
      reason: "Catégorie ou boutique (plusieurs produits)",
      hostname,
      pathname,
    };
  }

  // Filtres Magento / Utopya (ex. ?compatibilite=13314) = liste filtrée
  if (
    /(?:^|[?&])(?:compatibilite|cat|category|manufacturer|product_list_order)=/i.test(
      parsed.search,
    )
  ) {
    return {
      kind: "catalog",
      reason: "Catégorie filtrée (plusieurs produits)",
      hostname,
      pathname,
    };
  }

  // Magento SEO : /marque/modele.html = catégorie ; /slug-produit.html = fiche
  if (/\.html$/i.test(pathLower)) {
    const segments = pathLower.replace(/^\//, "").replace(/\.html$/i, "").split("/");
    if (segments.length >= 2) {
      return {
        kind: "catalog",
        reason: "Catégorie Magento SEO (plusieurs produits)",
        hostname,
        pathname,
      };
    }
    return {
      kind: "product",
      reason: "Fiche produit Magento SEO",
      hostname,
      pathname,
    };
  }

  // Par défaut : tenter comme produit unique (JSON-LD / OG)
  return {
    kind: "product",
    reason: "Page traitée comme fiche produit",
    hostname,
    pathname,
  };
}

export function isEbayItemUrl(url: string): boolean {
  try {
    const u = new URL(coerceImportUrl(url));
    return EBAY_HOST.test(u.hostname) && /\/itm\/\d+/i.test(u.pathname);
  } catch {
    return false;
  }
}
