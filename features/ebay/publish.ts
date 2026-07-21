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
import { resolveListingPolicies } from "@/services/ebay/sandbox-setup";
import { toEbayInventoryCondition } from "@/services/ebay/condition";
import { validateAdForPublish } from "@/features/ads/validation";
import { fetchAdById } from "@/features/ads/queries";
import type { IdentificationResult } from "@/types/identification";
import type { AdImagesRow } from "@/types/database";
import { AppError } from "@/lib/errors/app-error";

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
    .select("access_token_encrypted, token_expires_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!account?.access_token_encrypted) return null;

  if (
    account.token_expires_at &&
    new Date(account.token_expires_at) < new Date()
  ) {
    return null;
  }

  return decrypt(account.access_token_encrypted);
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

    // Remet READY avant retry (FAILED / SENDING_TO_EBAY / etc.)
    if (ad.statut !== "READY") {
      await supabase
        .from("ads")
        .update({
          statut: "READY",
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", adId)
        .eq("user_id", userId);
    }

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

    const settings = await getUserSettings(userId);
    const images = await getAdImages(userId, adId);
    const identification = ad.resultat_identification as IdentificationResult | null;

    // Filtrer les images non https (eBay refuse http / data / relatives)
    const httpsImages = images.filter((u) => /^https:\/\//i.test(u)).slice(0, 12);
    if (httpsImages.length === 0) {
      return {
        error:
          "Au moins une image HTTPS est requise pour publier sur eBay.",
      };
    }

    await supabase
      .from("ads")
      .update({ statut: "SENDING_TO_EBAY" })
      .eq("id", adId);

    const client = new EbayClient({ accessToken });

    const aspects: Record<string, string[]> = {};
    if (identification?.itemSpecifics) {
      for (const [key, value] of Object.entries(identification.itemSpecifics)) {
        aspects[key] = Array.isArray(value) ? value : [value];
      }
    }

    const condition = toEbayInventoryCondition(ad.ebay_condition_id);
    const policies = await resolveListingPolicies(client, {
      fulfillmentPolicyId: settings?.politique_expedition_par_defaut,
      paymentPolicyId: settings?.politique_paiement_par_defaut,
      returnPolicyId: settings?.politique_retour_par_defaut,
      merchantLocationKey: settings?.lieu_expedition_par_defaut,
    });

    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        politique_expedition_par_defaut: policies.fulfillmentPolicyId,
        politique_paiement_par_defaut: policies.paymentPolicyId,
        politique_retour_par_defaut: policies.returnPolicyId,
        lieu_expedition_par_defaut: policies.merchantLocationKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    await createInventoryItem(client, {
      sku: ad.sku!,
      title: ad.titre!,
      description: ad.description!,
      condition,
      images: httpsImages,
      aspects,
      quantity: ad.quantite,
    });

    await supabase.from("ads").update({ statut: "INVENTORY_CREATED" }).eq("id", adId);

    const { offerId } = await createOffer(client, {
      sku: ad.sku!,
      price: parseFloat(ad.prix_vente!),
      currency: settings?.devise ?? "EUR",
      categoryId: ad.ebay_category_id!,
      fulfillmentPolicyId: policies.fulfillmentPolicyId,
      paymentPolicyId: policies.paymentPolicyId,
      returnPolicyId: policies.returnPolicyId,
      merchantLocationKey: policies.merchantLocationKey,
      quantity: ad.quantite,
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
    // Garder l’annonce republable (Prêtes) après un échec eBay
    await supabase
      .from("ads")
      .update({
        statut: "READY",
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId);

    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Erreur de publication." };
  }
}
