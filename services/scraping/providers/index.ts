import { EbayProductProvider } from "./ebay";
import { UtopyaProductProvider } from "./utopya";
import { GenericProductProvider } from "./generic";
import type { ProductPageProvider } from "./base";

const providers: ProductPageProvider[] = [
  new EbayProductProvider(),
  new UtopyaProductProvider(),
  new GenericProductProvider(),
];

export function getProviderForUrl(url: string): ProductPageProvider {
  const specific = providers.find(
    (provider) => provider.name !== "generic" && provider.canHandle(url),
  );

  return specific ?? new GenericProductProvider();
}

export function getAllProviders(): ProductPageProvider[] {
  return providers;
}

export { EbayProductProvider, UtopyaProductProvider, GenericProductProvider };
export type { ProductPageProvider, ScrapedProduct } from "./base";
