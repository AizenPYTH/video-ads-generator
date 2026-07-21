import { EbayClient, isEbayMockMode } from "./client";
import { AppError } from "@/lib/errors/app-error";
import {
  fetchEbayPolicies,
  type EbayPolicies,
  type ResolvedListingPolicies,
} from "./policies";
import { SANDBOX_LOCATION_KEY } from "./locations";

export { SANDBOX_LOCATION_KEY };
export type { ResolvedListingPolicies };

/** Services d’expédition FR connus (Trading/Account API). FR_StandardDelivery n’existe pas. */
const FR_SHIPPING_SERVICE_CANDIDATES = [
  "FR_ColiposteColissimo",
  "FR_ColiposteColissimoRecommended",
  "FR_Colieco",
  "FR_PostOfficeLetter",
  "FR_PostOfficeLetterFollowed",
  "FR_Autre",
] as const;

export type SellerSetupResult = {
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  merchantLocationKey: string;
  created: {
    fulfillment: boolean;
    payment: boolean;
    returns: boolean;
    location: boolean;
  };
  policies: EbayPolicies;
};

async function optInBusinessPolicies(client: EbayClient): Promise<void> {
  try {
    await client.post("/sell/account/v1/program/opt_in", {
      programType: "SELLING_POLICY_MANAGEMENT",
    });
  } catch {
    // déjà opt-in
  }
}

async function createFulfillmentPolicy(client: EbayClient): Promise<string> {
  const marketplaceId = client.marketplace;
  let lastError: unknown;

  for (const shippingServiceCode of FR_SHIPPING_SERVICE_CANDIDATES) {
    try {
      const created = await client.post<{ fulfillmentPolicyId: string }>(
        "/sell/account/v1/fulfillment_policy",
        {
          name: `Smart Seller — Expédition (${shippingServiceCode})`,
          marketplaceId,
          categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
          handlingTime: { value: 1, unit: "DAY" },
          localPickup: false,
          freightShipping: false,
          globalShipping: false,
          shippingOptions: [
            {
              optionType: "DOMESTIC",
              costType: "FLAT_RATE",
              shippingServices: [
                {
                  sortOrder: 1,
                  shippingServiceCode,
                  shippingCost: { value: "5.90", currency: "EUR" },
                  freeShipping: false,
                  buyerResponsibleForShipping: false,
                },
              ],
            },
          ],
        },
      );
      if (created.fulfillmentPolicyId) {
        return created.fulfillmentPolicyId;
      }
    } catch (error) {
      lastError = error;
      // Essayer le service suivant
    }
  }

  // Dernier recours sandbox : retrait en main propre uniquement
  try {
    const pickup = await client.post<{ fulfillmentPolicyId: string }>(
      "/sell/account/v1/fulfillment_policy",
      {
        name: "Smart Seller — Remise en main propre",
        marketplaceId,
        categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
        handlingTime: { value: 1, unit: "DAY" },
        localPickup: true,
        freightShipping: false,
        globalShipping: false,
        shippingOptions: [],
      },
    );
    if (pickup.fulfillmentPolicyId) return pickup.fulfillmentPolicyId;
  } catch (error) {
    lastError = error;
  }

  throw lastError instanceof AppError
    ? lastError
    : AppError.internal(
        "Impossible de créer une politique d’expédition eBay valide.",
        lastError,
      );
}

async function createPaymentPolicy(client: EbayClient): Promise<string> {
  const marketplaceId = client.marketplace;
  const created = await client.post<{ paymentPolicyId: string }>(
    "/sell/account/v1/payment_policy",
    {
      name: "Smart Seller — Paiement FR",
      marketplaceId,
      categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
      paymentMethods: [],
    },
  );
  if (!created.paymentPolicyId) {
    throw AppError.internal("eBay n’a pas renvoyé paymentPolicyId.");
  }
  return created.paymentPolicyId;
}

async function createReturnPolicy(client: EbayClient): Promise<string> {
  const marketplaceId = client.marketplace;
  const created = await client.post<{ returnPolicyId: string }>(
    "/sell/account/v1/return_policy",
    {
      name: "Smart Seller — Retours FR",
      marketplaceId,
      categoryTypes: [{ name: "ALL_EXCLUDING_MOTORS_VEHICLES", default: true }],
      returnsAccepted: true,
      returnPeriod: { value: 14, unit: "DAY" },
      refundMethod: "MONEY_BACK",
      returnShippingCostPayer: "BUYER",
    },
  );
  if (!created.returnPolicyId) {
    throw AppError.internal("eBay n’a pas renvoyé returnPolicyId.");
  }
  return created.returnPolicyId;
}

export async function listMerchantLocations(
  client: EbayClient,
): Promise<Array<{ key: string; name: string }>> {
  if (isEbayMockMode()) {
    return [{ key: SANDBOX_LOCATION_KEY, name: "Entrepôt principal" }];
  }

  try {
    const data = await client.get<{
      locations?: Array<{
        merchantLocationKey?: string;
        name?: string;
      }>;
    }>("/sell/inventory/v1/location?limit=50");

    return (data.locations ?? [])
      .map((loc) => ({
        key: loc.merchantLocationKey ?? "",
        name: loc.name ?? loc.merchantLocationKey ?? "",
      }))
      .filter((loc) => Boolean(loc.key));
  } catch {
    return [];
  }
}

async function ensureEntrepotPrincipal(client: EbayClient): Promise<{
  key: string;
  created: boolean;
}> {
  if (isEbayMockMode()) {
    return { key: SANDBOX_LOCATION_KEY, created: false };
  }

  const existing = await listMerchantLocations(client);
  if (existing.some((loc) => loc.key === SANDBOX_LOCATION_KEY)) {
    return { key: SANDBOX_LOCATION_KEY, created: false };
  }
  if (existing[0]?.key) {
    return { key: existing[0].key, created: false };
  }

  try {
    await client.get(
      `/sell/inventory/v1/location/${encodeURIComponent(SANDBOX_LOCATION_KEY)}`,
    );
    return { key: SANDBOX_LOCATION_KEY, created: false };
  } catch {
    // create
  }

  try {
    await client.post(
      `/sell/inventory/v1/location/${encodeURIComponent(SANDBOX_LOCATION_KEY)}`,
      {
        name: "Entrepôt principal",
        merchantLocationStatus: "ENABLED",
        location: {
          address: {
            addressLine1: "1 rue de la République",
            city: "Marseille",
            postalCode: "13001",
            country: "FR",
          },
        },
        locationTypes: ["WAREHOUSE"],
      },
    );
    return { key: SANDBOX_LOCATION_KEY, created: true };
  } catch (error) {
    if (error instanceof AppError && error.status === 409) {
      return { key: SANDBOX_LOCATION_KEY, created: false };
    }
    throw error;
  }
}

/**
 * Idempotent : réutilise les politiques / lieux existants, ne crée que le manquant.
 * Sandbox : création auto autorisée.
 * Production : création uniquement si confirmProduction=true.
 */
export async function ensureSellerDefaults(
  client: EbayClient,
  options: { allowCreate?: boolean } = {},
): Promise<SellerSetupResult> {
  const isProduction = process.env.EBAY_ENVIRONMENT === "production";
  const allowCreate =
    options.allowCreate ??
    (!isProduction || process.env.EBAY_AUTO_CREATE_POLICIES === "true");

  if (isEbayMockMode()) {
    return {
      fulfillmentPolicyId: "mock-fulfillment-1",
      paymentPolicyId: "mock-payment-1",
      returnPolicyId: "mock-return-1",
      merchantLocationKey: SANDBOX_LOCATION_KEY,
      created: {
        fulfillment: false,
        payment: false,
        returns: false,
        location: false,
      },
      policies: await fetchEbayPolicies(client),
    };
  }

  await optInBusinessPolicies(client);

  let policies = await fetchEbayPolicies(client);
  const created = {
    fulfillment: false,
    payment: false,
    returns: false,
    location: false,
  };

  // Ne plus supprimer automatiquement les politiques Smart Seller :
  // ça invalidait les IDs stockés dans user_settings et cassait publishOffer (404).
  let fulfillmentPolicyId = policies.fulfillment[0]?.id ?? "";
  let returnPolicyId = policies.returns[0]?.id ?? "";
  let paymentPolicyId = policies.payment[0]?.id ?? "";

  // Si une vieille politique FR_StandardDelivery invalide est la seule,
  // on en crée une nouvelle (sans tout effacer).
  const fulfillmentLooksBroken = policies.fulfillment.some((p) =>
    /FR_StandardDelivery/i.test(p.name),
  );
  if (
    allowCreate &&
    fulfillmentLooksBroken &&
    policies.fulfillment.every((p) => /FR_StandardDelivery|smart\s*seller/i.test(p.name))
  ) {
    try {
      fulfillmentPolicyId = await createFulfillmentPolicy(client);
      created.fulfillment = true;
      policies = await fetchEbayPolicies(client);
    } catch {
      // garder l’existant
    }
  }

  if (!fulfillmentPolicyId || !returnPolicyId || !paymentPolicyId) {
    if (!allowCreate) {
      throw AppError.validation(
        "Politiques eBay manquantes sur ce compte. Créez-les dans Seller Hub (expédition, paiement, retour).",
      );
    }
    if (!fulfillmentPolicyId) {
      fulfillmentPolicyId = await createFulfillmentPolicy(client);
      created.fulfillment = true;
    }
    if (!returnPolicyId) {
      returnPolicyId = await createReturnPolicy(client);
      created.returns = true;
    }
    if (!paymentPolicyId) {
      paymentPolicyId = await createPaymentPolicy(client);
      created.payment = true;
    }
  }

  const location = allowCreate
    ? await ensureEntrepotPrincipal(client)
    : await (async () => {
        const locs = await listMerchantLocations(client);
        if (!locs[0]?.key) {
          throw AppError.validation(
            "Aucun lieu d’inventaire eBay. Créez-en un dans Seller Hub.",
          );
        }
        return { key: locs[0].key, created: false };
      })();
  created.location = location.created;

  policies = await fetchEbayPolicies(client);

  return {
    fulfillmentPolicyId:
      policies.fulfillment.find((p) => p.id === fulfillmentPolicyId)?.id ||
      policies.fulfillment[0]?.id ||
      fulfillmentPolicyId,
    paymentPolicyId:
      policies.payment.find((p) => p.id === paymentPolicyId)?.id ||
      policies.payment[0]?.id ||
      paymentPolicyId,
    returnPolicyId:
      policies.returns.find((p) => p.id === returnPolicyId)?.id ||
      policies.returns[0]?.id ||
      returnPolicyId,
    merchantLocationKey: location.key,
    created,
    policies,
  };
}

/** @deprecated use ensureSellerDefaults */
export const configureEbaySellerDefaults = ensureSellerDefaults;

/**
 * Résout politiques + lieu pour publier.
 * Sandbox : crée automatiquement le manquant. Production : réutilise l’existant.
 * Ne fait JAMAIS confiance aux IDs préférés sans vérifier qu’ils existent encore
 * (sinon publishOffer → 404 « offre non disponible » après reconnexion OAuth).
 */
export async function resolveListingPolicies(
  client: EbayClient,
  preferred?: {
    fulfillmentPolicyId?: string | null;
    paymentPolicyId?: string | null;
    returnPolicyId?: string | null;
    merchantLocationKey?: string | null;
  },
): Promise<ResolvedListingPolicies> {
  if (isEbayMockMode()) {
    return {
      fulfillmentPolicyId: "mock-fulfillment-1",
      paymentPolicyId: "mock-payment-1",
      returnPolicyId: "mock-return-1",
      merchantLocationKey:
        preferred?.merchantLocationKey?.trim() || SANDBOX_LOCATION_KEY,
    };
  }

  const existing = await fetchEbayPolicies(client);

  const fulfillmentPreferred = preferred?.fulfillmentPolicyId?.trim() || "";
  const paymentPreferred = preferred?.paymentPolicyId?.trim() || "";
  const returnPreferred = preferred?.returnPolicyId?.trim() || "";
  const locationPreferred = preferred?.merchantLocationKey?.trim() || "";

  const fulfillmentOk =
    Boolean(fulfillmentPreferred) &&
    existing.fulfillment.some((p) => p.id === fulfillmentPreferred);
  const paymentOk =
    Boolean(paymentPreferred) &&
    existing.payment.some((p) => p.id === paymentPreferred);
  const returnOk =
    Boolean(returnPreferred) &&
    existing.returns.some((p) => p.id === returnPreferred);

  let locationOk = false;
  if (locationPreferred) {
    try {
      await client.get(
        `/sell/inventory/v1/location/${encodeURIComponent(locationPreferred)}`,
      );
      locationOk = true;
    } catch {
      locationOk = false;
    }
  }

  if (fulfillmentOk && paymentOk && returnOk && locationOk) {
    return {
      fulfillmentPolicyId: fulfillmentPreferred,
      paymentPolicyId: paymentPreferred,
      returnPolicyId: returnPreferred,
      merchantLocationKey: locationPreferred,
    };
  }

  const setup = await ensureSellerDefaults(client, {
    allowCreate: process.env.EBAY_ENVIRONMENT !== "production",
  });

  return {
    fulfillmentPolicyId: fulfillmentOk
      ? fulfillmentPreferred
      : setup.fulfillmentPolicyId,
    paymentPolicyId: paymentOk ? paymentPreferred : setup.paymentPolicyId,
    returnPolicyId: returnOk ? returnPreferred : setup.returnPolicyId,
    merchantLocationKey: locationOk
      ? locationPreferred
      : setup.merchantLocationKey,
  };
}

