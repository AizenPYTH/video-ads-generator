"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EbayClient } from "@/services/ebay/client";
import { decrypt } from "@/lib/crypto/encryption";
import {
  createInventoryItem,
  createOffer,
  publishOffer,
} from "@/services/ebay/inventory";
import { validateAdForPublish } from "@/features/ads/validation";
import { fetchAdById } from "@/features/ads/queries";
import type { IdentificationResult } from "@/types/identification";
import type { AdImagesRow } from "@/types/database";

export type PublishActionResult<T = void> = {
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

async function getEbayAccessToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: account } = await supabase
    .from("ebay_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("est_actif", true)
    .limit(1)
    .maybeSingle();

  if (!account) return null;

  const { data: token } = await supabase
    .from("ebay_tokens")
    .select("access_token, expires_at")
    .eq("ebay_account_id", account.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!token) return null;

  if (new Date(token.expires_at) < new Date()) {
    return null;
  }

  return decrypt(token.access_token);
}

async function getAdImages(userId: string, adId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ad_images")
    .select("url")
    .eq("user_id", userId)
    .eq("ad_id", adId)
    .order("ordre");

  return (data as AdImagesRow[] | null)?.map((img) => img.url) ?? [];
}

async function getUserSettings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function publishAd(
  adId: string,
): Promise<PublishActionResult<{ listingId: string; offerId: string }>> {
  try {
    const userId = await requireUserId();
    const ad = await fetchAdById(userId, adId);

    if (!ad) {
      return { error: "Annonce introuvable." };
    }

    const validation = validateAdForPublish({
      id: ad.id,
      user_id: ad.user_id,
      titre: ad.titre,
      description: ad.description,
      statut: ad.statut,
      resultat_identification: ad.resultat_identification as IdentificationResult | null,
      prix_achat: ad.prix_achat,
      prix_vente: ad.prix_vente,
      quantite: ad.quantite,
      sku: ad.sku,
      ebay_category_id: ad.ebay_category_id,
      ebay_condition_id: ad.ebay_condition_id,
      notes: ad.notes,
    });

    if (!validation.valid) {
      return { error: validation.errors.map((e) => e.message).join(" ") };
    }

    const supabase = await createClient();

    const { data: existingPublication } = await supabase
      .from("listing_publications")
      .select("id, ebay_listing_id, statut")
      .eq("ad_id", adId)
      .eq("user_id", userId)
      .eq("statut", "SUCCESS")
      .maybeSingle();

    if (existingPublication?.ebay_listing_id) {
      return {
        success: true,
        data: {
          listingId: existingPublication.ebay_listing_id,
          offerId: "",
        },
      };
    }

    const accessToken = await getEbayAccessToken(userId);
    if (!accessToken) {
      return { error: "Compte eBay non connecté ou token expiré." };
    }

    await supabase
      .from("ads")
      .update({ statut: "SENDING_TO_EBAY" })
      .eq("id", adId);

    const settings = await getUserSettings(userId);
    const images = await getAdImages(userId, adId);
    const identification = ad.resultat_identification as IdentificationResult | null;

    const client = new EbayClient({ accessToken });

    const aspects: Record<string, string[]> = {};
    if (identification?.itemSpecifics) {
      for (const [key, value] of Object.entries(identification.itemSpecifics)) {
        aspects[key] = Array.isArray(value) ? value : [value];
      }
    }

    await createInventoryItem(client, {
      sku: ad.sku!,
      title: ad.titre!,
      description: ad.description!,
      condition: ad.ebay_condition_id!,
      images,
      aspects,
      quantity: ad.quantite,
    });

    await supabase.from("ads").update({ statut: "INVENTORY_CREATED" }).eq("id", adId);

    const { offerId } = await createOffer(client, {
      sku: ad.sku!,
      price: parseFloat(ad.prix_vente!),
      currency: settings?.devise ?? "EUR",
      categoryId: ad.ebay_category_id!,
      fulfillmentPolicyId: settings?.politique_expedition_par_defaut ?? "",
      paymentPolicyId: settings?.politique_paiement_par_defaut ?? "",
      returnPolicyId: settings?.politique_retour_par_defaut ?? "",
    });

    await supabase.from("ads").update({ statut: "OFFER_CREATED" }).eq("id", adId);

    const publishResult = await publishOffer(client, offerId);

    const { data: publication } = await supabase
      .from("listing_publications")
      .insert({
        user_id: userId,
        ad_id: adId,
        ebay_listing_id: publishResult.listingId,
        statut: "SUCCESS",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await supabase
      .from("ads")
      .update({ statut: "PUBLISHED" })
      .eq("id", adId);

    await supabase.from("ad_history").insert({
      user_id: userId,
      ad_id: adId,
      statut_avant: "SENDING_TO_EBAY",
      statut_apres: "PUBLISHED",
      action: "PUBLISH",
      details: { listingId: publishResult.listingId, offerId },
    });

    if (publication) {
      await supabase.from("publication_attempts").insert({
        user_id: userId,
        listing_publication_id: publication.id,
        statut: "SUCCESS",
        reponse_ebay: publishResult,
      });
    }

    revalidatePath("/ads");
    revalidatePath(`/ads/${adId}`);

    return {
      success: true,
      data: { listingId: publishResult.listingId, offerId },
    };
  } catch (err) {
    const supabase = await createClient();
    await supabase
      .from("ads")
      .update({ statut: "FAILED" })
      .eq("id", adId);

    return { error: err instanceof Error ? err.message : "Erreur de publication." };
  }
}
