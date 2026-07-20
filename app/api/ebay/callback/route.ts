import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeAuthorizationCode,
  hashState,
  parseOAuthState,
} from "@/services/ebay/oauth";
import { isEbayMockMode } from "@/services/ebay/client";
import { ebayOAuthCallbackSchema } from "@/lib/validation/schemas";

const OAUTH_STATE_COOKIE = "ebay_oauth_state";

function getAppUrl(request: Request): string {
  // Toujours privilégier l'origine réelle de la requête OAuth
  // (évite les placeholders type ton-domaine-vercel.vercel.app).
  const origin = new URL(request.url).origin;
  if (origin && !origin.includes("localhost")) {
    return origin;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return configured ?? "http://localhost:3000";
}

function redirectToEbay(
  appUrl: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/ebay", appUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const appUrl = getAppUrl(request);
  const cookieStore = await cookies();

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    if (errorParam) {
      cookieStore.delete(OAUTH_STATE_COOKIE);
      return redirectToEbay(appUrl, { error: errorParam });
    }

    if (!code || !state) {
      throw AppError.validation("Paramètres OAuth manquants.");
    }

    ebayOAuthCallbackSchema.parse({ code, state });

    const expectedHash = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
    if (!expectedHash || expectedHash !== hashState(state)) {
      throw AppError.validation("État OAuth invalide ou expiré.");
    }

    const { workspaceId: userId } = parseOAuthState(state);
    cookieStore.delete(OAUTH_STATE_COOKIE);

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
        throw AppError.internal(
          "Impossible de créer le compte eBay.",
          accountError,
        );
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
      throw AppError.internal(
        "Impossible d'enregistrer les jetons eBay.",
        tokenError,
      );
    }

    return redirectToEbay(appUrl, { connected: "true" });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Erreur lors de la connexion eBay.";

    return redirectToEbay(appUrl, { error: message });
  }
}
