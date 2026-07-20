import Papa from "papaparse";

export const MAX_CSV_ROWS = 10_000;
export const MAX_CELL_LENGTH = 5_000;

export const REQUIRED_COLUMNS = [
  "titre",
  "prix_vente",
] as const;

export const OPTIONAL_COLUMNS = [
  "description",
  "prix_achat",
  "quantite",
  "sku",
  "ebay_category_id",
  "ebay_condition_id",
  "notes",
  "item_specifics",
] as const;

export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  rows: CsvRow[];
  headers: string[];
  errors: string[];
};

const FORMULA_PATTERN = /^[=+\-@]/;

export function isDangerousFormula(value: string): boolean {
  return FORMULA_PATTERN.test(value.trim());
}

export function parseItemSpecifics(raw: string): Record<string, string> {
  if (!raw?.trim()) return {};

  const result: Record<string, string> = {};

  for (const pair of raw.split("|")) {
    const [key, ...valueParts] = pair.split("=");
    const trimmedKey = key?.trim();
    const value = valueParts.join("=").trim();

    if (trimmedKey && value) {
      result[trimmedKey] = value;
    }
  }

  return result;
}

function sanitizeCell(value: unknown): string {
  const str = String(value ?? "").trim();

  if (str.length > MAX_CELL_LENGTH) {
    throw new Error(`Cellule trop longue (max ${MAX_CELL_LENGTH} caractères).`);
  }

  if (isDangerousFormula(str)) {
    throw new Error(`Formule potentiellement dangereuse détectée : ${str.slice(0, 20)}`);
  }

  return str;
}

export function parseCsv(content: string): CsvParseResult {
  const errors: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    errors.push(
      ...parsed.errors.map((e) => `Ligne ${(e.row ?? 0) + 1}: ${e.message}`),
    );
  }

  const headers = parsed.meta.fields ?? [];

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push(`Colonne obligatoire manquante : ${col}`);
    }
  }

  if (parsed.data.length > MAX_CSV_ROWS) {
    errors.push(`Trop de lignes (max ${MAX_CSV_ROWS}).`);
  }

  const rows: CsvRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const rawRow = parsed.data[i];
    const row: CsvRow = {};

    try {
      for (const [key, value] of Object.entries(rawRow)) {
        row[key] = sanitizeCell(value);
      }
      rows.push(row);
    } catch (err) {
      errors.push(
        `Ligne ${i + 2}: ${err instanceof Error ? err.message : "Erreur de validation"}`,
      );
    }
  }

  return { rows, headers, errors };
}
