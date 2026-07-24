import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "@/features/imports/csv-parser";
import { mapHeader, normalizeHeader } from "@/features/imports/columns";
import { normalizeImportRow, normalizeImportRows } from "@/features/imports/normalizer";
import { UTOPYA_HEADER_ALIASES, UTOPYA_TO_EBAY_ASPECTS } from "@/features/imports/utopya-mapping";
import { extractAspectSourcesFromAd } from "@/services/ebay/aspects";

describe("Utopia / Magento FR header aliases", () => {
  it("maps French Utopia column names to Smart Seller fields", () => {
    expect(mapHeader("Marque")).toBe("brand");
    expect(mapHeader("Modèle")).toBe("model");
    expect(mapHeader("Appareil compatible")).toBe("compatible_device");
    expect(mapHeader("Marque compatible")).toBe("compatible_brand");
    expect(mapHeader("Référence fabricant")).toBe("mpn");
    expect(mapHeader("Référence compatible")).toBe("compatible_model");
    expect(mapHeader("Type de produit")).toBe("product_type");
    expect(mapHeader("Couleur")).toBe("color");
    expect(mapHeader("État")).toBe("ebay_condition_id");
    expect(mapHeader("Compatibilité")).toBe("compatible_device");
    expect(mapHeader("Nom du produit")).toBe("titre");
    expect(mapHeader("Code article")).toBe("sku");
  });

  it("normalizes accents in headers", () => {
    expect(normalizeHeader("Référence fabricant")).toBe("reference fabricant");
    expect(normalizeHeader("Modèle")).toBe("modele");
    expect(UTOPYA_HEADER_ALIASES["reference fabricant"]).toBe("mpn");
  });
});

describe("Utopia row normalization → item_specifics", () => {
  it("fills brand, compatibility, MPN and type without inventing values", () => {
    const row = normalizeImportRow({
      titre: "Écran LCD iPhone 13",
      prix_vente: "49.90",
      brand: "OEM",
      model: "iPhone 13",
      compatible_brand: "Apple",
      compatible_device: "iPhone 13",
      compatible_model: "A2482",
      mpn: "LCD-IP13-OEM",
      product_type: "Pièce détachée",
      type: "Écran",
      color: "Noir",
      ebay_condition_id: "Neuf",
    });

    expect(row.brand).toBe("OEM");
    expect(row.compatible_brand).toBe("Apple");
    expect(row.compatible_device).toBe("iPhone 13");
    expect(row.mpn).toBe("LCD-IP13-OEM");
    expect(row.ebay_condition_id).toBe("1000");

    expect(row.item_specifics.Brand).toBe("OEM");
    expect(row.item_specifics.Marque).toBe("OEM");
    expect(row.item_specifics["Compatible Brand"]).toBe("Apple");
    expect(row.item_specifics["Appareil compatible"]).toBe("iPhone 13");
    expect(row.item_specifics.MPN).toBe("LCD-IP13-OEM");
    expect(row.item_specifics.Type).toBe("Écran");
    expect(row.item_specifics.Couleur).toBe("Noir");

    expect(row.detected_specifics.length).toBeGreaterThan(0);
    expect(row.detected_specifics.some((s) => s.key === "Brand")).toBe(true);
    expect(row.missing_useful_fields).not.toContain("Marque");
    expect(row.missing_useful_fields).not.toContain("Marque compatible");
  });

  it("reports missing useful fields when columns are empty", () => {
    const row = normalizeImportRow({
      titre: "Produit sans specs",
      prix_vente: "10",
    });
    expect(row.item_specifics.Brand).toBeUndefined();
    expect(row.missing_useful_fields).toEqual(
      expect.arrayContaining(["Marque", "Marque compatible", "MPN / référence fabricant"]),
    );
  });

  it("does not invent Brand when absent from file", () => {
    const row = normalizeImportRow({
      titre: "Pièce générique",
      prix_vente: "5",
      compatible_brand: "Apple",
      compatible_device: "iPhone 12",
    });
    expect(row.brand).toBeNull();
    expect(row.item_specifics.Brand).toBeUndefined();
    expect(row.item_specifics["Compatible Brand"]).toBe("Apple");
  });
});

describe("exemple-import-utopya.csv multi-row", () => {
  it("parses and maps all sample Utopia rows into eBay-ready specifics", () => {
    const file = path.resolve("public/templates/exemple-import-utopya.csv");
    const csv = fs.readFileSync(file, "utf8");
    const parsed = parseCsv(csv);
    expect(parsed.errors.filter((e) => e.includes("obligatoire"))).toHaveLength(0);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(5);

    const normalized = normalizeImportRows(parsed.rows);
    expect(normalized).toHaveLength(parsed.rows.length);

    for (const row of normalized) {
      expect(row.titre.length).toBeGreaterThan(0);
      expect(Number(row.prix_vente)).toBeGreaterThan(0);
      expect(row.brand).toBeTruthy();
      expect(row.compatible_brand).toBeTruthy();
      expect(row.compatible_device).toBeTruthy();
      expect(row.mpn).toBeTruthy();
      expect(row.item_specifics.Brand || row.item_specifics.Marque).toBeTruthy();
      expect(
        row.item_specifics["Compatible Brand"] ||
          row.item_specifics["Marque compatible"],
      ).toBeTruthy();
      expect(row.detected_specifics.length).toBeGreaterThan(3);
    }

    const first = normalized[0];
    expect(first.sku).toBe("UTP-IP13-LCD-001");
    expect(first.compatible_brand).toBe("Apple");
    expect(first.item_specifics.MPN).toBe("LCD-IP13-OEM");
    expect(first.item_specifics["Référence compatible"]).toBe("A2482");
    expect(first.ebay_condition_id).toBe("1000");

    const occasion = normalized.find((r) => r.sku === "UTP-RN12-CAM-005");
    expect(occasion?.ebay_condition_id).toBe("3000");
    expect(occasion?.compatible_brand).toBe("Xiaomi");
  });

  it("feeds metadata into extractAspectSourcesFromAd for eBay publish", () => {
    const file = path.resolve("public/templates/exemple-import-utopya.csv");
    const normalized = normalizeImportRows(
      parseCsv(fs.readFileSync(file, "utf8")).rows,
    );
    const row = normalized[0];

    const sources = extractAspectSourcesFromAd({
      titre: row.titre,
      metadata: {
        item_specifics: row.item_specifics,
        brand: row.brand,
        mpn: row.mpn,
        model: row.model,
        type: row.type,
        product_type: row.product_type,
        color: row.color,
        compatible_brand: row.compatible_brand,
        compatible_device: row.compatible_device,
        compatible_model: row.compatible_model,
      },
    });

    expect(sources.brand).toBe("OEM");
    expect(sources.mpn).toBe("LCD-IP13-OEM");
    expect(sources.compatibleBrand).toBe("Apple");
    expect(sources.compatibleDevice).toBe("iPhone 13");
    expect(sources.compatibleModel).toBe("A2482");
    expect(sources.type).toBe("Écran");
    expect(sources.color).toBe("Noir");
  });
});

describe("UTOPYA_TO_EBAY_ASPECTS coverage", () => {
  it("covers the main eBay FR aspect families", () => {
    const fields = UTOPYA_TO_EBAY_ASPECTS.map((m) => m.utopiaField);
    expect(fields).toEqual(
      expect.arrayContaining([
        "brand",
        "mpn",
        "model",
        "compatible_brand",
        "compatible_device",
        "compatible_model",
        "color",
        "type",
      ]),
    );
  });
});
