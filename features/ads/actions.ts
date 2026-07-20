"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdStatus } from "@/types/ads";
import type { IdentificationResult } from "@/types/identification";
import { fetchAdById } from "./queries";

export type AdActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
};

type UploadedAdImage = {
  url: string;
  storagePath?: string;
};

type AddedAdImage = {
  id: string;
  url: string;
  storage_path: string | null;
  ordre: number;
  est_principale: boolean;
};

function revalidateAdPaths(adId: string) {
  revalidatePath("/ads");
  revalidatePath(`/ads/${adId}`);
  revalidatePath("/dashboard/annonces");
  revalidatePath(`/dashboard/annonces/${adId}`);
}

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

async function recordAdHistory(
  userId: string,
  adId: string,
  action: string,
  statutAvant: AdStatus | null,
  statutApres: AdStatus | null,
  details: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  await supabase.from("ad_history").insert({
    user_id: userId,
    ad_id: adId,
    statut_avant: statutAvant,
    statut_apres: statutApres,
    action,
    details,
  });
}

export async function createAd(
  input: {
    titre?: string;
    notes?: string;
    resultat_identification?: IdentificationResult;
    source?: string;
  } = {},
): Promise<AdActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const { ensureFreeSubscription } = await import(
      "@/lib/billing/ensure-subscription"
    );
    await ensureFreeSubscription(userId);

    const supabase = await createClient();
    const source = input.source ?? "photo";

    const { data, error } = await supabase
      .from("ads")
      .insert({
        user_id: userId,
        // Schéma hybride EN + FR
        titre: input.titre ?? null,
        title: input.titre ?? null,
        notes: input.notes ?? null,
        statut: "DRAFT",
        status: "draft",
        resultat_identification: input.resultat_identification ?? null,
        quantite: 1,
        quantity: 1,
        source,
        marketplace_id: "EBAY_FR",
        metadata: {},
      })
      .select("id")
      .single();

    if (error || !data) {
      const detail = error?.message?.trim();
      if (detail?.includes("No subscription found")) {
        return {
          error:
            "Aucun abonnement trouvé pour votre compte. Rechargez la page puis réessayez.",
        };
      }
      if (detail?.toLowerCase().includes("limit") || detail?.includes("quota")) {
        return {
          error: "Quota d'annonces atteint pour votre abonnement.",
        };
      }
      return {
        error: detail
          ? `Impossible de créer l'annonce : ${detail}`
          : "Impossible de créer l'annonce.",
      };
    }

    await recordAdHistory(userId, data.id, "CREATE", null, "DRAFT");
    revalidatePath("/ads");
    revalidatePath("/dashboard/annonces");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updateAd(
  adId: string,
  input: {
    titre?: string | null;
    description?: string | null;
    prix_achat?: string | null;
    prix_vente?: string | null;
    quantite?: number;
    sku?: string | null;
    ebay_category_id?: string | null;
    ebay_condition_id?: string | null;
    notes?: string | null;
    resultat_identification?: IdentificationResult | null;
    statut?: AdStatus;
  },
): Promise<AdActionResult> {
  try {
    const userId = await requireUserId();
    const existing = await fetchAdById(userId, adId);

    if (!existing) {
      return { error: "Annonce introuvable." };
    }

    const supabase = await createClient();
    const { recalculateAdStatus } = await import("./recalculate-status");

    const meta =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const categoryResolution =
      meta.category_resolution && typeof meta.category_resolution === "object"
        ? (meta.category_resolution as {
            status?: string;
            confidence?: number;
          })
        : null;

    const next = {
      titre: input.titre !== undefined ? input.titre : existing.titre,
      description:
        input.description !== undefined
          ? input.description
          : existing.description,
      prix_vente:
        input.prix_vente !== undefined
          ? input.prix_vente
          : existing.prix_vente,
      quantite:
        input.quantite !== undefined ? input.quantite : existing.quantite,
      sku: input.sku !== undefined ? input.sku : existing.sku,
      ebay_category_id:
        input.ebay_category_id !== undefined
          ? input.ebay_category_id
          : existing.ebay_category_id,
      ebay_condition_id:
        input.ebay_condition_id !== undefined
          ? input.ebay_condition_id
          : existing.ebay_condition_id,
    };

    const computedStatut =
      input.statut ??
      recalculateAdStatus({
        ...next,
        categoryStatus: categoryResolution?.status ?? null,
        categoryAmbiguous: categoryResolution?.status === "needs_review",
        categoryConfidence:
          typeof categoryResolution?.confidence === "number"
            ? categoryResolution.confidence
            : null,
      });

    console.info("[ad-update] status", {
      adId,
      old: existing.statut,
      new: computedStatut,
    });

    const { error } = await supabase
      .from("ads")
      .update({
        ...input,
        titre: next.titre,
        title: next.titre,
        description: next.description,
        prix_vente: next.prix_vente,
        quantite: next.quantite,
        quantity: next.quantite,
        sku: next.sku,
        ebay_category_id: next.ebay_category_id,
        ebay_condition_id: next.ebay_condition_id,
        statut: computedStatut,
        status: computedStatut === "READY" ? "ready" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", adId);

    if (error) {
      return { error: "Impossible de mettre à jour l'annonce." };
    }

    if (computedStatut !== existing.statut) {
      await recordAdHistory(
        userId,
        adId,
        "UPDATE_STATUS",
        existing.statut,
        computedStatut,
      );
    } else {
      await recordAdHistory(userId, adId, "UPDATE", existing.statut, existing.statut);
    }

    revalidatePath("/ads");
    revalidatePath(`/ads/${adId}`);
    revalidatePath("/dashboard/annonces");
    revalidatePath(`/dashboard/annonces/${adId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function addAdImages(
  adId: string,
  uploaded: UploadedAdImage[],
): Promise<AdActionResult<AddedAdImage[]>> {
  try {
    const userId = await requireUserId();
    const existingAd = await fetchAdById(userId, adId);
    if (!existingAd) return { error: "Annonce introuvable." };

    const candidates = uploaded
      .map((image) => ({
        url: image.url.trim(),
        storagePath: image.storagePath?.trim() || null,
      }))
      .filter((image) => image.url.length > 0);

    if (!candidates.length) return { error: "Aucune image à ajouter." };

    const supabase = await createClient();
    const { data: existingImages, error: existingError } = await supabase
      .from("ad_images")
      .select("url, ordre")
      .eq("ad_id", adId)
      .eq("user_id", userId)
      .order("ordre", { ascending: false });

    if (existingError) {
      return { error: "Impossible de vérifier les images existantes." };
    }

    const existingUrls = new Set(
      (existingImages ?? []).map((image) => image.url.trim()),
    );
    const seenUrls = new Set(existingUrls);
    const unique = candidates.filter((image) => {
      if (seenUrls.has(image.url)) return false;
      seenUrls.add(image.url);
      return true;
    });

    if (!unique.length) return { error: "Ces images sont déjà présentes." };

    const remaining = Math.max(0, 12 - (existingImages?.length ?? 0));
    if (!remaining) return { error: "La limite de 12 images est atteinte." };
    if (unique.length > remaining) {
      return {
        error: `Vous pouvez encore ajouter ${remaining} image${remaining > 1 ? "s" : ""}.`,
      };
    }

    const maxOrder =
      existingImages?.reduce(
        (max, image) => Math.max(max, image.ordre),
        -1,
      ) ?? -1;
    const hadImages = (existingImages?.length ?? 0) > 0;
    const { data, error } = await supabase
      .from("ad_images")
      .insert(
        unique.map((image, index) => ({
          user_id: userId,
          ad_id: adId,
          url: image.url,
          storage_path: image.storagePath,
          ordre: maxOrder + index + 1,
          est_principale: !hadImages && index === 0,
        })),
      )
      .select("id, url, storage_path, ordre, est_principale");

    if (error || !data) {
      return { error: "Impossible d'ajouter les images." };
    }

    revalidateAdPaths(adId);
    return { success: true, data: data as AddedAdImage[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function reorderAdImages(
  adId: string,
  orderedImageIds: string[],
): Promise<AdActionResult> {
  try {
    const userId = await requireUserId();
    const existingAd = await fetchAdById(userId, adId);
    if (!existingAd) return { error: "Annonce introuvable." };

    if (new Set(orderedImageIds).size !== orderedImageIds.length) {
      return { error: "Ordre des images invalide." };
    }

    const supabase = await createClient();
    const { data: images, error: imagesError } = await supabase
      .from("ad_images")
      .select("id")
      .eq("ad_id", adId)
      .eq("user_id", userId);

    if (imagesError) {
      return { error: "Impossible de vérifier les images." };
    }

    const currentIds = new Set((images ?? []).map((image) => image.id));
    if (
      currentIds.size !== orderedImageIds.length ||
      orderedImageIds.some((id) => !currentIds.has(id))
    ) {
      return { error: "La liste des images ne correspond pas à l'annonce." };
    }

    for (const [ordre, imageId] of orderedImageIds.entries()) {
      const { error } = await supabase
        .from("ad_images")
        .update({ ordre })
        .eq("id", imageId)
        .eq("ad_id", adId)
        .eq("user_id", userId);
      if (error) return { error: "Impossible de réordonner les images." };
    }

    revalidateAdPaths(adId);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function deleteAdImage(
  adId: string,
  imageId: string,
): Promise<AdActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: image } = await supabase
      .from("ad_images")
      .select("id, est_principale")
      .eq("id", imageId)
      .eq("ad_id", adId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!image) return { error: "Image introuvable." };

    await supabase
      .from("ad_images")
      .delete()
      .eq("id", imageId)
      .eq("user_id", userId);

    if (image.est_principale) {
      const { data: next } = await supabase
        .from("ad_images")
        .select("id")
        .eq("ad_id", adId)
        .eq("user_id", userId)
        .order("ordre", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (next) {
        await supabase
          .from("ad_images")
          .update({ est_principale: true })
          .eq("id", next.id);
      }
    }

    revalidatePath(`/dashboard/annonces/${adId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function setPrimaryAdImage(
  adId: string,
  imageId: string,
): Promise<AdActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: images, error: imagesError } = await supabase
      .from("ad_images")
      .select("id, ordre")
      .eq("ad_id", adId)
      .eq("user_id", userId)
      .order("ordre", { ascending: true });

    if (imagesError || !images?.some((image) => image.id === imageId)) {
      return { error: "Image introuvable." };
    }

    await supabase
      .from("ad_images")
      .update({ est_principale: false })
      .eq("ad_id", adId)
      .eq("user_id", userId);

    const { error } = await supabase
      .from("ad_images")
      .update({ est_principale: true })
      .eq("id", imageId)
      .eq("ad_id", adId)
      .eq("user_id", userId);

    if (error) return { error: "Impossible de définir l'image principale." };

    const orderedIds = [
      imageId,
      ...images.filter((image) => image.id !== imageId).map((image) => image.id),
    ];
    for (const [ordre, id] of orderedIds.entries()) {
      const { error: orderError } = await supabase
        .from("ad_images")
        .update({ ordre })
        .eq("id", id)
        .eq("ad_id", adId)
        .eq("user_id", userId);
      if (orderError) {
        return { error: "Image principale définie, mais ordre non mis à jour." };
      }
    }

    revalidateAdPaths(adId);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function deleteAd(adId: string): Promise<AdActionResult> {
  try {
    const userId = await requireUserId();
    const existing = await fetchAdById(userId, adId);

    if (!existing) {
      return { error: "Annonce introuvable." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("ads")
      .delete()
      .eq("user_id", userId)
      .eq("id", adId);

    if (error) {
      return { error: "Impossible de supprimer l'annonce." };
    }

    revalidatePath("/ads");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function duplicateAd(adId: string): Promise<AdActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const existing = await fetchAdById(userId, adId);

    if (!existing) {
      return { error: "Annonce introuvable." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ads")
      .insert({
        user_id: userId,
        titre: existing.titre ? `${existing.titre} (copie)` : null,
        description: existing.description,
        statut: "DRAFT",
        resultat_identification: existing.resultat_identification,
        prix_achat: existing.prix_achat,
        prix_vente: existing.prix_vente,
        quantite: existing.quantite,
        sku: existing.sku ? `${existing.sku}-copy` : null,
        ebay_category_id: existing.ebay_category_id,
        ebay_condition_id: existing.ebay_condition_id,
        notes: existing.notes,
        metadata: existing.metadata,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { error: "Impossible de dupliquer l'annonce." };
    }

    await recordAdHistory(userId, data.id, "DUPLICATE", null, "DRAFT", {
      source_ad_id: adId,
    });
    revalidatePath("/ads");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function archiveAd(adId: string): Promise<AdActionResult> {
  return updateAd(adId, { statut: "ARCHIVED" });
}
