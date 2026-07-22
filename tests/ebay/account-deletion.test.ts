import { createHash, createSign, generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function pemToKeyBody(pem: string): string {
  return pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
}

function makeSignatureHeader(kid: string, signature: string): string {
  return Buffer.from(JSON.stringify({ kid, signature, alg: "ECDSA" })).toString(
    "base64",
  );
}

describe("eBay account deletion challenge + signature", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.EBAY_DELETION_VERIFICATION_TOKEN =
      "test-verification-token-32chars-min!!";
    process.env.EBAY_DELETION_ENDPOINT_URL =
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion";
    process.env.EBAY_ENVIRONMENT = "sandbox";
    process.env.EBAY_DELETION_SKIP_SIGNATURE = "false";
    process.env.EBAY_CLIENT_ID = "prod-client-id";
    process.env.EBAY_CLIENT_SECRET = "prod-client-secret";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("builds SHA-256 challengeResponse with exact concatenation order", async () => {
    const { buildChallengeResponse } = await import(
      "@/services/ebay/account-deletion"
    );
    const challengeCode = "abc123";
    const token = process.env.EBAY_DELETION_VERIFICATION_TOKEN!;
    const endpoint = process.env.EBAY_DELETION_ENDPOINT_URL!;
    const expected = createHash("sha256")
      .update(challengeCode)
      .update(token)
      .update(endpoint)
      .digest("hex");

    expect(buildChallengeResponse(challengeCode)).toBe(expected);
  });

  it("does not insert separators in the hash input", async () => {
    const { buildChallengeResponse } = await import(
      "@/services/ebay/account-deletion"
    );
    const wrong = createHash("sha256").update("a+b+c").digest("hex");
    process.env.EBAY_DELETION_VERIFICATION_TOKEN = "b";
    process.env.EBAY_DELETION_ENDPOINT_URL = "c";
    vi.resetModules();
    const { buildChallengeResponse: rebuild } = await import(
      "@/services/ebay/account-deletion"
    );
    expect(rebuild("a")).not.toBe(wrong);
    expect(rebuild("a")).toBe(
      createHash("sha256").update("a").update("b").update("c").digest("hex"),
    );
  });

  it("throws when verification token is missing", async () => {
    delete process.env.EBAY_DELETION_VERIFICATION_TOKEN;
    vi.resetModules();
    const { buildChallengeResponse } = await import(
      "@/services/ebay/account-deletion"
    );
    expect(() => buildChallengeResponse("x")).toThrow(
      /EBAY_DELETION_VERIFICATION_TOKEN/,
    );
  });

  it("uses configured endpoint URL exactly", async () => {
    process.env.EBAY_DELETION_ENDPOINT_URL =
      "https://example.com/api/ebay/account-deletion";
    vi.resetModules();
    const { getDeletionEndpointUrl } = await import(
      "@/services/ebay/account-deletion"
    );
    expect(getDeletionEndpointUrl()).toBe(
      "https://example.com/api/ebay/account-deletion",
    );
  });

  it("rejects missing signature header with reason", async () => {
    const { verifyEbayNotificationSignatureDetailed } = await import(
      "@/services/ebay/account-deletion"
    );
    const result = await verifyEbayNotificationSignatureDetailed("{}", null);
    expect(result.valid).toBe(false);
    expect(result.failureStatus).toBe(412);
    expect(result.diagnostics.reason).toBe("missing_x_ebay_signature_header");
    expect(result.diagnostics.signatureHeaderPresent).toBe(false);
  });

  it("calls Production getPublicKey URL never sandbox", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const message = {
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "n-1", data: { userId: "u1" } },
    };
    // Official SDK signs JSON.stringify(parsedMessage)
    const canonical = JSON.stringify(message);
    const signer = createSign("ssl3-sha1");
    signer.update(Buffer.from(canonical, "utf8"));
    const signature = signer.sign(privateKey, "base64");
    const header = makeSignatureHeader("kid-prod", signature);
    const keyBody = pemToKeyBody(
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    );

    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      expect(u.includes("api.sandbox.ebay.com")).toBe(false);
      if (u.includes("/oauth2/token")) {
        expect(u).toBe("https://api.ebay.com/identity/v1/oauth2/token");
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "app-token", expires_in: 7200 }),
        } as Response;
      }
      if (u.includes("/public_key/")) {
        expect(u.startsWith("https://api.ebay.com/commerce/notification/v1/public_key/")).toBe(
          true,
        );
        return {
          ok: true,
          status: 200,
          json: async () => ({
            key: keyBody,
            algorithm: "ECDSA",
            digest: "SHA1",
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    // Force SDK path to fail so local path exercises Production URLs
    vi.doMock("event-notification-nodejs-sdk/lib/validator", () => ({
      validateSignature: async () => false,
    }));
    vi.resetModules();

    const { verifyEbayNotificationSignatureDetailed, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    const result = await verifyEbayNotificationSignatureDetailed(
      canonical,
      header,
      "application/json",
    );
    expect(result.valid).toBe(true);
    expect(result.diagnostics.apiHost).toBe("https://api.ebay.com");
    expect(result.diagnostics.publicKeyUrl).toContain(
      "https://api.ebay.com/commerce/notification/v1/public_key/",
    );
    expect(result.diagnostics.keyId).toBe("kid-prod");
    expect(result.diagnostics.publicKeyLoaded).toBe(true);
  });

  it("accepts ECC signature over JSON.stringify(message) with ssl3-sha1", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const message = {
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "ecc-1", data: { userId: "u1" } },
    };
    const canonical = JSON.stringify(message);
    const signer = createSign("ssl3-sha1");
    signer.update(Buffer.from(canonical, "utf8"));
    const signature = signer.sign(privateKey, "base64");
    const header = makeSignatureHeader("kid-ecc", signature);
    const keyBody = pemToKeyBody(
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            key: keyBody,
            algorithm: "ECDSA",
            digest: "SHA1",
          }),
        } as Response;
      }),
    );

    vi.resetModules();
    const { verifyEbayNotificationSignatureDetailed, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    const result = await verifyEbayNotificationSignatureDetailed(
      canonical,
      header,
    );
    expect(result.valid).toBe(true);
    expect(result.diagnostics.verificationResult).toBe(true);
  });

  it("rejects when body is mutated after signing", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const message = { hello: "world" };
    const canonical = JSON.stringify(message);
    const signer = createSign("ssl3-sha1");
    signer.update(Buffer.from(canonical, "utf8"));
    const signature = signer.sign(privateKey, "base64");
    const header = makeSignatureHeader("kid-mut", signature);
    const keyBody = pemToKeyBody(
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ key: keyBody, algorithm: "ECDSA", digest: "SHA1" }),
        } as Response;
      }),
    );

    vi.resetModules();
    const { verifyEbayNotificationSignatureDetailed, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    const tampered = JSON.stringify({ hello: "TAMPERED" });
    const result = await verifyEbayNotificationSignatureDetailed(
      tampered,
      header,
    );
    expect(result.valid).toBe(false);
    expect(result.failureStatus).toBe(412);
    expect(result.diagnostics.reason).toBe("signature_crypto_mismatch");
  });

  it("returns 500-class failure when getPublicKey auth fails", async () => {
    const header = makeSignatureHeader("kid-bad", "aaaa");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        return { ok: false, status: 401, json: async () => ({}) } as Response;
      }),
    );

    vi.resetModules();
    const { verifyEbayNotificationSignatureDetailed, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    const result = await verifyEbayNotificationSignatureDetailed("{}", header);
    expect(result.valid).toBe(false);
    expect(result.failureStatus).toBe(500);
    expect(result.diagnostics.publicKeyHttpStatus).toBe(401);
    expect(result.diagnostics.reason).toContain("production_credentials");
  });

  it("rejects wrong keyId / invalid signature bytes", async () => {
    const { publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const header = makeSignatureHeader("wrong-kid", "not-a-real-signature");
    const keyBody = pemToKeyBody(
      publicKey.export({ type: "spki", format: "pem" }).toString(),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ key: keyBody, algorithm: "ECDSA" }),
        } as Response;
      }),
    );

    vi.resetModules();
    const { verifyEbayNotificationSignature, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    await expect(
      verifyEbayNotificationSignature(JSON.stringify({ a: 1 }), header),
    ).resolves.toBe(false);
  });
});

describe("account deletion purge matching", () => {
  it("returns not_found when no accounts match", async () => {
    const updates: unknown[] = [];
    const fakeAdmin = {
      from(table: string) {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ data: [], error: null });
              },
              or() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
          update() {
            updates.push(table);
            return {
              eq() {
                return Promise.resolve({ data: null, error: null, count: 0 });
              },
            };
          },
          delete() {
            return {
              eq() {
                return Promise.resolve({ count: 0, error: null });
              },
            };
          },
        };
      },
    };

    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => fakeAdmin,
    }));
    vi.resetModules();
    const { processAccountDeletion } = await import(
      "@/services/ebay/account-deletion-purge"
    );
    const result = await processAccountDeletion({
      userId: "missing-user",
      username: "nobody",
    });
    expect(result.status).toBe("not_found");
    vi.doUnmock("@/lib/supabase/admin");
  });

  it("refuses ambiguous matches across different Smart Seller users", async () => {
    const fakeAdmin = {
      from() {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: [
                    {
                      id: "a1",
                      user_id: "user-1",
                      ebay_user_id: "ebay-1",
                      nom_compte: null,
                    },
                    {
                      id: "a2",
                      user_id: "user-2",
                      ebay_user_id: "ebay-1",
                      nom_compte: null,
                    },
                  ],
                  error: null,
                });
              },
            };
          },
        };
      },
    };

    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => fakeAdmin,
    }));
    vi.resetModules();
    const { processAccountDeletion } = await import(
      "@/services/ebay/account-deletion-purge"
    );
    const result = await processAccountDeletion({ userId: "ebay-1" });
    expect(result.status).toBe("ambiguous");
    vi.doUnmock("@/lib/supabase/admin");
  });
});
