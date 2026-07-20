import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { isXlsmFile, parseXlsx } from "@/features/imports/xlsx-parser";

function buildXlsxBuffer(
  rows: Record<string, string>[],
  sheetName = "Sheet1",
): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

describe("xlsx-parser", () => {
  it("parses valid XLSX with required columns", () => {
    const buffer = buildXlsxBuffer([
      {
        titre: "Écran MacBook",
        prix_vente: "129.99",
        description: "LCD panel",
        sku: "TEST-002",
        item_specifics: "Brand=Apple|Type=Screen",
      },
    ]);

    const result = parseXlsx(buffer);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titre).toBe("Écran MacBook");
    expect(result.rows[0].prix_vente).toBe("129.99");
  });

  it("reports missing required columns in XLSX", () => {
    const buffer = buildXlsxBuffer([{ description: "Sans titre ni prix" }]);

    const result = parseXlsx(buffer);

    expect(result.errors.some((e) => e.includes("titre"))).toBe(true);
    expect(result.errors.some((e) => e.includes("prix_vente"))).toBe(true);
  });

  it("rejects XLSM files by extension", () => {
    expect(isXlsmFile("import.xlsm")).toBe(true);
    expect(isXlsmFile("import.XLSM")).toBe(true);
    expect(isXlsmFile("import.xlsx")).toBe(false);
  });

  it("reports missing columns for header-only workbook with no data rows", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([["titre", "prix_vente"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXlsx(buffer);

    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("titre"))).toBe(true);
    expect(result.errors.some((e) => e.includes("prix_vente"))).toBe(true);
  });

  it("rejects dangerous formulas in XLSX cells", () => {
    const buffer = buildXlsxBuffer([
      { titre: "=1+1", prix_vente: "10.00" },
    ]);

    const result = parseXlsx(buffer);

    expect(result.errors.some((e) => e.includes("dangereuse"))).toBe(true);
  });

  it("normalizes XLSX headers to lowercase", () => {
    const buffer = buildXlsxBuffer([
      { Titre: "Test", Prix_Vente: "15.00" },
    ]);

    const result = parseXlsx(buffer);

    expect(result.headers).toContain("titre");
    expect(result.headers).toContain("prix_vente");
  });
});
