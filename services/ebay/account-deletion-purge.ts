/**
 * Purge / anonymize eBay-linked data after a verified MARKETPLACE_ACCOUNT_DELETION.
 *
 * Deleted:
 * - ebay_accounts row (tokens cascade / wiped)
 * - ebay_tokens for that account
 * - ebay_policies / ebay_locations for that account
 * - ebay_publication_attempts linked to that account
 *
 * Anonymized:
 * - listing_publications.ebay_account_id → null
 * - ads.metadata ebay_* identity fields cleared
 * - user_settings default policy IDs if they only belonged to this connection
 *
 * Retained (business records, not eBay PII):
 * - Smart Seller ads content (title, price, images owned by the seller app user)
 * - listing_publications history with listing IDs anonymized of personal account link
 * - billing / subscription data unrelated to eBay identity
 */

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashSensitive } from "@/services/ebay/account-deletion";

export type DeletionNotificationData = {
  username?: string | null;
  userId?: string | null;
  eiasToken?: string | null;
};

export type PurgeResult = {
  status: "processed" | "not_found" | "ambiguous" | "failed";
  summary: Record<string, unknown>;
  error?: string;
  internalAccountId?: string;
  smartSellerUserId?: string;
};

function pseudonym(userId: string | null | undefined): string {
  return hashSensitive(userId) ?? "unknown";
}

export async function processAccountDeletion(
  data: DeletionNotificationData,
): Promise<PurgeResult> {
  const admin = createAdminClient();
  const ebayUserId = data.userId?.trim() || null;
  const ebayUsername = data.username?.trim() || null;

  try {
    let accounts:
      | Array<{
          id: string;
          user_id: string;
          ebay_user_id: string;
          nom_compte: string | null;
        }>
      | null = null;

    if (ebayUserId) {
      const { data: byId, error } = await admin
        .from("ebay_accounts")
        .select("id, user_id, ebay_user_id, nom_compte")
        .eq("ebay_user_id", ebayUserId);
      if (error) {
        return {
          status: "failed",
          summary: { step: "lookup_by_user_id" },
          error: "lookup_failed",
        };
      }
      accounts = byId;
    }

    if ((!accounts || accounts.length === 0) && ebayUsername) {
      const { data: byNom } = await admin
        .from("ebay_accounts")
        .select("id, user_id, ebay_user_id, nom_compte")
        .eq("nom_compte", ebayUsername);
      const { data: byIdFallback } = await admin
        .from("ebay_accounts")
        .select("id, user_id, ebay_user_id, nom_compte")
        .eq("ebay_user_id", ebayUsername);
      const merged = [...(byNom ?? []), ...(byIdFallback ?? [])];
      const seen = new Set<string>();
      accounts = merged.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
    }

    if (!accounts || accounts.length === 0) {
      console.info("[ebay-deletion] no matching account", {
        ebayUserPseudonym: pseudonym(ebayUserId),
      });
      return {
        status: "not_found",
        summary: {
          matched: 0,
          ebayUserPseudonym: pseudonym(ebayUserId),
        },
      };
    }

    const distinctUsers = new Set(accounts.map((a) => a.user_id));
    if (accounts.length > 1 && distinctUsers.size > 1) {
      console.error("[ebay-deletion] ambiguous match — refusing purge", {
        count: accounts.length,
        ebayUserPseudonym: pseudonym(ebayUserId),
      });
      return {
        status: "ambiguous",
        summary: {
          matched: accounts.length,
          distinctSmartSellerUsers: distinctUsers.size,
        },
      };
    }

    // Same Smart Seller user with multiple ebay_accounts rows → purge all matches
    const deletedAccounts: string[] = [];
    let policiesDeleted = 0;
    let locationsDeleted = 0;
    let tokensDeleted = 0;
    let publicationsUnlinked = 0;
    let adsAnonymized = 0;

    for (const account of accounts) {
      const accountId = account.id;
      const userId = account.user_id;

      // Wipe tokens on account row before delete (encrypted blobs)
      await admin
        .from("ebay_accounts")
        .update({
          access_token_encrypted: "",
          refresh_token_encrypted: "",
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      // Hybrid schema may also expose est_actif
      await admin
        .from("ebay_accounts")
        .update({
          est_actif: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      const { count: tokCount } = await admin
        .from("ebay_tokens")
        .delete({ count: "exact" })
        .eq("ebay_account_id", accountId);
      tokensDeleted += tokCount ?? 0;

      const { count: polCount } = await admin
        .from("ebay_policies")
        .delete({ count: "exact" })
        .eq("ebay_account_id", accountId);
      policiesDeleted += polCount ?? 0;

      const { count: locCount } = await admin
        .from("ebay_locations")
        .delete({ count: "exact" })
        .eq("ebay_account_id", accountId);
      locationsDeleted += locCount ?? 0;

      await admin
        .from("ebay_publication_attempts")
        .delete()
        .eq("ebay_account_id", accountId);

      const { count: pubCount } = await admin
        .from("listing_publications")
        .update(
          {
            ebay_account_id: null,
            updated_at: new Date().toISOString(),
          },
          { count: "exact" },
        )
        .eq("ebay_account_id", accountId);
      publicationsUnlinked += pubCount ?? 0;

      // Anonymize eBay identity fields in ads metadata for this Smart Seller user
      const { data: ads } = await admin
        .from("ads")
        .select("id, metadata")
        .eq("user_id", userId);

      for (const ad of ads ?? []) {
        const meta =
          ad.metadata && typeof ad.metadata === "object"
            ? { ...(ad.metadata as Record<string, unknown>) }
            : {};
        let changed = false;
        for (const key of [
          "ebay_user_id",
          "ebay_username",
          "ebay_account_id",
        ]) {
          if (key in meta) {
            delete meta[key];
            changed = true;
          }
        }
        if (changed) {
          await admin
            .from("ads")
            .update({
              metadata: {
                ...meta,
                ebay_account_deleted_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", ad.id);
          adsAnonymized += 1;
        }
      }

      // Clear cached default policy IDs for this user (eBay-specific)
      await admin
        .from("user_settings")
        .update({
          politique_expedition_par_defaut: null,
          politique_retour_par_defaut: null,
          politique_paiement_par_defaut: null,
          lieu_expedition_par_defaut: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      await admin.from("ebay_accounts").delete().eq("id", accountId);
      deletedAccounts.push(accountId);

      console.info("[ebay-deletion] purged account", {
        ebayUserPseudonym: pseudonym(ebayUserId),
        smartSellerUserPseudonym: createHash("sha256")
          .update(userId)
          .digest("hex")
          .slice(0, 12),
      });
    }

    return {
      status: "processed",
      internalAccountId: accounts[0]?.id,
      smartSellerUserId: accounts[0]?.user_id,
      summary: {
        accountsDeleted: deletedAccounts.length,
        tokensDeleted,
        policiesDeleted,
        locationsDeleted,
        publicationsUnlinked,
        adsAnonymized,
        ebayUserPseudonym: pseudonym(ebayUserId),
        eiasTokenHash: hashSensitive(data.eiasToken),
        note: "Smart Seller ad content retained; eBay PII and connection removed.",
      },
    };
  } catch (err) {
    console.error("[ebay-deletion] purge failed", {
      message: err instanceof Error ? err.message : "unknown",
      ebayUserPseudonym: pseudonym(ebayUserId),
    });
    return {
      status: "failed",
      summary: {},
      error: "purge_exception",
    };
  }
}
