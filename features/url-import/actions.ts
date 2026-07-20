"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { importFromUrl } from "@/services/scraping/url-import";
import { createAd } from "@/features/ads/actions";

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

      const adResult = await createAd({
        titre: result.product.title,
        notes: result.product.description ?? undefined,
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

      await supabase
        .from("ads")
        .update({
          description: result.product.description,
          prix_vente: result.product.price?.toString() ?? null,
          metadata: {
            source_url: result.validatedUrl,
            provider: result.provider,
            brand: result.product.brand,
            images: result.product.images,
          },
        })
        .eq("id", adResult.data.id);

      await supabase
        .from("url_imports")
        .update({
          statut: "COMPLETED",
          ad_id: adResult.data.id,
          metadata: {
            provider: result.provider,
            title: result.product.title,
            image_count: result.product.images.length,
          },
        })
        .eq("id", urlImport.id);

      revalidatePath("/ads");
      revalidatePath("/imports/url");

      return {
        success: true,
        data: { adId: adResult.data.id, urlImportId: urlImport.id },
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
