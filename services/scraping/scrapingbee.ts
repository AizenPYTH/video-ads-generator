import { AppError } from "@/lib/errors/app-error";

export interface ScrapingBeeOptions {
  url: string;
  timeoutMs?: number;
  renderJs?: boolean;
  premiumProxy?: boolean;
  stealthProxy?: boolean;
  countryCode?: string;
  waitMs?: number;
  blockResources?: boolean;
}

export interface ScrapingBeeResponse {
  html: string;
  statusCode: number;
  finalUrl: string;
}

function getApiKey(): string {
  // Server-only. Never use NEXT_PUBLIC_SCRAPINGBEE_API_KEY.
  const key = process.env.SCRAPINGBEE_API_KEY?.trim();
  if (!key) {
    throw AppError.internal(
      "ScrapingBee non configuré : ajoutez SCRAPINGBEE_API_KEY dans .env.local puis redémarrez npm run dev.",
    );
  }
  return key;
}

/** Diagnostic temporaire : n'expose jamais la clé. */
export function getScrapingBeeDiagnostics(): {
  configured: boolean;
  premiumDefault: boolean;
} {
  return {
    configured: Boolean(process.env.SCRAPINGBEE_API_KEY?.trim()),
    premiumDefault: process.env.SCRAPINGBEE_PREMIUM === "true",
  };
}

function isAmazonUrl(url: string): boolean {
  return /amazon\.(fr|com|de|co\.uk|it|es|ca)/i.test(url);
}

function formatScrapingBeeError(
  status: number,
  statusText: string,
  body: string,
): string {
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 200);
  const lower = snippet.toLowerCase();

  if (status === 401) {
    return "Clé ScrapingBee invalide (401). Vérifiez SCRAPINGBEE_API_KEY.";
  }
  if (status === 402) {
    return "Crédits ScrapingBee épuisés (402). Rechargez votre compte ScrapingBee.";
  }
  if (status === 429) {
    return "Trop de requêtes ScrapingBee (429). Réessayez dans quelques secondes.";
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    status === 504
  ) {
    return "Délai dépassé chez ScrapingBee. Réessayez, ou activez SCRAPINGBEE_PREMIUM=true pour Amazon.";
  }
  if (
    lower.includes("blocked") ||
    lower.includes("captcha") ||
    lower.includes("403") ||
    status === 403
  ) {
    return "La page a bloqué le scraping (anti-bot). Activez SCRAPINGBEE_PREMIUM=true dans .env.local puis redémarrez.";
  }

  return `ScrapingBee a échoué (${status} ${statusText})${snippet ? ` : ${snippet}` : ""}. Pour Amazon, essayez SCRAPINGBEE_PREMIUM=true.`;
}

type Attempt = {
  renderJs: boolean;
  premiumProxy: boolean;
  stealthProxy: boolean;
  waitMs: number;
  blockResources: boolean;
};

async function scrapingBeeOnce(
  apiKey: string,
  targetUrl: string,
  attempt: Attempt,
  countryCode: string,
  timeoutMs: number,
): Promise<{ ok: true; html: string } | { ok: false; status: number; statusText: string; body: string }> {
  const apiUrl = new URL("https://app.scrapingbee.com/api/v1/");
  apiUrl.searchParams.set("api_key", apiKey);
  apiUrl.searchParams.set("url", targetUrl);
  apiUrl.searchParams.set("country_code", countryCode);
  apiUrl.searchParams.set("render_js", attempt.renderJs ? "true" : "false");

  if (attempt.premiumProxy) {
    apiUrl.searchParams.set("premium_proxy", "true");
  }
  if (attempt.stealthProxy) {
    apiUrl.searchParams.set("stealth_proxy", "true");
  }
  if (attempt.waitMs > 0 && attempt.renderJs) {
    apiUrl.searchParams.set("wait", String(attempt.waitMs));
  }
  // Amazon / JS sites cassent souvent avec block_resources=true (défaut ScrapingBee)
  if (attempt.blockResources === false) {
    apiUrl.searchParams.set("block_resources", "false");
  }

  console.info("[scrapingbee] request", {
    host: (() => {
      try {
        return new URL(targetUrl).host;
      } catch {
        return "invalid";
      }
    })(),
    renderJs: attempt.renderJs,
    premium: attempt.premiumProxy,
    stealth: attempt.stealthProxy,
    waitMs: attempt.waitMs,
  });

  const response = await fetch(apiUrl.toString(), {
    signal: AbortSignal.timeout(timeoutMs),
  });

  const body = await response.text();

  if (!response.ok) {
    console.error("[scrapingbee] error", {
      status: response.status,
      body: body.slice(0, 300),
    });
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      body,
    };
  }

  return { ok: true, html: body };
}

export async function fetchWithScrapingBee(
  options: ScrapingBeeOptions,
): Promise<ScrapingBeeResponse> {
  const {
    url,
    timeoutMs = 45_000,
    renderJs = false,
    premiumProxy,
    stealthProxy = false,
    countryCode = "fr",
    waitMs,
    blockResources,
  } = options;

  if (process.env.SCRAPINGBEE_MOCK_MODE === "true") {
    return {
      html: `<html><head><title>Mock Page</title></head><body><h1>Mock content for ${url}</h1></body></html>`,
      statusCode: 200,
      finalUrl: url,
    };
  }

  const apiKey = getApiKey();
  const amazon = isAmazonUrl(url);
  // Amazon : premium par défaut (sauf SCRAPINGBEE_PREMIUM=false)
  const forcePremium =
    premiumProxy === true ||
    process.env.SCRAPINGBEE_PREMIUM === "true" ||
    (amazon &&
      premiumProxy !== false &&
      process.env.SCRAPINGBEE_PREMIUM !== "false");

  const attempts: Attempt[] = [];

  // Tentative principale
  attempts.push({
    renderJs,
    premiumProxy: forcePremium,
    stealthProxy: stealthProxy || process.env.SCRAPINGBEE_STEALTH === "true",
    waitMs: waitMs ?? (amazon && renderJs ? 3000 : 0),
    blockResources: blockResources ?? (amazon ? false : true),
  });

  // Fallback Amazon : premium si pas déjà, puis stealth
  if (amazon && renderJs) {
    if (!forcePremium) {
      attempts.push({
        renderJs: true,
        premiumProxy: true,
        stealthProxy: false,
        waitMs: 4000,
        blockResources: false,
      });
    }
    if (process.env.SCRAPINGBEE_STEALTH === "true" || !forcePremium) {
      attempts.push({
        renderJs: true,
        premiumProxy: false,
        stealthProxy: true,
        waitMs: 5000,
        blockResources: false,
      });
    }
  }

  // Dédupliquer les tentatives identiques
  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter((a) => {
    const key = `${a.renderJs}:${a.premiumProxy}:${a.stealthProxy}:${a.waitMs}:${a.blockResources}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastFail: { status: number; statusText: string; body: string } | null =
    null;

  for (const attempt of uniqueAttempts) {
    try {
      const result = await scrapingBeeOnce(
        apiKey,
        url,
        attempt,
        countryCode,
        timeoutMs,
      );
      if (result.ok) {
        if (result.html.length < 200) {
          lastFail = {
            status: 500,
            statusText: "Empty response",
            body: "Réponse HTML trop courte — page probablement bloquée.",
          };
          continue;
        }
        return {
          html: result.html,
          statusCode: 200,
          finalUrl: url,
        };
      }
      lastFail = result;
      // Ne pas retry sur erreurs de compte
      if (result.status === 401 || result.status === 402) break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[scrapingbee] fetch exception", message);
      lastFail = {
        status: 500,
        statusText: "Exception",
        body: message,
      };
    }
  }

  throw AppError.internal(
    formatScrapingBeeError(
      lastFail?.status ?? 500,
      lastFail?.statusText ?? "Error",
      lastFail?.body ?? "",
    ),
  );
}
