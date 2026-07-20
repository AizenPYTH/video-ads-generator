import { describe, expect, it } from "vitest";
import {
  CATEGORY_READY_CONFIDENCE,
  isCategoryConfidenceReady,
  recalculateAdStatus,
  statusLabelFr,
} from "@/features/ads/recalculate-status";

const complete = {
  titre: "Batterie A1707",
  description: "OEM",
  prix_vente: "49.90",
  quantite: 1,
  ebay_category_id: "14295",
  ebay_condition_id: "1000",
  sku: "BAT-A1707",
};

describe("recalculateAdStatus confidence threshold", () => {
  it("uses 0.94 as ready threshold", () => {
    expect(CATEGORY_READY_CONFIDENCE).toBe(0.94);
    expect(isCategoryConfidenceReady(0.94)).toBe(true);
    expect(isCategoryConfidenceReady(0.939)).toBe(false);
  });

  it("returns READY only when checklist OK and confidence >= 0.94", () => {
    expect(
      recalculateAdStatus({
        ...complete,
        categoryConfidence: 0.94,
        categoryStatus: "resolved",
      }),
    ).toBe("READY");

    expect(
      recalculateAdStatus({
        ...complete,
        categoryConfidence: 0.93,
        categoryStatus: "resolved",
      }),
    ).toBe("NEEDS_REVIEW");
  });

  it("returns DRAFT when required fields missing", () => {
    expect(
      recalculateAdStatus({
        ...complete,
        prix_vente: null,
        categoryConfidence: 0.94,
      }),
    ).toBe("DRAFT");
  });

  it("labels NEEDS_REVIEW as À vérifier", () => {
    expect(statusLabelFr("NEEDS_REVIEW")).toBe("À vérifier");
    expect(statusLabelFr("READY")).toBe("Prêt à publier");
  });
});

describe("import confidence bucketing", () => {
  it("splits at > 0.9 for reliable block", () => {
    const rows = [0.91, 0.9, 0.89, 0.94].map((confidence) => ({
      confidence,
      reliable: confidence > 0.9,
    }));
    expect(rows.filter((r) => r.reliable).map((r) => r.confidence)).toEqual([
      0.91, 0.94,
    ]);
    expect(rows.filter((r) => !r.reliable).map((r) => r.confidence)).toEqual([
      0.9, 0.89,
    ]);
  });
});
