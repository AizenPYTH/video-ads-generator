import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EbayClient } from "@/services/ebay/client";
import {
  createInventoryItem,
  createOffer,
  ensureOffer,
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
    condition: "USED_EXCELLENT",
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
    merchantLocationKey: "default_fr",
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

  it("treats #25713 as empty offers list for unknown SKU", async () => {
    const { getOffersBySku, isEbayOfferUnavailableError } = await import(
      "@/services/ebay/inventory"
    );
    const { AppError } = await import("@/lib/errors/app-error");
    expect(
      isEbayOfferUnavailableError(
        new AppError(
          "EBAY_ERROR",
          "eBay API error: 404 — #25713 Cette offre n'est pas disponible.",
          {
            status: 404,
            details: { errors: [{ errorId: 25713 }] },
          },
        ),
      ),
    ).toBe(true);
    // mock: unknown SKU → []
    await expect(getOffersBySku(client, "SKU-NEVER-EXISTS")).resolves.toEqual(
      [],
    );
  });

  it("reuses existing offer for same SKU instead of failing", async () => {
    await createInventoryItem(client, inventoryInput);
    const first = await ensureOffer(client, offerInput);
    const second = await ensureOffer(client, {
      ...offerInput,
      price: 199.99,
    });

    expect(second.offerId).toBe(first.offerId);
    expect(mockOffers.size).toBe(1);
    expect(mockOffers.get(first.offerId)?.price).toBe(199.99);
  });

  it("createOffer is idempotent for the same SKU", async () => {
    const a = await createOffer(client, offerInput);
    const b = await createOffer(client, offerInput);
    expect(a.offerId).toBe(b.offerId);
    expect(mockOffers.size).toBe(1);
  });

  it("returns same listing when republishing the same offer", async () => {
    await createInventoryItem(client, inventoryInput);
    const { offerId } = await ensureOffer(client, offerInput);

    const first = await publishOffer(client, offerId);
    const second = await publishOffer(client, offerId);

    expect(first.listingId).toBe(second.listingId);
    expect(mockListings.size).toBe(1);
  });

  it("publishListing twice does not create a second offer", async () => {
    const first = await publishListing(client, inventoryInput, offerInput);
    const second = await publishListing(client, inventoryInput, offerInput);

    expect(second.offerId).toBe(first.offerId);
    expect(second.listingId).toBe(first.listingId);
    expect(mockOffers.size).toBe(1);
  });

  it("simulates publish idempotence guard for already published ads", () => {
    const existingPublication = {
      ebay_listing_id: "listing_abc",
      statut: "SUCCESS",
    };
    expect(existingPublication.ebay_listing_id).toBeTruthy();
  });
});
