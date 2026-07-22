/**
 * Construit les aspects (item specifics) pour l’Inventory API eBay FR.
 * Sources : metadata CSV/URL, identification photo, champs dédiés.
 * Mappe les clés EN du fichier d’import vers les noms localisés Taxonomy (ex. Marque compatible).
 */
import type { CategoryAspect } from "@/services/ebay/taxonomy";
import { inferProductTypeFromTitle } from "@/lib/scraping/infer-product-type";

export type AspectSourceInput = {
  itemSpecifics?: Record<string, string | string[] | null | undefined> | null;
  brand?: string | null;
  manufacturer?: string | null;
  mpn?: string | null;
  model?: string | null;
  type?: string | null;
  productType?: string | null;
  color?: string | null;
  material?: string | null;
  compatibleBrand?: string | null;
  compatibleDevice?: string | null;
  compatibleModel?: string | null;
  title?: string | null;
};

/** Alias EN/FR/variantes → famille d’aspect */
const ASPECT_FAMILIES: Record<string, string[]> = {
  brand: ["brand", "marque", "marke", "marca"],
  mpn: [
    "mpn",
    "manufacturer part number",
    "référence fabricant",
    "ref fabricant",
    "numero de piece fabricant",
    "numéro de pièce fabricant",
  ],
  model: ["model", "modèle", "modele"],
  type: ["type", "product type", "type de produit", "sold item name"],
  color: ["color", "colour", "couleur", "farbe"],
  material: ["material", "matériau", "materiau", "matière", "matiere"],
  manufacturer: ["manufacturer", "fabricant", "hersteller"],
  "compatible brand": [
    "compatible brand",
    "marque compatible",
    "kompatible marke",
    "marca compatible",
  ],
  "compatible device": [
    "compatible device",
    "appareil compatible",
    "modèle compatible",
    "modele compatible",
    "compatible model",
    "gerät kompatibel",
  ],
  "compatible model": [
    "compatible model number",
    "compatible model",
    "numéro de modèle compatible",
    "numero de modele compatible",
    "n° de modèle compatible",
  ],
};

const KNOWN_COMPAT_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Huawei",
  "Honor",
  "Oppo",
  "OnePlus",
  "Google",
  "Sony",
  "Motorola",
  "Nokia",
  "Realme",
  "Vivo",
  "Asus",
  "Lenovo",
  "Dell",
  "HP",
  "Microsoft",
] as const;

const JUNK_ASPECT_VALUES =
  /^(particulier|professionnel|voir (la )?description|see (the )?description|non applicable|n\/?a|-|—)$/i;

function normKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asSingleValue(
  value: string | string[] | null | undefined,
): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const first = value.map((v) => String(v).trim()).find(Boolean);
    return first ?? null;
  }
  const text = String(value).trim();
  return text || null;
}

/** eBay FR affiche souvent « Pour Apple » / « Pour Samsung Galaxy… » */
function stripPourPrefix(value: string): string {
  return value
    .replace(/^(pour|for|compatible\s+(avec|with))\s+/i, "")
    .trim();
}

function detectBrandInText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const hay = text.toLowerCase();
  for (const brand of KNOWN_COMPAT_BRANDS) {
    if (new RegExp(`\\b${brand}\\b`, "i").test(hay)) return brand;
  }
  if (/\b(iphone|ipad|macbook|airpods|imac)\b/i.test(hay)) return "Apple";
  if (/\b(galaxy|redmi|poco)\b/i.test(hay)) {
    if (/\bredmi|poco\b/i.test(hay)) return "Xiaomi";
    return "Samsung";
  }
  return null;
}

function looksLikeCompatPhrase(value: string): boolean {
  return /^(pour|for|compatible)\b/i.test(value.trim());
}

function familyForKey(key: string): string | null {
  const n = normKey(key);
  // « Marque compatible » ne doit PAS tomber dans la famille brand
  if (n.includes("compatible") && n.includes("marque")) {
    return "compatible brand";
  }
  if (n.includes("compatible") && (n.includes("brand") || n.includes("marca"))) {
    return "compatible brand";
  }
  for (const [family, aliases] of Object.entries(ASPECT_FAMILIES)) {
    if (aliases.some((a) => normKey(a) === n)) return family;
  }
  return null;
}

function familyForAspectName(aspectName: string): string | null {
  return familyForKey(aspectName);
}

/** Collecte brute (clés d’origine) depuis toutes les sources. */
export function collectRawAspectValues(
  input: AspectSourceInput,
): Record<string, string> {
  const out: Record<string, string> = {};

  const put = (key: string, value: string | string[] | null | undefined) => {
    const v = asSingleValue(value);
    if (!v || !key.trim()) return;
    if (JUNK_ASPECT_VALUES.test(v)) return;
    out[key.trim()] = v;
  };

  if (input.itemSpecifics) {
    for (const [k, v] of Object.entries(input.itemSpecifics)) {
      put(k, v);
    }
  }

  put("Brand", input.brand);
  put("Marque", input.brand);
  put("Manufacturer", input.manufacturer);
  put("Fabricant", input.manufacturer);
  put("MPN", input.mpn);
  put("Model", input.model);
  put("Modèle", input.model);
  put("Type", input.type ?? input.productType);
  put("Color", input.color);
  put("Couleur", input.color);
  put("Material", input.material);
  put("Compatible Brand", input.compatibleBrand);
  put("Marque compatible", input.compatibleBrand);
  put("Compatible Device", input.compatibleDevice);
  put("Appareil compatible", input.compatibleDevice);
  put("Compatible Model Number", input.compatibleModel);
  put("Numéro de modèle compatible", input.compatibleModel);

  enrichAspectsFromTitleAndCompat(out, input.title);

  return out;
}

/**
 * Normalise les valeurs eBay FR (« Pour Apple ») et complète Brand / Type / Compatible.
 */
function enrichAspectsFromTitleAndCompat(
  out: Record<string, string>,
  title: string | null | undefined,
): void {
  const titleText = title ?? "";

  // Brand du type « Pour Apple » → plutôt Marque compatible
  for (const key of ["Brand", "Marque"]) {
    const val = out[key];
    if (!val) continue;
    if (looksLikeCompatPhrase(val) || detectBrandInText(val)) {
      const compat = detectBrandInText(val) ?? stripPourPrefix(val);
      if (compat && !out["Compatible Brand"] && !out["Marque compatible"]) {
        out["Compatible Brand"] = compat;
        out["Marque compatible"] = compat;
      }
      if (looksLikeCompatPhrase(val)) {
        out.Brand = "OEM";
        out.Marque = "OEM";
      }
    }
  }

  // « Pour Apple » sur Marque compatible → Apple
  for (const key of ["Compatible Brand", "Marque compatible"]) {
    const val = out[key];
    if (!val) continue;
    const detected = detectBrandInText(val) ?? stripPourPrefix(val);
    if (detected) {
      out["Compatible Brand"] = detected;
      out["Marque compatible"] = detected;
    }
  }

  // Appareil : « Pour Apple iPhone 11 » → iPhone 11
  for (const key of [
    "Compatible Device",
    "Appareil compatible",
    "Modèle compatible",
    "Compatible Model",
  ]) {
    const val = out[key];
    if (!val) continue;
    const cleaned = stripPourPrefix(val)
      .replace(/^(Apple|Samsung|Xiaomi|Huawei)\s+/i, "")
      .trim();
    if (cleaned && cleaned !== val) {
      out["Appareil compatible"] = cleaned;
      out["Compatible Device"] = cleaned;
    }
  }

  const inferredCompat =
    detectBrandInText(out["Compatible Brand"]) ||
    detectBrandInText(out["Marque compatible"]) ||
    detectBrandInText(titleText) ||
    detectBrandInText(out["Modèle compatible"]) ||
    detectBrandInText(out["Appareil compatible"]);

  if (inferredCompat) {
    if (!out["Compatible Brand"] && !out["Marque compatible"]) {
      out["Compatible Brand"] = inferredCompat;
      out["Marque compatible"] = inferredCompat;
    } else {
      const current = out["Marque compatible"] || out["Compatible Brand"] || "";
      if (looksLikeCompatPhrase(current) || /pour\s+/i.test(current)) {
        out["Compatible Brand"] = inferredCompat;
        out["Marque compatible"] = inferredCompat;
      }
    }
  }

  if (!out.Brand && !out.Marque) {
    out.Brand = "OEM";
    out.Marque = "OEM";
  }

  if (!out.Type) {
    const inferredType = inferProductTypeFromTitle(titleText);
    if (inferredType) out.Type = inferredType;
  }
}

function pickValueForAspect(
  aspectName: string,
  raw: Record<string, string>,
): string | null {
  const aspectNorm = normKey(aspectName);
  const aspectFamily = familyForAspectName(aspectName);

  for (const [k, v] of Object.entries(raw)) {
    if (normKey(k) === aspectNorm) return v;
  }

  if (aspectFamily) {
    const aliases = ASPECT_FAMILIES[aspectFamily] ?? [];
    for (const [k, v] of Object.entries(raw)) {
      const keyFamily = familyForKey(k);
      if (keyFamily === aspectFamily) return v;
      if (aliases.some((a) => normKey(a) === normKey(k))) return v;
    }
  }

  return null;
}

function preferAllowedValue(value: string, aspect: CategoryAspect): string {
  if (!aspect.values.length) return value;

  const candidates = [
    value,
    stripPourPrefix(value),
    detectBrandInText(value) ?? "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const exact = aspect.values.find((v) => v === candidate);
    if (exact) return exact;
    const ci = aspect.values.find((v) => normKey(v) === normKey(candidate));
    if (ci) return ci;
  }

  for (const candidate of candidates) {
    const cn = normKey(candidate);
    const contained = aspect.values.find((v) => cn.includes(normKey(v)));
    if (contained) return contained;
    const container = aspect.values.find((v) => normKey(v).includes(cn));
    if (container) return container;
  }

  if (familyForAspectName(aspect.name) === "type") {
    const inferred = inferProductTypeFromTitle(value);
    if (inferred) {
      const match = aspect.values.find(
        (v) =>
          normKey(v) === normKey(inferred) ||
          normKey(v).includes(normKey(inferred)) ||
          normKey(inferred).includes(normKey(v)),
      );
      if (match) return match;
      if (aspect.mode !== "SELECTION_ONLY") return inferred;
    }
  }

  return value;
}

export type BuildAspectsResult = {
  aspects: Record<string, string[]>;
  missingRequired: string[];
  mappedFrom: Array<{ sourceKey: string; aspectName: string; value: string }>;
};

/**
 * Mappe les valeurs collectées vers les noms d’aspects Taxonomy de la catégorie.
 */
export function buildEbayAspects(input: {
  raw: Record<string, string>;
  categoryAspects: CategoryAspect[];
}): BuildAspectsResult {
  const aspects: Record<string, string[]> = {};
  const mappedFrom: BuildAspectsResult["mappedFrom"] = [];
  const usedRawKeys = new Set<string>();

  for (const aspect of input.categoryAspects) {
    const value = pickValueForAspect(aspect.name, input.raw);
    if (!value) continue;
    const finalValue = preferAllowedValue(value, aspect);

    // SELECTION_ONLY : ne pas envoyer une valeur hors liste
    if (
      aspect.mode === "SELECTION_ONLY" &&
      aspect.values.length > 0 &&
      !aspect.values.some((v) => normKey(v) === normKey(finalValue))
    ) {
      continue;
    }

    aspects[aspect.name] = [finalValue];

    const sourceKey =
      Object.keys(input.raw).find((k) => {
        if (normKey(k) === normKey(aspect.name)) return true;
        const f1 = familyForKey(k);
        const f2 = familyForAspectName(aspect.name);
        return Boolean(f1 && f1 === f2);
      }) ?? aspect.name;

    mappedFrom.push({
      sourceKey,
      aspectName: aspect.name,
      value: finalValue,
    });
    usedRawKeys.add(sourceKey);
  }

  if (input.categoryAspects.length === 0) {
    const fallbackOrder = [
      "Marque compatible",
      "Compatible Brand",
      "Marque",
      "Brand",
      "Appareil compatible",
      "Compatible Device",
      "Numéro de modèle compatible",
      "Compatible Model Number",
      "Modèle",
      "Model",
      "Type",
      "MPN",
      "Couleur",
      "Color",
      "Matière",
      "Material",
      "Fabricant",
      "Manufacturer",
    ];

    const byFamily = new Map<string, { key: string; value: string }>();
    for (const [k, v] of Object.entries(input.raw)) {
      const family = familyForKey(k) ?? normKey(k);
      const existing = byFamily.get(family);
      const preferFr =
        /[éèêàâùûôç]|marque|appareil|modèle|couleur|matière|fabricant/i.test(k);
      if (!existing || preferFr) {
        byFamily.set(family, { key: k, value: v });
      }
    }

    const frNames: Record<string, string> = {
      brand: "Marque",
      mpn: "MPN",
      model: "Modèle",
      type: "Type",
      color: "Couleur",
      material: "Matière",
      manufacturer: "Fabricant",
      "compatible brand": "Marque compatible",
      "compatible device": "Appareil compatible",
      "compatible model": "Numéro de modèle compatible",
    };

    for (const [family, { key, value }] of byFamily) {
      const aspectName = frNames[family] ?? key;
      if (!aspects[aspectName]) {
        aspects[aspectName] = [value];
        mappedFrom.push({ sourceKey: key, aspectName, value });
      }
    }

    for (const name of fallbackOrder) {
      if (aspects[name]) continue;
      const value = pickValueForAspect(name, input.raw);
      if (value) aspects[name] = [value];
    }
  }

  const missingRequired = input.categoryAspects
    .filter((a) => a.required)
    .map((a) => a.name)
    .filter((name) => !aspects[name]?.[0]?.trim());

  return { aspects, missingRequired, mappedFrom };
}

export function extractAspectSourcesFromAd(ad: {
  titre?: string | null;
  resultat_identification?: unknown;
  metadata?: unknown;
}): AspectSourceInput {
  const meta =
    ad.metadata && typeof ad.metadata === "object"
      ? (ad.metadata as Record<string, unknown>)
      : {};

  const metaSpecifics =
    meta.item_specifics && typeof meta.item_specifics === "object"
      ? (meta.item_specifics as Record<string, string | string[]>)
      : {};

  const identification =
    ad.resultat_identification &&
    typeof ad.resultat_identification === "object"
      ? (ad.resultat_identification as {
          itemSpecifics?: Record<string, string | string[]>;
          brand?: string;
          model?: string;
          mpn?: string;
        })
      : null;

  const mergedSpecifics: Record<string, string | string[]> = {
    ...metaSpecifics,
    ...(identification?.itemSpecifics ?? {}),
  };

  return {
    itemSpecifics: mergedSpecifics,
    brand:
      (meta.brand as string) ||
      identification?.brand ||
      (mergedSpecifics.Brand as string) ||
      (mergedSpecifics.Marque as string) ||
      null,
    manufacturer: (meta.manufacturer as string) || null,
    mpn:
      (meta.mpn as string) ||
      identification?.mpn ||
      (mergedSpecifics.MPN as string) ||
      null,
    model:
      (meta.model as string) ||
      identification?.model ||
      (mergedSpecifics.Model as string) ||
      null,
    type:
      (meta.type as string) ||
      (meta.product_type as string) ||
      (mergedSpecifics.Type as string) ||
      null,
    productType: (meta.product_type as string) || null,
    color:
      (meta.color as string) ||
      (mergedSpecifics.Color as string) ||
      (mergedSpecifics.Couleur as string) ||
      null,
    material: (meta.material as string) || null,
    compatibleBrand:
      (meta.compatible_brand as string) ||
      (mergedSpecifics["Compatible Brand"] as string) ||
      (mergedSpecifics["Marque compatible"] as string) ||
      null,
    compatibleDevice:
      (meta.compatible_device as string) ||
      (mergedSpecifics["Compatible Device"] as string) ||
      (mergedSpecifics["Appareil compatible"] as string) ||
      (mergedSpecifics["Modèle compatible"] as string) ||
      null,
    compatibleModel:
      (meta.compatible_model as string) ||
      (mergedSpecifics["Compatible Model Number"] as string) ||
      null,
    title: ad.titre,
  };
}
