"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { importFromUrl } from "@/services/scraping/url-import";
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
import {
  recalculateAdStatus,
} from "@/features/ads/recalculate-status";

export type UrlImportActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
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

export async function importProductFromUrl(
  url: string,
): Promise<UrlImportActionResult<{ adId: string; urlImportId: string }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: urlImport, error: insertError } = await supabase
      .from("url_imports")
      .insert({
        user_id: userId,
        url,
        statut: "FETCHING",
        metadata: {},
      })
      .select("id")
      .single();

    if (insertError || !urlImport) {
      return { error: "Impossible de créer l'import URL." };
    }

    try {
      const result = await importFromUrl(url);

      await supabase
        .from("url_imports")
        .update({ statut: "ANALYZING" })
        .eq("id", urlImport.id);

      const titre = buildEbayTitle(result.product.title, result.product.brand);
      const description = buildEbayDescription(
        result.product.description,
        titre,
      );
      const asin =
        extractAmazonAsin(result.validatedUrl) ||
        (result.product.sku && /^B0[A-Z0-9]{8}$/i.test(result.product.sku)
          ? result.product.sku.toUpperCase()
          : null);
      const sku = buildSku({
        scrapedSku: looksLikeAsin(result.product.sku)
          ? result.product.sku
          : asin ?? result.product.sku,
        sourceUrl: result.validatedUrl,
        title: titre,
      });
      const ebayConditionId =
        mapEbayConditionId(result.product.condition) ?? "1000";
      const prixVente =
        result.product.price && result.product.price > 0
          ? result.product.price.toFixed(2)
          : null;

      const imagePrep = await prepareProductImages(result.product.images, {
        max: 6,
        contentHash: true,
      });

      console.info("[url-import] images", {
        before: imagePrep.before,
        afterUrl: imagePrep.afterUrlDedupe,
        afterHash: imagePrep.afterContentDedupe,
      });

      const resolution = await resolveCategoryForRow({
        titre,
        description,
        brand: result.product.brand,
        model: null,
        mpn: null,
        asin,
        externalReference: asin ?? sku,
        ebay_condition_id: ebayConditionId,
        product_type: inferProductType(titre),
        type: inferProductType(titre),
        item_specifics: {
          ...(result.product.brand ? { Brand: result.product.brand } : {}),
          ...(asin ? { ASIN: asin } : {}),
        },
      });

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

      console.info("[url-import] status", {
        adId,
        old: "DRAFT",
        new: statut,
        price: prixVente,
        categoryId: resolution.categoryId,
      });

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
          metadata: {
            source_url: result.validatedUrl,
            provider: result.provider,
            brand: result.product.brand,
            currency: result.product.currency,
            images: imagePrep.images.map((i) => i.url),
            image_dedupe: {
              before: imagePrep.before,
              afterUrl: imagePrep.afterUrlDedupe,
              afterHash: imagePrep.afterContentDedupe,
            },
            raw_title: result.product.title,
            asin,
            external_reference: asin ?? sku,
            item_specifics: {
              ...(result.product.brand ? { Brand: result.product.brand } : {}),
              ...(asin ? { ASIN: asin } : {}),
            },
            category_resolution: resolution,
            category_name: resolution.categoryName,
            root_category_name: resolution.rootCategoryName,
            subcategory_name: resolution.subcategoryName,
            category_path: resolution.categoryPath,
          },
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
                source_url: result.validatedUrl,
                provider: result.provider,
                brand: result.product.brand,
                currency: result.product.currency,
                images: ensure.hosted.map((h) => h.url),
                image_dedupe: {
                  before: imagePrep.before,
                  afterUrl: imagePrep.afterUrlDedupe,
                  afterHash: imagePrep.afterContentDedupe,
                  hosted: ensure.hosted.length,
                },
                raw_title: result.product.title,
                asin,
                external_reference: asin ?? sku,
                item_specifics: {
                  ...(result.product.brand
                    ? { Brand: result.product.brand }
                    : {}),
                  ...(asin ? { ASIN: asin } : {}),
                },
                category_resolution: resolution,
                category_name: resolution.categoryName,
                root_category_name: resolution.rootCategoryName,
                subcategory_name: resolution.subcategoryName,
                category_path: resolution.categoryPath,
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
            provider: result.provider,
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
            statut,
          },
        })
        .eq("id", urlImport.id);

      revalidatePath("/dashboard/annonces");
      revalidatePath(`/dashboard/annonces/${adId}`);
      revalidatePath("/dashboard/creer/url");

      return {
        success: true,
        data: { adId, urlImportId: urlImport.id },
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

function inferProductType(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("headphone") || t.includes("headset") || t.includes("casque")) {
    return "Casque audio";
  }
  return null;
}
