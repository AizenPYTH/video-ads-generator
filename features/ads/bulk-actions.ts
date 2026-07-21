"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { publishAd } from "@/features/ebay/publish";
import { validateAdForPublish } from "@/features/ads/validation";
import { fetchAdById } from "@/features/ads/queries";
import {
  archiveAd,
  deleteAd,
  updateAd,
  type AdActionResult,
} from "@/features/ads/actions";
import type { AdStatus } from "@/types/ads";
import type { IdentificationResult } from "@/types/identification";
import { getPlan, type PlanId } from "@/lib/billing/plans";

const CONCURRENCY = 3;

export type BulkValidateItem = {
  id: string;
  titre: string | null;
  sku: string | null;
};

export type BulkBlockedItem = BulkValidateItem & {
  reasons: string[];
};

export type BulkValidateResult = {
  ready: BulkValidateItem[];
  blocked: BulkBlockedItem[];
};

export type BulkPublishItemResult = {
  id: string;
  titre: string | null;
  success: boolean;
  error?: string;
  listingId?: string;
  listingUrl?: string | null;
};

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Non authentifié.");
  return user.id;
}

async function getUserBulkLimits(userId: string): Promise<{
  enabled: boolean;
  maxItems: number;
}> {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "ACTIVE", "TRIALING"])
    .limit(1)
    .maybeSingle();

  // Hybrid schema: plan_id may be UUID pointing to subscription_plans
  let planKey: PlanId = "FREE";
  if (sub?.plan_id) {
    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select("code, name")
      .eq("id", sub.plan_id)
      .maybeSingle();
    const code = String(planRow?.code ?? planRow?.name ?? "")
      .toUpperCase()
      .trim();
    if (code.includes("BUSINESS")) planKey = "BUSINESS";
    else if (code.includes("PRO")) planKey = "PRO";
    else if (code.includes("STARTER")) planKey = "STARTER";
  }

  const quotas = getPlan(planKey).quotas;
  // FREE: allow a modest bulk for CSV workflows (sandbox / onboarding)
  if (planKey === "FREE") {
    return { enabled: true, maxItems: 25 };
  }
  return {
    enabled: quotas.bulkPublishEnabled,
    maxItems: Math.max(0, quotas.maxBulkPublishItems),
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => run(),
  );
  await Promise.all(runners);
  return results;
}

function toValidationAd(
  ad: NonNullable<Awaited<ReturnType<typeof fetchAdById>>>,
) {
  return {
    id: ad.id,
    user_id: ad.user_id,
    titre: ad.titre,
    description: ad.description,
    statut: ad.statut as AdStatus,
    resultat_identification:
      ad.resultat_identification as IdentificationResult | null,
    prix_achat: ad.prix_achat != null ? String(ad.prix_achat) : null,
    prix_vente: ad.prix_vente != null ? String(ad.prix_vente) : null,
    quantite: ad.quantite,
    sku: ad.sku,
    ebay_category_id: ad.ebay_category_id,
    ebay_condition_id: ad.ebay_condition_id,
    notes: ad.notes,
  };
}

export async function bulkValidateAds(
  adIds: string[],
): Promise<AdActionResult<BulkValidateResult>> {
  try {
    const userId = await requireUserId();
    const unique = [...new Set(adIds.filter(Boolean))];
    if (!unique.length) {
      return { error: "Aucune annonce sélectionnée." };
    }

    const ready: BulkValidateItem[] = [];
    const blocked: BulkBlockedItem[] = [];

    await mapPool(unique, CONCURRENCY, async (id) => {
      const ad = await fetchAdById(userId, id);
      if (!ad) {
        blocked.push({
          id,
          titre: null,
          sku: null,
          reasons: ["Annonce introuvable."],
        });
        return;
      }

      const base = {
        id: ad.id,
        titre: ad.titre,
        sku: ad.sku,
      };

      // Image check
      const supabase = await createClient();
      const { count } = await supabase
        .from("ad_images")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("ad_id", id);

      const validation = validateAdForPublish(toValidationAd(ad));
      const reasons = validation.errors.map((e) => e.message);
      if ((count ?? 0) === 0) {
        reasons.push("Au moins une image est requise.");
      }

      if (reasons.length) {
        blocked.push({ ...base, reasons });
      } else {
        ready.push(base);
      }
    });

    return { success: true, data: { ready, blocked } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur de validation.",
    };
  }
}

export async function bulkPublishAds(
  adIds: string[],
): Promise<AdActionResult<{ results: BulkPublishItemResult[] }>> {
  try {
    const userId = await requireUserId();
    const limits = await getUserBulkLimits(userId);
    if (!limits.enabled || limits.maxItems <= 0) {
      return {
        error:
          "La publication en masse n’est pas disponible sur votre plan actuel.",
      };
    }

    const unique = [...new Set(adIds.filter(Boolean))];
    if (!unique.length) return { error: "Aucune annonce sélectionnée." };
    if (unique.length > limits.maxItems) {
      return {
        error: `Maximum ${limits.maxItems} annonces par publication groupée.`,
      };
    }

    // Pre-validate; only publish ready ones
    const validation = await bulkValidateAds(unique);
    if (validation.error || !validation.data) {
      return { error: validation.error ?? "Validation impossible." };
    }

    const readyIds = new Set(validation.data.ready.map((r) => r.id));
    const results: BulkPublishItemResult[] = [];

    for (const blocked of validation.data.blocked) {
      results.push({
        id: blocked.id,
        titre: blocked.titre,
        success: false,
        error: blocked.reasons.join(" "),
      });
    }

    const toPublish = unique.filter((id) => readyIds.has(id));
    const published = await mapPool(toPublish, CONCURRENCY, async (id) => {
      const ad = await fetchAdById(userId, id);
      const result = await publishAd(id);
      if (result.error) {
        return {
          id,
          titre: ad?.titre ?? null,
          success: false,
          error: result.error,
        } satisfies BulkPublishItemResult;
      }
      return {
        id,
        titre: ad?.titre ?? null,
        success: true,
        listingId: result.data?.listingId,
        listingUrl: result.data?.listingUrl ?? null,
      } satisfies BulkPublishItemResult;
    });

    results.push(...published);
    revalidatePath("/dashboard/annonces");
    return { success: true, data: { results } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur de publication.",
    };
  }
}

export type BulkPatch = {
  id: string;
  prix_vente?: string | null;
  quantite?: number;
  statut?: AdStatus;
};

export async function bulkUpdateAds(
  patches: BulkPatch[],
): Promise<AdActionResult<{ updated: number; failed: number }>> {
  try {
    await requireUserId();
    const unique = patches.filter((p) => p.id);
    if (!unique.length) return { error: "Aucune modification." };

    let updated = 0;
    let failed = 0;

    await mapPool(unique, CONCURRENCY, async (patch) => {
      const result = await updateAd(patch.id, {
        ...(patch.prix_vente !== undefined
          ? { prix_vente: patch.prix_vente }
          : {}),
        ...(patch.quantite !== undefined ? { quantite: patch.quantite } : {}),
        ...(patch.statut !== undefined ? { statut: patch.statut } : {}),
      });
      if (result.error) failed += 1;
      else updated += 1;
    });

    revalidatePath("/dashboard/annonces");
    return { success: true, data: { updated, failed } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur de mise à jour.",
    };
  }
}

export async function bulkArchiveAds(
  adIds: string[],
): Promise<AdActionResult<{ archived: number; failed: number }>> {
  try {
    await requireUserId();
    const unique = [...new Set(adIds.filter(Boolean))];
    if (!unique.length) return { error: "Aucune annonce sélectionnée." };

    let archived = 0;
    let failed = 0;
    await mapPool(unique, CONCURRENCY, async (id) => {
      const result = await archiveAd(id);
      if (result.error) failed += 1;
      else archived += 1;
    });

    revalidatePath("/dashboard/annonces");
    return { success: true, data: { archived, failed } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur d’archivage.",
    };
  }
}

export async function bulkDeleteAds(
  adIds: string[],
): Promise<AdActionResult<{ deleted: number; failed: number; skippedPublished: number }>> {
  try {
    const userId = await requireUserId();
    const unique = [...new Set(adIds.filter(Boolean))];
    if (!unique.length) return { error: "Aucune annonce sélectionnée." };

    let deleted = 0;
    let failed = 0;
    let skippedPublished = 0;

    await mapPool(unique, CONCURRENCY, async (id) => {
      const ad = await fetchAdById(userId, id);
      if (!ad) {
        failed += 1;
        return;
      }
      if (ad.statut === "PUBLISHED") {
        skippedPublished += 1;
        return;
      }
      const result = await deleteAd(id);
      if (result.error) failed += 1;
      else deleted += 1;
    });

    revalidatePath("/dashboard/annonces");
    return {
      success: true,
      data: { deleted, failed, skippedPublished },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur de suppression.",
    };
  }
}

export async function bulkSetDraftAds(
  adIds: string[],
): Promise<AdActionResult<{ updated: number; failed: number }>> {
  return bulkUpdateAds(
    adIds.map((id) => ({ id, statut: "DRAFT" as const })),
  );
}

/**
 * Flag metadata only — policies are applied at publish time from user_settings.
 */
export async function bulkApplyDefaultPoliciesFlag(
  adIds: string[],
): Promise<AdActionResult<{ updated: number }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();
    const unique = [...new Set(adIds.filter(Boolean))];
    if (!unique.length) return { error: "Aucune annonce sélectionnée." };

    let updated = 0;
    for (const id of unique) {
      const ad = await fetchAdById(userId, id);
      if (!ad) continue;
      const meta =
        ad.metadata && typeof ad.metadata === "object"
          ? (ad.metadata as Record<string, unknown>)
          : {};
      const { error } = await supabase
        .from("ads")
        .update({
          metadata: {
            ...meta,
            use_default_ebay_policies: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (!error) updated += 1;
    }

    revalidatePath("/dashboard/annonces");
    return { success: true, data: { updated } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur politiques.",
    };
  }
}
