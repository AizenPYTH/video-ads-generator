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

/**
 * Amazon URLs trop longues / déjà encodées font échouer ScrapingBee (500).
 * On garde une URL canonique courte : https://www.amazon.fr/dp/ASIN
 */
export function normalizeScrapingUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (!isAmazonUrl(parsed.href)) {
      // Retirer fragments inutiles
      parsed.hash = "";
      return parsed.toString();
    }

    const asinMatch = parsed.pathname.match(
      /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
    );
    if (asinMatch?.[1]) {
      const host = parsed.hostname.replace(/^amazon\./i, "www.amazon.");
      const normalizedHost = host.startsWith("www.")
        ? host
        : `www.${host.replace(/^www\./, "")}`;
      // Forcer www.amazon.xx
      const marketHost = parsed.hostname.includes("amazon.")
        ? parsed.hostname.replace(/^(?:www\.)?/, "www.")
        : normalizedHost;
      return `https://${marketHost}/dp/${asinMatch[1].toUpperCase()}`;
    }

    parsed.hash = "";
    // Supprimer les paramètres tracking Amazon
    for (const key of [...parsed.searchParams.keys()]) {
      if (
        /^(ref|psc|smid|pd_rd|pf_rd|qid|sr|keywords|sprefix|crid|dib)/i.test(
          key,
        )
      ) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function countryFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("amazon.fr") || host.endsWith(".fr")) return "fr";
    if (host.includes("amazon.de") || host.endsWith(".de")) return "de";
    if (host.includes("amazon.co.uk")) return "gb";
    if (host.includes("amazon.it")) return "it";
    if (host.includes("amazon.es")) return "es";
    if (host.includes("amazon.ca")) return "ca";
    if (host.includes("amazon.com")) return "us";
  } catch {
    // ignore
  }
  return "fr";
}

function formatScrapingBeeError(
  status: number,
  statusText: string,
  body: string,
): string {
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 180);
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
    return "Délai dépassé chez ScrapingBee. Réessayez, ou activez SCRAPINGBEE_PREMIUM=true.";
  }
  if (
    lower.includes("blocked") ||
    lower.includes("captcha") ||
    status === 403
  ) {
    return "La page a bloqué le scraping (anti-bot). Activez SCRAPINGBEE_PREMIUM=true puis redéployez.";
  }

  return `ScrapingBee a échoué (${status} ${statusText})${snippet ? ` : ${snippet}` : ""}. Vérifiez SCRAPINGBEE_PREMIUM=true sur Vercel.`;
}

type Attempt = {
  renderJs: boolean;
  premiumProxy: boolean;
  stealthProxy: boolean;
  waitMs: number;
  /** Toujours false en pratique — le défaut ScrapingBee casse souvent les fiches produit. */
  blockResources: boolean;
};

async function scrapingBeeOnce(
  apiKey: string,
  targetUrl: string,
  attempt: Attempt,
  countryCode: string,
  timeoutMs: number,
): Promise<
  | { ok: true; html: string }
  | { ok: false; status: number; statusText: string; body: string }
> {
  // Construire manuellement pour éviter un double-encodage bizarre de l'URL cible.
  const params = new URLSearchParams();
  params.set("api_key", apiKey);
  params.set("url", targetUrl);
  params.set("country_code", countryCode);
  params.set("render_js", attempt.renderJs ? "true" : "false");
  // Recommandation ScrapingBee sur erreurs 500
  params.set("block_resources", attempt.blockResources ? "true" : "false");

  if (attempt.premiumProxy) {
    params.set("premium_proxy", "true");
  }
  if (attempt.stealthProxy) {
    params.set("stealth_proxy", "true");
  }
  if (attempt.waitMs > 0 && attempt.renderJs) {
    params.set("wait", String(attempt.waitMs));
  }

  const apiUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;

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
    blockResources: attempt.blockResources,
  });

  const response = await fetch(apiUrl, {
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
    url: rawUrl,
    timeoutMs = 60_000,
    renderJs = false,
    premiumProxy,
    stealthProxy = false,
    countryCode,
    waitMs,
    blockResources,
  } = options;

  const url = normalizeScrapingUrl(rawUrl);

  if (process.env.SCRAPINGBEE_MOCK_MODE === "true") {
    return {
      html: `<html><head><title>Mock Page</title></head><body><h1>Mock content for ${url}</h1></body></html>`,
      statusCode: 200,
      finalUrl: url,
    };
  }

  const apiKey = getApiKey();
  const amazon = isAmazonUrl(url);
  const resolvedCountry = countryCode ?? countryFromUrl(url);

  const forcePremium =
    premiumProxy === true ||
    process.env.SCRAPINGBEE_PREMIUM === "true" ||
    (amazon && process.env.SCRAPINGBEE_PREMIUM !== "false");

  const stealthDefault =
    stealthProxy || process.env.SCRAPINGBEE_STEALTH === "true";

  // Toujours désactiver block_resources sauf demande explicite true
  const defaultBlock = blockResources === true;

  const attempts: Attempt[] = [
    {
      renderJs,
      premiumProxy: forcePremium,
      stealthProxy: stealthDefault,
      waitMs: waitMs ?? (amazon && renderJs ? 3500 : 0),
      blockResources: defaultBlock,
    },
  ];

  // Fallbacks si 500 / anti-bot (tous sites, pas seulement Amazon)
  if (renderJs) {
    if (!forcePremium) {
      attempts.push({
        renderJs: true,
        premiumProxy: true,
        stealthProxy: false,
        waitMs: amazon ? 4000 : 2000,
        blockResources: false,
      });
    }
    attempts.push({
      renderJs: true,
      premiumProxy: true,
      stealthProxy: true,
      waitMs: amazon ? 5000 : 2500,
      blockResources: false,
    });
    // Dernier recours : sans JS (HTML brut)
    attempts.push({
      renderJs: false,
      premiumProxy: true,
      stealthProxy: false,
      waitMs: 0,
      blockResources: false,
    });
  } else if (amazon || forcePremium) {
    attempts.push({
      renderJs: false,
      premiumProxy: true,
      stealthProxy: false,
      waitMs: 0,
      blockResources: false,
    });
  }

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
        resolvedCountry,
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
