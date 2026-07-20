import { describe, expect, it } from "vitest";
import {
  isDangerousFormula,
  MAX_CSV_ROWS,
  parseCsv,
  parseItemSpecifics,
} from "@/features/imports/csv-parser";

const VALID_HEADER =
  "titre,prix_vente,description,sku,quantite,item_specifics\n";

describe("csv-parser", () => {
  it("parses valid CSV with required columns", () => {
    const csv = `${VALID_HEADER}Carte mère MacBook,189.99,Description,SKU-001,1,Brand=Apple|MPN=820-01779-A`;

    const result = parseCsv(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titre).toBe("Carte mère MacBook");
    expect(result.rows[0].prix_vente).toBe("189.99");
    expect(result.headers).toContain("titre");
    expect(result.headers).toContain("prix_vente");
  });

  it("reports missing required columns", () => {
    const csv = "description,sku\nfoo,bar";

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("titre"))).toBe(true);
    expect(result.errors.some((e) => e.includes("prix_vente"))).toBe(true);
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
      return `Produit TEST-${num},${(10 + i).toFixed(2)},Desc ${num},TEST-${num},1,`;
    }).join("\n");
    const csv = `${VALID_HEADER}${rows}`;

    const result = parseCsv(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0].sku).toBe("TEST-001");
    expect(result.rows[19].sku).toBe("TEST-020");
  });

  it("rejects dangerous spreadsheet formulas", () => {
    expect(isDangerousFormula("=CMD('calc')")).toBe(true);
    expect(isDangerousFormula("+1234")).toBe(true);
    expect(isDangerousFormula("-1+1")).toBe(true);
    expect(isDangerousFormula("@SUM(A1)")).toBe(true);

    const csv = `${VALID_HEADER}=HYPERLINK("http://evil"),10.00`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("dangereuse"))).toBe(true);
  });

  it("rejects files exceeding max row count", () => {
    const rows = Array.from(
      { length: MAX_CSV_ROWS + 1 },
      () => "Titre,10.00",
    ).join("\n");
    const csv = `${VALID_HEADER}${rows}`;

    const result = parseCsv(csv);

    expect(result.errors.some((e) => e.includes("Trop de lignes"))).toBe(true);
  });

  it("normalizes headers to lowercase", () => {
    const csv = "Titre,Prix_Vente\nTest,12.50";

    const result = parseCsv(csv);

    expect(result.headers).toContain("titre");
    expect(result.headers).toContain("prix_vente");
  });

  it("returns empty specifics for blank input", () => {
    expect(parseItemSpecifics("")).toEqual({});
    expect(parseItemSpecifics("   ")).toEqual({});
  });
});
