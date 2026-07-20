import { parseItemSpecifics, type CsvRow } from "./csv-parser";

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
};

const EBAY_FR_CONDITION_MAP: Record<string, string> = {
  neuf: "1000",
  "neuf avec défauts": "1500",
  reconditionné: "2000",
  occasion: "3000",
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
  const key = value.trim().toLowerCase();
  return EBAY_FR_CONDITION_MAP[key] ?? value.trim();
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

export function normalizeImportRow(row: CsvRow): NormalizedImportRow {
  const fromPipe = parseItemSpecifics(
    pick(row, "item_specifics", "item specifics"),
  );

  const brand = pick(row, "brand") || fromPipe.Brand || null;
  const mpn = pick(row, "mpn") || fromPipe.MPN || null;
  const model = pick(row, "model") || fromPipe.Model || null;
  const productType =
    pick(row, "product_type") || fromPipe.Type || fromPipe["Product type"] || null;
  const color = pick(row, "color") || fromPipe.Color || null;
  const material = pick(row, "material") || fromPipe.Material || null;
  const type = pick(row, "type") || fromPipe.Type || null;

  const item_specifics = mergeItemSpecifics(fromPipe, {
    Brand: brand,
    MPN: mpn,
    Model: model,
    Type: type ?? productType,
    Color: color,
    Material: material,
    "Compatible Brand": pick(row, "compatible_brand") || null,
    "Compatible Device": pick(row, "compatible_device") || null,
    "Compatible Model Number": pick(row, "compatible_model") || null,
    Manufacturer: pick(row, "manufacturer") || null,
  });

  const titre = pick(row, "titre", "title");
  const category_name = pick(row, "category_name") || null;
  const sold_item_name = pick(row, "sold_item_name") || null;
  const compatible_device = pick(row, "compatible_device") || null;
  const compatible_model = pick(row, "compatible_model") || null;

  const category_query_parts = [
    titre,
    category_name,
    brand,
    mpn,
    model,
    productType,
    sold_item_name,
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
    prix_vente: normalizePrice(pick(row, "prix_vente") || "0"),
    quantite: normalizeQuantity(pick(row, "quantite")),
    sku: pick(row, "sku") || null,
    ean: pick(row, "ean") || null,
    ebay_category_id: pick(row, "ebay_category_id") || null,
    category_name,
    ebay_condition_id: normalizeCondition(pick(row, "ebay_condition_id")),
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
    manufacturer: pick(row, "manufacturer") || null,
    mpn,
    model,
    product_type: productType,
    sold_item_name,
    compatible_brand: pick(row, "compatible_brand") || null,
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
  };
}

export function normalizeImportRows(rows: CsvRow[]): NormalizedImportRow[] {
  return rows.map(normalizeImportRow);
}
