import { describe, expect, it } from "vitest";

/**
 * Miroir léger de la logique de filtrage (évite d'exporter tout ScrapingBee).
 */
function stripRelatedProductSections(html: string): string {
  return html.replace(
    /<(?:aside|section|div)[^>]*(?:id|class)=["'][^"']*(?:related|recommand|recommend|suggest|similar|upsell|product[-_]?recommendations?)[^"']*["'][^>]*>[\s\S]*?<\/(?:aside|section|div)>/gi,
    " ",
  );
}

describe("scrape related-product filter", () => {
  it("removes related product blocks but keeps main gallery", () => {
    const html = `
      <div class="product-gallery">
        <img src="https://cdn.example.com/main.jpg" />
      </div>
      <section class="product-recommendations">
        <img src="https://cdn.example.com/other-product.jpg" />
      </section>
      <div class="related-products">
        <img src="https://cdn.example.com/upsell.jpg" />
      </div>
    `;
    const cleaned = stripRelatedProductSections(html);
    expect(cleaned).toContain("main.jpg");
    expect(cleaned).not.toContain("other-product.jpg");
    expect(cleaned).not.toContain("upsell.jpg");
  });
});
