import { describe, expect, it } from "vitest";
import {
  buildEbayAspects,
  collectRawAspectValues,
  extractAspectSourcesFromAd,
} from "@/services/ebay/aspects";
import type { CategoryAspect } from "@/services/ebay/taxonomy";

describe("ebay aspects mapping", () => {
  it("maps Compatible Brand from CSV metadata to Marque compatible", () => {
    const raw = collectRawAspectValues({
      itemSpecifics: {
        Brand: "Apple",
        "Compatible Brand": "Apple",
        Type: "Charging Port",
        Model: "A1990",
      },
      compatibleBrand: "Apple",
      title: "Connecteur port charge USB-C MacBook Pro A1990",
    });

    const categoryAspects: CategoryAspect[] = [
      {
        name: "Marque compatible",
        required: true,
        mode: "FREE_TEXT",
        values: [],
      },
      { name: "Marque", required: false, mode: "FREE_TEXT", values: [] },
      { name: "Type", required: true, mode: "FREE_TEXT", values: [] },
      { name: "Modèle", required: false, mode: "FREE_TEXT", values: [] },
    ];

    const { aspects, missingRequired } = buildEbayAspects({
      raw,
      categoryAspects,
    });

    expect(aspects["Marque compatible"]).toEqual(["Apple"]);
    expect(aspects.Type).toEqual(["Charging Port"]);
    expect(aspects.Modèle).toEqual(["A1990"]);
    expect(missingRequired).toEqual([]);
  });

  it("reads compatible brand from ad metadata like CSV import", () => {
    const sources = extractAspectSourcesFromAd({
      titre: "Connecteur port charge USB-C MacBook Pro A1990",
      metadata: {
        source: "csv_import",
        compatible_brand: "Apple",
        item_specifics: {
          Brand: "Apple",
          "Compatible Brand": "Apple",
          Type: "Charging Port",
        },
      },
    });

    const raw = collectRawAspectValues(sources);
    expect(raw["Compatible Brand"]).toBe("Apple");
    expect(raw["Marque compatible"]).toBe("Apple");

    const { aspects, missingRequired } = buildEbayAspects({
      raw,
      categoryAspects: [
        {
          name: "Marque compatible",
          required: true,
          mode: "SELECTION_ONLY",
          values: ["Apple", "Samsung", "Dell"],
        },
      ],
    });

    expect(aspects["Marque compatible"]).toEqual(["Apple"]);
    expect(missingRequired).toEqual([]);
  });

  it("infers Apple compatible brand from MacBook title when missing", () => {
    const raw = collectRawAspectValues({
      title: "Nappe flex MacBook Pro A1708",
      brand: "OEM",
    });
    expect(raw["Marque compatible"]).toBe("Apple");
  });

  it("normalizes eBay FR Pour Apple into OEM + Apple compatible", () => {
    const raw = collectRawAspectValues({
      itemSpecifics: {
        Marque: "Pour Apple",
        "Marque compatible": "Pour Apple",
        Type: "écran LCD",
        "Modèle compatible": "Pour Apple iPhone 11",
      },
      title: "Ecran LCD Iphone 11",
      brand: "Pour Apple",
    });

    expect(raw.Marque).toBe("OEM");
    expect(raw["Marque compatible"]).toBe("Apple");
    expect(raw["Appareil compatible"]).toMatch(/iPhone 11/i);

    const { aspects, missingRequired } = buildEbayAspects({
      raw,
      categoryAspects: [
        {
          name: "Marque",
          required: true,
          mode: "SELECTION_ONLY",
          values: ["OEM", "Apple", "Samsung", "Sans marque"],
        },
        {
          name: "Marque compatible",
          required: true,
          mode: "SELECTION_ONLY",
          values: ["Apple", "Samsung", "Xiaomi"],
        },
        {
          name: "Type",
          required: true,
          mode: "SELECTION_ONLY",
          values: ["Écran", "Batterie", "LCD"],
        },
        {
          name: "Appareil compatible",
          required: true,
          mode: "FREE_TEXT",
          values: [],
        },
      ],
    });

    expect(aspects.Marque).toEqual(["OEM"]);
    expect(aspects["Marque compatible"]).toEqual(["Apple"]);
    expect(aspects.Type).toEqual(["Écran"]);
    expect(missingRequired).toEqual([]);
  });

  it("reports missing required aspects instead of publishing empty", () => {
    const { missingRequired } = buildEbayAspects({
      raw: { Brand: "Apple" },
      categoryAspects: [
        {
          name: "Marque compatible",
          required: true,
          mode: "FREE_TEXT",
          values: [],
        },
      ],
    });
    // Brand Apple seul ne remplit plus Marque compatible (pas de confusion)
    expect(missingRequired).toContain("Marque compatible");
  });
});
