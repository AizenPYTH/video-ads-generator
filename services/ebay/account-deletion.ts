/**
 * eBay Marketplace Account Deletion — challenge + signature helpers.
 * Spec: https://developer.ebay.com/marketplace-account-deletion
 * Signature verification mirrors event-notification-nodejs-sdk (ECC + ssl3-sha1).
 */

import { createRequire } from "module";
import path from "path";
import {
  createHash,
  createVerify,
  createHmac,
} from "crypto";

type SdkValidator = {
  validateSignature: (
    message: unknown,
    signatureHeader: string,
    config: Record<string, string>,
  ) => Promise<boolean>;
};

function loadSdkValidator(): SdkValidator | null {
  try {
    const req = createRequire(path.join(process.cwd(), "package.json"));
    return req("event-notification-nodejs-sdk/lib/validator") as SdkValidator;
  } catch {
    return null;
  }
}

/** Production Notification API — required for Production keyset compliance. */
export const EBAY_PRODUCTION_API_HOST = "https://api.ebay.com";
export const EBAY_PRODUCTION_PUBLIC_KEY_BASE =
  `${EBAY_PRODUCTION_API_HOST}/commerce/notification/v1/public_key/`;
/** Official SDK algorithm for ECC notification signatures. */
export const EBAY_NOTIFICATION_VERIFY_ALGORITHM = "ssl3-sha1";

const PUBLIC_KEY_CACHE = new Map<
  string,
  { key: string; algorithm: string; digest: string | null; expiresAt: number }
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

export type SignatureDiagnostics = {
  signatureHeaderPresent: boolean;
  signatureHeaderLength: number;
  rawBodyLength: number;
  contentType: string | null;
  keyId: string | null;
  publicKeyUrl: string | null;
  publicKeyHttpStatus: number | null;
  algorithm: string | null;
  digest: string | null;
  publicKeyLoaded: boolean;
  verificationResult: boolean;
  usedRawBody: boolean;
  usedSdkStringify: boolean;
  sdkUsed: boolean;
  apiHost: string;
  reason: string;
};

export type SignatureVerifyResult = {
  valid: boolean;
  /** 412 = bad signature; 500 = config/upstream failure (not a signature mismatch). */
  failureStatus: 412 | 500;
  diagnostics: SignatureDiagnostics;
};

function emptyDiagnostics(
  partial: Partial<SignatureDiagnostics> & { reason: string },
): SignatureDiagnostics {
  return {
    signatureHeaderPresent: false,
    signatureHeaderLength: 0,
    rawBodyLength: 0,
    contentType: null,
    keyId: null,
    publicKeyUrl: null,
    publicKeyHttpStatus: null,
    algorithm: null,
    digest: null,
    publicKeyLoaded: false,
    verificationResult: false,
    usedRawBody: false,
    usedSdkStringify: false,
    sdkUsed: false,
    apiHost: EBAY_PRODUCTION_API_HOST,
    ...partial,
  };
}

export function decodeEbaySignatureHeader(
  headerValue: string,
): EbaySignatureHeader {
  const json = Buffer.from(headerValue, "base64").toString("ascii");
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

async function getProductionApplicationAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("EBAY_CLIENT_ID / EBAY_CLIENT_SECRET missing for public key fetch");
  }

  const tokenUrl = `${EBAY_PRODUCTION_API_HOST}/identity/v1/oauth2/token`;
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

async function fetchProductionPublicKey(keyId: string): Promise<{
  key: string;
  algorithm: string;
  digest: string | null;
  httpStatus: number;
  url: string;
}> {
  const cached = PUBLIC_KEY_CACHE.get(keyId);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      key: cached.key,
      algorithm: cached.algorithm,
      digest: cached.digest,
      httpStatus: 200,
      url: `${EBAY_PRODUCTION_PUBLIC_KEY_BASE}${keyId}`,
    };
  }

  const appToken = await getProductionApplicationAccessToken();
  const uri = `${EBAY_PRODUCTION_PUBLIC_KEY_BASE}${encodeURIComponent(keyId)}`;
  const response = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw Object.assign(
      new Error(`Public key retrieval failed (HTTP ${response.status})`),
      { httpStatus: response.status, url: uri },
    );
  }

  const data = (await response.json()) as {
    key?: string;
    algorithm?: string;
    digest?: string;
  };
  if (!data.key) {
    throw Object.assign(new Error("Public key payload missing key"), {
      httpStatus: response.status,
      url: uri,
    });
  }

  const algorithm = data.algorithm ?? "ECDSA";
  const digest = data.digest ?? null;
  PUBLIC_KEY_CACHE.set(keyId, {
    key: data.key,
    algorithm,
    digest,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  return {
    key: data.key,
    algorithm,
    digest,
    httpStatus: response.status,
    url: uri,
  };
}

function verifyWithAlgorithm(
  pem: string,
  signatureBase64: string,
  payload: Buffer,
  algorithm: string,
): boolean {
  try {
    const verifier = createVerify(algorithm);
    verifier.update(payload);
    verifier.end();
    return verifier.verify(pem, signatureBase64, "base64");
  } catch {
    return false;
  }
}

/**
 * Verify x-ebay-signature using the official SDK algorithm (preferred)
 * plus a mirrored local path for diagnostics.
 *
 * Production Notification API is always used (never sandbox) for this compliance endpoint.
 */
export async function verifyEbayNotificationSignatureDetailed(
  rawBody: string,
  signatureHeader: string | null | undefined,
  contentType: string | null = null,
): Promise<SignatureVerifyResult> {
  const rawBodyLength = Buffer.byteLength(rawBody, "utf8");
  const baseDiag = {
    signatureHeaderPresent: Boolean(signatureHeader?.trim()),
    signatureHeaderLength: signatureHeader?.trim()?.length ?? 0,
    rawBodyLength,
    contentType,
    apiHost: EBAY_PRODUCTION_API_HOST,
  };

  // Test / local bypass only — never when EBAY_ENVIRONMENT=production
  if (
    process.env.EBAY_DELETION_SKIP_SIGNATURE === "true" &&
    process.env.EBAY_ENVIRONMENT !== "production"
  ) {
    return {
      valid: true,
      failureStatus: 412,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        verificationResult: true,
        reason: "skip_signature_non_production",
      }),
    };
  }

  if (!signatureHeader?.trim()) {
    return {
      valid: false,
      failureStatus: 412,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        reason: "missing_x_ebay_signature_header",
      }),
    };
  }

  let decoded: EbaySignatureHeader;
  try {
    decoded = decodeEbaySignatureHeader(signatureHeader.trim());
  } catch {
    return {
      valid: false,
      failureStatus: 412,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        reason: "signature_header_decode_failed",
      }),
    };
  }

  let parsedMessage: unknown;
  try {
    parsedMessage = JSON.parse(rawBody);
  } catch {
    return {
      valid: false,
      failureStatus: 412,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        keyId: decoded.kid,
        reason: "raw_body_json_parse_failed",
      }),
    };
  }

  // Official SDK path (PRODUCTION credentials + environment)
  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      valid: false,
      failureStatus: 500,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        keyId: decoded.kid,
        reason: "missing_ebay_client_credentials",
      }),
    };
  }

  try {
    const skipSdk =
      process.env.VITEST === "true" ||
      process.env.EBAY_DELETION_DISABLE_SDK === "true";
    const sdkValidator = skipSdk ? null : loadSdkValidator();
    if (sdkValidator) {
      const sdkOk = await sdkValidator.validateSignature(
        parsedMessage,
        signatureHeader.trim(),
        {
          clientId,
          clientSecret,
          environment: "PRODUCTION",
          redirectUri: process.env.EBAY_RUNAME?.trim() || "",
        },
      );

      if (sdkOk) {
        return {
          valid: true,
          failureStatus: 412,
          diagnostics: emptyDiagnostics({
            ...baseDiag,
            keyId: decoded.kid,
            publicKeyUrl: `${EBAY_PRODUCTION_PUBLIC_KEY_BASE}${decoded.kid}`,
            publicKeyHttpStatus: 200,
            publicKeyLoaded: true,
            verificationResult: true,
            usedSdkStringify: true,
            sdkUsed: true,
            algorithm: EBAY_NOTIFICATION_VERIFY_ALGORITHM,
            reason: "sdk_signature_valid",
          }),
        };
      }
    }
  } catch (err) {
    // Fall through to local path for diagnostics; may still succeed locally.
    console.warn("[ebay-deletion] sdk validateSignature error", {
      message: err instanceof Error ? err.message : "sdk_error",
      keyId: decoded.kid,
    });
  }

  // Local mirror of SDK (diagnostics + fallback)
  let publicKeyHttpStatus: number | null = null;
  let publicKeyUrl: string | null =
    `${EBAY_PRODUCTION_PUBLIC_KEY_BASE}${decoded.kid}`;
  let algorithm: string | null = null;
  let digest: string | null = null;
  let publicKeyLoaded = false;

  try {
    const publicKey = await fetchProductionPublicKey(decoded.kid);
    publicKeyHttpStatus = publicKey.httpStatus;
    publicKeyUrl = publicKey.url;
    algorithm = publicKey.algorithm;
    digest = publicKey.digest;
    publicKeyLoaded = true;

    const pem = formatPublicKey(publicKey.key);
    // Official SDK: verifier.update(JSON.stringify(message)) + ssl3-sha1
    const sdkPayload = Buffer.from(JSON.stringify(parsedMessage), "utf8");
    const rawPayload = Buffer.from(rawBody, "utf8");

    const algorithms = [
      EBAY_NOTIFICATION_VERIFY_ALGORITHM,
      "SHA1",
      "sha1",
    ] as const;

    for (const algo of algorithms) {
      if (verifyWithAlgorithm(pem, decoded.signature, sdkPayload, algo)) {
        return {
          valid: true,
          failureStatus: 412,
          diagnostics: emptyDiagnostics({
            ...baseDiag,
            keyId: decoded.kid,
            publicKeyUrl,
            publicKeyHttpStatus,
            algorithm: algo,
            digest,
            publicKeyLoaded,
            verificationResult: true,
            usedSdkStringify: true,
            usedRawBody: false,
            sdkUsed: false,
            reason: "local_signature_valid_sdk_stringify",
          }),
        };
      }
    }

    for (const algo of algorithms) {
      if (verifyWithAlgorithm(pem, decoded.signature, rawPayload, algo)) {
        return {
          valid: true,
          failureStatus: 412,
          diagnostics: emptyDiagnostics({
            ...baseDiag,
            keyId: decoded.kid,
            publicKeyUrl,
            publicKeyHttpStatus,
            algorithm: algo,
            digest,
            publicKeyLoaded,
            verificationResult: true,
            usedSdkStringify: false,
            usedRawBody: true,
            sdkUsed: false,
            reason: "local_signature_valid_raw_body",
          }),
        };
      }
    }

    return {
      valid: false,
      failureStatus: 412,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        keyId: decoded.kid,
        publicKeyUrl,
        publicKeyHttpStatus,
        algorithm: algorithm ?? EBAY_NOTIFICATION_VERIFY_ALGORITHM,
        digest,
        publicKeyLoaded,
        verificationResult: false,
        usedSdkStringify: true,
        usedRawBody: true,
        sdkUsed: false,
        reason: "signature_crypto_mismatch",
      }),
    };
  } catch (err) {
    const httpStatus =
      typeof err === "object" &&
      err &&
      "httpStatus" in err &&
      typeof (err as { httpStatus?: unknown }).httpStatus === "number"
        ? (err as { httpStatus: number }).httpStatus
        : null;
    const url =
      typeof err === "object" &&
      err &&
      "url" in err &&
      typeof (err as { url?: unknown }).url === "string"
        ? (err as { url: string }).url
        : publicKeyUrl;

    console.error("[ebay-deletion] signature verification error", {
      message: err instanceof Error ? err.message : "unknown",
      keyId: decoded.kid,
      publicKeyHttpStatus: httpStatus,
    });

    return {
      valid: false,
      failureStatus: httpStatus && httpStatus >= 400 ? 500 : 500,
      diagnostics: emptyDiagnostics({
        ...baseDiag,
        keyId: decoded.kid,
        publicKeyUrl: url,
        publicKeyHttpStatus: httpStatus,
        algorithm,
        digest,
        publicKeyLoaded,
        verificationResult: false,
        reason:
          httpStatus === 401 || httpStatus === 403
            ? "public_key_auth_failed_check_production_credentials"
            : httpStatus
              ? `public_key_http_${httpStatus}`
              : "public_key_or_token_fetch_failed",
      }),
    };
  }
}

/** Boolean helper for tests / simple callers. */
export async function verifyEbayNotificationSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
): Promise<boolean> {
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const result = await verifyEbayNotificationSignatureDetailed(
    body,
    signatureHeader,
  );
  return result.valid;
}

export function logSignatureDiagnostics(diagnostics: SignatureDiagnostics): void {
  console.info("[ebay-deletion] signature diagnostics", {
    signatureHeaderPresent: diagnostics.signatureHeaderPresent ? "yes" : "no",
    signatureHeaderLength: diagnostics.signatureHeaderLength,
    rawBodyLength: diagnostics.rawBodyLength,
    contentType: diagnostics.contentType,
    keyId: diagnostics.keyId,
    publicKeyUrl: diagnostics.publicKeyUrl,
    publicKeyHttpStatus: diagnostics.publicKeyHttpStatus,
    algorithm: diagnostics.algorithm,
    digest: diagnostics.digest,
    publicKeyLoaded: diagnostics.publicKeyLoaded ? "yes" : "no",
    verificationResult: diagnostics.verificationResult,
    usedRawBody: diagnostics.usedRawBody,
    usedSdkStringify: diagnostics.usedSdkStringify,
    sdkUsed: diagnostics.sdkUsed,
    apiHost: diagnostics.apiHost,
    reason: diagnostics.reason,
  });
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
