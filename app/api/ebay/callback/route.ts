import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeAuthorizationCode,
  hashState,
  parseOAuthState,
} from "@/services/ebay/oauth";
import { getEbayApiUrl, isEbayMockMode } from "@/services/ebay/client";
import { ebayOAuthCallbackSchema } from "@/lib/validation/schemas";

const OAUTH_STATE_COOKIE = "ebay_oauth_state";

const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
];

function getAppUrl(request: Request): string {
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

async function resolveEbayUser(
  accessToken: string,
  fallbackUserId: string,
): Promise<{ ebayUserId: string; displayName: string | null }> {
  if (isEbayMockMode()) {
    return {
      ebayUserId: `mock-${fallbackUserId.slice(0, 8)}`,
      displayName: "Compte eBay (test)",
    };
  }

  try {
    const response = await fetch(
      `${getEbayApiUrl()}/commerce/identity/v1/user/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) {
      const data = (await response.json()) as {
        userId?: string;
        username?: string;
      };
      const ebayUserId = data.userId || data.username;
      if (ebayUserId) {
        return {
          ebayUserId,
          displayName: data.username ?? data.userId ?? null,
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    ebayUserId: `ebay-${fallbackUserId.slice(0, 8)}`,
    displayName: null,
  };
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

    const sessionClient = await createClient();
    const {
      data: { user: sessionUser },
    } = await sessionClient.auth.getUser();

    if (sessionUser && sessionUser.id !== userId) {
      throw AppError.validation(
        "Session utilisateur différente de la demande eBay. Reconnectez-vous puis réessayez.",
      );
    }

    const tokens = await exchangeAuthorizationCode(code);
    const { ebayUserId, displayName } = await resolveEbayUser(
      tokens.accessToken,
      userId,
    );

    let accessEncrypted: string;
    let refreshEncrypted: string;
    try {
      accessEncrypted = encrypt(tokens.accessToken);
      // Colonne NOT NULL côté Supabase distant.
      refreshEncrypted = encrypt(tokens.refreshToken || "");
    } catch (encryptError) {
      throw AppError.internal(
        encryptError instanceof Error
          ? encryptError.message
          : "ENCRYPTION_KEY manquante ou invalide",
        encryptError,
      );
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        email: sessionUser?.email ?? null,
      });
      if (profileError) {
        throw AppError.internal(
          `Impossible de préparer le profil: ${profileError.message}`,
          profileError,
        );
      }
    }

    const accountPayload = {
      user_id: userId,
      ebay_user_id: displayName || ebayUserId,
      marketplace: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
      access_token_encrypted: accessEncrypted,
      refresh_token_encrypted: refreshEncrypted,
      token_expires_at: tokens.expiresAt.toISOString(),
      scopes: EBAY_SCOPES,
      is_active: true,
      connected_at: now,
      updated_at: now,
    };

    const { data: existing } = await admin
      .from("ebay_accounts")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("ebay_accounts")
        .update(accountPayload)
        .eq("id", existing.id)
        .eq("user_id", userId);

      if (updateError) {
        throw AppError.internal(
          `Impossible de mettre à jour le compte eBay: ${updateError.message}`,
          updateError,
        );
      }
    } else {
      const { error: insertError } = await admin
        .from("ebay_accounts")
        .insert(accountPayload);

      if (insertError) {
        throw AppError.internal(
          `Impossible de créer le compte eBay: ${insertError.message}`,
          insertError,
        );
      }
    }

    // Sandbox : prépare politiques + lieu automatiquement (idempotent).
    // Production : réutilise uniquement l’existant Seller Hub.
    try {
      const { EbayClient } = await import("@/services/ebay/client");
      const { ensureSellerDefaults } = await import(
        "@/services/ebay/sandbox-setup"
      );
      const client = new EbayClient({ accessToken: tokens.accessToken });
      const setup = await ensureSellerDefaults(client, {
        allowCreate: process.env.EBAY_ENVIRONMENT !== "production",
      });
      await admin.from("user_settings").upsert(
        {
          user_id: userId,
          marche_ebay: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR",
          politique_expedition_par_defaut: setup.fulfillmentPolicyId,
          politique_paiement_par_defaut: setup.paymentPolicyId,
          politique_retour_par_defaut: setup.returnPolicyId,
          lieu_expedition_par_defaut: setup.merchantLocationKey,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
    } catch (setupError) {
      console.error("[ebay/callback] seller setup", setupError);
      // La connexion reste valide même si le setup policies échoue.
    }

    return redirectToEbay(appUrl, { connected: "true" });
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erreur lors de la connexion eBay.";

    console.error("[ebay/callback]", message, error);
    return redirectToEbay(appUrl, {
      error: message.slice(0, 240),
    });
  }
}
