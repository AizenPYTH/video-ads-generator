import { describe, expect, it, afterEach, beforeEach } from "vitest";

describe("ensureSellerDefaults guards", () => {
  const originalEnv = process.env.EBAY_ENVIRONMENT;
  const originalMock = process.env.EBAY_MOCK_MODE;

  beforeEach(() => {
    process.env.EBAY_MOCK_MODE = "true";
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.EBAY_ENVIRONMENT;
    else process.env.EBAY_ENVIRONMENT = originalEnv;
    if (originalMock === undefined) delete process.env.EBAY_MOCK_MODE;
    else process.env.EBAY_MOCK_MODE = originalMock;
  });

  it("returns mock defaults in mock mode", async () => {
    process.env.EBAY_ENVIRONMENT = "sandbox";
    const { ensureSellerDefaults } = await import(
      "@/services/ebay/sandbox-setup"
    );
    const { EbayClient } = await import("@/services/ebay/client");
    const client = new EbayClient({ accessToken: "mock" });
    const result = await ensureSellerDefaults(client);
    expect(result.merchantLocationKey).toBe("entrepot-principal");
    expect(result.fulfillmentPolicyId).toBeTruthy();
  });

  it("resolveListingPolicies accepts preferred ids in mock mode", async () => {
    const { resolveListingPolicies } = await import(
      "@/services/ebay/sandbox-setup"
    );
    const { EbayClient } = await import("@/services/ebay/client");
    const client = new EbayClient({ accessToken: "mock" });
    const result = await resolveListingPolicies(client, {
      fulfillmentPolicyId: "f1",
      paymentPolicyId: "p1",
      returnPolicyId: "r1",
      merchantLocationKey: "loc-1",
    });
    expect(result.merchantLocationKey).toBe("loc-1");
    expect(result.fulfillmentPolicyId).toBe("mock-fulfillment-1");
  });
});
