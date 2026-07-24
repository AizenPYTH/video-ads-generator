"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
import { coerceImportUrl } from "@/lib/scraping/coerce-url";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { AppError } from "@/lib/errors/app-error";
import {
  formatPriceForStorage,
  PRICE_NOT_DETECTED_MESSAGE,
} from "@/lib/scraping/parse-price";
import { collectRawAspectValues } from "@/services/ebay/aspects";
import { enrichItemSpecificsForEbay } from "@/features/ai/fill-missing-aspects";

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

  // Enrichissement titre (marque compatible, OEM…) — comme à la publication
  const enriched = collectRawAspectValues({
    title: input.title,
    itemSpecifics: specifics,
    brand: specifics.Brand || specifics.Marque || input.brand,
    type: specifics.Type || null,
    productType: specifics.Type || null,
    compatibleBrand:
      specifics["Compatible Brand"] || specifics["Marque compatible"] || null,
    compatibleDevice:
      specifics["Compatible Device"] ||
      specifics["Appareil compatible"] ||
      null,
    compatibleModel:
      specifics["Compatible Model Number"] ||
      specifics["Numéro de modèle compatible"] ||
      null,
    mpn: specifics.MPN || null,
    model: specifics.Model || specifics.Modèle || null,
  });

  return { ...specifics, ...enriched };
}

/**
 * Point d’entrée unique : détecte fiche produit vs boutique/catégorie.
 * @param utopyaCookies cookies de session Utopya (prix visibles uniquement si connecté)
 */
export async function importProductFromUrl(
  url: string,
  utopyaCookies?: string | null,
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const normalized = coerceImportUrl(url);
    const classification = classifyImportUrl(normalized);

    if (classification.kind === "catalog") {
      return importCatalogFromUrl(normalized, utopyaCookies);
    }

    return importSingleProductFromUrl(normalized, utopyaCookies);
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

async function importCatalogFromUrl(
  url: string,
  utopyaCookies?: string | null,
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  const discovered = await discoverCatalogProductUrls(url, {
    cookies: utopyaCookies,
  });
  const adIds: string[] = [];
  const failureReasons: string[] = [];
  let failedCount = 0;

  const urls = discovered.productUrls;
  const cardByUrl = new Map(
    discovered.cards.map((c) => [c.url, c] as const),
  );
  const isUtopya = /utopya\.fr/i.test(url);

  console.info("[url-import] catalog discover", {
    urls: urls.length,
    cards: discovered.cards.length,
    withPrice: discovered.cards.filter((c) => c.price != null).length,
    mode: "per-product-with-grid-fallback",
    concurrency: isUtopya ? 4 : 3,
    source: discovered.validatedUrl,
    isUtopya,
    hasCookies: Boolean(utopyaCookies?.trim() || process.env.UTOPYA_COOKIES),
  });

  // Parallélisme : Utopya 4 fiches à la fois (cookies thread-safe via options)
  const CONCURRENCY = isUtopya ? 4 : 3;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (productUrl) => {
        const card = cardByUrl.get(productUrl);

        // 1) Fiche produit — prix grille fusionné si PDP sans prix
        const pdp = await importSingleProductFromUrl(productUrl, utopyaCookies, {
          forceProduct: true,
          // Comme Excel : Taxonomy + IA pour Marque compatible / Type
          lightEnrich: false,
          deferImages: true,
          gridPrice: card?.price ?? null,
          gridImage: card?.image ?? null,
        });
        if (pdp.data?.adId) return pdp;

        // 2) Fallback grille
        if (card?.title) {
          console.warn("[url-import] PDP failed, using grid card", {
            productUrl: productUrl.slice(0, 80),
            pdpError: pdp.error?.slice(0, 120),
          });
          return persistScrapedProduct({
            product: scrapedProductFromCatalogCard(card),
            validatedUrl: productUrl,
            provider: isUtopya ? "utopya-grid" : "catalog-grid",
            hashImages: true,
            resolveCategory: true,
            lightEnrich: false,
            deferImages: true,
          });
        }
        return pdp;
      }),
    );
    for (const result of results) {
      if (result.data?.adId) adIds.push(result.data.adId);
      else {
        failedCount += 1;
        if (result.error && failureReasons.length < 5) {
          failureReasons.push(result.error.slice(0, 160));
        }
        console.warn("[url-import] catalog item failed", {
          error: result.error?.slice(0, 160),
        });
      }
    }
  }

  if (adIds.length === 0) {
    const detail = failureReasons[0]
      ? ` Détail : ${failureReasons[0]}`
      : "";
    return {
      error: `Aucun produit n’a pu être importé (${failedCount} échec${failedCount > 1 ? "s" : ""}).${detail}`,
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
  utopyaCookies?: string | null,
  opts?: {
    forceProduct?: boolean;
    lightEnrich?: boolean;
    deferImages?: boolean;
    gridPrice?: number | null;
    gridImage?: string | null;
  },
): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const result = await importFromUrl(url, {
      cookies: utopyaCookies,
      forceProduct: opts?.forceProduct,
    });

    const product = { ...result.product };
    // Fusion prix grille si fiche sans prix (cookies / timing ScrapingBee)
    if (
      (product.price == null || !Number.isFinite(product.price)) &&
      opts?.gridPrice != null &&
      Number.isFinite(opts.gridPrice) &&
      opts.gridPrice > 0
    ) {
      product.price = opts.gridPrice;
      product.raw = {
        ...product.raw,
        priceFromGrid: true,
      };
    }
    // Image grille en secours si galerie PDP vide
    if (
      (!product.images || product.images.length === 0) &&
      opts?.gridImage
    ) {
      product.images = [opts.gridImage];
      product.raw = { ...product.raw, imageFromGrid: true };
    }

    return persistScrapedProduct({
      product,
      validatedUrl: result.validatedUrl,
      provider: result.provider,
      hashImages: true,
      resolveCategory: true,
      lightEnrich: opts?.lightEnrich,
      deferImages: opts?.deferImages,
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
  /** true = heuristiques seules (pas d’OpenAI). false = comme Excel. */
  lightEnrich?: boolean;
  /** Hébergement images après retour (catalogue plus rapide / liste visible tout de suite). */
  deferImages?: boolean;
}): Promise<UrlImportActionResult<UrlImportSuccessData>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    // Journal url_imports : best-effort (ne doit jamais bloquer l’annonce)
    let urlImportId: string | null = null;
    const { data: urlImport, error: insertError } = await supabase
      .from("url_imports")
      .insert({
        user_id: userId,
        url: input.validatedUrl,
        statut: "FETCHING",
        metadata: {},
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.warn(
        "[url-import] url_imports insert skipped",
        insertError.message,
      );
    } else {
      urlImportId = urlImport?.id ?? null;
    }

    try {
      if (urlImportId) {
        await supabase
          .from("url_imports")
          .update({ statut: "ANALYZING" })
          .eq("id", urlImportId);
      }

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
      const prixVente = formatPriceForStorage(input.product.price);
      const priceWarning =
        typeof input.product.raw?.priceWarning === "string"
          ? input.product.raw.priceWarning
          : prixVente
            ? null
            : PRICE_NOT_DETECTED_MESSAGE;

      let itemSpecifics = buildItemSpecifics({
        scraped: input.product.itemSpecifics,
        brand: input.product.brand,
        asin,
        title: titre,
      });

      const productType =
        itemSpecifics.Type || inferProductTypeFromTitle(titre);
      if (productType) {
        itemSpecifics.Type ??= productType;
        itemSpecifics["Type de produit"] ??= productType;
        itemSpecifics["Product Type"] ??= productType;
      }

      const sourceImages = (input.product.images ?? []).filter(Boolean);
      const imagePrep = await prepareProductImages(sourceImages, {
        max: 6,
        contentHash: input.hashImages,
      });
      // Toujours garder les URLs sources (même si download échoue)
      const imagesForMeta =
        imagePrep.images.map((i) => i.url).filter(Boolean).length > 0
          ? imagePrep.images.map((i) => i.url)
          : sourceImages;

      console.info("[url-import] images", {
        before: imagePrep.before,
        afterUrl: imagePrep.afterUrlDedupe,
        afterHash: imagePrep.afterContentDedupe,
        sourceKept: imagesForMeta.length,
        specifics: Object.keys(itemSpecifics),
        provider: input.provider,
      });

      let resolution = input.resolveCategory
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
            compatible_device:
              itemSpecifics["Compatible Device"] ||
              itemSpecifics["Appareil compatible"] ||
              null,
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
            missingAspects: [] as string[],
            recommendedAspects: [],
            allowedConditions: [],
            message: "Catégorie à confirmer après import grille",
          };

      // Compléter TOUJOURS les champs eBay obligatoires (Amazon / eBay / Utopya)
      // comme à l’import Excel — pas seulement si un aspect manque déjà.
      if (input.resolveCategory) {
        let categoryAspects: Awaited<
          ReturnType<
            typeof import("@/services/ebay/taxonomy").getItemAspectsForCategory
          >
        > = [];
        try {
          if (resolution.categoryId) {
            const { getItemAspectsForCategory } = await import(
              "@/services/ebay/taxonomy"
            );
            categoryAspects = await getItemAspectsForCategory(
              resolution.categoryId,
            );
          }
        } catch {
          /* ignore */
        }

        const requiredNames = categoryAspects
          .filter((a) => a.required)
          .map((a) => a.name);

        const enriched = await enrichItemSpecificsForEbay({
          title: titre,
          description,
          itemSpecifics,
          missingAspects:
            resolution.missingAspects?.length
              ? resolution.missingAspects
              : requiredNames.length
                ? requiredNames
                : ["Marque", "Marque compatible", "Type", "Couleur", "Color"],
          categoryAspects,
          skipOpenAI: Boolean(input.lightEnrich),
        });
        itemSpecifics = enriched.itemSpecifics;
        resolution = {
          ...resolution,
          missingAspects: enriched.stillMissing,
          message:
            enriched.stillMissing.length === 0
              ? resolution.message?.includes("manquants")
                ? "Catégorie et caractéristiques complétées."
                : resolution.message
              : `Champs encore manquants : ${enriched.stillMissing.join(", ")}`,
          status:
            enriched.stillMissing.length === 0 &&
            resolution.status === "needs_review" &&
            resolution.categoryId
              ? "resolved"
              : resolution.status,
        };
      }

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
        if (urlImportId) {
          await supabase
            .from("url_imports")
            .update({
              statut: "FAILED",
              erreur: adResult.error ?? "Échec de création de l'annonce",
            })
            .eq("id", urlImportId);
        }
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
        brand:
          itemSpecifics.Brand ||
          itemSpecifics.Marque ||
          input.product.brand,
        currency: input.product.currency,
        images: imagesForMeta,
        source_images: sourceImages,
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
        compatible_brand:
          itemSpecifics["Compatible Brand"] ||
          itemSpecifics["Marque compatible"] ||
          null,
        compatible_device:
          itemSpecifics["Compatible Device"] ||
          itemSpecifics["Appareil compatible"] ||
          null,
        compatible_model:
          itemSpecifics["Compatible Model Number"] ||
          itemSpecifics["Numéro de modèle compatible"] ||
          null,
        mpn: itemSpecifics.MPN || null,
        model: itemSpecifics.Model || itemSpecifics.Modèle || null,
        category_resolution: resolution,
        category_name: resolution.categoryName,
        root_category_name: resolution.rootCategoryName,
        subcategory_name: resolution.subcategoryName,
        category_path: resolution.categoryPath,
        price_warning: priceWarning,
        price_login_required: Boolean(input.product.raw?.priceLoginRequired),
        utopya_attributes:
          input.product.raw?.attributes &&
          typeof input.product.raw.attributes === "object"
            ? input.product.raw.attributes
            : undefined,
      };

      const { error: adUpdateError } = await supabase
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

      if (adUpdateError) {
        console.error("[url-import] ad update failed", adUpdateError.message);
        return {
          error: `Annonce créée mais non remplie : ${adUpdateError.message}`,
        };
      }

      // Affichage immédiat : seed ad_images avec URLs sources (storage_path null OK)
      if (imagesForMeta.length > 0) {
        await seedExternalAdImages({
          userId,
          adId,
          urls: imagesForMeta.slice(0, 6),
        });
      }

      const hostImages = async () => {
        try {
          const ensure = await ensureRemoteImagesOnAd({
            userId,
            adId,
            // Prefer buffers if any, sinon re-télécharge les URLs sources
            preparedImages: imagePrep.images.some((i) => i.buffer)
              ? imagePrep.images
              : undefined,
            urls: sourceImages.length > 0 ? sourceImages : imagesForMeta,
            replace: true,
          });
          console.info("[url-import] ad_images ensure", {
            adId,
            hosted: ensure.hosted.length,
            skipped: ensure.skipped,
            errors: ensure.errors.slice(0, 3),
          });
          if (ensure.hosted.length > 0) {
            const admin = createAdminClient();
            await admin
              .from("ads")
              .update({
                metadata: {
                  ...metadataBase,
                  images: ensure.hosted.map((h) => h.url),
                  source_images: sourceImages,
                  image_dedupe: {
                    ...metadataBase.image_dedupe,
                    hosted: ensure.hosted.length,
                  },
                },
              })
              .eq("id", adId);
          }
        } catch (err) {
          console.warn(
            "[url-import] deferred image host failed",
            err instanceof Error ? err.message : err,
          );
        }
      };

      if (imagesForMeta.length > 0 || sourceImages.length > 0) {
        if (input.deferImages) {
          after(() => hostImages());
        } else {
          await hostImages();
        }
      }

      if (urlImportId) {
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
          .eq("id", urlImportId);
      }

      revalidatePath("/dashboard/annonces");
      revalidatePath(`/dashboard/annonces/${adId}`);
      revalidatePath("/dashboard/creer/url");

      return {
        success: true,
        data: {
          mode: "product",
          adId,
          urlImportId: urlImportId ?? undefined,
          importedCount: 1,
          adIds: [adId],
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'import";
      if (urlImportId) {
        await supabase
          .from("url_imports")
          .update({ statut: "FAILED", erreur: message })
          .eq("id", urlImportId);
      }
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

/** Insère tout de suite les URLs (Utopya/CDN) pour que la liste affiche une photo. */
async function seedExternalAdImages(input: {
  userId: string;
  adId: string;
  urls: string[];
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("ad_images")
      .select("id", { count: "exact", head: true })
      .eq("ad_id", input.adId)
      .eq("user_id", input.userId);
    if ((count ?? 0) > 0) return;

    const rows = input.urls.slice(0, 6).map((url, index) => ({
      user_id: input.userId,
      ad_id: input.adId,
      url,
      storage_path: null,
      ordre: index,
      est_principale: index === 0,
    }));
    if (rows.length === 0) return;
    const { error } = await admin.from("ad_images").insert(rows);
    if (error) {
      console.warn("[url-import] seed images failed", error.message);
    }
  } catch (err) {
    console.warn(
      "[url-import] seed images error",
      err instanceof Error ? err.message : err,
    );
  }
}
