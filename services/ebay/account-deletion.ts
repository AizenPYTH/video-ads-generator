/**
 * eBay Marketplace Account Deletion — challenge + signature helpers.
 * Spec: https://developer.ebay.com/marketplace-account-deletion
 * Compatible with event-notification-nodejs-sdk algorithm.
 */

import { createHash, createVerify, createHmac } from "crypto";
import { getEbayApiUrl } from "@/services/ebay/client";

const PUBLIC_KEY_CACHE = new Map<
  string,
  { key: string; algorithm: string; expiresAt: number }
>();

export function getDeletionVerificationToken(): string {
  const token = process.env.EBAY_DELETION_VERIFICATION_TOKEN?.trim();
  if (!token) {
    throw new Error("EBAY_DELETION_VERIFICATION_TOKEN is not configured");
  }
  return token;
}

/** Canonical endpoint URL exactly as registered in the eBay portal. */
export function getDeletionEndpointUrl(): string {
  const configured = process.env.EBAY_DELETION_ENDPOINT_URL?.trim();
  if (configured) return configured;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (appUrl) {
    return `${appUrl}/api/ebay/account-deletion`;
  }

  throw new Error("EBAY_DELETION_ENDPOINT_URL is not configured");
}

/**
 * challengeResponse = hex(SHA-256(challengeCode + verificationToken + endpoint))
 * Order and concatenation must be exact (no separators).
 */
export function buildChallengeResponse(challengeCode: string): string {
  const verificationToken = getDeletionVerificationToken();
  const endpoint = getDeletionEndpointUrl();

  const hash = createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpoint);
  return hash.digest("hex");
}

export type EbaySignatureHeader = {
  alg?: string;
  kid: string;
  signature: string;
  digest?: string;
};

export function decodeEbaySignatureHeader(
  headerValue: string,
): EbaySignatureHeader {
  const json = Buffer.from(headerValue, "base64").toString("utf8");
  const parsed = JSON.parse(json) as EbaySignatureHeader;
  if (!parsed?.kid || !parsed?.signature) {
    throw new Error("Invalid x-ebay-signature payload");
  }
  return parsed;
}

function formatPublicKey(key: string): string {
  const start = "-----BEGIN PUBLIC KEY-----";
  const end = "-----END PUBLIC KEY-----";
  let formatted = key.trim();
  if (!formatted.includes(start)) {
    formatted = `${start}\n${formatted}`;
  }
  if (!formatted.includes(end)) {
    formatted = `${formatted}\n${end}`;
  }
  return formatted
    .replace(/-----BEGIN PUBLIC KEY-----\s*/, `${start}\n`)
    .replace(/\s*-----END PUBLIC KEY-----/, `\n${end}`);
}

async function getApplicationAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET missing for public key fetch");
  }

  const tokenUrl = `${getEbayApiUrl().replace(/\/$/, "")}/identity/v1/oauth2/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain eBay app token (HTTP ${response.status})`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("eBay app token response missing access_token");
  }
  return data.access_token;
}

async function fetchPublicKey(keyId: string): Promise<{
  key: string;
  algorithm: string;
}> {
  const cached = PUBLIC_KEY_CACHE.get(keyId);
  if (cached && cached.expiresAt > Date.now()) {
    return { key: cached.key, algorithm: cached.algorithm };
  }

  const appToken = await getApplicationAccessToken();
  const uri = `${getEbayApiUrl().replace(/\/$/, "")}/commerce/notification/v1/public_key/${encodeURIComponent(keyId)}`;
  const response = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Public key retrieval failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as {
    key?: string;
    algorithm?: string;
  };
  if (!data.key) {
    throw new Error("Public key payload missing key");
  }

  const algorithm = data.algorithm ?? "ECDSA";
  PUBLIC_KEY_CACHE.set(keyId, {
    key: data.key,
    algorithm,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  return { key: data.key, algorithm };
}

/**
 * Verify x-ebay-signature against the raw request body.
 * Returns false on invalid signature (caller should respond 412).
 */
export async function verifyEbayNotificationSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  // Test / local bypass only — never in production without explicit flag
  if (
    process.env.EBAY_DELETION_SKIP_SIGNATURE === "true" &&
    process.env.EBAY_ENVIRONMENT !== "production"
  ) {
    return true;
  }

  if (!signatureHeader?.trim()) return false;

  try {
    const decoded = decodeEbaySignatureHeader(signatureHeader);
    const publicKey = await fetchPublicKey(decoded.kid);
    const pem = formatPublicKey(publicKey.key);

    // Official SDK uses ssl3-sha1 with JSON.stringify(message).
    // We verify the raw body first (preferred), then fall back to
    // re-stringified JSON for SDK compatibility.
    const bodyString =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    const tryVerify = (payload: string): boolean => {
      // Prefer SHA256 for modern keys; also try ssl3-sha1 like the SDK
      for (const algo of ["SHA256", "ssl3-sha1", "RSA-SHA1"] as const) {
        try {
          const verifier = createVerify(algo);
          verifier.update(payload);
          if (verifier.verify(pem, decoded.signature, "base64")) {
            return true;
          }
        } catch {
          /* try next algorithm */
        }
      }
      return false;
    };

    if (tryVerify(bodyString)) return true;

    try {
      const parsed = JSON.parse(bodyString) as unknown;
      if (tryVerify(JSON.stringify(parsed))) return true;
    } catch {
      /* ignore */
    }

    return false;
  } catch (err) {
    console.error("[ebay-deletion] signature verification error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

export function hashSensitive(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHmac("sha256", "ebay-deletion-pseudonym")
    .update(value)
    .digest("hex")
    .slice(0, 32);
}

/** Clear public key cache (tests). */
export function clearPublicKeyCache(): void {
  PUBLIC_KEY_CACHE.clear();
}
