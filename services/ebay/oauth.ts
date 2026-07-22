import { createHash, randomBytes } from "crypto";
import { AppError } from "@/lib/errors/app-error";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEbayMockMode, resolveEbayApiHost } from "./client";
import { mockOAuthTokens } from "./mock";

export interface EbayTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/** Nettoie les secrets Vercel (guillemets, espaces, retours ligne). */
function sanitizeEnv(value: string | undefined | null): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "").trim();
}

function getEbayAuthUrl(): string {
  const configured = sanitizeEnv(process.env.EBAY_AUTH_URL);
  if (configured) {
    // Ne jamais utiliser l'URL API pour l'authorize (et inversement).
    if (configured.includes("api.")) {
      return resolveEbayApiHost().includes("sandbox")
        ? "https://auth.sandbox.ebay.com"
        : "https://auth.ebay.com";
    }
    return configured.replace(/\/$/, "");
  }

  return resolveEbayApiHost().includes("sandbox")
    ? "https://auth.sandbox.ebay.com"
    : "https://auth.ebay.com";
}

function tokenUrlForHost(apiHost: string): string {
  return `${apiHost.replace(/\/$/, "")}/identity/v1/oauth2/token`;
}

/** Endpoints token à essayer (alignés sur les credentials). */
function candidateTokenUrls(): string[] {
  const host = resolveEbayApiHost();
  const primary = tokenUrlForHost(host);
  const alternate = host.includes("sandbox")
    ? "https://api.ebay.com/identity/v1/oauth2/token"
    : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";
  return [...new Set([primary, alternate])];
}

function getClientCredentials() {
  const clientId = sanitizeEnv(process.env.EBAY_CLIENT_ID);
  const clientSecret = sanitizeEnv(process.env.EBAY_CLIENT_SECRET);
  const ruName = sanitizeEnv(process.env.EBAY_RUNAME);

  if (!clientId || !clientSecret || !ruName) {
    throw AppError.internal("eBay OAuth credentials are not configured");
  }

  return { clientId, clientSecret, ruName };
}

export function generateOAuthState(workspaceId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${workspaceId}:${nonce}:${Date.now()}`;
  return Buffer.from(payload).toString("base64url");
}

export function parseOAuthState(state: string): { workspaceId: string } {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [workspaceId] = decoded.split(":");
    if (!workspaceId) {
      throw new Error("Missing workspace ID");
    }
    return { workspaceId };
  } catch {
    throw AppError.validation("Invalid OAuth state parameter");
  }
}

export function getEbayAuthorizationUrl(state: string): string {
  const { clientId, ruName } = getClientCredentials();
  const scopes = [
    "https://api.ebay.com/oauth/api_scope",
    "https://api.ebay.com/oauth/api_scope/sell.inventory",
    "https://api.ebay.com/oauth/api_scope/sell.account",
    "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
  ];

  const url = new URL(`${getEbayAuthUrl()}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", ruName);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

async function exchangeTokenAtUrl(
  tokenUrl: string,
  params: Record<string, string>,
  clientId: string,
  clientSecret: string,
): Promise<
  | { ok: true; data: { access_token: string; refresh_token: string; expires_in: number } }
  | { ok: false; status: number; body: string }
> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  const errorBody = await response.text();
  if (!response.ok) {
    return { ok: false, status: response.status, body: errorBody };
  }

  try {
    const data = JSON.parse(errorBody) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return { ok: true, data };
  } catch {
    return { ok: false, status: response.status, body: errorBody };
  }
}

async function exchangeToken(
  params: Record<string, string>,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  if (isEbayMockMode()) {
    return mockOAuthTokens;
  }

  const { clientId, clientSecret } = getClientCredentials();
  const urls = candidateTokenUrls();
  let lastBody = "";
  let lastStatus = 0;

  for (const tokenUrl of urls) {
    const result = await exchangeTokenAtUrl(
      tokenUrl,
      params,
      clientId,
      clientSecret,
    );
    if (result.ok) {
      console.info("[ebay-oauth] token exchange ok", {
        host: tokenUrl.includes("sandbox") ? "sandbox" : "production",
        grant: params.grant_type,
        clientPrefix: clientId.slice(0, 16),
      });
      return result.data;
    }

    lastBody = result.body;
    lastStatus = result.status;
    console.warn("[ebay-oauth] token exchange failed", {
      host: tokenUrl.includes("sandbox") ? "sandbox" : "production",
      status: result.status,
      grant: params.grant_type,
      clientPrefix: clientId.slice(0, 16),
      body: result.body.slice(0, 160),
    });

    // invalid_client → essayer l'autre environnement ; invalid_grant → inutile
    if (!/invalid_client/i.test(result.body)) {
      break;
    }
  }

  if (/invalid_client/i.test(lastBody)) {
    throw AppError.internal(
      "eBay token exchange failed: invalid_client — vérifiez EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_ENVIRONMENT (sandbox vs production) sur Vercel, puis reconnectez le compte eBay.",
    );
  }

  if (/invalid_grant/i.test(lastBody)) {
    throw AppError.internal(
      "eBay token expiré ou invalide — reconnectez votre compte eBay dans Paramètres / eBay.",
    );
  }

  throw AppError.internal(
    `eBay token exchange failed (HTTP ${lastStatus}): ${lastBody.slice(0, 200)}`,
  );
}

export async function exchangeAuthorizationCode(
  code: string,
): Promise<EbayTokens> {
  const { ruName } = getClientCredentials();

  const data = await exchangeToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: ruName,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<EbayTokens> {
  const data = await exchangeToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function storeEbayTokens(
  workspaceId: string,
  tokens: EbayTokens,
): Promise<void> {
  const supabase = createAdminClient();

  const payload = {
    access_token_encrypted: encrypt(tokens.accessToken),
    refresh_token_encrypted: encrypt(tokens.refreshToken || ""),
    token_expires_at: tokens.expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  // Ne pas filtrer is_active=true : sinon le refresh échoue silencieusement
  // si la ligne a été désactivée / schéma hybride.
  const { error, count } = await supabase
    .from("ebay_accounts")
    .update(payload, { count: "exact" })
    .eq("user_id", workspaceId);

  if (error) {
    throw AppError.internal("Failed to store eBay tokens", error);
  }
  if (count === 0) {
    // Fallback : tenter avec is_active si aucune ligne touchée
    const { error: err2 } = await supabase
      .from("ebay_accounts")
      .update(payload)
      .eq("user_id", workspaceId)
      .eq("is_active", true);
    if (err2) {
      throw AppError.internal("Failed to store eBay tokens", err2);
    }
  }
}

export async function getEbayTokens(workspaceId: string): Promise<EbayTokens | null> {
  const supabase = createAdminClient();

  let { data, error } = await supabase
    .from("ebay_accounts")
    .select(
      "access_token_encrypted, refresh_token_encrypted, token_expires_at, is_active",
    )
    .eq("user_id", workspaceId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  // Fallback sans filtre is_active (schémas / comptes désynchronisés)
  if (error || !data?.access_token_encrypted) {
    const fallback = await supabase
      .from("ebay_accounts")
      .select(
        "access_token_encrypted, refresh_token_encrypted, token_expires_at, is_active",
      )
      .eq("user_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data?.access_token_encrypted) {
    return null;
  }

  const expiresAt = new Date(data.token_expires_at);
  const accessToken = decrypt(data.access_token_encrypted);
  let refreshToken = "";
  try {
    if (data.refresh_token_encrypted) {
      refreshToken = decrypt(data.refresh_token_encrypted);
    }
  } catch {
    refreshToken = "";
  }

  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    if (!refreshToken) return null;
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      await storeEbayTokens(workspaceId, refreshed);
      return refreshed;
    } catch (err) {
      console.error("[ebay-oauth] refresh failed", {
        message: err instanceof Error ? err.message : "refresh_error",
      });
      throw err;
    }
  }

  return { accessToken, refreshToken, expiresAt };
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}
