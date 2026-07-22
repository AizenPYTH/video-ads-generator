import { describe, expect, it } from "vitest";
import { classifyImportUrl, isEbayItemUrl } from "@/lib/scraping/url-kind";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { extractCatalogProductLinks } from "@/lib/scraping/catalog-links";
import { extractAllItemSpecifics } from "@/services/scraping/providers/ebay";

describe("classifyImportUrl", () => {
  it("detects eBay item product URLs", () => {
    const c = classifyImportUrl(
      "https://www.ebay.fr/itm/405037724398?_skw=ecran+iphone",
    );
    expect(c.kind).toBe("product");
    expect(isEbayItemUrl("https://www.ebay.fr/itm/405037724398")).toBe(true);
  });

  it("detects eBay search/catalog URLs", () => {
    const c = classifyImportUrl(
      "https://www.ebay.fr/sch/i.html?_nkw=ecran+iphone+11",
    );
    expect(c.kind).toBe("catalog");
  });

  it("detects Shopify product vs collection", () => {
    expect(
      classifyImportUrl("https://www.utopya.fr/products/ecran-iphone-11").kind,
    ).toBe("product");
    expect(
      classifyImportUrl(
        "https://www.utopya.fr/collections/ecrans-iphone",
      ).kind,
    ).toBe("catalog");
  });
});

describe("inferProductTypeFromTitle", () => {
  it("infers screen type for iPhone listing titles", () => {
    expect(
      inferProductTypeFromTitle(
        "Écran LCD iPhone 11 vitre tactile remplacement",
      ),
    ).toBe("Écran");
  });
});

describe("extractAllItemSpecifics", () => {
  it("reads ux-labels-values and JSON nameValueList", () => {
    const html = `
      <div class="ux-labels-values">
        <div class="ux-labels-values__labels"><span>Type</span></div>
        <div class="ux-labels-values__values"><span>Écran</span></div>
      </div>
      <div class="ux-labels-values">
        <div class="ux-labels-values__labels"><span>Marque</span></div>
        <div class="ux-labels-values__values"><span>OEM</span></div>
      </div>
      {"nameValueList":[{"name":"Compatible Brand","value":["Apple"]}]}
    `;
    const specifics = extractAllItemSpecifics(html);
    expect(specifics.Type).toBe("Écran");
    expect(specifics.Marque).toBe("OEM");
    expect(specifics["Compatible Brand"]).toBe("Apple");
  });
});

describe("extractCatalogProductLinks", () => {
  it("collects eBay itm and Shopify product links", () => {
    const html = `
      <a href="/itm/111">A</a>
      <a href="https://www.ebay.fr/itm/222?hash=x">B</a>
      <a href="/products/ecran-iphone-11">C</a>
      <a href="/collections/foo">ignore</a>
    `;
    const links = extractCatalogProductLinks(
      html,
      "https://www.utopya.fr/collections/ecrans",
    );
    expect(links).toContain("https://www.ebay.fr/itm/222");
    expect(links).toContain("https://www.utopya.fr/products/ecran-iphone-11");
    expect(links.some((l) => l.includes("/collections/"))).toBe(false);
  });
});
