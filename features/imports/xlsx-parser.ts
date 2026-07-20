import * as XLSX from "xlsx";
import {
  isDangerousFormula,
  MAX_CELL_LENGTH,
  MAX_CSV_ROWS,
  REQUIRED_COLUMNS,
  type CsvRow,
} from "./csv-parser";

export type XlsxParseResult = {
  rows: CsvRow[];
  headers: string[];
  errors: string[];
};

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

export function parseXlsx(buffer: ArrayBuffer): XlsxParseResult {
  const errors: string[] = [];

  const workbook = XLSX.read(buffer, { type: "array", cellFormula: false });

  const hasMacros = workbook.SheetNames.some((name) => {
    const sheet = workbook.Sheets[name];
    return (sheet?.["!type"] as string | undefined) === "macro";
  });

  if (hasMacros) {
    errors.push("Les fichiers avec macros (XLSM) ne sont pas acceptés.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], headers: [], errors: ["Fichier XLSX vide."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawData.length > MAX_CSV_ROWS) {
    errors.push(`Trop de lignes (max ${MAX_CSV_ROWS}).`);
  }

  const headers = rawData.length > 0
    ? Object.keys(rawData[0]).map((h) => h.trim().toLowerCase())
    : [];

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push(`Colonne obligatoire manquante : ${col}`);
    }
  }

  const rows: CsvRow[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const row: CsvRow = {};

    try {
      for (const [key, value] of Object.entries(rawRow)) {
        row[key.trim().toLowerCase()] = sanitizeCell(value);
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

export function isXlsmFile(filename: string): boolean {
  return filename.toLowerCase().endsWith(".xlsm");
}
