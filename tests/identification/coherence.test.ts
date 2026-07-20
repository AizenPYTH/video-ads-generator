import { describe, expect, it } from "vitest";
import { validateCoherence } from "@/features/ai/coherence-validator";
import type { IdentificationResult } from "@/types/identification";

function baseResult(
  overrides: Partial<IdentificationResult> = {},
): IdentificationResult {
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
      global: 0.8,
      productType: 0.8,
      compatibility: 0.8,
      brand: 0.8,
      partNumber: 0.8,
    },
    evidence: [],
    alternatives: [],
    warnings: [],
    needsReview: false,
    ...overrides,
  };
}

describe("coherence validator", () => {
  it("accepts Screen Replacement as replacement part", () => {
    const result = baseResult({
      soldItem: {
        type: "Screen Replacement",
        name: "LCD Panel",
        isCompleteDevice: false,
        isReplacementPart: true,
      },
      brand: "Apple",
      model: "A2337",
      compatibility: {
        brand: "Apple",
        device: "MacBook Air 13",
        modelNumber: "A2337",
      },
    });

    const { contradictions, result: validated } = validateCoherence({ result });

    expect(contradictions).toHaveLength(0);
    expect(validated.soldItem.type).toBe("Screen Replacement");
    expect(validated.needsReview).toBe(false);
  });

  it("accepts Charging Port with matching compatibility", () => {
    const result = baseResult({
      soldItem: {
        type: "Charging Port",
        name: "USB-C Port",
        isCompleteDevice: false,
        isReplacementPart: true,
      },
      brand: "Apple",
      partNumber: "820-00850-A",
      compatibility: {
        brand: "Apple",
        device: "MacBook Pro 13",
        modelNumber: "A1990",
      },
      model: "A1990",
    });

    const { contradictions } = validateCoherence({ result });

    expect(contradictions).toHaveLength(0);
  });

  it("accepts Logic Board identification", () => {
    const result = baseResult({
      soldItem: {
        type: "Logic Board",
        name: "Motherboard",
        isCompleteDevice: false,
        isReplacementPart: true,
      },
      brand: "Apple",
      partNumber: "820-01779-A",
      model: "A2141",
      compatibility: {
        brand: "Apple",
        device: "MacBook Pro 16",
        modelNumber: "A2141",
      },
    });

    const { contradictions } = validateCoherence({
      result,
      ocrText: "820-01779-A Apple A2141 Logic Board",
    });

    expect(contradictions).toHaveLength(0);
  });

  it("flags complete device and replacement part simultaneously", () => {
    const result = baseResult({
      soldItem: {
        type: "Laptop",
        name: "MacBook Pro",
        isCompleteDevice: true,
        isReplacementPart: true,
      },
    });

    const { contradictions, result: validated } = validateCoherence({ result });

    expect(contradictions.some((c) => c.includes("appareil complet"))).toBe(
      true,
    );
    expect(validated.needsReview).toBe(true);
  });

  it("detects compatibility brand mismatch", () => {
    const result = baseResult({
      brand: "Apple",
      compatibility: {
        brand: "Dell",
        device: "XPS 13",
        modelNumber: "XPS9360",
      },
    });

    const { contradictions } = validateCoherence({ result });

    expect(contradictions.some((c) => c.includes("Incohérence entre la marque"))).toBe(
      true,
    );
  });

  it("detects model vs compatibility model number mismatch", () => {
    const result = baseResult({
      model: "A2141",
      compatibility: {
        brand: "Apple",
        device: "MacBook Pro 16",
        modelNumber: "A1990",
      },
    });

    const { contradictions } = validateCoherence({ result });

    expect(
      contradictions.some((c) => c.includes("numéro de compatibilité")),
    ).toBe(true);
  });

  it("flags OCR inconsistency when brand missing from OCR text", () => {
    const result = baseResult({
      brand: "Apple",
      partNumber: "820-01779-A",
    });

    const { contradictions } = validateCoherence({
      result,
      ocrText: "Generic PCB board 12345",
    });

    expect(contradictions.some((c) => c.includes("marque identifiée"))).toBe(
      true,
    );
    expect(contradictions.some((c) => c.includes("référence identifiée"))).toBe(
      true,
    );
  });

  it("reduces global confidence when contradictions exist", () => {
    const result = baseResult({
      brand: "Apple",
      confidence: {
        global: 0.9,
        productType: 0.9,
        compatibility: 0.9,
        brand: 0.9,
        partNumber: 0.9,
      },
    });

    const { result: validated } = validateCoherence({
      result,
      ocrText: "unknown part",
    });

    expect(validated.confidence.global).toBeLessThan(0.9);
    expect(validated.confidence.global).toBeGreaterThanOrEqual(0.4);
  });
});
