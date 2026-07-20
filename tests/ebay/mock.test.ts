import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EbayClient, isEbayMockMode } from "@/services/ebay/client";
import {
  generateMockId,
  mockEbayResponse,
  mockInventoryItems,
  mockOffers,
  mockListings,
  mockOAuthTokens,
  mockPolicies,
} from "@/services/ebay/mock";

describe("eBay mock mode", () => {
  const originalEnv = process.env.EBAY_MOCK_MODE;

  beforeEach(() => {
    process.env.EBAY_MOCK_MODE = "true";
    mockInventoryItems.clear();
    mockOffers.clear();
    mockListings.clear();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EBAY_MOCK_MODE;
    } else {
      process.env.EBAY_MOCK_MODE = originalEnv;
    }
  });

  it("detects mock mode from environment", () => {
    expect(isEbayMockMode()).toBe(true);
  });

  it("returns mock OAuth tokens", () => {
    expect(mockOAuthTokens.access_token).toBe("mock_access_token");
    expect(mockOAuthTokens.refresh_token).toBe("mock_refresh_token");
    expect(mockOAuthTokens.expires_in).toBe(7200);
  });

  it("provides mock policies for EBAY_FR", () => {
    expect(mockPolicies.fulfillmentPolicies[0].marketplaceId).toBe("EBAY_FR");
    expect(mockPolicies.paymentPolicies).toHaveLength(1);
    expect(mockPolicies.returnPolicies).toHaveLength(1);
  });

  it("generates unique mock IDs with prefix", () => {
    const id1 = generateMockId("offer");
    const id2 = generateMockId("offer");

    expect(id1).toMatch(/^offer_/);
    expect(id2).toMatch(/^offer_/);
    expect(id1).not.toBe(id2);
  });

  it("returns data unchanged from mockEbayResponse", () => {
    const payload = { offerId: "test-offer" };
    expect(mockEbayResponse("/sell/inventory/v1/offer", payload)).toBe(payload);
  });

  it("short-circuits API requests in mock mode", async () => {
    const client = new EbayClient({ accessToken: "mock-token" });
    const result = await client.get<{ items: unknown[] }>(
      "/sell/inventory/v1/inventory_item",
    );

    expect(result).toEqual({});
  });

  it("stores inventory items in mock map", () => {
    mockInventoryItems.set("SKU-001", {
      sku: "SKU-001",
      title: "Test Item",
    });

    expect(mockInventoryItems.get("SKU-001")).toEqual({
      sku: "SKU-001",
      title: "Test Item",
    });
  });

  it("logs mock endpoint when DEBUG_MODE is true", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    process.env.DEBUG_MODE = "true";

    mockEbayResponse("/test", { ok: true });

    expect(consoleSpy).toHaveBeenCalledWith("[eBay Mock] /test");

    delete process.env.DEBUG_MODE;
    consoleSpy.mockRestore();
  });
});
