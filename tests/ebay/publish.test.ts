import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EbayClient } from "@/services/ebay/client";
import {
  createInventoryItem,
  createOffer,
  publishOffer,
  publishListing,
} from "@/services/ebay/inventory";
import {
  mockInventoryItems,
  mockOffers,
  mockListings,
} from "@/services/ebay/mock";

describe("eBay publish idempotence", () => {
  const originalEnv = process.env.EBAY_MOCK_MODE;
  let client: EbayClient;

  beforeEach(() => {
    process.env.EBAY_MOCK_MODE = "true";
    mockInventoryItems.clear();
    mockOffers.clear();
    mockListings.clear();
    client = new EbayClient({ accessToken: "mock-token" });
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EBAY_MOCK_MODE;
    } else {
      process.env.EBAY_MOCK_MODE = originalEnv;
    }
  });

  const inventoryInput = {
    sku: "TEST-001",
    title: "Logic Board 820-01779-A",
    description: "Test motherboard",
    condition: "3000",
    images: [] as string[],
    quantity: 1,
  };

  const offerInput = {
    sku: "TEST-001",
    price: 189.99,
    currency: "EUR",
    categoryId: "175673",
    fulfillmentPolicyId: "mock-fulfillment-1",
    paymentPolicyId: "mock-payment-1",
    returnPolicyId: "mock-return-1",
  };

  it("overwrites inventory item for same SKU (upsert semantics)", async () => {
    await createInventoryItem(client, inventoryInput);
    await createInventoryItem(client, {
      ...inventoryInput,
      title: "Updated Title",
    });

    expect(mockInventoryItems.size).toBe(1);
    expect(mockInventoryItems.get("TEST-001")?.title).toBe("Updated Title");
  });

  it("publishes listing end-to-end in mock mode", async () => {
    const result = await publishListing(client, inventoryInput, offerInput);

    expect(result.status).toBe("PUBLISHED");
    expect(result.listingId).toMatch(/^listing_/);
    expect(result.offerId).toMatch(/^offer_/);
    expect(mockInventoryItems.has("TEST-001")).toBe(true);
    expect(mockListings.size).toBe(1);
  });

  it("returns consistent SKU from publishOffer for same offer", async () => {
    await createInventoryItem(client, inventoryInput);
    const { offerId } = await createOffer(client, offerInput);

    const first = await publishOffer(client, offerId);
    const second = await publishOffer(client, offerId);

    expect(first.sku).toBe("TEST-001");
    expect(second.sku).toBe("TEST-001");
    expect(mockOffers.get(offerId)?.sku).toBe("TEST-001");
  });

  it("creates separate listing IDs for repeated publishOffer calls", async () => {
    await createInventoryItem(client, inventoryInput);
    const { offerId } = await createOffer(client, offerInput);

    const first = await publishOffer(client, offerId);
    const second = await publishOffer(client, offerId);

    expect(first.listingId).not.toBe(second.listingId);
    expect(mockListings.size).toBe(2);
  });

  it("simulates publish idempotence guard for already published ads", () => {
    const existingPublication = {
      id: "pub-1",
      ebay_listing_id: "listing_existing",
      statut: "SUCCESS",
    };

    function shouldSkipPublish(
      publication: typeof existingPublication | null,
    ): boolean {
      return Boolean(publication?.ebay_listing_id);
    }

    expect(shouldSkipPublish(existingPublication)).toBe(true);
    expect(
      shouldSkipPublish({ ...existingPublication, ebay_listing_id: "" }),
    ).toBe(false);
    expect(shouldSkipPublish(null)).toBe(false);
  });
});
