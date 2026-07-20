import { describe, expect, it } from "vitest";
import { extractJsonLd } from "@/lib/scraping/json-ld";

describe("JSON-LD extraction", () => {
  it("extracts Product from JSON-LD script tag", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Product",
              "name": "MacBook Logic Board",
              "description": "820-01779-A motherboard",
              "sku": "820-01779-A",
              "brand": { "@type": "Brand", "name": "Apple" },
              "offers": { "price": "189.99", "priceCurrency": "EUR" }
            }
          </script>
        </head>
      </html>
    `;

    const product = extractJsonLd(html);

    expect(product).not.toBeNull();
    expect(product?.name).toBe("MacBook Logic Board");
    expect(product?.sku).toBe("820-01779-A");
    expect(product?.brand).toEqual({ "@type": "Brand", name: "Apple" });
    expect(product?.offers?.price).toBe("189.99");
    expect(product?.offers?.priceCurrency).toBe("EUR");
  });

  it("extracts product from JSON-LD array", () => {
    const html = `
      <script type="application/ld+json">
        [
          { "@type": "WebSite", "name": "Shop" },
          {
            "@type": "Product",
            "name": "Charging Port",
            "mpn": "820-00850-A"
          }
        ]
      </script>
    `;

    const product = extractJsonLd(html);

    expect(product?.name).toBe("Charging Port");
    expect(product?.mpn).toBe("820-00850-A");
  });

  it("falls back to item with name when @type is missing", () => {
    const html = `
      <script type="application/ld+json">
        { "name": "Screen Replacement", "description": "LCD panel" }
      </script>
    `;

    const product = extractJsonLd(html);

    expect(product?.name).toBe("Screen Replacement");
  });

  it("returns null when no JSON-LD is present", () => {
    expect(extractJsonLd("<html><body>No structured data</body></html>")).toBeNull();
  });

  it("skips invalid JSON and continues to next script", () => {
    const html = `
      <script type="application/ld+json">{ invalid json }</script>
      <script type="application/ld+json">
        { "@type": "Product", "name": "Valid Product" }
      </script>
    `;

    const product = extractJsonLd(html);

    expect(product?.name).toBe("Valid Product");
  });

  it("extracts image as string or array", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Part",
          "image": ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]
        }
      </script>
    `;

    const product = extractJsonLd(html);

    expect(product?.image).toEqual([
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
    ]);
  });
});
