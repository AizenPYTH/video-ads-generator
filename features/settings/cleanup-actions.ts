"use server";

import { createClient } from "@/lib/supabase/server";
import type { AdActionResult } from "@/features/ads/actions";

export type TestDataPreview = {
  draftAds: number;
  publishedAds: number;
  otherAds: number;
  importBatches: number;
  importRows: number;
  urlImports: number;
  analyzedProducts: number;
  adImages: number;
  publicationAttempts: number;
  listingPublications: number;
  ebayAccounts: number;
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

async function countRows(
  table: string,
  userId: string,
  extra?: (q: {
    eq: (c: string, v: string) => unknown;
    in: (c: string, v: string[]) => unknown;
  }) => unknown,
): Promise<number> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

/**
 * Dry-run uniquement : compte les éléments de test de l’utilisateur courant.
 * Aucune suppression.
 */
export async function previewTestDataCleanup(): Promise<
  AdActionResult<TestDataPreview>
> {
  try {
    const userId = await requireUserId();

    const [
      draftAds,
      publishedAds,
      allAds,
      importBatches,
      importRows,
      urlImports,
      analyzedProducts,
      adImages,
      publicationAttempts,
      listingPublications,
      ebayAccounts,
    ] = await Promise.all([
      countRows("ads", userId, (q) =>
        q.in("statut", ["DRAFT", "ANALYZING", "NEEDS_REVIEW"]),
      ),
      countRows("ads", userId, (q) => q.eq("statut", "PUBLISHED")),
      countRows("ads", userId),
      countRows("product_import_batches", userId),
      countRows("product_import_rows", userId),
      countRows("url_imports", userId),
      countRows("analyzed_products", userId),
      countRows("ad_images", userId),
      countRows("publication_attempts", userId),
      countRows("listing_publications", userId),
      countRows("ebay_accounts", userId),
    ]);

    return {
      success: true,
      data: {
        draftAds,
        publishedAds,
        otherAds: Math.max(0, allAds - draftAds - publishedAds),
        importBatches,
        importRows,
        urlImports,
        analyzedProducts,
        adImages,
        publicationAttempts,
        listingPublications,
        ebayAccounts,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Impossible de prévisualiser le nettoyage.",
    };
  }
}

/**
 * Suppression ciblée des brouillons / imports de test.
 * Ne touche jamais aux annonces PUBLISHED, ni aux users.
 * Les tokens eBay ne sont désactivés que si `disconnectEbay` est coché.
 */
export async function executeTestDataCleanup(input: {
  confirmPhrase: string;
  deleteDrafts: boolean;
  deleteImports: boolean;
  deleteAnalyzed: boolean;
  deleteOrphanImages: boolean;
  disconnectEbay: boolean;
}): Promise<AdActionResult<{ deleted: Record<string, number> }>> {
  if (input.confirmPhrase !== "SUPPRIMER LES DONNÉES DE TEST") {
    return {
      error:
        'Confirmation invalide. Tapez exactement : SUPPRIMER LES DONNÉES DE TEST',
    };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();
    const deleted: Record<string, number> = {};

    if (input.deleteDrafts) {
      const { data } = await supabase
        .from("ads")
        .delete()
        .eq("user_id", userId)
        .in("statut", ["DRAFT", "ANALYZING", "NEEDS_REVIEW", "FAILED"])
        .select("id");
      deleted.draftAds = data?.length ?? 0;
    }

    if (input.deleteImports) {
      const { data: batches } = await supabase
        .from("product_import_batches")
        .delete()
        .eq("user_id", userId)
        .select("id");
      deleted.importBatches = batches?.length ?? 0;

      const { data: urls } = await supabase
        .from("url_imports")
        .delete()
        .eq("user_id", userId)
        .select("id");
      deleted.urlImports = urls?.length ?? 0;
    }

    if (input.deleteAnalyzed) {
      const { data } = await supabase
        .from("analyzed_products")
        .delete()
        .eq("user_id", userId)
        .select("id");
      deleted.analyzedProducts = data?.length ?? 0;
    }

    if (input.deleteOrphanImages) {
      const { data: images } = await supabase
        .from("ad_images")
        .select("id, ad_id")
        .eq("user_id", userId);
      const adIds = [
        ...new Set((images ?? []).map((i) => i.ad_id).filter(Boolean)),
      ] as string[];
      if (adIds.length) {
        const { data: existingAds } = await supabase
          .from("ads")
          .select("id")
          .eq("user_id", userId)
          .in("id", adIds);
        const existing = new Set((existingAds ?? []).map((a) => a.id));
        const orphanIds = (images ?? [])
          .filter((i) => !existing.has(i.ad_id))
          .map((i) => i.id);
        if (orphanIds.length) {
          const { data } = await supabase
            .from("ad_images")
            .delete()
            .eq("user_id", userId)
            .in("id", orphanIds)
            .select("id");
          deleted.orphanImages = data?.length ?? 0;
        } else {
          deleted.orphanImages = 0;
        }
      } else {
        deleted.orphanImages = 0;
      }
    }

    if (input.disconnectEbay) {
      const { data } = await supabase
        .from("ebay_accounts")
        .update({ est_actif: false })
        .eq("user_id", userId)
        .select("id");
      deleted.ebayAccountsDeactivated = data?.length ?? 0;
    }

    return { success: true, data: { deleted } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Échec du nettoyage.",
    };
  }
}
