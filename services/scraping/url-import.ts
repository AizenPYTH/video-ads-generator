import { AppError } from "@/lib/errors/app-error";
import { validateUrl } from "@/lib/validation/url";
import { classifyImportUrl } from "@/lib/scraping/url-kind";
import {
  extractCatalogPageUrls,
  extractCatalogProductCards,
  extractCatalogProductLinks,
  MAX_CATALOG_PRODUCTS,
  withCatalogListLimit,
  type CatalogProductCard,
} from "@/lib/scraping/catalog-links";
import { resolveUtopyaCookies } from "@/lib/scraping/utopya-cookies";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { isUtopyaUrl } from "./providers/utopya-extract";
import { fetchWithScrapingBee } from "./scrapingbee";
import { getProviderForUrl } from "./providers";
import type { ScrapedProduct } from "./providers/base";

export interface UrlImportResult {
  product: ScrapedProduct;
  provider: string;
  validatedUrl: string;
  kind: "product";
}

export interface CatalogDiscoverResult {
  kind: "catalog";
  validatedUrl: string;
  reason: string;
  productUrls: string[];
  /** Cartes grille (Magento/Utopya) : titre + image (+ prix si session) */
  cards: CatalogProductCard[];
}

export type DiscoverCatalogOptions = {
  /** Cookies session Utopya (prix + plus de produits) */
  cookies?: string | null;
  /**
   * Quand true : ne refuse pas l’URL même si elle ressemble à un catalogue.
   * Utilisé pour les fiches découvertes depuis une page catégorie.
   */
  forceProduct?: boolean;
};

export async function importFromUrl(
  rawUrl: string,
  options?: DiscoverCatalogOptions,
): Promise<UrlImportResult> {
  let validated;

  try {
    validated = validateUrl(rawUrl);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.validation("Invalid URL");
  }

  const classification = classifyImportUrl(validated.href);
  if (classification.kind === "catalog" && !options?.forceProduct) {
    throw AppError.validation(
      "Cette adresse pointe vers une boutique ou une catégorie (plusieurs produits). Relancez l’import catalogue.",
    );
  }

  const provider = getProviderForUrl(validated.href);

  try {
    // Cookies passés en options (safe en parallèle, pas via process.env)
    const cookies = resolveUtopyaCookies(options?.cookies);
    const product = await provider.scrape(validated.href, { cookies });
    return {
      product,
      provider: provider.name,
      validatedUrl: validated.href,
      kind: "product",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.internal("Failed to import product from URL", error);
  }
}

export function scrapedProductFromCatalogCard(
  card: CatalogProductCard,
): ScrapedProduct {
  const title = (card.title || "Produit sans titre").trim();
  const itemSpecifics: Record<string, string> = {};
  if (card.brand) {
    itemSpecifics.Brand = card.brand;
    itemSpecifics.Marque = card.brand;
  }
  const inferredType = inferProductTypeFromTitle(title);
  if (inferredType) {
    itemSpecifics.Type = inferredType;
    itemSpecifics["Type de produit"] = inferredType;
  }
  // Marque pièce inconnue → OEM ; marque compatible depuis titre
  if (!itemSpecifics.Brand) {
    itemSpecifics.Brand = "OEM";
    itemSpecifics.Marque = "OEM";
  }
  const compat = title.match(
    /\b(Apple|Samsung|Xiaomi|Huawei|Oppo|Honor|Google|OnePlus|Sony|Nokia|Motorola|Realme|Vivo|Asus|Lenovo|Microsoft|Nintendo|HP|Dell|iPhone|iPad|MacBook)\b/i,
  )?.[1];
  if (compat) {
    const brand =
      /iphone|ipad|macbook/i.test(compat) ? "Apple" : compat;
    itemSpecifics["Compatible Brand"] = brand;
    itemSpecifics["Marque compatible"] = brand;
  }

  return {
    title,
    description: null,
    price: card.price,
    currency: "EUR",
    images: card.image ? [card.image] : [],
    brand: card.brand,
    sku: card.sku,
    condition: "New",
    itemSpecifics,
    sourceUrl: card.url,
    raw: {
      from: "catalog-grid",
      sku: card.sku,
      priceLoginRequired: card.price == null,
      priceWarning:
        card.price == null
          ? "Prix non détecté sur la grille — saisie manuelle ou cookies Utopya."
          : null,
    },
  };
}

export async function discoverCatalogProductUrls(
  rawUrl: string,
  options?: DiscoverCatalogOptions,
): Promise<CatalogDiscoverResult> {
  let validated;
  try {
    validated = validateUrl(rawUrl);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.validation("Invalid URL");
  }

  const classification = classifyImportUrl(validated.href);
  if (classification.kind === "product") {
    return {
      kind: "catalog",
      validatedUrl: validated.href,
      reason: classification.reason,
      productUrls: [validated.href],
      cards: [],
    };
  }

  const isEbay = /ebay\./i.test(validated.hostname);
  const utopya = isUtopyaUrl(validated.href);
  const cookies = utopya
    ? resolveUtopyaCookies(options?.cookies)
    : undefined;

  let pathName = "/";
  try {
    pathName = new URL(validated.href).pathname;
  } catch {
    /* ignore */
  }
  const looksLikeCategoryPage =
    /\/catalog\/category\//i.test(validated.href) ||
    /\/collections?\//i.test(validated.href) ||
    /\/categor/i.test(validated.href) ||
    /\/sch\//i.test(validated.href) ||
    /(?:^|[?&])compatibilite=/i.test(validated.href) ||
    (/\.html$/i.test(pathName) &&
      pathName.replace(/^\//, "").split("/").length >= 2) ||
    classification.kind === "catalog";

  const startUrl = utopya
    ? withCatalogListLimit(validated.href, 36)
    : validated.href;

  const first = await fetchWithScrapingBee({
    url: startUrl,
    renderJs: true,
    premiumProxy: true,
    countryCode: "fr",
    waitMs: isEbay ? 3500 : looksLikeCategoryPage ? 4500 : 2000,
    blockResources: false,
    cookies,
    waitFor: cookies && utopya ? ".price, .product-item-link" : undefined,
  });

  const pageUrls = utopya
    ? extractCatalogPageUrls(first.html, startUrl, { maxPages: 5 })
    : [startUrl];

  const allCards: CatalogProductCard[] = [];
  const seenUrl = new Set<string>();
  const seenSku = new Set<string>();

  const ingest = (html: string, pageUrl: string) => {
    const cards = extractCatalogProductCards(html, pageUrl, {
      max: MAX_CATALOG_PRODUCTS,
    });
    for (const card of cards) {
      if (seenUrl.has(card.url)) continue;
      if (card.sku && seenSku.has(card.sku)) continue;
      seenUrl.add(card.url);
      if (card.sku) seenSku.add(card.sku);
      allCards.push(card);
      if (allCards.length >= MAX_CATALOG_PRODUCTS) return;
    }
  };

  ingest(first.html, startUrl);

  for (const pageUrl of pageUrls) {
    if (pageUrl === startUrl) continue;
    if (allCards.length >= MAX_CATALOG_PRODUCTS) break;
    try {
      const page = await fetchWithScrapingBee({
        url: pageUrl,
        renderJs: true,
        premiumProxy: true,
        countryCode: "fr",
        waitMs: 3500,
        blockResources: false,
        cookies,
        waitFor: cookies && utopya ? ".price, .product-item-link" : undefined,
      });
      ingest(page.html, pageUrl);
    } catch (err) {
      console.warn("[catalog] page fetch failed", pageUrl, err);
    }
  }

  let productUrls =
    allCards.length > 0
      ? allCards.map((c) => c.url)
      : extractCatalogProductLinks(first.html, startUrl, {
          max: MAX_CATALOG_PRODUCTS,
        });

  // Retry sans limit si vide
  if (productUrls.length === 0 && looksLikeCategoryPage) {
    const retry = await fetchWithScrapingBee({
      url: validated.href,
      renderJs: true,
      premiumProxy: true,
      countryCode: "fr",
      waitMs: 6500,
      blockResources: false,
      cookies,
    });
    const cards = extractCatalogProductCards(retry.html, validated.href, {
      max: MAX_CATALOG_PRODUCTS,
    });
    for (const card of cards) {
      if (seenUrl.has(card.url)) continue;
      seenUrl.add(card.url);
      allCards.push(card);
    }
    productUrls =
      allCards.length > 0
        ? allCards.map((c) => c.url)
        : extractCatalogProductLinks(retry.html, validated.href, {
            max: MAX_CATALOG_PRODUCTS,
          });
  }

  if (productUrls.length === 0) {
    throw AppError.validation(
      "Aucun produit trouvé sur cette page. Ouvrez une fiche produit individuelle, ou une catégorie qui liste des articles.",
    );
  }

  console.info("[catalog-discover]", {
    source: validated.href,
    pages: pageUrls.length,
    products: productUrls.length,
    withPrice: allCards.filter((c) => c.price != null).length,
    hasCookies: Boolean(cookies),
  });

  return {
    kind: "catalog",
    validatedUrl: validated.href,
    reason: classification.reason,
    productUrls,
    cards: allCards,
  };
}
