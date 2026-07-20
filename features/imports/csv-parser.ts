import Papa from "papaparse";
import { detectAndDecodeCsv } from "./encoding";
import {
  mapHeader,
  REQUIRED_EBAY_COLUMNS,
  normalizeHeader,
} from "./columns";

export const MAX_CSV_ROWS = 10_000;
export const MAX_CELL_LENGTH = 5_000;

/** @deprecated use REQUIRED_EBAY_COLUMNS — kept for test compatibility aliases */
export const REQUIRED_COLUMNS = ["titre", "prix_vente"] as const;

export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  rows: CsvRow[];
  headers: string[];
  errors: string[];
  encoding?: string;
  delimiter?: string;
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
    throw new Error(
      `Formule potentiellement dangereuse détectée : ${str.slice(0, 20)}`,
    );
  }

  return str;
}

function mapRowKeys(raw: Record<string, string>): CsvRow {
  const row: CsvRow = {};
  for (const [header, value] of Object.entries(raw)) {
    const mapped = mapHeader(header) ?? normalizeHeader(header).replace(/\s+/g, "_");
    // Prefer first non-empty if duplicate mapped keys
    if (!row[mapped] || !String(row[mapped]).trim()) {
      row[mapped] = sanitizeCell(value);
    }
  }
  return row;
}

function hasRequiredMappedColumns(headers: string[]): string[] {
  const mapped = new Set(
    headers.map((h) => mapHeader(h)).filter(Boolean) as string[],
  );
  const missing: string[] = [];
  // Title / Start price via aliases
  if (!mapped.has("titre")) missing.push("Title");
  if (!mapped.has("prix_vente")) missing.push("Start price");
  return missing;
}

export function parseCsv(
  content: string | ArrayBuffer | Buffer,
): CsvParseResult {
  const errors: string[] = [];
  const { text, encoding, delimiter } = detectAndDecodeCsv(content);

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    errors.push(
      ...parsed.errors.map((e) => `Ligne ${(e.row ?? 0) + 1}: ${e.message}`),
    );
  }

  const headers = parsed.meta.fields ?? [];
  const missing = hasRequiredMappedColumns(headers);
  for (const col of missing) {
    errors.push(`Colonne obligatoire manquante : ${col}`);
  }

  // Category ID never required
  void REQUIRED_EBAY_COLUMNS;

  if (parsed.data.length > MAX_CSV_ROWS) {
    errors.push(`Trop de lignes (max ${MAX_CSV_ROWS}).`);
  }

  const rows: CsvRow[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const rawRow = parsed.data[i];
    try {
      const row = mapRowKeys(rawRow);
      // Skip completely empty rows
      if (!Object.values(row).some((v) => v.trim())) continue;
      rows.push(row);
    } catch (err) {
      errors.push(
        `Ligne ${i + 2}: ${err instanceof Error ? err.message : "Erreur de validation"}`,
      );
    }
  }

  return { rows, headers, errors, encoding, delimiter };
}
