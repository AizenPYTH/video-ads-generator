import { AppError } from "@/lib/errors/app-error";
import { EbayClient, isEbayMockMode } from "./client";
import {
  generateMockId,
  mockInventoryItems,
  mockOffers,
  mockListings,
} from "./mock";

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

export type EbayOfferSummary = {
  offerId: string;
  sku?: string;
  status?: string;
  listing?: { listingId?: string; listingStatus?: string };
  marketplaceId?: string;
};

type OffersBySkuResponse = {
  offers?: EbayOfferSummary[];
  total?: number;
};

function offerBody(input: CreateOfferInput) {
  return {
    sku: input.sku,
    marketplaceId: input.marketplaceId ?? "EBAY_FR",
    format: "FIXED_PRICE" as const,
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
  };
}

export function isEbayAlreadyExistsError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  const msg = err.message.toLowerCase();
  if (
    msg.includes("existe déjà") ||
    msg.includes("already exists") ||
    msg.includes("offer entity already")
  ) {
    return true;
  }
  const details = err.details;
  if (details && typeof details === "object") {
    const errors = (details as { errors?: Array<{ errorId?: number }> }).errors;
    if (Array.isArray(errors)) {
      // 25002 = Offer entity already exists (Inventory API)
      return errors.some((e) => e.errorId === 25002 || e.errorId === 25001);
    }
  }
  return false;
}

export function isEbayAlreadyPublishedError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  const msg = err.message.toLowerCase();
  if (
    msg.includes("already published") ||
    msg.includes("déjà publi") ||
    msg.includes("listing already") ||
    msg.includes("has already been published")
  ) {
    return true;
  }
  const details = err.details;
  if (details && typeof details === "object") {
    const errors = (details as { errors?: Array<{ errorId?: number }> }).errors;
    if (Array.isArray(errors)) {
      // 25007 / 25604 common “already published” variants
      return errors.some(
        (e) => e.errorId === 25007 || e.errorId === 25604 || e.errorId === 25009,
      );
    }
  }
  return false;
}

/** Offre introuvable / non publiable (souvent après retry ou reconnexion sandbox). */
export function isEbayOfferUnavailableError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  if (err.status === 404) return true;
  const msg = err.message.toLowerCase();
  if (
    msg.includes("pas disponible") ||
    msg.includes("not available") ||
    msg.includes("didn't find the entity") ||
    msg.includes("did not find the entity") ||
    msg.includes("we didn't find")
  ) {
    return true;
  }
  const details = err.details;
  if (details && typeof details === "object") {
    const errors = (details as { errors?: Array<{ errorId?: number }> }).errors;
    // 25710 = entity not found (Inventory)
    if (Array.isArray(errors) && errors.some((e) => e.errorId === 25710)) {
      return true;
    }
  }
  return false;
}

export async function deleteOffer(
  client: EbayClient,
  offerId: string,
): Promise<void> {
  if (isEbayMockMode()) {
    mockOffers.delete(offerId);
    return;
  }
  try {
    await client.delete(
      `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`,
    );
  } catch (err) {
    if (isEbayOfferUnavailableError(err)) return;
    // Offre déjà publiée / non supprimable — laisser l’appelant gérer
    throw err;
  }
}

export async function createInventoryItem(
  client: EbayClient,
  input: InventoryItemInput,
): Promise<{ sku: string }> {
  if (isEbayMockMode()) {
    mockInventoryItems.set(input.sku, {
      ...input,
      createdAt: new Date().toISOString(),
    });
    return { sku: input.sku };
  }

  await client.put(
    `/sell/inventory/v1/inventory_item/${encodeURIComponent(input.sku)}`,
    {
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
    },
  );

  return { sku: input.sku };
}

export async function getOffersBySku(
  client: EbayClient,
  sku: string,
  marketplaceId?: string,
): Promise<EbayOfferSummary[]> {
  if (isEbayMockMode()) {
    return [...mockOffers.entries()]
      .filter(([, offer]) => offer.sku === sku)
      .map(([offerId, offer]) => ({
        offerId,
        sku: offer.sku as string,
        status: (offer.status as string) ?? "UNPUBLISHED",
        marketplaceId: (offer.marketplaceId as string) ?? client.marketplace,
        listing: offer.listingId
          ? { listingId: offer.listingId as string }
          : undefined,
      }));
  }

  const marketplace = marketplaceId ?? client.marketplace;
  const data = await client.get<OffersBySkuResponse>(
    `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}&marketplace_id=${encodeURIComponent(marketplace)}&limit=25`,
  );
  return data.offers ?? [];
}

export async function getOffer(
  client: EbayClient,
  offerId: string,
): Promise<EbayOfferSummary | null> {
  if (isEbayMockMode()) {
    const offer = mockOffers.get(offerId);
    if (!offer) return null;
    return {
      offerId,
      sku: offer.sku as string,
      status: (offer.status as string) ?? "UNPUBLISHED",
      listing: offer.listingId
        ? { listingId: offer.listingId as string }
        : undefined,
    };
  }

  try {
    return await client.get<EbayOfferSummary>(
      `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`,
    );
  } catch (err) {
    if (err instanceof AppError && err.status === 404) return null;
    throw err;
  }
}

export async function updateOffer(
  client: EbayClient,
  offerId: string,
  input: CreateOfferInput,
): Promise<{ offerId: string }> {
  if (isEbayMockMode()) {
    const existing = mockOffers.get(offerId) ?? {};
    mockOffers.set(offerId, { ...existing, ...input, offerId });
    return { offerId };
  }

  await client.put(
    `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`,
    offerBody({ ...input, marketplaceId: input.marketplaceId ?? client.marketplace }),
  );
  return { offerId };
}

export async function createOffer(
  client: EbayClient,
  input: CreateOfferInput,
): Promise<{ offerId: string }> {
  if (isEbayMockMode()) {
    // Idempotent mock: reuse existing offer for same SKU
    for (const [id, offer] of mockOffers.entries()) {
      if (offer.sku === input.sku) {
        mockOffers.set(id, { ...offer, ...input, offerId: id });
        return { offerId: id };
      }
    }
    const offerId = generateMockId("offer");
    mockOffers.set(offerId, { ...input, offerId, status: "UNPUBLISHED" });
    return { offerId };
  }

  const response = await client.post<{ offerId: string }>(
    "/sell/inventory/v1/offer",
    offerBody({ ...input, marketplaceId: input.marketplaceId ?? client.marketplace }),
  );

  if (!response.offerId) {
    throw AppError.internal("eBay did not return an offer ID");
  }

  return { offerId: response.offerId };
}

/**
 * Crée l’offre, ou réutilise / met à jour celle déjà liée au SKU (retry safe).
 */
export async function ensureOffer(
  client: EbayClient,
  input: CreateOfferInput,
): Promise<{ offerId: string; listingId?: string; alreadyPublished: boolean }> {
  const marketplace = input.marketplaceId ?? client.marketplace;
  const existing = await getOffersBySku(client, input.sku, marketplace);

  const published = existing.find(
    (o) =>
      o.status === "PUBLISHED" ||
      Boolean(o.listing?.listingId) ||
      o.listing?.listingStatus === "ACTIVE",
  );
  if (published?.offerId) {
    // Rafraîchir l’offre puis retourner le listing existant
    try {
      await updateOffer(client, published.offerId, {
        ...input,
        marketplaceId: marketplace,
      });
    } catch {
      // Listing déjà live : l’update peut être refusé — on continue
    }
    return {
      offerId: published.offerId,
      listingId: published.listing?.listingId,
      alreadyPublished: Boolean(published.listing?.listingId),
    };
  }

  const draft = existing.find((o) => o.offerId);
  if (draft?.offerId) {
    const live = await getOffer(client, draft.offerId);
    if (!live) {
      // Entrée fantôme côté liste SKU — on recrée plus bas
      try {
        await deleteOffer(client, draft.offerId);
      } catch {
        /* ignore */
      }
    } else {
      await updateOffer(client, draft.offerId, {
        ...input,
        marketplaceId: marketplace,
      });
      return { offerId: draft.offerId, alreadyPublished: false };
    }
  }

  try {
    const created = await createOffer(client, {
      ...input,
      marketplaceId: marketplace,
    });
    return { offerId: created.offerId, alreadyPublished: false };
  } catch (err) {
    if (!isEbayAlreadyExistsError(err)) throw err;

    // Course : l’offre a été créée entre le GET et le POST
    const retry = await getOffersBySku(client, input.sku, marketplace);
    const found = retry[0];
    if (!found?.offerId) throw err;

    await updateOffer(client, found.offerId, {
      ...input,
      marketplaceId: marketplace,
    });
    return {
      offerId: found.offerId,
      listingId: found.listing?.listingId,
      alreadyPublished: Boolean(found.listing?.listingId),
    };
  }
}

export async function publishOffer(
  client: EbayClient,
  offerId: string,
): Promise<PublishResult> {
  if (isEbayMockMode()) {
    const offer = mockOffers.get(offerId);
    // Idempotent : si déjà publié, renvoyer le même listing
    if (offer?.listingId) {
      return {
        listingId: offer.listingId as string,
        offerId,
        sku: (offer.sku as string) ?? "mock-sku",
        status: "PUBLISHED",
      };
    }
    const listingId = generateMockId("listing");
    mockOffers.set(offerId, {
      ...offer,
      status: "PUBLISHED",
      listingId,
    });
    mockListings.set(listingId, { offerId, listingId });
    return {
      listingId,
      offerId,
      sku: (offer?.sku as string) ?? "mock-sku",
      status: "PUBLISHED",
    };
  }

  try {
    const response = await client.post<{ listingId?: string }>(
      `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`,
      {},
    );

    const listingId = response.listingId;
    if (!listingId) {
      // Certains comptes renvoient 200 sans body — relire l’offre
      const offer = await getOffer(client, offerId);
      if (offer?.listing?.listingId) {
        return {
          listingId: offer.listing.listingId,
          offerId,
          sku: offer.sku ?? "",
          status: "PUBLISHED",
        };
      }
      throw AppError.internal("eBay n’a pas renvoyé d’ID d’annonce.");
    }

    return {
      listingId,
      offerId,
      sku: "",
      status: "PUBLISHED",
    };
  } catch (err) {
    if (!isEbayAlreadyPublishedError(err) && !isEbayAlreadyExistsError(err)) {
      throw err;
    }
    const offer = await getOffer(client, offerId);
    if (offer?.listing?.listingId) {
      return {
        listingId: offer.listing.listingId,
        offerId,
        sku: offer.sku ?? "",
        status: "PUBLISHED",
      };
    }
    throw err;
  }
}

export async function publishListing(
  client: EbayClient,
  inventory: InventoryItemInput,
  offer: CreateOfferInput,
): Promise<PublishResult> {
  await createInventoryItem(client, inventory);
  const ensured = await ensureOffer(client, offer);
  if (ensured.alreadyPublished && ensured.listingId) {
    return {
      listingId: ensured.listingId,
      offerId: ensured.offerId,
      sku: inventory.sku,
      status: "PUBLISHED",
    };
  }
  return publishOffer(client, ensured.offerId);
}
