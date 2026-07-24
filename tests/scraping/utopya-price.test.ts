import { describe, expect, it } from "vitest";
import {
  formatPriceForStorage,
  parseFrenchPrice,
  PRICE_NOT_DETECTED_MESSAGE,
} from "@/lib/scraping/parse-price";
import {
  extractUtopyaPrice,
  extractUtopyaProduct,
  extractUtopyaMainImages,
  stripUtopyaRelatedSections,
} from "@/services/scraping/providers/utopya-extract";
import { buildAdChecklist } from "@/features/ads/recalculate-status";

describe("parseFrenchPrice", () => {
  it("parses common FR formats", () => {
    expect(parseFrenchPrice("12")).toBe(12);
    expect(parseFrenchPrice("12,00")).toBe(12);
    expect(parseFrenchPrice("12.00")).toBe(12);
    expect(parseFrenchPrice("12,50 €")).toBe(12.5);
    expect(parseFrenchPrice("1 249,90 €")).toBe(1249.9);
    expect(parseFrenchPrice("€12.50")).toBe(12.5);
  });

  it("never returns 0 for missing/invalid", () => {
    expect(parseFrenchPrice("")).toBeNull();
    expect(parseFrenchPrice("0")).toBeNull();
    expect(parseFrenchPrice("abc")).toBeNull();
    expect(formatPriceForStorage(null)).toBeNull();
    expect(formatPriceForStorage("12")).toBe("12.00");
    expect(formatPriceForStorage("12,5")).toBe("12.50");
  });
});

describe("Utopya extract from HTML", () => {
  const fixture = `
<html><body class="catalog-product-view">
  <h1 class="product block-title"><span class="base">Ecran Complet Redmi 15C 5G (Sans Châssis)</span></h1>
  <div class="product_mainbloc">
    <div class="product-slider">
      <img class="zoom" src="https://www.utopya.fr/media/catalog/product/cache/abc/1/-/1-3667075250340-0000.jpg" />
    </div>
    <ul class="additional-attributes-wrapper">
      <li class="attr-custom_type" data-code="custom_type"><span class="t_span">Type de produit</span><strong class="data">Ecran complet</strong></li>
      <li class="attr-qualite" data-code="qualite"><span class="t_span">Qualité</span><strong class="data">Compatible</strong></li>
      <li class="attr-fabricant" data-code="fabricant"><span class="t_span">Marque</span><strong class="data">N/A</strong></li>
      <li class="attr-sku" data-code="sku"><span class="t_span">SKU</span><strong class="data">EC-R15C5G</strong></li>
      <li class="attr-compatibilite" data-code="compatibilite"><a class="fake-link">Redmi 15C 5G</a></li>
    </ul>
  </div>
  <div class="product_pricebloc">
    <div class="box-no-log"><p>Vous devez être connecté afin de consulter les prix et les disponibilités.</p>
    <span class="btn log-to-see-price">S'identifier pour voir le prix</span></div>
  </div>
  <div class="ajax-selection selection-related_products">
    <div class="products wrapper grid products-grid">
      <a class="product-item-link">COVERME Coque TPU</a>
      <img class="product-image-photo" src="https://www.utopya.fr/media/catalog/product/cache/x/coque.jpg" />
    </div>
  </div>
</body></html>`;

  const fixtureWithPrice = fixture.replace(
    /box-no-log[\s\S]*?log-to-see-price[\s\S]*?<\/div>/,
    `<span class="price-wrapper" data-price-amount="12.50" data-price-type="finalPrice"><span class="price">12,50 €</span></span>`,
  );

  it("extracts attributes and SKU without inventing brand", () => {
    const product = extractUtopyaProduct(
      fixture,
      "https://www.utopya.fr/ecran-complet-redmi-15c-5g-sans-chassis-relife.html",
    );
    expect(product.title).toContain("Ecran Complet Redmi 15C");
    expect(product.sku).toBe("EC-R15C5G");
    expect(product.brand).toBeNull();
    expect(product.itemSpecifics.Type).toBe("Ecran complet");
    expect(product.itemSpecifics["Appareil compatible"]).toBe("Redmi 15C 5G");
    expect(product.price).toBeNull();
    expect(product.priceLoginRequired).toBe(true);
    expect(product.priceWarning).toContain(PRICE_NOT_DETECTED_MESSAGE);
  });

  it("extracts Magento price when present", () => {
    const { price, loginRequired } = extractUtopyaPrice(fixtureWithPrice);
    expect(price).toBe(12.5);
    expect(loginRequired).toBe(false);
    expect(
      extractUtopyaProduct(
        fixtureWithPrice,
        "https://www.utopya.fr/ecran.html",
      ).price,
    ).toBe(12.5);
  });

  it("extracts logged-in visible price 179,84€ from price bloc", () => {
    const html = `
      <div class="product_pricebloc">
        <div class="product-atc">
          <span class="price">179,84€</span>
          <span class="stock">En stock</span>
        </div>
      </div>`;
    expect(extractUtopyaPrice(html).price).toBe(179.84);
  });

  it("keeps only main gallery images, not related accessories", () => {
    const images = extractUtopyaMainImages(
      fixture,
      "https://www.utopya.fr/ecran.html",
    );
    expect(images.some((u) => u.includes("3667075250340"))).toBe(true);
    expect(images.some((u) => u.includes("coque"))).toBe(false);

    const stripped = stripUtopyaRelatedSections(fixture);
    expect(stripped).not.toContain("COVERME Coque TPU");
  });
});

describe("manual price checklist", () => {
  it("accepts integer 12 after manual entry", () => {
    const checklist = buildAdChecklist({
      titre: "Test",
      prix_vente: "12",
      quantite: 1,
      ebay_condition_id: "1000",
      ebay_category_id: "123",
      sku: "SKU",
    });
    expect(checklist.find((c) => c.field === "prix_vente")?.ok).toBe(true);
  });

  it("accepts French comma price", () => {
    const checklist = buildAdChecklist({
      titre: "Test",
      prix_vente: "12,50",
      quantite: 1,
      ebay_condition_id: "1000",
      ebay_category_id: "123",
      sku: "SKU",
    });
    expect(checklist.find((c) => c.field === "prix_vente")?.ok).toBe(true);
  });

  it("rejects empty / zero price", () => {
    expect(
      buildAdChecklist({ titre: "T", prix_vente: null, quantite: 1 })
        .find((c) => c.field === "prix_vente")?.ok,
    ).toBe(false);
    expect(
      buildAdChecklist({ titre: "T", prix_vente: "0", quantite: 1 })
        .find((c) => c.field === "prix_vente")?.ok,
    ).toBe(false);
  });
});
