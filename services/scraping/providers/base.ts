export interface ScrapedProduct {
  title: string;
  description: string | null;
  /** null si non trouvé — jamais 0 */
  price: number | null;
  currency: string | null;
  images: string[];
  brand: string | null;
  sku: string | null;
  condition: string | null;
  /** Caractéristiques eBay / fiche (Brand, Type, Compatible brand…) */
  itemSpecifics?: Record<string, string>;
  sourceUrl: string;
  raw: Record<string, unknown>;
}

export type ScrapeOptions = {
  /** Cookies session (Utopya) — thread-safe, pas via process.env */
  cookies?: string | null;
};

export interface ProductPageProvider {
  readonly name: string;
  canHandle(url: string): boolean;
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedProduct>;
}
