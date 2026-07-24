import { describe, expect, it } from "vitest";
import {
  buildAdTitleFromAnalysis,
  enrichIdentificationFromOcr,
} from "@/features/ai/build-listing-from-analysis";
import type { IdentificationResult } from "@/types/identification";

function emptyResult(): IdentificationResult {
  return {
    soldItem: {
      type: null,
      name: null,
      isCompleteDevice: false,
      isReplacementPart: false,
    },
    compatibility: {
      brand: null,
      device: null,
      modelNumber: null,
    },
    brand: null,
    model: null,
    partNumber: null,
    manufacturer: null,
    category: null,
    color: null,
    condition: null,
    conditionDescription: null,
    accessories: [],
    defects: [],
    serialNumber: null,
    itemSpecifics: {},
    confidence: {
      global: 0.1,
      productType: 0.1,
      compatibility: 0.1,
      brand: 0.1,
      partNumber: 0.1,
    },
    evidence: [],
    alternatives: [],
    warnings: [],
    needsReview: false,
  };
}

const A1706_OCR = `
YOPOLEAN
A1706 Motherboard
With Touch ID
CPU i5 i7 256GB/512GB/1TB
2016 2017 Year
Support wholesale
`;

describe("enrichIdentificationFromOcr", () => {
  it("reconstruit A1706 Motherboard + Touch ID depuis OCR marketing", () => {
    const enriched = enrichIdentificationFromOcr(emptyResult(), A1706_OCR);

    expect(enriched.model).toBe("A1706");
    expect(enriched.compatibility.modelNumber).toBe("A1706");
    expect(enriched.soldItem.type).toMatch(/Carte mère|Logic Board/i);
    expect(enriched.soldItem.isReplacementPart).toBe(true);
    expect(enriched.compatibility.brand).toBe("Apple");
    expect(enriched.itemSpecifics["Touch ID"]).toBe("Oui");
    expect(enriched.soldItem.name).toMatch(/A1706/i);
    expect(enriched.soldItem.name).toMatch(/Touch ID/i);
  });

  it("ne remplace pas un nom déjà fourni par OpenAI", () => {
    const base = emptyResult();
    base.soldItem.name = "Titre OpenAI déjà bon";
    base.model = "A1706";
    const enriched = enrichIdentificationFromOcr(base, A1706_OCR);
    expect(enriched.soldItem.name).toBe("Titre OpenAI déjà bon");
  });
});

describe("buildAdTitleFromAnalysis", () => {
  it("construit un titre eBay depuis l'OCR A1706", () => {
    const enriched = enrichIdentificationFromOcr(emptyResult(), A1706_OCR);
    const title = buildAdTitleFromAnalysis(enriched, A1706_OCR);
    expect(title.length).toBeGreaterThan(4);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title).toMatch(/A1706/i);
  });
});
