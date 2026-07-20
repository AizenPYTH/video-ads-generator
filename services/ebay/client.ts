import { AppError } from "@/lib/errors/app-error";
import { mockEbayResponse } from "./mock";

export interface EbayClientConfig {
  accessToken: string;
  marketplaceId?: string;
}

export function isEbayMockMode(): boolean {
  return process.env.EBAY_MOCK_MODE === "true";
}

export function getEbayApiUrl(): string {
  return (
    process.env.EBAY_API_URL ??
    (process.env.EBAY_ENVIRONMENT === "production"
      ? "https://api.ebay.com"
      : "https://api.sandbox.ebay.com")
  );
}

export function getEbayMarketplaceId(): string {
  return process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR";
}

export class EbayClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly marketplaceId: string;

  constructor(config: EbayClientConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = getEbayApiUrl();
    this.marketplaceId = config.marketplaceId ?? getEbayMarketplaceId();
  }

  get marketplace(): string {
    return this.marketplaceId;
  }

  async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    if (isEbayMockMode()) {
      return mockEbayResponse(path, {} as T);
    }

    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "Accept-Language": "fr-FR",
        "Content-Language": "fr-FR",
        "X-EBAY-C-MARKETPLACE-ID": this.marketplaceId,
        ...options?.headers,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      throw new AppError(
        "EBAY_ERROR",
        `eBay API error: ${response.status}`,
        {
          status: response.status,
          details: data,
        },
      );
    }

    return data as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
