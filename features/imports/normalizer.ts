import { parseItemSpecifics, type CsvRow } from "./csv-parser";

export type NormalizedImportRow = {
  titre: string;
  description: string | null;
  prix_achat: string | null;
  prix_vente: string;
  quantite: number;
  sku: string | null;
  ebay_category_id: string | null;
  ebay_condition_id: string | null;
  notes: string | null;
  item_specifics: Record<string, string>;
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

export function normalizeImportRow(row: CsvRow): NormalizedImportRow {
  const itemSpecificsRaw = row.item_specifics ?? row["item specifics"] ?? "";

  return {
    titre: row.titre?.trim() ?? "",
    description: row.description?.trim() || null,
    prix_achat: row.prix_achat ? normalizePrice(row.prix_achat) : null,
    prix_vente: normalizePrice(row.prix_vente ?? "0"),
    quantite: normalizeQuantity(row.quantite),
    sku: row.sku?.trim() || null,
    ebay_category_id: row.ebay_category_id?.trim() || null,
    ebay_condition_id: normalizeCondition(row.ebay_condition_id),
    notes: row.notes?.trim() || null,
    item_specifics: parseItemSpecifics(itemSpecificsRaw),
  };
}

export function normalizeImportRows(rows: CsvRow[]): NormalizedImportRow[] {
  return rows.map(normalizeImportRow);
}
