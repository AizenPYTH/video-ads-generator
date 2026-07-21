import { EbayClient, isEbayMockMode } from "./client";
import { AppError } from "@/lib/errors/app-error";

export const SANDBOX_LOCATION_KEY = "entrepot-principal";

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
