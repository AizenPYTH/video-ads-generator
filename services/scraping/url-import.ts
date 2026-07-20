import { AppError } from "@/lib/errors/app-error";
import { validateUrl } from "@/lib/validation/url";
import { getProviderForUrl } from "./providers";
import type { ScrapedProduct } from "./providers/base";

export interface UrlImportResult {
  product: ScrapedProduct;
  provider: string;
  validatedUrl: string;
}

export async function importFromUrl(rawUrl: string): Promise<UrlImportResult> {
  let validated;

  try {
    validated = validateUrl(rawUrl);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.validation("Invalid URL");
  }

  const provider = getProviderForUrl(validated.href);

  try {
    const product = await provider.scrape(validated.href);

    return {
      product,
      provider: provider.name,
      validatedUrl: validated.href,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.internal("Failed to import product from URL", error);
  }
}
