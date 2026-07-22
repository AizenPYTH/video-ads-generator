import { decodeHtmlEntities } from "@/lib/html/decode-entities";
import { extractJsonLd } from "@/lib/scraping/json-ld";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";
import { fetchWithScrapingBee } from "../scrapingbee";
import type { ProductPageProvider, ScrapedProduct } from "./base";

const EBAY_HOSTS = [
  "ebay.com",
  "ebay.fr",
  "ebay.de",
  "ebay.co.uk",
  "ebay.it",
  "ebay.es",
];

export class EbayProductProvider implements ProductPageProvider {
  readonly name = "ebay";

  canHandle(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return EBAY_HOSTS.some((host) => hostname.includes(host));
    } catch {
      return false;
    }
  }

  async scrape(url: string): Promise<ScrapedProduct> {
    const { html } = await fetchWithScrapingBee({
      url,
      renderJs: true,
      premiumProxy: true,
      countryCode: "fr",
      waitMs: 4000,
      blockResources: false,
    });

    const jsonLd = extractJsonLd(html);
    const itemSpecifics = extractAllItemSpecifics(html);

    const title =
      (jsonLd?.name ? String(jsonLd.name) : null) ??
      extractMeta(html, "og:title") ??
      extractBetween(
        html,
        /<h1[^>]*class="[^"]*x-item-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
      ) ??
      extractBetween(html, /<title>([\s\S]*?)<\/title>/i) ??
      "Produit eBay";

    const cleanTitle = decodeHtmlEntities(stripTags(title).trim());

    const priceText =
      extractMeta(html, "product:price:amount") ??
      extractBetween(html, /itemprop="price"[^>]*content="([^"]+)"/i) ??
      extractBetween(
        html,
        /class="[^"]*x-price-primary[^"]*"[^>]*>[\s\S]*?([0-9]+[.,][0-9]+)/i,
      ) ??
      (jsonLd?.offers &&
      !Array.isArray(jsonLd.offers) &&
      jsonLd.offers.price != null
        ? String(jsonLd.offers.price)
        : null);

    const currency =
      extractMeta(html, "product:price:currency") ??
      extractBetween(html, /itemprop="priceCurrency"[^>]*content="([^"]+)"/i) ??
      (jsonLd?.offers &&
      !Array.isArray(jsonLd.offers) &&
      jsonLd.offers.priceCurrency
        ? String(jsonLd.offers.priceCurrency)
        : null) ??
      "EUR";

    const images = [
      ...extractAll(
        html,
        /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/gi,
      ),
      ...(jsonLd?.image
        ? Array.isArray(jsonLd.image)
          ? jsonLd.image.map((img) =>
              typeof img === "string" ? img : (img?.url ?? ""),
            )
          : [String(jsonLd.image)]
        : []),
    ].filter(Boolean);

    const description =
      (jsonLd?.description ? String(jsonLd.description) : null) ??
      extractMeta(html, "og:description") ??
      extractBetween(html, /id="desc_div"[^>]*>([\s\S]*?)<\/div>/i);

    const sku =
      pickSpecific(itemSpecifics, [
        "MPN",
        "Numéro de pièce fabricant",
        "Numero de piece fabricant",
        "Référence fabricant",
        "Manufacturer Part Number",
      ]) ??
      (jsonLd?.mpn ? String(jsonLd.mpn) : null) ??
      (jsonLd?.sku ? String(jsonLd.sku) : null) ??
      null;

    let condition =
      pickSpecific(itemSpecifics, ["Condition", "État", "Etat", "Zustands"]) ??
      (jsonLd?.itemCondition ? String(jsonLd.itemCondition) : null) ??
      null;
    if (condition && /^(particulier|professionnel)$/i.test(condition)) {
      condition = null;
      delete itemSpecifics.État;
      delete itemSpecifics.Etat;
      delete itemSpecifics.Condition;
    }

    // Type : page eBay d’abord, sinon inférence titre (ex. « Écran iPhone 11 »)
    if (!pickSpecific(itemSpecifics, ["Type", "Product Type", "Type de produit"])) {
      const inferred = inferProductTypeFromTitle(cleanTitle);
      if (inferred) {
        itemSpecifics.Type = inferred;
      }
    }

    // Normaliser « Pour Apple » (eBay FR) → Compatible Brand + Marque OEM
    normalizeEbayFrSpecifics(itemSpecifics, cleanTitle);

    const brand =
      pickSpecific(itemSpecifics, ["Brand", "Marque", "Marke", "Marca"]) ??
      brandFromJsonLd(jsonLd) ??
      null;

    if (brand) {
      itemSpecifics.Brand ??= brand;
      itemSpecifics.Marque ??= brand;
    }

    // Pièces : Marque compatible depuis titre si absente
    if (
      !pickSpecific(itemSpecifics, ["Compatible Brand", "Marque compatible"])
    ) {
      const fromTitle = inferCompatibleBrandFromTitle(cleanTitle);
      if (fromTitle) {
        itemSpecifics["Compatible Brand"] = fromTitle;
        itemSpecifics["Marque compatible"] = fromTitle;
      }
    }

    if (
      !pickSpecific(itemSpecifics, ["Brand", "Marque"]) &&
      pickSpecific(itemSpecifics, ["Compatible Brand", "Marque compatible"])
    ) {
      itemSpecifics.Brand = "OEM";
      itemSpecifics.Marque = "OEM";
    }

    return {
      title: cleanTitle,
      description: description
        ? decodeHtmlEntities(stripTags(description).trim())
        : null,
      price: parsePrice(priceText),
      currency,
      images: [...new Set(images)],
      brand,
      sku,
      condition,
      itemSpecifics,
      sourceUrl: url,
      raw: {
        provider: this.name,
        itemSpecificKeys: Object.keys(itemSpecifics),
      },
    };
  }
}

function brandFromJsonLd(
  jsonLd: ReturnType<typeof extractJsonLd>,
): string | null {
  if (!jsonLd?.brand) return null;
  if (typeof jsonLd.brand === "string") return jsonLd.brand;
  if (typeof jsonLd.brand.name === "string") return jsonLd.brand.name;
  return null;
}

function inferCompatibleBrandFromTitle(title: string): string | null {
  if (/\b(iphone|ipad|macbook|airpods|imac|apple\s*watch|\bapple\b)\b/i.test(title)) {
    return "Apple";
  }
  if (/\b(redmi|poco|xiaomi)\b/i.test(title)) return "Xiaomi";
  if (/\b(galaxy|samsung)\b/i.test(title)) return "Samsung";
  if (/\bhuawei\b/i.test(title)) return "Huawei";
  if (/\bhonor\b/i.test(title)) return "Honor";
  if (/\boppo\b/i.test(title)) return "Oppo";
  if (/\boneplus\b/i.test(title)) return "OnePlus";
  if (/\b(pixel|google)\b/i.test(title)) return "Google";
  if (/\bmotorola|moto\b/i.test(title)) return "Motorola";
  return null;
}

function normalizeEbayFrSpecifics(
  specifics: Record<string, string>,
  title: string,
): void {
  const stripPour = (v: string) =>
    v.replace(/^(pour|for|compatible\s+(avec|with))\s+/i, "").trim();

  for (const key of ["Brand", "Marque"]) {
    const val = specifics[key];
    if (!val) continue;
    if (/^(pour|for)\b/i.test(val)) {
      const compat =
        inferCompatibleBrandFromTitle(val) ||
        inferCompatibleBrandFromTitle(title) ||
        stripPour(val);
      if (compat) {
        specifics["Compatible Brand"] ??= compat;
        specifics["Marque compatible"] ??= compat;
      }
      specifics.Brand = "OEM";
      specifics.Marque = "OEM";
    }
  }

  for (const key of ["Compatible Brand", "Marque compatible"]) {
    const val = specifics[key];
    if (!val) continue;
    const cleaned =
      inferCompatibleBrandFromTitle(val) ||
      inferCompatibleBrandFromTitle(stripPour(val)) ||
      stripPour(val);
    if (cleaned) {
      specifics["Compatible Brand"] = cleaned;
      specifics["Marque compatible"] = cleaned;
    }
  }

  for (const key of ["Modèle compatible", "Compatible Device", "Appareil compatible"]) {
    const val = specifics[key];
    if (!val) continue;
    const cleaned = stripPour(val)
      .replace(/^(Apple|Samsung|Xiaomi|Huawei)\s+/i, "")
      .trim();
    if (cleaned) {
      specifics["Appareil compatible"] = cleaned;
      specifics["Compatible Device"] = cleaned;
    }
  }
}

function pickSpecific(
  specifics: Record<string, string>,
  labels: string[],
): string | null {
  for (const label of labels) {
    const direct = specifics[label];
    if (direct?.trim()) return direct.trim();
    const found = Object.entries(specifics).find(
      ([k]) => k.toLowerCase() === label.toLowerCase(),
    );
    if (found?.[1]?.trim()) return found[1].trim();
  }
  return null;
}

/**
 * Agrège les caractéristiques « À propos de cet article » depuis le HTML eBay rendu.
 */
export function extractAllItemSpecifics(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (label: string, value: string) => {
    const l = decodeHtmlEntities(stripTags(label)).replace(/\s+/g, " ").trim();
    const v = decodeHtmlEntities(stripTags(value)).replace(/\s+/g, " ").trim();
    if (!l || !v || l.length > 80 || v.length > 200) return;
    if (/^(voir|see|en savoir|learn more|plus d)/i.test(v)) return;
    if (!out[l]) out[l] = v;
  };

  // 1) Blocs ux-labels-values (eBay moderne)
  for (const block of html.matchAll(
    /class="[^"]*ux-labels-values[^"]*"[^>]*>([\s\S]*?)(?=class="[^"]*ux-labels-values|<\/section|<\/div>\s*<\/div>\s*<div[^>]*class="[^"]*ux-layout)/gi,
  )) {
    const chunk = block[1] ?? "";
    const labels = [
      ...chunk.matchAll(
        /ux-labels-values__labels[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi,
      ),
    ];
    const values = [
      ...chunk.matchAll(
        /ux-labels-values__values[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi,
      ),
    ];
    const n = Math.min(labels.length, values.length);
    for (let i = 0; i < n; i++) {
      put(labels[i][1] ?? "", values[i][1] ?? "");
    }
  }

  // 2) dt/dd ou th/td dans la zone caractéristiques
  for (const m of html.matchAll(
    /<(?:dt|th)[^>]*>([\s\S]*?)<\/(?:dt|th)>\s*<(?:dd|td)[^>]*>([\s\S]*?)<\/(?:dd|td)>/gi,
  )) {
    put(m[1] ?? "", m[2] ?? "");
  }

  // 3) Patterns label puis valeur adjacente
  const knownLabels = [
    "Brand",
    "Marque",
    "Type",
    "MPN",
    "Model",
    "Modèle",
    "Modele",
    "Color",
    "Couleur",
    "Compatible Brand",
    "Marque compatible",
    "Compatible Model",
    "Compatible Device",
    "Appareil compatible",
    "Condition",
    "État",
    "Etat",
    "Material",
    "Matériau",
    "Manufacturer",
    "Fabricant",
    "Numéro de pièce fabricant",
    "Manufacturer Part Number",
    "Product Type",
    "Type de produit",
  ];

  for (const label of knownLabels) {
    if (out[label]) continue;
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `${escaped}\\s*</[^>]+>\\s*<[^>]+>[\\s\\S]*?<[^>]+>([^<]{1,120})`,
        "i",
      ),
      new RegExp(
        `>(${escaped})<\\/[^>]+>[\\s\\S]{0,120}?>([^<]{1,120})<`,
        "i",
      ),
      new RegExp(
        `"label"\\s*:\\s*"${escaped}"[\\s\\S]{0,80}?"value"\\s*:\\s*"([^"]+)"`,
        "i",
      ),
      new RegExp(
        `"name"\\s*:\\s*"${escaped}"[\\s\\S]{0,80}?"value"\\s*:\\s*"([^"]+)"`,
        "i",
      ),
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match) {
        const value = match[2] ?? match[1];
        if (value && normKey(value) !== normKey(label)) {
          put(label, value);
          break;
        }
      }
    }
  }

  // 4) JSON embarqué itemSpecifics / nameValueList
  for (const key of ["nameValueList", "itemSpecifics"] as const) {
    const marker = `"${key}"`;
    let from = 0;
    while (from < html.length) {
      const idx = html.indexOf(marker, from);
      if (idx < 0) break;
      const colon = html.indexOf(":", idx + marker.length);
      if (colon < 0) break;
      const start = html.indexOf("[", colon);
      if (start < 0 || start - colon > 20) {
        from = idx + marker.length;
        continue;
      }
      const slice = extractJsonArray(html, start);
      from = start + 1;
      if (!slice) continue;
      try {
        const list = JSON.parse(slice) as Array<{
          name?: string;
          value?: string | string[];
          values?: string[];
        }>;
        for (const row of list) {
          if (!row?.name) continue;
          const value =
            (Array.isArray(row.value) ? row.value[0] : row.value) ??
            row.values?.[0];
          if (value) put(row.name, String(value));
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 5) JSON-LD additionalProperty
  for (const m of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(m[1]) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const props = (item as { additionalProperty?: unknown })
          .additionalProperty;
        if (!Array.isArray(props)) continue;
        for (const prop of props) {
          if (!prop || typeof prop !== "object") continue;
          const name = (prop as { name?: string }).name;
          const value = (prop as { value?: string }).value;
          if (name && value) put(name, String(value));
        }
      }
    } catch {
      /* ignore */
    }
  }

  return out;
}

function extractJsonArray(html: string, startIdx: number): string | null {
  if (html[startIdx] !== "[") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIdx; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return html.slice(startIdx, i + 1);
    }
  }
  return null;
}

function normKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractMeta(html: string, property: string): string | null {
  const match = html.match(
    new RegExp(
      `<meta[^>]*(?:property|name)="${property}"[^>]*content="([^"]*)"`,
      "i",
    ),
  );
  return match?.[1] ?? null;
}

function extractBetween(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractAll(html: string, regex: RegExp): string[] {
  return [...html.matchAll(regex)].map((m) => m[1]).filter(Boolean);
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function parsePrice(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
