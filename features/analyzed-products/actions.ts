"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runPhotoAnalysisPipeline } from "@/features/ai/photo-analysis-pipeline";
import { createAd } from "@/features/ads/actions";
import type { IdentificationResult } from "@/types/identification";
import { fetchAnalyzedProductById } from "./queries";

export type ProductActionResult<T = void> = {
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

export async function rerunAnalysis(
  productId: string,
): Promise<ProductActionResult<{ analysisRunId: string }>> {
  try {
    const userId = await requireUserId();
    const product = await fetchAnalyzedProductById(userId, productId);

    if (!product) {
      return { error: "Produit introuvable." };
    }

    const result = await runPhotoAnalysisPipeline({
      userId,
      photoUrls: [product.url_source],
      adId: product.ad_id ?? undefined,
    });

    revalidatePath("/products");
    return { success: true, data: { analysisRunId: result.analysisRunId } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function createAdFromProduct(
  productId: string,
): Promise<ProductActionResult<{ adId: string }>> {
  try {
    const userId = await requireUserId();
    const product = await fetchAnalyzedProductById(userId, productId);

    if (!product) {
      return { error: "Produit introuvable." };
    }

    if (product.ad_id) {
      return { error: "Une annonce existe déjà pour ce produit.", data: { adId: product.ad_id } };
    }

    const identification = product.resultat_identification as IdentificationResult;
    const soldName = identification.soldItem?.name ?? identification.brand ?? "Produit";

    const adResult = await createAd({
      titre: soldName,
      resultat_identification: identification,
    });

    if (adResult.error || !adResult.data) {
      return { error: adResult.error ?? "Échec de création de l'annonce." };
    }

    const supabase = await createClient();
    await supabase
      .from("analyzed_products")
      .update({ ad_id: adResult.data.id })
      .eq("id", productId)
      .eq("user_id", userId);

    await supabase
      .from("ads")
      .update({
        statut: identification.needsReview ? "NEEDS_REVIEW" : "READY",
        description: identification.conditionDescription,
      })
      .eq("id", adResult.data.id);

    revalidatePath("/products");
    revalidatePath("/ads");
    return { success: true, data: { adId: adResult.data.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
