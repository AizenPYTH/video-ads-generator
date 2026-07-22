"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EbayClient } from "@/services/ebay/client";
import {
  generateOAuthState,
  getEbayAuthorizationUrl,
  getEbayTokens,
  hashState,
} from "@/services/ebay/oauth";
import { fetchEbayPolicies } from "@/services/ebay/policies";
import {
  ensureSellerDefaults,
  listMerchantLocations,
} from "@/services/ebay/sandbox-setup";
import { createMerchantLocation } from "@/services/ebay/locations";
import { AppError } from "@/lib/errors/app-error";

const OAUTH_STATE_COOKIE = "ebay_oauth_state";

export type EbayActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
};

export type EbayAccountSummary = {
  id: string;
  ebay_user_id: string;
  nom_compte: string | null;
  marche: string;
  est_actif: boolean;
};

export type EbayPolicyOption = { id: string; name: string };

export type EbaySetupOptions = {
  fulfillment: EbayPolicyOption[];
  payment: EbayPolicyOption[];
  returns: EbayPolicyOption[];
  locations: EbayPolicyOption[];
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

async function getActiveEbayAccessToken(userId: string): Promise<string> {
  const tokens = await getEbayTokens(userId);
  if (!tokens?.accessToken) {
    throw AppError.validation(
      "Votre connexion eBay a expiré. Reconnectez votre compte pour continuer.",
    );
  }
  return tokens.accessToken;
}

export async function connectEbay(): Promise<void> {
  const userId = await requireUserId();
  const state = generateOAuthState(userId);
  const authUrl = getEbayAuthorizationUrl(state);

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE, hashState(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect(authUrl);
}

export async function disconnectEbay(
  accountId: string,
): Promise<EbayActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("ebay_accounts")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) {
      return {
        error: `Impossible de déconnecter le compte eBay: ${error.message}`,
      };
    }

    revalidatePath("/dashboard/ebay");
    revalidatePath("/settings/ebay");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function saveEbaySettings(input: {
  politique_expedition_par_defaut?: string | null;
  politique_retour_par_defaut?: string | null;
  politique_paiement_par_defaut?: string | null;
  lieu_expedition_par_defaut?: string | null;
  marche_ebay?: string;
}): Promise<EbayActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return { error: "Impossible de sauvegarder les paramètres eBay." };
    }

    revalidatePath("/dashboard/ebay");
    revalidatePath("/settings/ebay");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getEbayAccounts(): Promise<
  EbayActionResult<EbayAccountSummary[]>
> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ebay_accounts")
      .select("id, ebay_user_id, marketplace, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      return {
        error: `Impossible de récupérer les comptes eBay: ${error.message}`,
      };
    }

    const mapped: EbayAccountSummary[] = (data ?? []).map((row) => ({
      id: row.id,
      ebay_user_id: row.ebay_user_id,
      nom_compte: row.ebay_user_id,
      marche: row.marketplace ?? "EBAY_FR",
      est_actif: row.is_active ?? true,
    }));

    return { success: true, data: mapped };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getEbaySetupOptions(): Promise<
  EbayActionResult<EbaySetupOptions>
> {
  try {
    const userId = await requireUserId();
    const accessToken = await getActiveEbayAccessToken(userId);
    const client = new EbayClient({ accessToken });

    const [policies, locations] = await Promise.all([
      fetchEbayPolicies(client),
      listMerchantLocations(client),
    ]);

    return {
      success: true,
      data: {
        fulfillment: policies.fulfillment.map((p) => ({
          id: p.id,
          name: p.name,
        })),
        payment: policies.payment.map((p) => ({ id: p.id, name: p.name })),
        returns: policies.returns.map((p) => ({ id: p.id, name: p.name })),
        locations: locations.map((loc) => ({
          id: loc.key,
          name: `${loc.name} (${loc.key})`,
        })),
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur inconnue.",
      data: { fulfillment: [], payment: [], returns: [], locations: [] },
    };
  }
}

export async function createEbayInventoryLocation(input: {
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country?: string;
}): Promise<EbayActionResult<{ key: string; name: string }>> {
  try {
    const userId = await requireUserId();
    const accessToken = await getActiveEbayAccessToken(userId);
    const client = new EbayClient({ accessToken });

    const created = await createMerchantLocation(client, input);

    const supabase = await createClient();
    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        lieu_expedition_par_defaut: created.key,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    revalidatePath("/dashboard/ebay");

    return {
      success: true,
      data: { key: created.key, name: created.name },
    };
  } catch (err) {
    if (err instanceof AppError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function ensureEbaySellerSetup(): Promise<
  EbayActionResult<{
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
    merchantLocationKey: string;
    options: EbaySetupOptions;
  }>
> {
  try {
    const userId = await requireUserId();
    const accessToken = await getActiveEbayAccessToken(userId);
    const client = new EbayClient({ accessToken });

    const result = await ensureSellerDefaults(client, {
      allowCreate: process.env.EBAY_ENVIRONMENT !== "production",
    });

    const supabase = await createClient();
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        marche_ebay: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
        politique_expedition_par_defaut: result.fulfillmentPolicyId,
        politique_paiement_par_defaut: result.paymentPolicyId,
        politique_retour_par_defaut: result.returnPolicyId,
        lieu_expedition_par_defaut: result.merchantLocationKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return {
        error: `Setup eBay OK, mais enregistrement local échoué: ${error.message}`,
      };
    }

    const locations = await listMerchantLocations(client);
    revalidatePath("/dashboard/ebay");

    return {
      success: true,
      data: {
        fulfillmentPolicyId: result.fulfillmentPolicyId,
        paymentPolicyId: result.paymentPolicyId,
        returnPolicyId: result.returnPolicyId,
        merchantLocationKey: result.merchantLocationKey,
        options: {
          fulfillment: result.policies.fulfillment.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          payment: result.policies.payment.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          returns: result.policies.returns.map((p) => ({
            id: p.id,
            name: p.name,
          })),
          locations: locations.map((loc) => ({
            id: loc.key,
            name: `${loc.name} (${loc.key})`,
          })),
        },
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

