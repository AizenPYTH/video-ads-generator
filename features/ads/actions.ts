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
  } = {},
): Promise<AdActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ads")
      .insert({
        user_id: userId,
        titre: input.titre ?? null,
        notes: input.notes ?? null,
        statut: "DRAFT",
        resultat_identification: input.resultat_identification ?? null,
        quantite: 1,
        metadata: {},
      })
      .select("id")
      .single();

    if (error || !data) {
      return { error: "Impossible de créer l'annonce." };
    }

    await recordAdHistory(userId, data.id, "CREATE", null, "DRAFT");
    revalidatePath("/ads");
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
    const { error } = await supabase
      .from("ads")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("id", adId);

    if (error) {
      return { error: "Impossible de mettre à jour l'annonce." };
    }

    if (input.statut && input.statut !== existing.statut) {
      await recordAdHistory(
        userId,
        adId,
        "UPDATE_STATUS",
        existing.statut,
        input.statut,
      );
    } else {
      await recordAdHistory(userId, adId, "UPDATE", existing.statut, existing.statut);
    }

    revalidatePath("/ads");
    revalidatePath(`/ads/${adId}`);
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
