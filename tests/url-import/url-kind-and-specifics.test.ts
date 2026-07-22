import { describe, expect, it } from "vitest";
import { classifyImportUrl, isEbayItemUrl } from "@/lib/scraping/url-kind";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import {
  extractCatalogProductCards,
  extractCatalogProductLinks,
} from "@/lib/scraping/catalog-links";
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

  it("detects Magento / Utopya category pages as catalog", () => {
    expect(
      classifyImportUrl(
        "https://www.utopya.fr/catalog/category/view/s/redmi-note-13-4g/id/4758/",
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

  it("collects Magento / Utopya product-item-link grid products", () => {
    const html = `
      <a href="/apple/iphone.html">nav</a>
      <a class="product-item-link name" href="/ecran-complet-vert-redmi-note-13-4g.html">Écran vert</a>
      <a class="product-item-link name" href="/batterie-redmi-note-13-4g.html">Batterie</a>
      <a class="product-item-link name" href="/camera-avant-redmi-note-13.html">Caméra</a>
      <a href="/brand/xiaomi.html">marque</a>
      <a href="/catalog/category/view/s/x/id/1/">cat</a>
    `;
    const links = extractCatalogProductLinks(
      html,
      "https://www.utopya.fr/catalog/category/view/s/redmi-note-13-4g/id/4758/",
    );
    expect(links.length).toBe(3);
    expect(links).toContain(
      "https://www.utopya.fr/ecran-complet-vert-redmi-note-13-4g.html",
    );
    expect(links).toContain(
      "https://www.utopya.fr/batterie-redmi-note-13-4g.html",
    );
    expect(links.some((l) => l.includes("/brand/"))).toBe(false);
    expect(links.some((l) => l.includes("/category/"))).toBe(false);
  });

  it("extracts Magento listing cards with title image sku brand", () => {
    const html = `
      <div class="item product product-item listing-item" data-sku="131387">
        <a href="https://www.utopya.fr/ecran-complet-vert-redmi-note-13-4g.html" class="product photo product-item-photo">
          <img class="product-image-photo" src="https://www.utopya.fr/media/catalog/product/cache/x/56000300n700-0000.jpg" alt="Ecran">
        </a>
        <div class="product-brand-logo" data-brand="Xiaomi"></div>
        <a class="product-item-link name" href="https://www.utopya.fr/ecran-complet-vert-redmi-note-13-4g.html">
          Ecran Complet Vert Redmi Note 13 4G
        </a>
      </div>
      <div class="item product product-item listing-item" data-sku="423546">
        <a href="https://www.utopya.fr/batterie-redmi-note-13-4g.html" class="product photo product-item-photo">
          <img class="product-image-photo" src="https://www.utopya.fr/media/catalog/product/cache/x/batterie.jpg" alt="Batterie">
        </a>
        <div class="product-brand-logo" data-brand="Xiaomi"></div>
        <a class="product-item-link name" href="https://www.utopya.fr/batterie-redmi-note-13-4g.html">
          Batterie Redmi Note 13 4G
        </a>
      </div>
    `;
    const cards = extractCatalogProductCards(
      html,
      "https://www.utopya.fr/catalog/category/view/s/redmi-note-13-4g/id/4758/",
    );
    expect(cards.length).toBe(2);
    expect(cards[0]?.title).toContain("Ecran Complet Vert");
    expect(cards[0]?.sku).toBe("131387");
    expect(cards[0]?.brand).toBe("Xiaomi");
    expect(cards[0]?.image).toContain("56000300n700-0000.jpg");
    expect(cards[1]?.title).toContain("Batterie");
  });

  it("collects eBay search result item links", () => {
    const html = `
      <a class="s-item__link" href="https://www.ebay.fr/itm/405037724398?hash=item">A</a>
      <a class="s-item__link" href="https://www.ebay.fr/itm/123456789012">B</a>
      <a href="https://www.ebay.fr/sch/i.html?_nkw=x">search</a>
    `;
    const links = extractCatalogProductLinks(
      html,
      "https://www.ebay.fr/sch/i.html?_nkw=ecran",
    );
    expect(links.length).toBe(2);
    expect(links).toContain("https://www.ebay.fr/itm/405037724398");
    expect(links).toContain("https://www.ebay.fr/itm/123456789012");
  });
});
