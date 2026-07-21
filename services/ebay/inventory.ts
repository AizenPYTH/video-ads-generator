import { AppError } from "@/lib/errors/app-error";
import { EbayClient, isEbayMockMode } from "./client";
import { generateMockId, mockInventoryItems, mockOffers, mockListings } from "./mock";

export interface InventoryItemInput {
  sku: string;
  title: string;
  description: string;
  condition: string;
  images: string[];
  aspects?: Record<string, string[]>;
  quantity?: number;
}

export interface CreateOfferInput {
  sku: string;
  price: number;
  currency: string;
  categoryId: string;
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  merchantLocationKey: string;
  marketplaceId?: string;
  quantity?: number;
}

export interface PublishResult {
  listingId: string;
  offerId: string;
  sku: string;
  status: string;
}

export async function createInventoryItem(
  client: EbayClient,
  input: InventoryItemInput,
): Promise<{ sku: string }> {
  if (isEbayMockMode()) {
    mockInventoryItems.set(input.sku, { ...input, createdAt: new Date().toISOString() });
    return { sku: input.sku };
  }

  await client.put(`/sell/inventory/v1/inventory_item/${encodeURIComponent(input.sku)}`, {
    product: {
      title: input.title,
      description: input.description,
      imageUrls: input.images,
      aspects: input.aspects ?? {},
    },
    condition: input.condition,
    availability: {
      shipToLocationAvailability: {
        quantity: input.quantity ?? 1,
      },
    },
  });

  return { sku: input.sku };
}

export async function createOffer(
  client: EbayClient,
  input: CreateOfferInput,
): Promise<{ offerId: string }> {
  if (isEbayMockMode()) {
    const offerId = generateMockId("offer");
    mockOffers.set(offerId, { ...input, offerId });
    return { offerId };
  }

  const response = await client.post<{ offerId: string }>(
    "/sell/inventory/v1/offer",
    {
      sku: input.sku,
      marketplaceId: input.marketplaceId ?? client.marketplace,
      format: "FIXED_PRICE",
      availableQuantity: input.quantity ?? 1,
      pricingSummary: {
        price: {
          value: Number(input.price).toFixed(2),
          currency: input.currency,
        },
      },
      categoryId: String(input.categoryId),
      merchantLocationKey: input.merchantLocationKey,
      listingPolicies: {
        fulfillmentPolicyId: input.fulfillmentPolicyId,
        paymentPolicyId: input.paymentPolicyId,
        returnPolicyId: input.returnPolicyId,
      },
    },
  );

  if (!response.offerId) {
    throw AppError.internal("eBay did not return an offer ID");
  }

  return { offerId: response.offerId };
}

export async function publishOffer(
  client: EbayClient,
  offerId: string,
): Promise<PublishResult> {
  if (isEbayMockMode()) {
    const listingId = generateMockId("listing");
    const offer = mockOffers.get(offerId);
    mockListings.set(listingId, { offerId, listingId });
    return {
      listingId,
      offerId,
      sku: (offer?.sku as string) ?? "mock-sku",
      status: "PUBLISHED",
    };
  }

  const response = await client.post<{ listingId: string }>(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
    {},
  );

  return {
    listingId: response.listingId,
    offerId,
    sku: "",
    status: "PUBLISHED",
  };
}

export async function publishListing(
  client: EbayClient,
  inventory: InventoryItemInput,
  offer: CreateOfferInput,
): Promise<PublishResult> {
  await createInventoryItem(client, inventory);
  const { offerId } = await createOffer(client, offer);
  return publishOffer(client, offerId);
}
