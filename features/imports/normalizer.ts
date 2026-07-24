import { parseItemSpecifics, type CsvRow } from "./csv-parser";
import {
  humanizeImportKey,
  IMPORT_INTERNAL_KEYS,
  UTOPYA_TO_EBAY_ASPECTS,
} from "./utopya-mapping";

export type NormalizedImportRow = {
  action: string;
  titre: string;
  subtitle: string | null;
  description: string | null;
  prix_achat: string | null;
  prix_vente: string;
  quantite: number;
  sku: string | null;
  ean: string | null;
  ebay_category_id: string | null;
  category_name: string | null;
  ebay_condition_id: string | null;
  condition_description: string | null;
  photo_url: string | null;
  format: string | null;
  duration: string | null;
  location: string | null;
  country: string | null;
  postal_code: string | null;
  shipping_profile: string | null;
  return_profile: string | null;
  payment_profile: string | null;
  brand: string | null;
  manufacturer: string | null;
  mpn: string | null;
  model: string | null;
  product_type: string | null;
  sold_item_name: string | null;
  compatible_brand: string | null;
  compatible_device: string | null;
  compatible_model: string | null;
  color: string | null;
  material: string | null;
  type: string | null;
  unit_quantity: string | null;
  unit_type: string | null;
  notes: string | null;
  item_specifics: Record<string, string>;
  /** Champs utilisés pour la suggestion Taxonomy */
  category_query_parts: string[];
  /** Caractéristiques détectées (aperçu UI) */
  detected_specifics: Array<{ key: string; value: string; source: string }>;
  /** Champs utiles encore vides après mapping fichier */
  missing_useful_fields: string[];
};

const EBAY_FR_CONDITION_MAP: Record<string, string> = {
  neuf: "1000",
  "neuf avec defauts": "1500",
  "neuf avec défauts": "1500",
  reconditionne: "2000",
  reconditionné: "2000",
  occasion: "3000",
  "pour pieces": "7000",
  "pour pièces": "7000",
  new: "1000",
  used: "3000",
  refurbished: "2000",
  "for parts": "7000",
  "1000": "1000",
  "1500": "1500",
  "2000": "2000",
  "3000": "3000",
  "7000": "7000",
};

function normalizePrice(value: string): string {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return value;
  return num.toFixed(2);
}

function normalizeCondition(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const key = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    EBAY_FR_CONDITION_MAP[key] ??
    EBAY_FR_CONDITION_MAP[value.trim().toLowerCase()] ??
    value.trim()
  );
}

function normalizeQuantity(value: string | undefined): number {
  if (!value?.trim()) return 1;
  const num = parseInt(value, 10);
  return isNaN(num) || num < 1 ? 1 : num;
}

function pick(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v?.trim()) return v.trim();
  }
  return "";
}

/**
 * Fusionne Item specifics avec colonnes dédiées.
 * Priorité : colonnes dédiées > Item specifics.
 */
export function mergeItemSpecifics(
  fromPipe: Record<string, string>,
  dedicated: Record<string, string | null>,
): Record<string, string> {
  const merged = { ...fromPipe };
  for (const [key, value] of Object.entries(dedicated)) {
    if (value?.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

/** Colonnes fichier non mappées mais utiles → item_specifics (sans inventer). */
function collectExtraSpecifics(
  row: CsvRow,
  already: Record<string, string>,
): Record<string, string> {
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!value?.trim()) continue;
    if (IMPORT_INTERNAL_KEYS.has(key)) continue;
    const label = humanizeImportKey(key);
    if (!label || label.length > 60) continue;
    // Éviter de dupliquer une valeur déjà présente sous un autre nom
    const exists = Object.values(already).some(
      (v) => v.toLowerCase() === value.trim().toLowerCase(),
    );
    if (exists && already[label]) continue;
    if (!already[label] && !extras[label]) {
      extras[label] = value.trim();
    }
  }
  return extras;
}

function buildDetectedSpecifics(
  item_specifics: Record<string, string>,
  dedicatedSources: Record<string, string | null>,
): Array<{ key: string; value: string; source: string }> {
  const out: Array<{ key: string; value: string; source: string }> = [];
  const seen = new Set<string>();

  for (const mapping of UTOPYA_TO_EBAY_ASPECTS) {
    const fieldValue = dedicatedSources[mapping.utopiaField];
    if (!fieldValue?.trim()) continue;
    for (const ebayKey of mapping.ebayKeys) {
      const val = item_specifics[ebayKey];
      if (!val) continue;
      const sig = `${ebayKey.toLowerCase()}::${val.toLowerCase()}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push({
        key: ebayKey,
        value: val,
        source: `colonne ${mapping.utopiaField}`,
      });
    }
  }

  for (const [key, value] of Object.entries(item_specifics)) {
    const sig = `${key.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ key, value, source: "fichier" });
  }

  return out;
}

const USEFUL_FIELDS: Array<{ key: string; label: string }> = [
  { key: "brand", label: "Marque" },
  { key: "compatible_brand", label: "Marque compatible" },
  { key: "compatible_device", label: "Appareil / modèle compatible" },
  { key: "mpn", label: "MPN / référence fabricant" },
  { key: "type", label: "Type" },
  { key: "color", label: "Couleur" },
  { key: "ebay_condition_id", label: "État" },
];

export function normalizeImportRow(row: CsvRow): NormalizedImportRow {
  const fromPipe = parseItemSpecifics(
    pick(row, "item_specifics", "item specifics"),
  );

  const brand = pick(row, "brand") || fromPipe.Brand || fromPipe.Marque || null;
  const mpn =
    pick(row, "mpn") ||
    fromPipe.MPN ||
    fromPipe["Numéro de pièce fabricant"] ||
    null;
  const model =
    pick(row, "model") || fromPipe.Model || fromPipe.Modèle || null;
  const productType =
    pick(row, "product_type") ||
    fromPipe.Type ||
    fromPipe["Product type"] ||
    fromPipe["Type de produit"] ||
    null;
  const color =
    pick(row, "color") || fromPipe.Color || fromPipe.Couleur || null;
  const material =
    pick(row, "material") || fromPipe.Material || fromPipe.Matière || null;
  const type = pick(row, "type") || fromPipe.Type || productType || null;
  const compatible_brand =
    pick(row, "compatible_brand") ||
    fromPipe["Compatible Brand"] ||
    fromPipe["Marque compatible"] ||
    null;
  const compatible_device =
    pick(row, "compatible_device") ||
    fromPipe["Compatible Device"] ||
    fromPipe["Appareil compatible"] ||
    fromPipe["Modèle compatible"] ||
    null;
  const compatible_model =
    pick(row, "compatible_model") ||
    fromPipe["Compatible Model Number"] ||
    fromPipe["Numéro de modèle compatible"] ||
    fromPipe["Référence compatible"] ||
    null;
  const manufacturer =
    pick(row, "manufacturer") ||
    fromPipe.Manufacturer ||
    fromPipe.Fabricant ||
    null;

  let item_specifics = mergeItemSpecifics(fromPipe, {
    Brand: brand,
    Marque: brand,
    MPN: mpn,
    Model: model,
    Modèle: model,
    Type: type ?? productType,
    "Product Type": productType ?? type,
    "Type de produit": productType ?? type,
    Color: color,
    Couleur: color,
    Material: material,
    Matière: material,
    "Compatible Brand": compatible_brand,
    "Marque compatible": compatible_brand,
    "Compatible Device": compatible_device,
    "Appareil compatible": compatible_device,
    "Modèle compatible": compatible_device,
    "Compatible Model Number": compatible_model,
    "Numéro de modèle compatible": compatible_model,
    "Référence compatible": compatible_model,
    Manufacturer: manufacturer,
    Fabricant: manufacturer,
  });

  item_specifics = {
    ...item_specifics,
    ...collectExtraSpecifics(row, item_specifics),
  };

  const titre = pick(row, "titre", "title");
  const category_name = pick(row, "category_name") || null;
  const sold_item_name = pick(row, "sold_item_name") || null;
  const ebay_condition_id = normalizeCondition(
    pick(row, "ebay_condition_id") || undefined,
  );

  const dedicatedSources: Record<string, string | null> = {
    brand,
    manufacturer,
    mpn,
    model,
    product_type: productType,
    type,
    color,
    material,
    compatible_brand,
    compatible_device,
    compatible_model,
  };

  const detected_specifics = buildDetectedSpecifics(
    item_specifics,
    dedicatedSources,
  );

  const missing_useful_fields = USEFUL_FIELDS.filter(({ key }) => {
    if (key === "ebay_condition_id") return !ebay_condition_id;
    if (key === "type") return !(type || productType);
    return !dedicatedSources[key]?.trim();
  }).map((f) => f.label);

  const category_query_parts = [
    titre,
    category_name,
    brand,
    mpn,
    model,
    productType,
    sold_item_name,
    compatible_brand,
    compatible_device,
    compatible_model,
    type,
    ...Object.entries(item_specifics).map(([k, v]) => `${k} ${v}`),
  ].filter((p): p is string => Boolean(p?.trim()));

  return {
    action: pick(row, "action") || "Add",
    titre,
    subtitle: pick(row, "subtitle") || null,
    description: pick(row, "description") || null,
    prix_achat: pick(row, "prix_achat")
      ? normalizePrice(pick(row, "prix_achat"))
      : null,
    prix_vente: (() => {
      const raw = pick(row, "prix_vente");
      if (!raw) return ""; // jamais "0" par défaut
      return normalizePrice(raw);
    })(),
    quantite: normalizeQuantity(pick(row, "quantite")),
    sku: pick(row, "sku") || null,
    ean: pick(row, "ean") || null,
    ebay_category_id: pick(row, "ebay_category_id") || null,
    category_name,
    ebay_condition_id,
    condition_description: pick(row, "condition_description") || null,
    photo_url: pick(row, "photo_url") || null,
    format: pick(row, "format") || "FixedPrice",
    duration: pick(row, "duration") || "GTC",
    location: pick(row, "location") || null,
    country: pick(row, "country") || "FR",
    postal_code: pick(row, "postal_code") || null,
    shipping_profile: pick(row, "shipping_profile") || null,
    return_profile: pick(row, "return_profile") || null,
    payment_profile: pick(row, "payment_profile") || null,
    brand,
    manufacturer,
    mpn,
    model,
    product_type: productType,
    sold_item_name,
    compatible_brand,
    compatible_device,
    compatible_model,
    color,
    material,
    type,
    unit_quantity: pick(row, "unit_quantity") || null,
    unit_type: pick(row, "unit_type") || null,
    notes: pick(row, "notes") || null,
    item_specifics,
    category_query_parts,
    detected_specifics,
    missing_useful_fields,
  };
}

export function normalizeImportRows(rows: CsvRow[]): NormalizedImportRow[] {
  return rows.map(normalizeImportRow);
}
