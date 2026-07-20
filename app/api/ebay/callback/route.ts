import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeAuthorizationCode,
  parseOAuthState,
} from "@/services/ebay/oauth";
import { isEbayMockMode } from "@/services/ebay/client";
import { ebayOAuthCallbackSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectBase = `${appUrl}/dashboard/ebay`;

    if (errorParam) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent(errorParam)}`,
      );
    }

    if (!code || !state) {
      throw AppError.validation("Paramètres OAuth manquants.");
    }

    ebayOAuthCallbackSchema.parse({ code, state });
    const { workspaceId: userId } = parseOAuthState(state);

    const tokens = await exchangeAuthorizationCode(code);
    const supabase = await createClient();

    const ebayUserId = isEbayMockMode()
      ? `mock-${userId.slice(0, 8)}`
      : userId;

    const { data: existingAccount } = await supabase
      .from("ebay_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("ebay_user_id", ebayUserId)
      .maybeSingle();

    let accountId = existingAccount?.id;

    if (!accountId) {
      const { data: newAccount, error: accountError } = await supabase
        .from("ebay_accounts")
        .insert({
          user_id: userId,
          ebay_user_id: ebayUserId,
          nom_compte: isEbayMockMode() ? "Compte eBay (test)" : null,
          marche: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
          est_actif: true,
        })
        .select("id")
        .single();

      if (accountError || !newAccount) {
        throw AppError.internal("Impossible de créer le compte eBay.", accountError);
      }
      accountId = newAccount.id;
    } else {
      await supabase
        .from("ebay_accounts")
        .update({ est_actif: true, updated_at: new Date().toISOString() })
        .eq("id", accountId);
    }

    const { error: tokenError } = await supabase.from("ebay_tokens").upsert(
      {
        user_id: userId,
        ebay_account_id: accountId,
        access_token: encrypt(tokens.accessToken),
        refresh_token: tokens.refreshToken
          ? encrypt(tokens.refreshToken)
          : null,
        expires_at: tokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ebay_account_id" },
    );

    if (tokenError) {
      throw AppError.internal("Impossible d'enregistrer les jetons eBay.", tokenError);
    }

    return NextResponse.redirect(`${redirectBase}?connected=true`);
  } catch (error) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const message =
      error instanceof AppError
        ? error.message
        : "Erreur lors de la connexion eBay.";

    return NextResponse.redirect(
      `${appUrl}/dashboard/ebay?error=${encodeURIComponent(message)}`,
    );
  }
}
