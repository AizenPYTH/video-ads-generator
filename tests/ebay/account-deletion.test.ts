import { createHash, createSign, generateKeyPairSync } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("eBay account deletion challenge + signature", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.EBAY_DELETION_VERIFICATION_TOKEN =
      "test-verification-token-32chars-min!!";
    process.env.EBAY_DELETION_ENDPOINT_URL =
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion";
    process.env.EBAY_ENVIRONMENT = "sandbox";
    process.env.EBAY_DELETION_SKIP_SIGNATURE = "false";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
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
    const wrong = createHash("sha256")
      .update("a+b+c")
      .digest("hex");
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

  it("rejects missing signature header", async () => {
    const { verifyEbayNotificationSignature } = await import(
      "@/services/ebay/account-deletion"
    );
    await expect(
      verifyEbayNotificationSignature("{}", null),
    ).resolves.toBe(false);
  });

  it("rejects invalid signature", async () => {
    const { verifyEbayNotificationSignature } = await import(
      "@/services/ebay/account-deletion"
    );
    const fakeHeader = Buffer.from(
      JSON.stringify({ kid: "kid-1", signature: "aaaa" }),
    ).toString("base64");

    // Mock fetch for public key + token to avoid network
    const { publicKey, privateKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    void privateKey;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        if (String(url).includes("/public_key/")) {
          return {
            ok: true,
            json: async () => ({
              key: publicKey
                .export({ type: "spki", format: "pem" })
                .toString()
                .replace(/-----BEGIN PUBLIC KEY-----/, "")
                .replace(/-----END PUBLIC KEY-----/, "")
                .replace(/\s+/g, ""),
              algorithm: "ECDSA",
            }),
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      }),
    );

    process.env.EBAY_CLIENT_ID = "id";
    process.env.EBAY_CLIENT_SECRET = "secret";
    process.env.EBAY_API_URL = "https://api.sandbox.ebay.com";

    const ok = await verifyEbayNotificationSignature(
      JSON.stringify({ hello: "world" }),
      fakeHeader,
    );
    expect(ok).toBe(false);
    vi.unstubAllGlobals();
  });

  it("accepts a correctly signed payload (SHA256)", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const body = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "n-1", data: { userId: "u1" } },
    });
    const signer = createSign("SHA256");
    signer.update(body);
    const signature = signer.sign(privateKey, "base64");
    const header = Buffer.from(
      JSON.stringify({ kid: "kid-test", signature, alg: "ECDSA" }),
    ).toString("base64");

    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const keyBody = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth2/token")) {
          return {
            ok: true,
            json: async () => ({ access_token: "app-token", expires_in: 7200 }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ key: keyBody, algorithm: "ECDSA" }),
        } as Response;
      }),
    );

    process.env.EBAY_CLIENT_ID = "id";
    process.env.EBAY_CLIENT_SECRET = "secret";
    process.env.EBAY_API_URL = "https://api.sandbox.ebay.com";
    vi.resetModules();

    const { verifyEbayNotificationSignature, clearPublicKeyCache } =
      await import("@/services/ebay/account-deletion");
    clearPublicKeyCache();

    await expect(
      verifyEbayNotificationSignature(body, header),
    ).resolves.toBe(true);
    vi.unstubAllGlobals();
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
