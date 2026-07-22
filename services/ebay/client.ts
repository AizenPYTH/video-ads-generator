import { AppError } from "@/lib/errors/app-error";
import { mockEbayResponse } from "./mock";

export interface EbayClientConfig {
  accessToken: string;
  marketplaceId?: string;
  /** Override API host (ex. Taxonomy auto-détecté sandbox/production). */
  baseUrl?: string;
}

export function isEbayMockMode(): boolean {
  return process.env.EBAY_MOCK_MODE === "true";
}

function sanitizeEnvValue(value: string | undefined | null): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "").trim();
}

/**
 * Host API eBay cohérent avec les credentials.
 * Priorité : hint Client ID (SBX/PRD) > EBAY_API_URL > EBAY_ENVIRONMENT.
 */
export function resolveEbayApiHost(): string {
  const clientId = sanitizeEnvValue(process.env.EBAY_CLIENT_ID);
  if (/SBX/i.test(clientId)) {
    return "https://api.sandbox.ebay.com";
  }
  if (/PRD/i.test(clientId)) {
    return "https://api.ebay.com";
  }

  const configured = sanitizeEnvValue(process.env.EBAY_API_URL);
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return sanitizeEnvValue(process.env.EBAY_ENVIRONMENT) === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

export function getEbayApiUrl(): string {
  return resolveEbayApiHost();
}

export function getEbayMarketplaceId(): string {
  return sanitizeEnvValue(process.env.EBAY_MARKETPLACE_ID) || "EBAY_FR";
}

export class EbayClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly marketplaceId: string;

  constructor(config: EbayClientConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl?.trim() || getEbayApiUrl()).replace(
      /\/$/,
      "",
    );
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
      const detailMessage = extractEbayErrorMessage(data);
      throw new AppError(
        "EBAY_ERROR",
        detailMessage
          ? `eBay API error: ${response.status} — ${detailMessage}`
          : `eBay API error: ${response.status}`,
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

function extractEbayErrorMessage(data: unknown): string | null {
  if (!data || typeof data === "string") {
    return typeof data === "string" ? data.slice(0, 300) : null;
  }

  if (!data || typeof data !== "object") return null;

  const record = data as {
    errors?: Array<{
      message?: string;
      longMessage?: string;
      errorId?: number;
      parameters?: Array<{ name?: string; value?: string }>;
    }>;
    error?: string;
    message?: string;
  };

  if (Array.isArray(record.errors) && record.errors.length > 0) {
    return record.errors
      .map((e) => {
        const id = e.errorId != null ? `#${e.errorId} ` : "";
        const text = e.longMessage || e.message || "";
        const params = (e.parameters ?? [])
          .map((p) => `${p.name}=${p.value}`)
          .filter(Boolean)
          .join(", ");
        return `${id}${text}${params ? ` (${params})` : ""}`.trim();
      })
      .filter(Boolean)
      .join(" | ")
      .slice(0, 500);
  }

  if (typeof record.message === "string") return record.message.slice(0, 300);
  if (typeof record.error === "string") return record.error.slice(0, 300);
  return null;
}
