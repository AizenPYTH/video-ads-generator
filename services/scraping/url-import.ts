import { AppError } from "@/lib/errors/app-error";
import { validateUrl } from "@/lib/validation/url";
import { classifyImportUrl } from "@/lib/scraping/url-kind";
import {
  extractCatalogProductLinks,
  MAX_CATALOG_PRODUCTS,
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
    };
  }

  const isEbay = /ebay\./i.test(validated.hostname);
  const isMagentoCatalog =
    /\/catalog\/category\//i.test(validated.href) ||
    /utopya\.fr$/i.test(validated.hostname);

  const { html } = await fetchWithScrapingBee({
    url: validated.href,
    renderJs: true,
    premiumProxy: true,
    countryCode: "fr",
    waitMs: isEbay ? 3000 : isMagentoCatalog ? 4500 : 2000,
    blockResources: false,
  });

  let productUrls = extractCatalogProductLinks(html, validated.href, {
    max: MAX_CATALOG_PRODUCTS,
  });

  // Deuxième passe si la grille Magento n’était pas encore hydratée
  if (productUrls.length <= 1 && isMagentoCatalog) {
    const retry = await fetchWithScrapingBee({
      url: validated.href,
      renderJs: true,
      premiumProxy: true,
      countryCode: "fr",
      waitMs: 7000,
      blockResources: false,
    });
    productUrls = extractCatalogProductLinks(retry.html, validated.href, {
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
  };
}
