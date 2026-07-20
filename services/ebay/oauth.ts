import { createHash, randomBytes } from "crypto";
import { AppError } from "@/lib/errors/app-error";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEbayMockMode } from "./client";
import { mockOAuthTokens } from "./mock";

export interface EbayTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

function getEbayAuthUrl(): string {
  return (
    process.env.EBAY_AUTH_URL ??
    (process.env.EBAY_ENVIRONMENT === "production"
      ? "https://auth.ebay.com"
      : "https://auth.sandbox.ebay.com")
  );
}

function getClientCredentials() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const ruName = process.env.EBAY_RUNAME;

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
  ];

  const url = new URL(`${getEbayAuthUrl()}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", ruName);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

async function exchangeToken(
  params: Record<string, string>,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  if (isEbayMockMode()) {
    return mockOAuthTokens;
  }

  const { clientId, clientSecret } = getClientCredentials();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${getEbayAuthUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw AppError.internal(`eBay token exchange failed: ${errorBody}`);
  }

  return response.json();
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

  const { error } = await supabase.from("ebay_connections").upsert(
    {
      workspace_id: workspaceId,
      access_token_encrypted: encrypt(tokens.accessToken),
      refresh_token_encrypted: encrypt(tokens.refreshToken),
      expires_at: tokens.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );

  if (error) {
    throw AppError.internal("Failed to store eBay tokens", error);
  }
}

export async function getEbayTokens(workspaceId: string): Promise<EbayTokens | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ebay_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const expiresAt = new Date(data.expires_at);
  let accessToken = decrypt(data.access_token_encrypted);
  let refreshToken = decrypt(data.refresh_token_encrypted);

  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(refreshToken);
    await storeEbayTokens(workspaceId, refreshed);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    expiresAt.setTime(refreshed.expiresAt.getTime());
  }

  return { accessToken, refreshToken, expiresAt };
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}
