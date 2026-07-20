"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  generateOAuthState,
  getEbayAuthorizationUrl,
} from "@/services/ebay/oauth";

export type EbayActionResult<T = void> = {
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

export async function connectEbay(): Promise<void> {
  const userId = await requireUserId();
  const state = generateOAuthState(userId);
  const authUrl = getEbayAuthorizationUrl(state);
  redirect(authUrl);
}

export async function disconnectEbay(
  accountId: string,
): Promise<EbayActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    await supabase
      .from("ebay_tokens")
      .delete()
      .eq("ebay_account_id", accountId)
      .eq("user_id", userId);

    const { error } = await supabase
      .from("ebay_accounts")
      .update({ est_actif: false })
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) {
      return { error: "Impossible de déconnecter le compte eBay." };
    }

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

    const { error } = await supabase
      .from("user_settings")
      .upsert(
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

    revalidatePath("/settings/ebay");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getEbayAccounts(): Promise<
  EbayActionResult<
    Array<{
      id: string;
      ebay_user_id: string;
      nom_compte: string | null;
      marche: string;
      est_actif: boolean;
    }>
  >
> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ebay_accounts")
      .select("id, ebay_user_id, nom_compte, marche, est_actif")
      .eq("user_id", userId)
      .eq("est_actif", true);

    if (error) {
      return { error: "Impossible de récupérer les comptes eBay." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
