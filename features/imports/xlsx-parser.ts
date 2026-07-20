import * as XLSX from "xlsx";
import {
  isDangerousFormula,
  MAX_CELL_LENGTH,
  MAX_CSV_ROWS,
  type CsvRow,
} from "./csv-parser";
import { mapHeader, normalizeHeader } from "./columns";

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
    throw new Error(
      `Formule potentiellement dangereuse détectée : ${str.slice(0, 20)}`,
    );
  }

  return str;
}

function pickSheetName(names: string[]): string | null {
  const preferred = names.find(
    (n) => n.trim().toLowerCase() === "annonces" || n.trim().toLowerCase() === "import ebay",
  );
  return preferred ?? names[0] ?? null;
}

export function parseXlsx(buffer: ArrayBuffer): XlsxParseResult {
  const errors: string[] = [];

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellFormula: false,
    raw: false,
  });

  if (workbook.Workbook?.Names?.some((n) => /macro/i.test(n.Name ?? ""))) {
    errors.push("Les fichiers avec macros ne sont pas acceptés.");
  }

  const sheetName = pickSheetName(workbook.SheetNames);
  if (!sheetName) {
    return { rows: [], headers: [], errors: ["Fichier XLSX vide."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const headerMatrix = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(
    sheet,
    { header: 1, defval: "", raw: false },
  );
  const headers = ((headerMatrix[0] ?? []) as unknown[])
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawData.length > MAX_CSV_ROWS) {
    errors.push(`Trop de lignes (max ${MAX_CSV_ROWS}).`);
  }

  const mappedHeaders = new Set(
    headers.map((h) => mapHeader(h)).filter(Boolean),
  );
  if (!mappedHeaders.has("titre")) {
    errors.push("Colonne obligatoire manquante : Title");
  }
  if (!mappedHeaders.has("prix_vente")) {
    errors.push("Colonne obligatoire manquante : Start price");
  }

  const rows: CsvRow[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const row: CsvRow = {};

    try {
      for (const [key, value] of Object.entries(rawRow)) {
        const mapped =
          mapHeader(key) ?? normalizeHeader(key).replace(/\s+/g, "_");
        if (!row[mapped] || !String(row[mapped]).trim()) {
          row[mapped] = sanitizeCell(value);
        }
      }
      if (!Object.values(row).some((v) => v.trim())) continue;
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
