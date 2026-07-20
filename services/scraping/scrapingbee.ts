import { AppError } from "@/lib/errors/app-error";

export interface ScrapingBeeOptions {
  url: string;
  timeoutMs?: number;
  renderJs?: boolean;
  premiumProxy?: boolean;
  countryCode?: string;
}

export interface ScrapingBeeResponse {
  html: string;
  statusCode: number;
  finalUrl: string;
}

function getApiKey(): string {
  const key = process.env.SCRAPINGBEE_API_KEY;
  if (!key) {
    throw AppError.internal("SCRAPINGBEE_API_KEY is not configured");
  }
  return key;
}

export async function fetchWithScrapingBee(
  options: ScrapingBeeOptions,
): Promise<ScrapingBeeResponse> {
  const {
    url,
    timeoutMs = 30_000,
    renderJs = false,
    premiumProxy = false,
    countryCode = "fr",
  } = options;

  if (process.env.SCRAPINGBEE_MOCK_MODE === "true") {
    return {
      html: `<html><head><title>Mock Page</title></head><body><h1>Mock content for ${url}</h1></body></html>`,
      statusCode: 200,
      finalUrl: url,
    };
  }

  const apiKey = getApiKey();
  const apiUrl = new URL("https://app.scrapingbee.com/api/v1/");
  apiUrl.searchParams.set("api_key", apiKey);
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("country_code", countryCode);

  if (renderJs) {
    apiUrl.searchParams.set("render_js", "true");
  }

  if (premiumProxy) {
    apiUrl.searchParams.set("premium_proxy", "true");
  }

  const response = await fetch(apiUrl.toString(), {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw AppError.internal(
      `ScrapingBee request failed: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();

  return {
    html,
    statusCode: response.status,
    finalUrl: response.url || url,
  };
}
