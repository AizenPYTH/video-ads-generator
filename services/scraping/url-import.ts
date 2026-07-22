import { AppError } from "@/lib/errors/app-error";
import { validateUrl } from "@/lib/validation/url";
import { classifyImportUrl } from "@/lib/scraping/url-kind";
import {
  extractCatalogProductCards,
  extractCatalogProductLinks,
  MAX_CATALOG_PRODUCTS,
  type CatalogProductCard,
} from "@/lib/scraping/catalog-links";
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
  /** Cartes grille (Magento/Utopya) : titre + image sans re-scrape PDP */
  cards: CatalogProductCard[];
}

export async function importFromUrl(rawUrl: string): Promise<UrlImportResult> {
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
  if (classification.kind === "catalog") {
    throw AppError.validation(
      "Cette adresse pointe vers une boutique ou une catégorie (plusieurs produits). Relancez l’import catalogue.",
    );
  }

  const provider = getProviderForUrl(validated.href);

  try {
    const product = await provider.scrape(validated.href);

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
    raw: { from: "catalog-grid", sku: card.sku },
  };
}

export async function discoverCatalogProductUrls(
  rawUrl: string,
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

  const { html } = await fetchWithScrapingBee({
    url: validated.href,
    renderJs: true,
    premiumProxy: true,
    countryCode: "fr",
    waitMs: isEbay ? 3500 : looksLikeCategoryPage ? 4000 : 2000,
    blockResources: false,
  });

  let cards = extractCatalogProductCards(html, validated.href, {
    max: MAX_CATALOG_PRODUCTS,
  });
  let productUrls =
    cards.length > 0
      ? cards.map((c) => c.url)
      : extractCatalogProductLinks(html, validated.href, {
          max: MAX_CATALOG_PRODUCTS,
        });

  // Une seule retry si rien trouvé
  if (productUrls.length === 0 && looksLikeCategoryPage) {
    const retry = await fetchWithScrapingBee({
      url: validated.href,
      renderJs: true,
      premiumProxy: true,
      countryCode: "fr",
      waitMs: 6500,
      blockResources: false,
    });
    cards = extractCatalogProductCards(retry.html, validated.href, {
      max: MAX_CATALOG_PRODUCTS,
    });
    productUrls =
      cards.length > 0
        ? cards.map((c) => c.url)
        : extractCatalogProductLinks(retry.html, validated.href, {
            max: MAX_CATALOG_PRODUCTS,
          });
  }

  if (productUrls.length === 0) {
    throw AppError.validation(
      "Aucun produit trouvé sur cette page. Ouvrez une fiche produit individuelle, ou une catégorie qui liste des articles.",
    );
  }

  return {
    kind: "catalog",
    validatedUrl: validated.href,
    reason: classification.reason,
    productUrls,
    cards,
  };
}
