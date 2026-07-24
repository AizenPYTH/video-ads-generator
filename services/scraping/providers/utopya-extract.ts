/**
 * Extraction Magento / Utopya (fiches produit + prix + attributs + galerie).
 * Ne lit que le HTML — n’invente aucune caractéristique.
 */

import {
  parseFrenchPrice,
  PRICE_NOT_DETECTED_MESSAGE,
} from "@/lib/scraping/parse-price";
import { decodeHtmlEntities } from "@/lib/html/decode-entities";

export type UtopyaExtractResult = {
  title: string | null;
  sku: string | null;
  ean: string | null;
  brand: string | null;
  description: string | null;
  price: number | null;
  priceLoginRequired: boolean;
  priceWarning: string | null;
  images: string[];
  itemSpecifics: Record<string, string>;
  attributes: Record<string, string>;
};

const ATTR_TO_EBAY: Record<string, string[]> = {
  fabricant: ["Brand", "Marque"],
  marque: ["Brand", "Marque"],
  brand: ["Brand", "Marque"],
  custom_type: ["Type", "Type de produit", "Product Type"],
  type: ["Type", "Type de produit"],
  qualite: ["Qualité"],
  // SKU Utopya ≠ MPN eBay (MPN = référence fabricant)
  mpn: ["MPN"],
  reference: ["MPN"],
  "reference fabricant": ["MPN", "Référence fabricant"],
  ref_fabricant: ["MPN", "Référence fabricant"],
  manufacturer_part_number: ["MPN", "Référence fabricant"],
  ean: ["EAN"],
  gtin: ["EAN"],
  couleur: ["Color", "Couleur"],
  color: ["Color", "Couleur"],
  compatibilite: [
    "Compatible Device",
    "Appareil compatible",
    "Modèle compatible",
  ],
  marque_compatible: ["Compatible Brand", "Marque compatible"],
  compatible_brand: ["Compatible Brand", "Marque compatible"],
  "marque compatible": ["Compatible Brand", "Marque compatible"],
  pour: ["Compatible Brand", "Marque compatible"],
  modele: ["Model", "Modèle"],
  model: ["Model", "Modèle"],
  etat: ["Condition"],
  garantie: ["Garantie"],
};

function absolutize(raw: string, pageUrl: string): string | null {
  if (!raw || raw.startsWith("data:")) return null;
  try {
    return new URL(raw, pageUrl).toString();
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Retire les blocs recommandations / accessoires Utopya. */
export function stripUtopyaRelatedSections(html: string): string {
  let cleaned = html;
  const patterns = [
    /<(?:div|section|aside)[^>]*(?:class|id)=["'][^"']*(?:selection-related|related_products|ajax-selection|products-related|block\s+related|upsell|crosssell|vous[-_]?aimerez|complements?)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section|aside)>/gi,
    /<(?:div|section)[^>]*class=["'][^"']*products\s+wrapper[^"']*products-grid[^"']*["'][^>]*>[\s\S]*?<\/(?:div|section)>/gi,
  ];
  for (const re of patterns) {
    cleaned = cleaned.replace(re, " ");
  }
  return cleaned;
}

export function extractUtopyaAttributes(
  html: string,
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const m of html.matchAll(
    /<li\b[^>]*data-code=["']([^"']+)["'][^>]*>([\s\S]*?)<\/li>/gi,
  )) {
    const code = m[1]?.trim().toLowerCase();
    const block = m[2] ?? "";
    if (!code) continue;

    const label =
      block
        .match(/class=["'][^"']*t_span[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1]
        ?.replace(/<[^>]+>/g, "")
        .trim()
        .toLowerCase() || "";

    let value = "";
    const strong = block.match(
      /<(?:strong|span)[^>]*class=["'][^"']*\bdata\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:strong|span)>/i,
    );
    if (strong?.[1]) {
      value = stripTags(strong[1]);
    }
    if (!value) {
      const link = block.match(/<(?:a)[^>]*>([\s\S]*?)<\/a>/i);
      if (link?.[1]) value = stripTags(link[1]);
    }
    if (!value) {
      const fake = block.match(
        /class=["'][^"']*fake-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (fake?.[1]) value = stripTags(fake[1]);
    }
    if (!value || /^n\/?a$/i.test(value)) continue;
    out[code] = value;

    // Alias FR utiles (Référence fabricant, Marque…)
    if (label.includes("référence fabricant") || label.includes("reference fabricant")) {
      out["reference fabricant"] = value;
    }
    if (label === "marque" || label === "brand") {
      out.marque = value;
    }
    if (label.includes("ean")) {
      out.ean = value;
    }
  }

  return out;
}

function mapAttributesToItemSpecifics(
  attrs: Record<string, string>,
): Record<string, string> {
  const specifics: Record<string, string> = {};

  for (const [code, value] of Object.entries(attrs)) {
    if (!value?.trim()) continue;
    const keys = ATTR_TO_EBAY[code];
    if (keys) {
      for (const key of keys) {
        specifics[key] ??= value.trim();
      }
    } else {
      // Conservé tel quel (libellé code Magento) sans inventer
      const label = code
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      specifics[label] ??= value.trim();
    }
  }

  return specifics;
}

/**
 * Prix Magento / Utopya : data-price-amount, JSON finalPrice, texte .price.
 * Ignore les prix dans les cartes recommandations si html déjà filtré.
 */
export function extractUtopyaPrice(html: string): {
  price: number | null;
  loginRequired: boolean;
} {
  const loginRequired =
    /box-no-log|log-to-see-price|devez être connecté|S'identifier pour voir le prix/i.test(
      html,
    );

  // Bloc achat à droite (captures utilisateur : 179,84€)
  const priceBloc =
    html.match(
      /<(?:div|aside)[^>]*class=["'][^"']*product_pricebloc[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside)>/i,
    )?.[1] ??
    html.match(
      /<(?:div)[^>]*class=["'][^"']*product-atc[^"']*["'][^>]*>([\s\S]*?)<\/(?:div)>/i,
    )?.[1] ??
    "";

  const scopes = [priceBloc, html].filter(Boolean);

  for (const scope of scopes) {
    const patterns: RegExp[] = [
      /data-price-amount=["']([0-9]+(?:[.,][0-9]+)?)["']/gi,
      /data-price=["']([0-9]+(?:[.,][0-9]+)?)["']/gi,
      /"finalPrice"\s*:\s*\{[^}]*?"amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/gi,
      /"amount"\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*"currency"/gi,
      /itemprop=["']price["'][^>]*content=["']([^"']+)["']/gi,
      /content=["']([^"']+)["'][^>]*itemprop=["']price["']/gi,
      // Texte visible connecté : 179,84€ / 179.84 €
      /(?:class=["'][^"']*\bprice\b[^"']*["'][^>]*>\s*)(\d{1,5}(?:[.,]\d{2})?)\s*€/gi,
      /(\d{1,5}[.,]\d{2})\s*€/g,
    ];

    for (const re of patterns) {
      for (const m of scope.matchAll(re)) {
        const n = parseFrenchPrice(m[1]);
        if (n != null) return { price: n, loginRequired: false };
      }
    }
  }

  return { price: null, loginRequired };
}

/** Galerie principale uniquement (.product-slider / .product_mainbloc). */
export function extractUtopyaMainImages(
  html: string,
  pageUrl: string,
): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const abs = absolutize(raw.trim().split(/\s+/)[0]!, pageUrl);
    if (!abs) return;
    if (!/\/media\/catalog\/product\//i.test(abs)) return;
    if (/sprite|logo|swatch|placeholder|banner/i.test(abs)) return;
    urls.push(abs);
  };

  const blocks = [
    ...html.matchAll(
      /<(?:div|section)[^>]*(?:class|id)=["'][^"']*(?:product-slider|product_mainbloc|gallery-placeholder)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
    ),
  ];

  const scope =
    blocks.length > 0
      ? blocks.map((b) => b[1] ?? "").join("\n")
      : stripUtopyaRelatedSections(html);

  for (const m of scope.matchAll(/<(?:img|source)[^>]+>/gi)) {
    const tag = m[0];
    if (/product-image-photo/i.test(tag) && /product-item/i.test(scope)) {
      // product-image-photo souvent = cartes grille ; dans le slider Utopya utilise .zoom
      continue;
    }
    for (const attr of ["data-zoom-image", "data-src", "src", "srcset"]) {
      const match = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
      if (!match?.[1]) continue;
      if (attr === "srcset") {
        for (const part of match[1].split(",")) push(part.trim());
      } else {
        push(match[1]);
      }
    }
  }

  // Fallback : première image zoom / EAN dans le mainbloc
  if (urls.length === 0) {
    for (const m of html.matchAll(
      /class=["'][^"']*\bzoom\b[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    )) {
      push(m[1]);
    }
    for (const m of html.matchAll(
      /src=["']([^"']+)["'][^>]*class=["'][^"']*\bzoom\b[^"']*["']/gi,
    )) {
      push(m[1]);
    }
  }

  // Déduplique en gardant l’ordre (ignore variantes cache/)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const key = u.replace(/\/cache\/[^/]+\//i, "/");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= 6) break;
  }
  return out;
}

export function extractUtopyaTitle(html: string): string | null {
  const h1 = html.match(
    /<h1[^>]*class=["'][^"']*product[^"']*block-title[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*base[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  if (h1?.[1]) return stripTags(h1[1]);
  const h1b = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1b?.[1]) return stripTags(h1b[1]);
  return null;
}

export function extractUtopyaDescription(html: string): string | null {
  const desc = html.match(
    /<(?:div|section)[^>]*class=["'][^"']*product-description[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i,
  );
  if (!desc?.[1]) return null;
  const text = stripTags(desc[1]);
  return text.length > 20 ? text.slice(0, 5000) : null;
}

export function isUtopyaUrl(url: string): boolean {
  try {
    return /utopya\.fr$/i.test(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return /utopya\.fr/i.test(url);
  }
}

export function extractUtopyaProduct(
  html: string,
  pageUrl: string,
): UtopyaExtractResult {
  // Scope prix + attributs : hors recommandations
  const mainHtml = stripUtopyaRelatedSections(html);
  const attrs = extractUtopyaAttributes(mainHtml);
  const { price, loginRequired } = extractUtopyaPrice(
    // Prefer price bloc
    (() => {
      const bloc = mainHtml.match(
        /<(?:div|aside)[^>]*class=["'][^"']*product_pricebloc[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside)>/i,
      );
      return bloc?.[0] ?? mainHtml;
    })(),
  );

  const itemSpecifics = mapAttributesToItemSpecifics(attrs);
  const brand =
    attrs.fabricant && !/^n\/?a$/i.test(attrs.fabricant)
      ? attrs.fabricant
      : attrs.marque && !/^n\/?a$/i.test(attrs.marque)
        ? attrs.marque
        : null;

  let ean = attrs.ean ?? attrs.gtin ?? null;
  if (!ean) {
    const fromText = mainHtml.match(/\bEAN\b[\s\S]{0,60}?(\d{8,14})/i);
    if (fromText?.[1]) ean = fromText[1];
  }
  if (ean) {
    itemSpecifics.EAN ??= ean;
  }

  if (attrs.compatibilite) {
    itemSpecifics["Compatible Device"] ??= attrs.compatibilite;
    itemSpecifics["Appareil compatible"] ??= attrs.compatibilite;
    itemSpecifics["Modèle compatible"] ??= attrs.compatibilite;
    const compatBrand = attrs.compatibilite.match(
      /\b(Apple|Samsung|Xiaomi|Huawei|Oppo|Honor|Google|OnePlus|Sony|Nokia|Motorola|Realme|Vivo|Asus|Lenovo|Microsoft|Nintendo|HP|Dell)\b/i,
    )?.[1];
    if (compatBrand) {
      itemSpecifics["Compatible Brand"] ??= compatBrand;
      itemSpecifics["Marque compatible"] ??= compatBrand;
    }
  }

  // Marque pièce inconnue → OEM (pièces détachées Utopya)
  if (!brand && !itemSpecifics.Brand && !itemSpecifics.Marque) {
    itemSpecifics.Brand = "OEM";
    itemSpecifics.Marque = "OEM";
  }

  const images = extractUtopyaMainImages(html, pageUrl);

  return {
    title: extractUtopyaTitle(html),
    sku: attrs.sku ?? null,
    ean,
    brand,
    description: extractUtopyaDescription(html),
    price,
    priceLoginRequired: loginRequired && price == null,
    priceWarning:
      price == null
        ? loginRequired
          ? `${PRICE_NOT_DETECTED_MESSAGE} (prix Utopya visible après connexion professionnelle).`
          : PRICE_NOT_DETECTED_MESSAGE
        : null,
    images,
    itemSpecifics: Object.fromEntries(
      Object.entries(itemSpecifics).filter(
        ([, v]) => typeof v === "string" && v.trim().length > 0,
      ),
    ),
    attributes: attrs,
  };
}
