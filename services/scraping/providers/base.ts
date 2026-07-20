export interface ScrapedProduct {
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  images: string[];
  brand: string | null;
  sku: string | null;
  condition: string | null;
  sourceUrl: string;
  raw: Record<string, unknown>;
}

export interface ProductPageProvider {
  readonly name: string;
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapedProduct>;
}
