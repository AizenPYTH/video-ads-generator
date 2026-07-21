import { describe, expect, it } from "vitest";
import { matchImagesToAds, type MatchableAd } from "@/features/ads/image-match";
import { validateAdForPublish } from "@/features/ads/validation";
import type { Ad } from "@/types/ads";

const ads: MatchableAd[] = [
  {
    id: "a1",
    titre: "Batterie MacBook Pro A1707 2016",
    sku: "BAT-A1707",
    mpn: "A1707-BAT",
  },
  {
    id: "a2",
    titre: "Repose-poignets aluminium gris sidéral",
    sku: "TP-RP-001",
    mpn: null,
  },
  {
    id: "a3",
    titre: "Ventilateur CPU A1708",
    sku: "FAN-A1708",
    externalRef: "REF-9988",
  },
];

describe("matchImagesToAds", () => {
  it("matches filename to SKU", () => {
    const result = matchImagesToAds(["BAT-A1707.jpg"], ads);
    expect(result).toHaveLength(1);
    expect(result[0].adId).toBe("a1");
    expect(result[0].confidence).toBeGreaterThan(0.9);
    expect(result[0].reason).toMatch(/SKU/i);
  });

  it("matches MPN substring in filename", () => {
    const result = matchImagesToAds(["photo-A1707-BAT-front.png"], ads);
    expect(result[0].adId).toBe("a1");
    expect(result[0].reason).toMatch(/MPN|SKU/i);
  });

  it("matches external ref", () => {
    const result = matchImagesToAds(["REF-9988.webp"], ads);
    expect(result[0].adId).toBe("a3");
  });

  it("matches model code in title", () => {
    const result = matchImagesToAds(["detail_a1707_side.jpg"], [
      { id: "x", titre: "Nappe clavier A1707", sku: null },
    ]);
    expect(result[0].adId).toBe("x");
    expect(result[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("returns unmatched below confidence", () => {
    const result = matchImagesToAds(["zzzz-unknown.jpg"], ads);
    expect(result[0].adId).toBeNull();
    expect(result[0].confidence).toBe(0);
  });

  it("resolves conflicts: highest score keeps the ad", () => {
    const result = matchImagesToAds(
      ["BAT-A1707.jpg", "also-BAT-A1707-extra.jpg"],
      ads,
    );
    const matched = result.filter((r) => r.adId === "a1");
    expect(matched).toHaveLength(1);
    const conflicted = result.filter((r) => r.adId === null);
    expect(conflicted.length).toBeGreaterThanOrEqual(1);
  });
});

/** Mirrors bulkValidateAds ready/blocked partitioning (pure). */
function partitionBulkValidate(
  items: Array<{ id: string; titre: string | null; sku: string | null; ad: Ad; imageCount: number }>,
) {
  const ready: Array<{ id: string; titre: string | null; sku: string | null }> = [];
  const blocked: Array<{
    id: string;
    titre: string | null;
    sku: string | null;
    reasons: string[];
  }> = [];

  for (const item of items) {
    const validation = validateAdForPublish(item.ad);
    const reasons = validation.errors.map((e) => e.message);
    if (item.imageCount === 0) {
      reasons.push("Au moins une image est requise.");
    }
    const base = { id: item.id, titre: item.titre, sku: item.sku };
    if (reasons.length) blocked.push({ ...base, reasons });
    else ready.push(base);
  }
  return { ready, blocked };
}

function makeAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: "1",
    user_id: "u1",
    titre: "Batterie A1707 OEM",
    description: "Description complète de la batterie.",
    statut: "READY",
    resultat_identification: null,
    prix_achat: null,
    prix_vente: "49.90",
    quantite: 1,
    sku: "BAT-1",
    ebay_category_id: "14295",
    ebay_condition_id: "1000",
    notes: null,
    ...overrides,
  } as Ad;
}

describe("bulkValidate partitioning (mock)", () => {
  it("marks complete ads with images as ready", () => {
    const { ready, blocked } = partitionBulkValidate([
      {
        id: "1",
        titre: "OK",
        sku: "S1",
        ad: makeAd({ id: "1" }),
        imageCount: 1,
      },
    ]);
    expect(ready).toHaveLength(1);
    expect(blocked).toHaveLength(0);
  });

  it("blocks missing image and missing price", () => {
    const { ready, blocked } = partitionBulkValidate([
      {
        id: "2",
        titre: "No image",
        sku: "S2",
        ad: makeAd({ id: "2", prix_vente: null }),
        imageCount: 0,
      },
    ]);
    expect(ready).toHaveLength(0);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reasons.some((r) => /image/i.test(r))).toBe(true);
    expect(blocked[0].reasons.some((r) => /prix|obligatoire/i.test(r))).toBe(
      true,
    );
  });

  it("blocks already published", () => {
    const { blocked } = partitionBulkValidate([
      {
        id: "3",
        titre: "Live",
        sku: "S3",
        ad: makeAd({ id: "3", statut: "PUBLISHED" }),
        imageCount: 2,
      },
    ]);
    expect(blocked[0].reasons.some((r) => /déjà publiée/i.test(r))).toBe(true);
  });
});
