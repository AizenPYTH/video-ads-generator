import { describe, expect, it } from "vitest";
import {
  isDangerousFormula,
  MAX_CSV_ROWS,
  parseCsv,
  parseItemSpecifics,
} from "@/features/imports/csv-parser";
import { normalizeImportRow } from "@/features/imports/normalizer";
import { validateImportRows } from "@/features/imports/validator";

const VALID_HEADER =
  "Title;Start price;Description;Custom label (SKU);Quantity;Item specifics;P:EAN;Postal code\n";

describe("csv-parser", () => {
  it("parses valid CSV with eBay FR columns", () => {
    const csv = `${VALID_HEADER}Carte mère MacBook;189.99;Description;SKU-001;1;Brand=Apple|MPN=820-01779-A;0123456789012;01000`;

    const result = parseCsv(csv);

    expect(result.errors.filter((e) => e.includes("obligatoire"))).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titre).toBe("Carte mère MacBook");
    expect(result.rows[0].prix_vente).toBe("189.99");
    expect(result.rows[0].ean).toBe("0123456789012");
    expect(result.rows[0].postal_code).toBe("01000");
  });

  it("supports comma delimiter", () => {
    const csv =
      "Title,Start price\nÉcran LCD MacBook,129.50";
    const result = parseCsv(csv);
    expect(result.rows[0].titre).toBe("Écran LCD MacBook");
    expect(result.delimiter).toBe(",");
  });

  it("reports missing required columns", () => {
    const csv = "Description,Custom label (SKU)\nfoo,bar";

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("Title"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Start price"))).toBe(true);
  });

  it("does not require Category ID", () => {
    const csv = "Title;Start price\nProduit test;10.00";
    const result = parseCsv(csv);
    expect(result.errors.some((e) => e.includes("Category ID"))).toBe(false);
    expect(result.rows).toHaveLength(1);
  });

  it("parses Item Specifics pipe-delimited key=value pairs", () => {
    const specifics = parseItemSpecifics(
      "Brand=Apple|MPN=820-01779-A|Model=A2115|Type=Logic Board|Color=Green",
    );

    expect(specifics).toEqual({
      Brand: "Apple",
      MPN: "820-01779-A",
      Model: "A2115",
      Type: "Logic Board",
      Color: "Green",
    });
  });

  it("parses 20 data rows", () => {
    const rows = Array.from({ length: 20 }, (_, i) => {
      const num = String(i + 1).padStart(3, "0");
      return `Produit TEST-${num};${(10 + i).toFixed(2)};Desc ${num};TEST-${num};1;;;`;
    }).join("\n");
    const csv = `${VALID_HEADER}${rows}`;

    const result = parseCsv(csv);

    expect(result.rows).toHaveLength(20);
    expect(result.rows[0].sku).toBe("TEST-001");
    expect(result.rows[19].sku).toBe("TEST-020");
  });

  it("rejects dangerous spreadsheet formulas", () => {
    expect(isDangerousFormula("=CMD('calc')")).toBe(true);
    expect(isDangerousFormula("+1234")).toBe(true);
    expect(isDangerousFormula("-1+1")).toBe(true);
    expect(isDangerousFormula("@SUM(A1)")).toBe(true);

    const csv = `${VALID_HEADER}=HYPERLINK("http://evil");10.00;;;;;`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("dangereuse"))).toBe(true);
  });

  it("rejects files exceeding max row count", () => {
    const rows = Array.from(
      { length: MAX_CSV_ROWS + 1 },
      () => "Titre;10.00",
    ).join("\n");
    const csv = `${VALID_HEADER}${rows}`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("Trop de lignes"))).toBe(true);
  });

  it("preserves French accents", () => {
    const csv = "Title;Start price\nBatterie reconditionnée MacBook;59.00";
    const result = parseCsv(csv);
    expect(result.rows[0].titre).toContain("reconditionnée");
  });

  it("returns empty specifics for blank input", () => {
    expect(parseItemSpecifics("")).toEqual({});
    expect(parseItemSpecifics("   ")).toEqual({});
  });
});

describe("normalizer item specifics merge", () => {
  it("gives priority to dedicated columns over Item specifics", () => {
    const row = normalizeImportRow({
      titre: "Test",
      prix_vente: "10",
      brand: "Samsung",
      item_specifics: "Brand=Apple|MPN=123|Color=Green",
      mpn: "",
      color: "Blue",
    });

    expect(row.item_specifics.Brand).toBe("Samsung");
    expect(row.item_specifics.MPN).toBe("123");
    expect(row.item_specifics.Color).toBe("Blue");
  });
});

describe("validator partial failures", () => {
  it("keeps valid rows when one row is invalid", () => {
    const rows = [
      normalizeImportRow({ titre: "OK", prix_vente: "10" }),
      normalizeImportRow({ titre: "", prix_vente: "0" }),
      normalizeImportRow({ titre: "OK2", prix_vente: "20" }),
    ];
    const result = validateImportRows(rows);
    expect(result.valid).toBe(true);
    expect(result.validRowIndexes).toEqual([0, 2]);
    expect(result.errors.some((e) => e.row === 2)).toBe(true);
  });
});
