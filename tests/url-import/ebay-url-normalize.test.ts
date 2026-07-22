import { describe, expect, it } from "vitest";
import { normalizeScrapingUrl } from "@/services/scraping/scrapingbee";
import { buildEbayTitle } from "@/lib/listings/normalize-from-url";

describe("normalizeScrapingUrl eBay", () => {
  it("strips tracking query from /itm/ URLs", () => {
    const long =
      "https://www.ebay.fr/itm/318081142630?_trkparms=itmf%3D1&itmmeta=01KY1SJTPWHGKYEDXC9B1C6DNG&foo=bar";
    expect(normalizeScrapingUrl(long)).toBe(
      "https://www.ebay.fr/itm/318081142630",
    );
  });
});

describe("buildEbayTitle", () => {
  it("does not break title with Sans marque/Générique brand", () => {
    const title = buildEbayTitle(
      "Ecran Complet Pour iPhone  12 / 12 Pro | eBay",
      "- Sans marque/Générique -",
    );
    expect(title).toContain("Ecran Complet");
    expect(title).toContain("iPhone");
    expect(title).not.toMatch(/^\s*$/);
  });
});
