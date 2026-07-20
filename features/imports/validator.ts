import type { NormalizedImportRow } from "./normalizer";

export type ImportRowValidationError = {
  row: number;
  field: string;
  message: string;
};

export type ImportValidationResult = {
  valid: boolean;
  errors: ImportRowValidationError[];
};

export function validateImportRow(
  row: NormalizedImportRow,
  rowNumber: number,
): ImportRowValidationError[] {
  const errors: ImportRowValidationError[] = [];

  if (!row.titre.trim()) {
    errors.push({
      row: rowNumber,
      field: "titre",
      message: "Le titre est obligatoire.",
    });
  } else if (row.titre.length > 80) {
    errors.push({
      row: rowNumber,
      field: "titre",
      message: "Le titre ne doit pas dépasser 80 caractères.",
    });
  }

  const prix = parseFloat(row.prix_vente);
  if (isNaN(prix) || prix <= 0) {
    errors.push({
      row: rowNumber,
      field: "prix_vente",
      message: "Le prix de vente doit être un nombre positif.",
    });
  }

  if (row.prix_achat) {
    const achat = parseFloat(row.prix_achat);
    if (isNaN(achat) || achat < 0) {
      errors.push({
        row: rowNumber,
        field: "prix_achat",
        message: "Le prix d'achat doit être un nombre positif ou nul.",
      });
    }
  }

  if (row.quantite < 1) {
    errors.push({
      row: rowNumber,
      field: "quantite",
      message: "La quantité doit être au moins 1.",
    });
  }

  if (row.sku && row.sku.length > 50) {
    errors.push({
      row: rowNumber,
      field: "sku",
      message: "Le SKU ne doit pas dépasser 50 caractères.",
    });
  }

  return errors;
}

export function validateImportRows(
  rows: NormalizedImportRow[],
): ImportValidationResult {
  const errors = rows.flatMap((row, index) =>
    validateImportRow(row, index + 1),
  );

  return {
    valid: errors.length === 0,
    errors,
  };
}
