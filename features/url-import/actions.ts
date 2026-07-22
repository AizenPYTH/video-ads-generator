"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  discoverCatalogProductUrls,
  importFromUrl,
  scrapedProductFromCatalogCard,
} from "@/services/scraping/url-import";
import type { ScrapedProduct } from "@/services/scraping/providers/base";
import { createAd } from "@/features/ads/actions";
import {
  buildEbayDescription,
  buildEbayTitle,
  buildSku,
  extractAmazonAsin,
  mapEbayConditionId,
} from "@/lib/listings/normalize-from-url";
import { resolveCategoryForRow } from "@/features/imports/category-resolve";
import { prepareProductImages } from "@/lib/images/dedupe";
import { ensureRemoteImagesOnAd } from "@/features/ads/ensure-ad-images";
import { recalculateAdStatus } from "@/features/ads/recalculate-status";
import { classifyImportUrl } from "@/lib/scraping/url-kind";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { AppError } from "@/lib/errors/app-error";

export type UrlImportActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
};

export type UrlImportSuccessData = {
  mode: "product" | "catalog";
  adId?: string;
  urlImportId?: string;
  importedCount?: number;
  failedCount?: number;
  adIds?: string[];
};

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié.");
  }

  return user.id;
}

function buildItemSpecifics(input: {
  scraped?: Record<string, string>;
  brand: string | null;
  asin: string | null;
  title: string;
}): Record<string, string> {
  const specifics: Record<string, string> = { ...(input.scraped ?? {}) };

  if (input.brand) {
    specifics.Brand ??= input.brand;
    specifics.Marque ??= input.brand;
  }
  if (input.asin) {
    specifics.ASIN ??= input.asin;
  }

  const type =
    specifics.Type ||
    specifics["Product Type"] ||
    specifics["Type de produit"] ||
    inferProductTypeFromTitle(input.title);
  if (type) {
    specifics.Type ??= type;
  }

  return specifics;
}

/**
 * Point d’entrée unique : détecte fiche produit vs boutique/catégorie.
 */
export async function importProductFromUrl(
  url: string,
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const classification = classifyImportUrl(url);

    if (classification.kind === "catalog") {
      return importCatalogFromUrl(url);
    }

    return importSingleProductFromUrl(url);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

async function importCatalogFromUrl(
  url: string,
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  const discovered = await discoverCatalogProductUrls(url);
  const adIds: string[] = [];
  let failedCount = 0;

  const richCards = discovered.cards.filter((c) => c.title || c.image);
  const useGrid = richCards.length >= 2;

  console.info("[url-import] catalog discover", {
    urls: discovered.productUrls.length,
    cards: discovered.cards.length,
    richCards: richCards.length,
    mode: useGrid ? "grid" : "per-product",
    source: discovered.validatedUrl,
  });

  if (useGrid) {
    // Une seule page ScrapingBee déjà faite : créer les annonces depuis la grille
    const CONCURRENCY = 5;
    for (let i = 0; i < richCards.length; i += CONCURRENCY) {
      const chunk = richCards.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (card) => {
          const product = scrapedProductFromCatalogCard(card);
          return persistScrapedProduct({
            product,
            validatedUrl: card.url,
            provider: "catalog-grid",
            hashImages: false,
            // Grille : pas de Taxonomy par produit (évite timeout / 1 seul résultat).
            // Catégorie eBay à confirmer ensuite en masse ou fiche par fiche.
            resolveCategory: false,
          });
        }),
      );
      for (const result of results) {
        if (result.data?.adId) adIds.push(result.data.adId);
        else {
          failedCount += 1;
          console.warn("[url-import] catalog grid item failed", {
            error: result.error?.slice(0, 120),
          });
        }
      }
    }
  } else {
    const CONCURRENCY = 3;
    const urls = discovered.productUrls;
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const chunk = urls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map((productUrl) => importSingleProductFromUrl(productUrl)),
      );
      for (const result of results) {
        if (result.data?.adId) adIds.push(result.data.adId);
        else {
          failedCount += 1;
          console.warn("[url-import] catalog item failed", {
            error: result.error?.slice(0, 120),
          });
        }
      }
    }
  }

  if (adIds.length === 0) {
    return {
      error:
        failedCount > 0
          ? `Aucun produit n’a pu être importé (${failedCount} échec${failedCount > 1 ? "s" : ""}).`
          : "Aucun produit trouvé à importer.",
    };
  }

  revalidatePath("/dashboard/annonces");
  revalidatePath("/dashboard/creer/url");

  return {
    success: true,
    data: {
      mode: "catalog",
      importedCount: adIds.length,
      failedCount,
      adIds,
      adId: adIds[0],
    },
  };
}

async function importSingleProductFromUrl(
  url: string,
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const result = await importFromUrl(url);
    return persistScrapedProduct({
      product: result.product,
      validatedUrl: result.validatedUrl,
      provider: result.provider,
      hashImages: true,
      resolveCategory: true,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

async function persistScrapedProduct(input: {
  product: ScrapedProduct;
  validatedUrl: string;
  provider: string;
  hashImages: boolean;
  resolveCategory: boolean;
}): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: urlImport, error: insertError } = await supabase
      .from("url_imports")
      .insert({
        user_id: userId,
        url: input.validatedUrl,
        statut: "FETCHING",
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError || !urlImport) {
      return { error: "Impossible de créer l'import URL." };
    }

    try {
      await supabase
        .from("url_imports")
        .update({ statut: "ANALYZING" })
        .eq("id", urlImport.id);

      const titre = buildEbayTitle(input.product.title, input.product.brand);
      const description = buildEbayDescription(
        input.product.description,
        titre,
      );
      const asin =
        extractAmazonAsin(input.validatedUrl) ||
        (input.product.sku && /^B0[A-Z0-9]{8}$/i.test(input.product.sku)
          ? input.product.sku.toUpperCase()
          : null);
      const sku = buildSku({
        scrapedSku: looksLikeAsin(input.product.sku)
          ? input.product.sku
          : (asin ?? input.product.sku),
        sourceUrl: input.validatedUrl,
        title: titre,
      });
      const ebayConditionId =
        mapEbayConditionId(input.product.condition) ?? "1000";
      const prixVente =
        input.product.price && input.product.price > 0
          ? input.product.price.toFixed(2)
          : null;

      const itemSpecifics = buildItemSpecifics({
        scraped: input.product.itemSpecifics,
        brand: input.product.brand,
        asin,
        title: titre,
      });

      const productType =
        itemSpecifics.Type || inferProductTypeFromTitle(titre);

      const imagePrep = await prepareProductImages(input.product.images, {
        max: 6,
        contentHash: input.hashImages,
      });

      console.info("[url-import] images", {
        before: imagePrep.before,
        afterUrl: imagePrep.afterUrlDedupe,
        afterHash: imagePrep.afterContentDedupe,
        specifics: Object.keys(itemSpecifics),
        provider: input.provider,
      });

      const resolution = input.resolveCategory
        ? await resolveCategoryForRow({
            titre,
            description,
            brand: input.product.brand,
            model: itemSpecifics.Model || itemSpecifics.Modèle || null,
            mpn: itemSpecifics.MPN || null,
            asin,
            externalReference: asin ?? sku,
            ebay_condition_id: ebayConditionId,
            product_type: productType,
            type: productType,
            item_specifics: itemSpecifics,
          })
        : {
            status: "needs_review" as const,
            categoryId: null,
            categoryName: null,
            rootCategoryName: null,
            subcategoryName: null,
            categoryPath: [] as string[],
            confidence: 0,
            source: "none" as const,
            taxonomySource: "eBay Taxonomy" as const,
            alternatives: [],
            missingAspects: [],
            recommendedAspects: [],
            allowedConditions: [],
            message: "Catégorie à confirmer après import grille",
          };

      console.info("[url-import] category", {
        status: resolution.status,
        categoryId: resolution.categoryId,
        categoryName: resolution.categoryName,
        confidence: resolution.confidence,
        message: resolution.message,
      });

      const adResult = await createAd({
        titre,
        source: "url",
      });

      if (adResult.error || !adResult.data) {
        await supabase
          .from("url_imports")
          .update({
            statut: "FAILED",
            erreur: adResult.error ?? "Échec de création de l'annonce",
          })
          .eq("id", urlImport.id);
        return { error: adResult.error ?? "Échec de création de l'annonce." };
      }

      const adId = adResult.data.id;
      const statut = recalculateAdStatus({
        titre,
        description,
        prix_vente: prixVente,
        quantite: 1,
        ebay_category_id: resolution.categoryId,
        ebay_condition_id: ebayConditionId,
        sku,
        categoryStatus: resolution.status,
        categoryAmbiguous: resolution.status === "needs_review",
        categoryConfidence: resolution.confidence,
        technicalError: false,
      });

      const metadataBase = {
        source_url: input.validatedUrl,
        provider: input.provider,
        brand: input.product.brand,
        currency: input.product.currency,
        images: imagePrep.images.map((i) => i.url),
        image_dedupe: {
          before: imagePrep.before,
          afterUrl: imagePrep.afterUrlDedupe,
          afterHash: imagePrep.afterContentDedupe,
        },
        raw_title: input.product.title,
        asin,
        external_reference: asin ?? sku,
        type: productType,
        product_type: productType,
        item_specifics: itemSpecifics,
        category_resolution: resolution,
        category_name: resolution.categoryName,
        root_category_name: resolution.rootCategoryName,
        subcategory_name: resolution.subcategoryName,
        category_path: resolution.categoryPath,
      };

      await supabase
        .from("ads")
        .update({
          titre,
          title: titre,
          description,
          prix_vente: prixVente,
          quantite: 1,
          quantity: 1,
          sku,
          ebay_condition_id: ebayConditionId,
          ebay_category_id: resolution.categoryId,
          statut,
          status: statut === "READY" ? "ready" : "draft",
          notes: null,
          metadata: metadataBase,
        })
        .eq("id", adId);

      if (imagePrep.images.length > 0) {
        const ensure = await ensureRemoteImagesOnAd({
          userId,
          adId,
          preparedImages: imagePrep.images,
          replace: true,
        });

        console.info("[url-import] ad_images ensure", {
          adId,
          hosted: ensure.hosted.length,
          skipped: ensure.skipped,
          errors: ensure.errors.slice(0, 3),
        });

        if (ensure.hosted.length > 0) {
          await supabase
            .from("ads")
            .update({
              metadata: {
                ...metadataBase,
                images: ensure.hosted.map((h) => h.url),
                image_dedupe: {
                  ...metadataBase.image_dedupe,
                  hosted: ensure.hosted.length,
                },
              },
            })
            .eq("id", adId);
        } else if (ensure.errors.length > 0) {
          console.warn(
            "[url-import] aucune image hébergée",
            ensure.errors.slice(0, 5),
          );
        }
      }

      await supabase
        .from("url_imports")
        .update({
          statut: "COMPLETED",
          ad_id: adId,
          metadata: {
            provider: input.provider,
            title: titre,
            image_count: imagePrep.images.length,
            images_before: imagePrep.before,
            price: prixVente,
            sku,
            asin,
            category_id: resolution.categoryId,
            category_name: resolution.categoryName,
            category_status: resolution.status,
            category_message: resolution.message,
            item_specifics: itemSpecifics,
            statut,
          },
        })
        .eq("id", urlImport.id);

      revalidatePath("/dashboard/annonces");
      revalidatePath(`/dashboard/annonces/${adId}`);
      revalidatePath("/dashboard/creer/url");

      return {
        success: true,
        data: {
          mode: "product",
          adId,
          urlImportId: urlImport.id,
          importedCount: 1,
          adIds: [adId],
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'import";
      await supabase
        .from("url_imports")
        .update({ statut: "FAILED", erreur: message })
        .eq("id", urlImport.id);
      return { error: message };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

function looksLikeAsin(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^B0[A-Z0-9]{8}$/i.test(value.trim());
}
