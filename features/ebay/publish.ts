"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EbayClient } from "@/services/ebay/client";
import {
  createInventoryItem,
  ensureOffer,
  getOffer,
  getInventoryItem,
  publishOffer,
  createOffer,
} from "@/services/ebay/inventory";
import { resolveListingPolicies } from "@/services/ebay/sandbox-setup";
import { toEbayInventoryCondition } from "@/services/ebay/condition";
import {
  buildEbayAspects,
  collectRawAspectValues,
  extractAspectSourcesFromAd,
} from "@/services/ebay/aspects";
import { getItemAspectsForCategory } from "@/services/ebay/taxonomy";
import {
  buildEbayListingUrl,
  buildEbaySellerListingsUrl,
  isEbaySandboxEnvironment,
} from "@/services/ebay/listing-url";
import { validateAdForPublish } from "@/features/ads/validation";
import { fetchAdById } from "@/features/ads/queries";
import { getEbayTokens } from "@/services/ebay/oauth";
import type { IdentificationResult } from "@/types/identification";
import type { AdImagesRow } from "@/types/database";
import { AppError } from "@/lib/errors/app-error";

export type PublishActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
  /** Message UX (sandbox, lien, etc.) */
  message?: string;
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
  // Refresh automatique si access token proche de l’expiration / expiré
  const tokens = await getEbayTokens(userId);
  return tokens?.accessToken ?? null;
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
): Promise<
  PublishActionResult<{
    listingId: string;
    offerId: string;
    listingUrl: string | null;
    sellerListingsUrl: string;
    sandbox: boolean;
  }>
> {
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
      const listingId = existingPublication.ebay_listing_id;
      const listingUrl = buildEbayListingUrl(listingId);
      const sellerListingsUrl = buildEbaySellerListingsUrl();
      const sandbox = isEbaySandboxEnvironment();
      return {
        success: true,
        message: sandbox
          ? `Déjà publiée sur eBay Sandbox. Ouvrez : ${listingUrl ?? sellerListingsUrl}`
          : `Déjà publiée sur eBay.`,
        data: {
          listingId,
          offerId: "",
          listingUrl,
          sellerListingsUrl,
          sandbox,
        },
      };
    }

    const accessToken = await getEbayAccessToken(userId);
    if (!accessToken) {
      return { error: "Compte eBay non connecté ou token expiré." };
    }

    const settings = await getUserSettings(userId);
    const images = await getAdImages(userId, adId);

    // Filtrer les images non https (eBay refuse http / data / relatives)
    const httpsImages = images.filter((u) => /^https:\/\//i.test(u)).slice(0, 12);
    if (httpsImages.length === 0) {
      return {
        error:
          "Au moins une image HTTPS est requise pour publier sur eBay.",
      };
    }

    const client = new EbayClient({ accessToken });

    // Aspects depuis CSV metadata / URL / photo — mappés aux noms FR Taxonomy
    const rawAspects = collectRawAspectValues(
      extractAspectSourcesFromAd({
        titre: ad.titre,
        resultat_identification: ad.resultat_identification,
        metadata: ad.metadata,
      }),
    );

    let categoryAspects: Awaited<
      ReturnType<typeof getItemAspectsForCategory>
    > = [];
    try {
      if (ad.ebay_category_id) {
        categoryAspects = await getItemAspectsForCategory(ad.ebay_category_id);
      }
    } catch (err) {
      console.warn("[publish] taxonomy aspects unavailable", err);
    }

    const { aspects, missingRequired, mappedFrom } = buildEbayAspects({
      raw: rawAspects,
      categoryAspects,
    });

    console.info("[publish] aspects", {
      adId,
      rawKeys: Object.keys(rawAspects),
      mapped: mappedFrom,
      aspectKeys: Object.keys(aspects),
      missingRequired,
    });

    if (missingRequired.length > 0) {
      return {
        error: `Caractéristiques eBay manquantes : ${missingRequired.join(", ")}. Vérifiez le CSV (Compatible brand, Brand, Type…) puis réessayez.`,
      };
    }

    await supabase
      .from("ads")
      .update({ statut: "SENDING_TO_EBAY" })
      .eq("id", adId);

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

    // Sandbox : SKU unique + offre neuve (évite l’état corrompu des retries)
    const sandboxPublish = isEbaySandboxEnvironment();
    let workingSku = sandboxPublish
      ? `${ad.sku}-p${Date.now().toString(36).slice(-6)}`
      : ad.sku!;

    await createInventoryItem(client, {
      sku: workingSku,
      title: ad.titre!,
      description: ad.description!,
      condition,
      images: httpsImages,
      aspects,
      quantity: ad.quantite,
    });

    const inventoryOk = await getInventoryItem(client, workingSku);
    if (!inventoryOk) {
      throw new AppError(
        "EBAY_ERROR",
        "L’article d’inventaire eBay n’a pas été créé (SKU introuvable après écriture). Réessayez. [ss7]",
        { status: 502 },
      );
    }

    await supabase.from("ads").update({ statut: "INVENTORY_CREATED" }).eq("id", adId);

    const buildOfferInput = (sku: string, policySet: typeof policies) => ({
      sku,
      price: parseFloat(String(ad.prix_vente)),
      currency: settings?.devise ?? "EUR",
      categoryId: ad.ebay_category_id!,
      fulfillmentPolicyId: policySet.fulfillmentPolicyId,
      paymentPolicyId: policySet.paymentPolicyId,
      returnPolicyId: policySet.returnPolicyId,
      merchantLocationKey: policySet.merchantLocationKey,
      quantity: Math.max(1, Number(ad.quantite) || 1),
      marketplaceId: client.marketplace,
      listingDescription: String(ad.description ?? "").slice(0, 4000),
    });

    const offerInput = buildOfferInput(workingSku, policies);

    // Sandbox + SKU unique : createOffer direct (PAS de GET /offer?sku=).
    // eBay renvoie #25713 sur ce GET quand aucune offre n’existe — ce n’est
    // pas une erreur métier, mais ss5 le traitait comme fatale et bloquait
    // createOffer. On évite complètement cet appel pour un SKU neuf.
    let ensured = sandboxPublish
      ? {
          ...(await createOffer(client, offerInput)),
          alreadyPublished: false as boolean,
          listingId: undefined as string | undefined,
        }
      : await ensureOffer(client, offerInput);

    if (workingSku !== ad.sku) {
      await supabase
        .from("ads")
        .update({
          sku: workingSku,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adId);
    }

    await supabase
      .from("ads")
      .update({
        statut: ensured.alreadyPublished ? "PUBLISHED" : "OFFER_CREATED",
        metadata: {
          ...((ad.metadata && typeof ad.metadata === "object"
            ? ad.metadata
            : {}) as Record<string, unknown>),
          ebay_offer_id: ensured.offerId,
          ebay_sku: workingSku,
          ebay_sku_previous: ad.sku,
          ...(ensured.listingId ? { ebay_listing_id: ensured.listingId } : {}),
          ebay_policies: {
            fulfillment: policies.fulfillmentPolicyId,
            payment: policies.paymentPolicyId,
            returns: policies.returnPolicyId,
            location: policies.merchantLocationKey,
          },
          publish_engine: "ss7",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId);

    let publishResult:
      | {
          listingId: string;
          offerId: string;
          sku: string;
          status: string;
        }
      | Awaited<ReturnType<typeof publishOffer>>;

    if (ensured.alreadyPublished && ensured.listingId) {
      publishResult = {
        listingId: ensured.listingId,
        offerId: ensured.offerId,
        sku: workingSku,
        status: "PUBLISHED",
      };
    } else {
      if (!ensured.offerId) {
        throw new AppError(
          "EBAY_ERROR",
          "createOffer n’a renvoyé aucun offerId. [ss7]",
          { status: 502 },
        );
      }
      try {
        publishResult = await publishOffer(client, ensured.offerId);
      } catch (publishErr) {
        const detail =
          publishErr instanceof Error ? publishErr.message : String(publishErr);
        console.error("[publish] publishOffer failed", {
          adId,
          offerId: ensured.offerId,
          sku: workingSku,
          policies,
          detail,
        });
        throw new AppError(
          "EBAY_ERROR",
          `${detail} [ss7 sku=${workingSku} offer=${ensured.offerId}]`,
          {
            status:
              publishErr instanceof AppError ? publishErr.status : 502,
            details:
              publishErr instanceof AppError ? publishErr.details : undefined,
          },
        );
      }
    }

    // Vérifier côté eBay qu’un vrai listingId existe avant de marquer Publié
    let listingId = publishResult.listingId?.trim() || "";
    if (!listingId) {
      const verified = await getOffer(client, publishResult.offerId);
      listingId = verified?.listing?.listingId?.trim() || "";
    }

    if (!listingId) {
      throw new AppError(
        "EBAY_ERROR",
        "eBay n’a pas confirmé d’ID d’annonce active. L’offre existe peut‑être en brouillon : réessayez « Publier », ou ouvrez Mes annonces sur sandbox.ebay.fr (pas ebay.fr).",
        { status: 400 },
      );
    }

    const listingUrl = buildEbayListingUrl(listingId);
    const sellerListingsUrl = buildEbaySellerListingsUrl();
    const sandbox = isEbaySandboxEnvironment();

    const { data: publication } = await supabase
      .from("listing_publications")
      .insert({
        user_id: userId,
        ad_id: adId,
        ebay_listing_id: listingId,
        url_annonce: listingUrl,
        statut: "SUCCESS",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await supabase
      .from("ads")
      .update({
        statut: "PUBLISHED",
        status: "published",
        metadata: {
          ...((ad.metadata && typeof ad.metadata === "object"
            ? ad.metadata
            : {}) as Record<string, unknown>),
          ebay_offer_id: publishResult.offerId,
          ebay_listing_id: listingId,
          ebay_listing_url: listingUrl,
          ebay_sku: ad.sku,
          ebay_environment: sandbox ? "sandbox" : "production",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId);

    await supabase.from("ad_history").insert({
      user_id: userId,
      ad_id: adId,
      statut_avant: "SENDING_TO_EBAY",
      statut_apres: "PUBLISHED",
      action: "PUBLISH",
      details: {
        listingId,
        offerId: publishResult.offerId,
        listingUrl,
        sandbox,
      },
    });

    if (publication) {
      await supabase.from("publication_attempts").insert({
        user_id: userId,
        listing_publication_id: publication.id,
        statut: "SUCCESS",
        reponse_ebay: { ...publishResult, listingId, listingUrl },
      });
    }

    revalidatePath("/ads");
    revalidatePath(`/ads/${adId}`);
    revalidatePath("/dashboard/annonces");
    revalidatePath(`/dashboard/annonces/${adId}`);

    const message = sandbox
      ? `Publiée sur eBay Sandbox (pas sur ebay.fr). Ouvrez : ${listingUrl ?? sellerListingsUrl}`
      : `Publiée sur eBay. ${listingUrl ?? ""}`;

    return {
      success: true,
      message,
      data: {
        listingId,
        offerId: publishResult.offerId,
        listingUrl,
        sellerListingsUrl,
        sandbox,
      },
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

    const friendly = `${humanizePublishError(err)} [ss7]`;
    return { error: friendly };
  }
}

function humanizePublishError(err: unknown): string {
  if (!(err instanceof Error)) return "Erreur de publication.";
  const msg = err.message;

  if (/existe déjà|already exists|offer entity/i.test(msg)) {
    return "Une offre eBay existe déjà pour ce SKU — réessayez, la publication va la réutiliser automatiquement.";
  }
  if (/already published|déjà publi/i.test(msg)) {
    return "Cette annonce semble déjà publiée sur eBay Sandbox. Ouvrez sandbox.ebay.fr (pas ebay.fr) → Mes annonces.";
  }
  if (/marque compatible|compatible brand|item specific|caractéristique/i.test(msg)) {
    return msg;
  }
  if (/policy|politique/i.test(msg)) {
    return `Politiques eBay invalides ou manquantes. ${msg}`;
  }
  if (/location|lieu|merchant/i.test(msg)) {
    return `Lieu d’expédition eBay manquant ou invalide. ${msg}`;
  }
  if (/image|https/i.test(msg)) {
    return msg;
  }
  // Garder le message eBay brut (avec #errorId) pour diagnostiquer les 404
  if (err instanceof AppError) return msg;
  return msg || "Erreur de publication.";
}
