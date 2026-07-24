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
  /** Cookies de session (ex. Utopya) — name=value; name2=value2 */
  cookies?: string;
  /** Attendre un sélecteur CSS (render JS requis) */
  waitFor?: string;
}

export interface ScrapingBeeResponse {
  html: string;
  statusCode: number;
  finalUrl: string;
}

function getApiToken(): string {
  const key =
    process.env.ZENROWS_API_KEY?.trim() ||
    process.env.ZENROWS_APIKEY?.trim() ||
    process.env.SCRAPINGBEE_API_KEY?.trim() ||
    process.env.SCRAPE_DO_TOKEN?.trim();
  if (!key) {
    throw AppError.internal(
      "ZenRows non configuré : ajoutez ZENROWS_API_KEY dans .env.local puis redémarrez.",
    );
  }
  return key;
}

/** Diagnostic : n'expose jamais la clé. */
export function getScrapingBeeDiagnostics(): {
  configured: boolean;
  provider: "zenrows";
  premiumDefault: boolean;
} {
  return {
    configured: Boolean(
      process.env.ZENROWS_API_KEY?.trim() ||
        process.env.ZENROWS_APIKEY?.trim() ||
        process.env.SCRAPINGBEE_API_KEY?.trim() ||
        process.env.SCRAPE_DO_TOKEN?.trim(),
    ),
    provider: "zenrows",
    premiumDefault:
      process.env.ZENROWS_PREMIUM === "true" ||
      process.env.SCRAPINGBEE_PREMIUM === "true" ||
      process.env.SCRAPE_DO_SUPER === "true",
  };
}

function isAmazonUrl(url: string): boolean {
  return /amazon\.(fr|com|de|co\.uk|it|es|ca)/i.test(url);
}

function isEbayUrl(url: string): boolean {
  return /ebay\./i.test(url);
}

/**
 * Amazon / eBay : canonise l’URL pour éviter des 500 scrapers.
 */
export function normalizeScrapingUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);

    const ebayItem = parsed.pathname.match(/\/itm\/(?:[^/]+\/)?(\d{9,16})/i);
    if (ebayItem && /ebay\./i.test(parsed.hostname)) {
      const host = parsed.hostname.toLowerCase().replace(/^(www\.)?/, "www.");
      return `https://${host}/itm/${ebayItem[1]}`;
    }

    if (!isAmazonUrl(parsed.href)) {
      parsed.hash = "";
      return parsed.toString();
    }

    const asinMatch = parsed.pathname.match(
      /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
    );
    if (asinMatch?.[1]) {
      const marketHost = parsed.hostname.replace(/^(?:www\.)?/, "www.");
      return `https://${marketHost}/dp/${asinMatch[1].toUpperCase()}`;
    }

    parsed.hash = "";
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
    if (host.includes("amazon.fr") || host.includes("ebay.fr") || host.endsWith(".fr"))
      return "fr";
    if (host.includes("amazon.de") || host.includes("ebay.de") || host.endsWith(".de"))
      return "de";
    if (host.includes("amazon.co.uk") || host.includes("ebay.co.uk")) return "gb";
    if (host.includes("amazon.it") || host.includes("ebay.it")) return "it";
    if (host.includes("amazon.es") || host.includes("ebay.es")) return "es";
    if (host.includes("amazon.ca")) return "ca";
    if (host.includes("amazon.com") || host.includes("ebay.com")) return "us";
  } catch {
    // ignore
  }
  return "fr";
}

function formatZenRowsError(
  status: number,
  statusText: string,
  body: string,
): string {
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 220);
  const lower = snippet.toLowerCase();

  if (status === 401 || status === 403) {
    return "Clé ZenRows invalide ou non autorisée. Vérifiez ZENROWS_API_KEY.";
  }
  if (status === 402) {
    return "Crédits ZenRows épuisés. Rechargez votre compte ZenRows.";
  }
  if (status === 429) {
    return "Trop de requêtes ZenRows (429). Réessayez dans quelques secondes.";
  }
  if (status === 422 || lower.includes("resp001")) {
    return (
      "ZenRows n’a pas pu lire la page (anti-bot / contenu inaccessible). " +
      "Réessayez, ou vérifiez sur app.zenrows.com que le plan inclut JS render + premium proxy " +
      "(eBay/Amazon sont très protégés)."
    );
  }
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    status === 504
  ) {
    return "Délai dépassé chez ZenRows. Réessayez, ou activez ZENROWS_PREMIUM=true.";
  }
  if (
    lower.includes("blocked") ||
    lower.includes("captcha") ||
    lower.includes("reqs002")
  ) {
    return "La page a bloqué le scraping. Activez ZENROWS_PREMIUM=true (premium_proxy) puis redéployez.";
  }

  return `ZenRows a échoué (${status} ${statusText})${snippet ? ` : ${snippet}` : ""}.`;
}

type Attempt = {
  renderJs: boolean;
  usePremium: boolean;
  waitMs: number;
  proxyCountry?: string | null;
  waitFor?: string;
  /** mode=auto laisse ZenRows choisir (ne pas forcer js/premium en même temps) */
  modeAuto?: boolean;
  referer?: string;
};

async function zenRowsOnce(
  apikey: string,
  targetUrl: string,
  attempt: Attempt,
  timeoutMs: number,
  cookies?: string,
): Promise<
  | { ok: true; html: string }
  | { ok: false; status: number; statusText: string; body: string }
> {
  const params = new URLSearchParams();
  params.set("apikey", apikey);
  params.set("url", targetUrl);

  if (attempt.modeAuto) {
    params.set("mode", "auto");
    if (attempt.proxyCountry) {
      params.set("proxy_country", attempt.proxyCountry.toLowerCase());
    }
  } else {
    params.set("js_render", attempt.renderJs ? "true" : "false");
    params.set("premium_proxy", attempt.usePremium ? "true" : "false");
    if (attempt.usePremium && attempt.proxyCountry) {
      params.set("proxy_country", attempt.proxyCountry.toLowerCase());
    }
  }

  if (attempt.waitMs > 0 && (attempt.renderJs || attempt.modeAuto)) {
    params.set("wait", String(Math.min(Math.max(attempt.waitMs, 0), 30000)));
  }
  if (attempt.waitFor?.trim() && (attempt.renderJs || attempt.modeAuto)) {
    params.set("wait_for", attempt.waitFor.trim());
  }

  const needCustomHeaders = Boolean(cookies?.trim() || attempt.referer);
  if (needCustomHeaders) {
    params.set("custom_headers", "true");
  }

  const apiUrl = `https://api.zenrows.com/v1/?${params.toString()}`;

  console.info("[zenrows] request", {
    host: (() => {
      try {
        return new URL(targetUrl).host;
      } catch {
        return "invalid";
      }
    })(),
    modeAuto: Boolean(attempt.modeAuto),
    js_render: attempt.modeAuto ? "auto" : attempt.renderJs,
    premium_proxy: attempt.modeAuto ? "auto" : attempt.usePremium,
    waitMs: attempt.waitMs,
    proxy_country: attempt.proxyCountry ?? null,
    waitFor: attempt.waitFor ?? null,
    hasCookies: Boolean(cookies?.trim()),
    hasReferer: Boolean(attempt.referer),
  });

  const headers: Record<string, string> = {};
  if (cookies?.trim()) headers.Cookie = cookies.trim();
  if (attempt.referer) headers.Referer = attempt.referer;
  if (needCustomHeaders) {
    headers["User-Agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    headers["Accept-Language"] = "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7";
  }

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: Object.keys(headers).length ? headers : undefined,
  });

  const body = await response.text();

  if (!response.ok) {
    console.error("[zenrows] error", {
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

function buildAttempts(options: {
  url: string;
  renderJs: boolean;
  forcePremium: boolean;
  proxyCountry: string;
  waitMs?: number;
  waitFor?: string;
}): Attempt[] {
  const { url, renderJs, forcePremium, proxyCountry, waitMs, waitFor } = options;
  const amazon = isAmazonUrl(url);
  const ebay = isEbayUrl(url);
  const hard = amazon || ebay;

  const referer = ebay
    ? `https://www.${proxyCountry === "us" ? "ebay.com" : `ebay.${proxyCountry === "gb" ? "co.uk" : proxyCountry}`}/`
    : amazon
      ? "https://www.google.com/"
      : undefined;

  const ebayWaitFor =
    waitFor ||
    (ebay
      ? "h1.x-item-title__mainTitle, #itemTitle, [data-testid='x-price-primary'], .x-price-primary"
      : waitFor);

  const baseWait =
    waitMs ??
    (ebay ? 8000 : amazon && renderJs ? 4000 : renderJs ? 2000 : 0);

  const attempts: Attempt[] = [];

  // 1) Config demandée
  attempts.push({
    renderJs: renderJs || hard,
    usePremium: forcePremium || hard,
    waitMs: baseWait,
    proxyCountry,
    waitFor: ebayWaitFor,
    referer,
  });

  if (ebay) {
    // 2) Plus d’attente + FR
    attempts.push({
      renderJs: true,
      usePremium: true,
      waitMs: 12000,
      proxyCountry: "fr",
      waitFor: ebayWaitFor,
      referer: "https://www.ebay.fr/",
    });
    // 3) Autre géo (souvent mieux pour anti-bot)
    attempts.push({
      renderJs: true,
      usePremium: true,
      waitMs: 10000,
      proxyCountry: "de",
      waitFor: ebayWaitFor,
      referer: "https://www.ebay.de/",
    });
    attempts.push({
      renderJs: true,
      usePremium: true,
      waitMs: 10000,
      proxyCountry: "us",
      waitFor: ebayWaitFor,
      referer: "https://www.ebay.com/",
    });
    // 4) mode=auto ZenRows
    attempts.push({
      renderJs: true,
      usePremium: true,
      modeAuto: true,
      waitMs: 8000,
      proxyCountry: "fr",
      waitFor: ebayWaitFor,
      referer: "https://www.google.fr/",
    });
  } else if (renderJs || hard) {
    if (!forcePremium) {
      attempts.push({
        renderJs: true,
        usePremium: true,
        waitMs: amazon ? 5000 : 3000,
        proxyCountry,
        waitFor,
        referer,
      });
    }
    attempts.push({
      renderJs: true,
      usePremium: true,
      waitMs: amazon ? 7000 : 4000,
      proxyCountry,
      waitFor,
      referer,
    });
    attempts.push({
      renderJs: true,
      usePremium: true,
      modeAuto: true,
      waitMs: 5000,
      proxyCountry,
      referer,
    });
  } else if (forcePremium) {
    attempts.push({
      renderJs: true,
      usePremium: true,
      waitMs: 3000,
      proxyCountry,
      referer,
    });
  }

  return attempts;
}

/**
 * Récupère le HTML d’une URL via ZenRows.
 * (Nom historique `fetchWithScrapingBee` conservé pour compatibilité.)
 */
export async function fetchWithScrapingBee(
  options: ScrapingBeeOptions,
): Promise<ScrapingBeeResponse> {
  const {
    url: rawUrl,
    timeoutMs: timeoutOpt,
    renderJs = false,
    premiumProxy,
    stealthProxy = false,
    countryCode,
    waitMs,
    cookies,
    waitFor,
  } = options;

  const url = normalizeScrapingUrl(rawUrl);
  const ebay = isEbayUrl(url);
  const timeoutMs = timeoutOpt ?? (ebay ? 150_000 : 90_000);

  if (
    process.env.ZENROWS_MOCK_MODE === "true" ||
    process.env.SCRAPE_DO_MOCK_MODE === "true" ||
    process.env.SCRAPINGBEE_MOCK_MODE === "true"
  ) {
    return {
      html: `<html><head><title>Mock Page</title></head><body><h1>Mock content for ${url}</h1></body></html>`,
      statusCode: 200,
      finalUrl: url,
    };
  }

  const apikey = getApiToken();
  const amazon = isAmazonUrl(url);
  const proxyCountry = (countryCode ?? countryFromUrl(url)).toLowerCase();

  const forcePremium =
    premiumProxy === true ||
    stealthProxy === true ||
    process.env.ZENROWS_PREMIUM === "true" ||
    process.env.SCRAPINGBEE_PREMIUM === "true" ||
    process.env.SCRAPE_DO_SUPER === "true" ||
    ((amazon || ebay) && process.env.ZENROWS_PREMIUM !== "false");

  const attempts = buildAttempts({
    url,
    renderJs,
    forcePremium,
    proxyCountry,
    waitMs,
    waitFor,
  });

  let lastFail: {
    status: number;
    statusText: string;
    body: string;
  } | null = null;

  for (const attempt of attempts) {
    try {
      const result = await zenRowsOnce(
        apikey,
        url,
        attempt,
        timeoutMs,
        cookies,
      );
      if (result.ok) {
        return {
          html: result.html,
          statusCode: 200,
          finalUrl: url,
        };
      }
      lastFail = result;
      // RESP001 (422) + anti-bot → on enchaîne les tentatives
      const retryable =
        result.status >= 500 ||
        result.status === 422 ||
        result.status === 403 ||
        result.status === 429 ||
        result.status === 400 ||
        /resp001|reqs002|premium|js_render|could not get content/i.test(
          result.body,
        );
      if (!retryable) break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[zenrows] fetch exception", message);
      lastFail = {
        status: 0,
        statusText: "network",
        body: message,
      };
    }
  }

  throw AppError.internal(
    formatZenRowsError(
      lastFail?.status ?? 0,
      lastFail?.statusText ?? "error",
      lastFail?.body ?? "",
    ),
  );
}
