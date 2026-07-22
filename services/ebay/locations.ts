import { EbayClient, isEbayMockMode } from "./client";
import { AppError } from "@/lib/errors/app-error";

export const SANDBOX_LOCATION_KEY = "entrepot-principal";

export type MerchantLocationInput = {
  key?: string;
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country?: string;
};

function slugLocationKey(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const suffix = Date.now().toString(36).slice(-6);
  return `${base || "entrepot"}-${suffix}`.slice(0, 36);
}

export async function ensureMerchantLocation(
  client: EbayClient,
  preferredKey?: string | null,
): Promise<string> {
  const key = (preferredKey?.trim() || SANDBOX_LOCATION_KEY).slice(0, 36);

  if (isEbayMockMode()) {
    return key;
  }

  try {
    await client.get(`/sell/inventory/v1/location/${encodeURIComponent(key)}`);
    return key;
  } catch {
    // create below
  }

  try {
    await client.post(`/sell/inventory/v1/location/${encodeURIComponent(key)}`, {
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
    });
    return key;
  } catch (error) {
    if (error instanceof AppError && error.status === 409) {
      return key;
    }
    throw error;
  }
}

/**
 * Crée un lieu d’inventaire (warehouse) sur le compte eBay connecté.
 * Requis pour publier en Production si Seller Hub n’en a aucun.
 */
export async function createMerchantLocation(
  client: EbayClient,
  input: MerchantLocationInput,
): Promise<{ key: string; name: string }> {
  const name = input.name.trim();
  const addressLine1 = input.addressLine1.trim();
  const city = input.city.trim();
  const postalCode = input.postalCode.trim();
  const country = (input.country || "FR").trim().toUpperCase();

  if (!name || !addressLine1 || !city || !postalCode) {
    throw AppError.validation(
      "Indiquez un nom, une adresse, une ville et un code postal pour le lieu d’expédition.",
    );
  }

  const key = (input.key?.trim() || slugLocationKey(name)).slice(0, 36);

  if (isEbayMockMode()) {
    return { key, name };
  }

  try {
    await client.post(`/sell/inventory/v1/location/${encodeURIComponent(key)}`, {
      name,
      merchantLocationStatus: "ENABLED",
      location: {
        address: {
          addressLine1,
          city,
          postalCode,
          country,
        },
      },
      locationTypes: ["WAREHOUSE"],
    });
    return { key, name };
  } catch (error) {
    if (error instanceof AppError && error.status === 409) {
      return { key, name };
    }
    throw error;
  }
}
