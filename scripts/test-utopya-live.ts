/**
 * Test live Utopya : PDP + catégorie (nécessite SCRAPINGBEE_API_KEY).
 * npx tsx --env-file=.env.local scripts/test-utopya-live.ts
 */
import { discoverCatalogProductUrls } from "../services/scraping/url-import";
import { getProviderForUrl } from "../services/scraping/providers";
import { formatPriceForStorage } from "../lib/scraping/parse-price";

async function main() {
  const pdpUrl =
    "https://www.utopya.fr/ecran-complet-redmi-15c-5g-sans-chassis-relife.html";
  const catUrl =
    "https://www.utopya.fr/xiaomi/serie-redmi/redmi-15c-5g.html";

  console.log("=== PDP ===");
  const provider = getProviderForUrl(pdpUrl);
  const product = await provider.scrape(pdpUrl);
  console.log(
    JSON.stringify(
      {
        provider: provider.name,
        title: product.title,
        price: product.price,
        stored: formatPriceForStorage(product.price),
        sku: product.sku,
        images: product.images,
        specs: product.itemSpecifics,
        warning: product.raw.priceWarning,
      },
      null,
      2,
    ),
  );

  console.log("=== CATEGORY ===");
  const cat = await discoverCatalogProductUrls(catUrl);
  console.log(
    JSON.stringify(
      {
        count: cat.productUrls.length,
        sample: cat.productUrls.slice(0, 8),
        firstCards: cat.cards.slice(0, 5).map((c) => ({
          title: c.title,
          sku: c.sku,
          price: c.price,
          image: c.image?.slice(-40),
        })),
      },
      null,
      2,
    ),
  );

  if (cat.productUrls.length >= 2) {
    console.log("=== 2e fiche catégorie ===");
    const second = await getProviderForUrl(cat.productUrls[1]!).scrape(
      cat.productUrls[1]!,
    );
    console.log(
      JSON.stringify(
        {
          url: cat.productUrls[1],
          title: second.title,
          sku: second.sku,
          price: second.price,
          images: second.images.slice(0, 2),
        },
        null,
        2,
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
