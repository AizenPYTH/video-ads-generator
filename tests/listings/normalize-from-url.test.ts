import { describe, expect, it } from "vitest";
import {
  buildEbayTitle,
  buildSku,
  extractAmazonAsin,
  mapEbayConditionId,
} from "@/lib/listings/normalize-from-url";

describe("normalize-from-url", () => {
  it("tronque le titre Amazon sous 80 caractères", () => {
    const raw =
      "Amazon Basics Casque Audio Bluetooth 5.1 Sans Fil, 35 Heures d’Autonomie, Léger, Réglable, Idéal Pour les Voyages, le Bureau, les Téléphones Portables et les Ordinateurs, Noir : Amazon.fr: High-Tech";
    const title = buildEbayTitle(raw, "Amazon Basics");
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.toLowerCase()).not.toContain("amazon.fr");
  });

  it("extrait l'ASIN Amazon comme SKU", () => {
    expect(
      extractAmazonAsin(
        "https://www.amazon.fr/dp/B08XYZABCD/ref=sr_1_1",
      ),
    ).toBe("B08XYZABCD");
    expect(
      buildSku({
        title: "Casque",
        sourceUrl: "https://www.amazon.fr/dp/B08XYZABCD",
      }),
    ).toBe("B08XYZABCD");
  });

  it("mappe NewCondition vers 1000", () => {
    expect(mapEbayConditionId("NewCondition")).toBe("1000");
    expect(mapEbayConditionId("https://schema.org/NewCondition")).toBe("1000");
  });
});
