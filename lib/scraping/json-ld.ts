export interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[] | Array<{ url?: string }>;
  brand?: string | { name?: string };
  sku?: string;
  mpn?: string;
  itemCondition?: string;
  offers?: { price?: string | number; priceCurrency?: string };
}

export function extractJsonLd(html: string): JsonLdProduct | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const [, content] of scripts) {
    try {
      const parsed = JSON.parse(content) as JsonLdProduct | JsonLdProduct[];
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const product =
        items.find(
          (item) => (item as { "@type"?: string })["@type"] === "Product",
        ) ?? items.find((item) => item.name);
      if (product) return product;
    } catch {
      continue;
    }
  }

  return null;
}
