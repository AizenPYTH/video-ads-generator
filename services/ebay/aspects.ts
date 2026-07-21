/**
 * Construit les aspects (item specifics) pour l’Inventory API eBay FR.
 * Sources : metadata CSV/URL, identification photo, champs dédiés.
 * Mappe les clés EN du fichier d’import vers les noms localisés Taxonomy (ex. Marque compatible).
 */
import type { CategoryAspect } from "@/services/ebay/taxonomy";

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
  mpn: ["mpn", "manufacturer part number", "référence fabricant", "ref fabricant"],
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

function familyForKey(key: string): string | null {
  const n = normKey(key);
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

  // Inférence légère pièces Apple si CSV partiel
  const title = (input.title ?? "").toLowerCase();
  const hasAppleHint =
    /\b(macbook|iphone|ipad|apple|a\d{4})\b/i.test(title) ||
    /\bapple\b/i.test(out.Brand ?? "") ||
    /\bapple\b/i.test(out["Compatible Brand"] ?? "");

  if (hasAppleHint && !out["Compatible Brand"] && !out["Marque compatible"]) {
    put("Compatible Brand", "Apple");
    put("Marque compatible", "Apple");
  }

  return out;
}

function pickValueForAspect(
  aspectName: string,
  raw: Record<string, string>,
): string | null {
  const aspectNorm = normKey(aspectName);

  // 1) Match exact / insensible à la casse
  for (const [k, v] of Object.entries(raw)) {
    if (normKey(k) === aspectNorm) return v;
  }

  // 2) Même famille d’alias
  const family = familyForAspectName(aspectName);
  if (family) {
    const aliases = ASPECT_FAMILIES[family] ?? [];
    for (const [k, v] of Object.entries(raw)) {
      const keyFamily = familyForKey(k);
      if (keyFamily === family) return v;
      if (aliases.some((a) => normKey(a) === normKey(k))) return v;
    }
  }

  return null;
}

function preferAllowedValue(
  value: string,
  aspect: CategoryAspect,
): string {
  if (!aspect.values.length) return value;
  const exact = aspect.values.find((v) => v === value);
  if (exact) return exact;
  const ci = aspect.values.find(
    (v) => normKey(v) === normKey(value),
  );
  if (ci) return ci;
  // FREE_TEXT : garder la valeur ; SELECTION_ONLY : tenter inclusion
  if (aspect.mode === "SELECTION_ONLY") {
    const partial = aspect.values.find((v) =>
      normKey(v).includes(normKey(value)),
    );
    if (partial) return partial;
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

  // Aspects Taxonomy absents (mock / hors ligne) : privilégier les clés FR
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
      const preferFr = /[éèêàâùûôç]|marque|appareil|modèle|couleur|matière|fabricant/i.test(
        k,
      );
      if (!existing || preferFr) {
        byFamily.set(family, { key: k, value: v });
      }
    }

    // Réécrire avec noms FR quand on connaît la famille
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

    // Garantir l’ordre des clés importantes
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
      null,
    compatibleModel:
      (meta.compatible_model as string) ||
      (mergedSpecifics["Compatible Model Number"] as string) ||
      null,
    title: ad.titre,
  };
}
