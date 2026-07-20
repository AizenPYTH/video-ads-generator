import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { isXlsmFile, parseXlsx } from "@/features/imports/xlsx-parser";

function buildXlsxBuffer(
  rows: Record<string, string>[],
  sheetName = "Annonces",
): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

describe("xlsx-parser", () => {
  it("parses valid XLSX with eBay FR columns", () => {
    const buffer = buildXlsxBuffer([
      {
        Title: "Écran MacBook",
        "Start price": "129.99",
        Description: "LCD panel",
        "Custom label (SKU)": "TEST-002",
        "Item specifics": "Brand=Apple|Type=Screen",
        "P:EAN": "0123456789012",
        "Postal code": "01000",
      },
    ]);

    const result = parseXlsx(buffer);

    expect(result.errors.filter((e) => e.includes("obligatoire"))).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titre).toBe("Écran MacBook");
    expect(result.rows[0].prix_vente).toBe("129.99");
    expect(result.rows[0].ean).toBe("0123456789012");
    expect(result.rows[0].postal_code).toBe("01000");
  });

  it("reports missing required columns in XLSX", () => {
    const buffer = buildXlsxBuffer([{ Description: "Sans titre ni prix" }]);

    const result = parseXlsx(buffer);

    expect(result.errors.some((e) => e.includes("Title"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Start price"))).toBe(true);
  });

  it("rejects XLSM files by extension", () => {
    expect(isXlsmFile("import.xlsm")).toBe(true);
    expect(isXlsmFile("import.XLSM")).toBe(true);
    expect(isXlsmFile("import.xlsx")).toBe(false);
  });

  it("reports missing columns for header-only workbook with no data rows", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([["Title", "Start price"]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Annonces");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const result = parseXlsx(buffer);

    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("obligatoire"))).toBe(false);
  });

  it("rejects dangerous formulas in XLSX cells", () => {
    const buffer = buildXlsxBuffer([
      { Title: "=1+1", "Start price": "10.00" },
    ]);

    const result = parseXlsx(buffer);

    expect(result.errors.some((e) => e.includes("dangereuse"))).toBe(true);
  });

  it("maps Title / Start price aliases", () => {
    const buffer = buildXlsxBuffer([
      { Title: "Test", "Start price": "15.00" },
    ]);

    const result = parseXlsx(buffer);

    expect(result.rows[0].titre).toBe("Test");
    expect(result.rows[0].prix_vente).toBe("15.00");
  });
});
