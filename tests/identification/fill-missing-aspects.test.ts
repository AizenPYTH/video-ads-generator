import { describe, expect, it } from "vitest";
import { enrichItemSpecificsForEbay } from "@/features/ai/fill-missing-aspects";

describe("enrichItemSpecificsForEbay", () => {
  it("infère Marque compatible + OEM depuis un titre pièce Apple", async () => {
    const result = await enrichItemSpecificsForEbay({
      title: "Écran LCD iPhone 11 Apple compatible",
      description: "Pièce détachée qualité OEM",
      itemSpecifics: { Type: "Écran" },
      missingAspects: ["Marque compatible", "Marque"],
    });

    expect(result.itemSpecifics["Marque compatible"] || result.itemSpecifics["Compatible Brand"]).toMatch(
      /Apple/i,
    );
    expect(result.itemSpecifics.Brand || result.itemSpecifics.Marque).toBe("OEM");
    expect(result.stillMissing).not.toContain("Marque compatible");
  });
});
