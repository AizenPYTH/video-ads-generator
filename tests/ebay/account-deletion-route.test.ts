import { createHash } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/ebay/account-deletion challenge", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    process.env.EBAY_DELETION_VERIFICATION_TOKEN =
      "unit-test-verification-token-value";
    process.env.EBAY_DELETION_ENDPOINT_URL =
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it("returns 400 when challenge_code is missing", async () => {
    const { GET } = await import("@/app/api/ebay/account-deletion/route");
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns challengeResponse for a valid challenge_code", async () => {
    const { GET } = await import("@/app/api/ebay/account-deletion/route");
    const code = "challenge-xyz";
    const req = new NextRequest(
      `https://snowolf-lime.vercel.app/api/ebay/account-deletion?challenge_code=${code}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { challengeResponse: string };
    const expected = createHash("sha256")
      .update(code)
      .update(process.env.EBAY_DELETION_VERIFICATION_TOKEN!)
      .update(process.env.EBAY_DELETION_ENDPOINT_URL!)
      .digest("hex");
    expect(body.challengeResponse).toBe(expected);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("returns 500 when token env is missing", async () => {
    delete process.env.EBAY_DELETION_VERIFICATION_TOKEN;
    vi.resetModules();
    const { GET } = await import("@/app/api/ebay/account-deletion/route");
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion?challenge_code=abc",
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/ebay/account-deletion", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    process.env.EBAY_ENVIRONMENT = "sandbox";
    process.env.EBAY_DELETION_SKIP_SIGNATURE = "true";
    process.env.EBAY_DELETION_VERIFICATION_TOKEN = "token";
    process.env.EBAY_DELETION_ENDPOINT_URL =
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
    vi.doUnmock("@/services/ebay/account-deletion-purge");
  });

  it("rejects invalid topic", async () => {
    vi.doMock("@/services/ebay/account-deletion-purge", () => ({
      processAccountDeletion: vi.fn(),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "1" }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const body = JSON.stringify({
      metadata: { topic: "OTHER" },
      notification: { notificationId: "n1", data: {} },
    });
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
      {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 204 for a valid deletion notification", async () => {
    const processAccountDeletion = vi.fn(async () => ({
      status: "processed" as const,
      summary: { accountsDeleted: 1 },
      internalAccountId: "acc",
      smartSellerUserId: "user",
    }));

    vi.doMock("@/services/ebay/account-deletion-purge", () => ({
      processAccountDeletion,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "log-1" }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const body = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION", schemaVersion: "1.0" },
      notification: {
        notificationId: "notif-42",
        eventDate: new Date().toISOString(),
        publishDate: new Date().toISOString(),
        data: {
          username: "seller1",
          userId: "ebay-user-1",
          eiasToken: "eias-token",
        },
      },
    });
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
      {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-ebay-signature": "ignored-when-skip",
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(processAccountDeletion).toHaveBeenCalled();
  });

  it("is idempotent for already processed notifications", async () => {
    const processAccountDeletion = vi.fn();
    vi.doMock("@/services/ebay/account-deletion-purge", () => ({
      processAccountDeletion,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "log-1",
                  status: "processed",
                  processing_summary: {},
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const body = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: {
        notificationId: "already-done",
        publishAttemptCount: 2,
        data: { userId: "u" },
      },
    });
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
      { method: "POST", body },
    );
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(processAccountDeletion).not.toHaveBeenCalled();
  });

  it("returns 204 for test notification with no matching account (not 412)", async () => {
    const processAccountDeletion = vi.fn(async () => ({
      status: "not_found" as const,
      summary: { matched: 0 },
    }));
    vi.doMock("@/services/ebay/account-deletion-purge", () => ({
      processAccountDeletion,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "log-nf" }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const body = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: {
        notificationId: "ebay-test-notif",
        data: { userId: "test-user-no-match", username: "test_user" },
      },
    });
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
      {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-ebay-signature": "ignored-when-skip",
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(processAccountDeletion).toHaveBeenCalled();
  });

  it("returns 412 when signature header is absent (skip disabled)", async () => {
    process.env.EBAY_DELETION_SKIP_SIGNATURE = "false";
    process.env.EBAY_ENVIRONMENT = "production";
    vi.resetModules();

    const { POST } = await import("@/app/api/ebay/account-deletion/route");
    const body = JSON.stringify({
      metadata: { topic: "MARKETPLACE_ACCOUNT_DELETION" },
      notification: { notificationId: "n", data: {} },
    });
    const req = new NextRequest(
      "https://snowolf-lime.vercel.app/api/ebay/account-deletion",
      {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(412);
  });
});
