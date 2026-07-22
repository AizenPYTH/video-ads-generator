import { EbayClient, isEbayMockMode } from "./client";
import { AppError } from "@/lib/errors/app-error";

export const SANDBOX_LOCATION_KEY = "entrepot-principal";

export type MerchantLocationInput = {
  key?: string;
  name: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  /** Code ISO 2 lettres (FR) ou nom (France) — normalisé côté serveur */
  country?: string;
  stateOrProvince?: string;
};

const COUNTRY_ALIASES: Record<string, string> = {
  fr: "FR",
  france: "FR",
  de: "DE",
  deutschland: "DE",
  allemagne: "DE",
  be: "BE",
  belgique: "BE",
  belgium: "BE",
  es: "ES",
  espagne: "ES",
  spain: "ES",
  it: "IT",
  italie: "IT",
  italy: "IT",
  gb: "GB",
  uk: "GB",
  "united kingdom": "GB",
  "royaume-uni": "GB",
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

/** eBay CountryCodeEnum = ISO 3166-1 alpha-2 */
export function normalizeEbayCountryCode(raw: string | null | undefined): string {
  const value = (raw ?? "FR").trim();
  if (!value) return "FR";
  const lower = value.toLowerCase();
  if (COUNTRY_ALIASES[lower]) return COUNTRY_ALIASES[lower];
  if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();
  return "FR";
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
      locationTypes: ["WAREHOUSE"],
      location: {
        address: {
          addressLine1: "1 rue de la République",
          city: "Marseille",
          stateOrProvince: "Bouches-du-Rhône",
          postalCode: "13001",
          country: "FR",
        },
      },
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
 * Warehouse eBay exige : (postalCode + country) OU (city + stateOrProvince + country).
 */
export async function createMerchantLocation(
  client: EbayClient,
  input: MerchantLocationInput,
): Promise<{ key: string; name: string }> {
  const name = input.name.trim();
  const addressLine1 = input.addressLine1.trim();
  const city = input.city.trim();
  const postalCode = input.postalCode.replace(/\s+/g, "").trim();
  const country = normalizeEbayCountryCode(input.country);
  const stateOrProvince = (
    input.stateOrProvince?.trim() ||
    city ||
    "France"
  ).trim();

  if (!name || !addressLine1 || !city || !postalCode) {
    throw AppError.validation(
      "Indiquez un nom, une adresse, une ville et un code postal pour le lieu d’expédition.",
    );
  }

  if (!/^[A-Z]{2}$/.test(country)) {
    throw AppError.validation(
      "Pays invalide : utilisez le code à 2 lettres (ex. FR).",
    );
  }

  const key = (input.key?.trim() || slugLocationKey(name)).slice(0, 36);

  if (isEbayMockMode()) {
    return { key, name };
  }

  const body = {
    name,
    merchantLocationStatus: "ENABLED",
    locationTypes: ["WAREHOUSE"],
    location: {
      address: {
        addressLine1,
        city,
        stateOrProvince,
        postalCode,
        country,
      },
    },
  };

  try {
    await client.post(
      `/sell/inventory/v1/location/${encodeURIComponent(key)}`,
      body,
    );
    return { key, name };
  } catch (error) {
    if (error instanceof AppError && error.status === 409) {
      return { key, name };
    }
    if (error instanceof AppError) {
      console.error("[ebay-location] create failed", {
        status: error.status,
        message: error.message,
        details: error.details,
        payload: body,
      });
      // Message plus clair si eBay parle de country
      if (/country/i.test(error.message)) {
        throw AppError.validation(
          `eBay refuse le pays du lieu (reçu « ${country} »). Vérifiez l’adresse et réessayez, ou utilisez FR.`,
        );
      }
    }
    throw error;
  }
}
