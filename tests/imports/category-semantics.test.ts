import { describe, expect, it } from "vitest";
import {
  buildSoldTypeSearchQueries,
  confidenceBand,
  detectSoldItemType,
  pathHasContradiction,
  pathMatchesSoldType,
  scoreCategorySemantics,
} from "@/features/imports/category-semantics";

describe("detectSoldItemType", () => {
  it("détecte batterie MacBook", () => {
    const t = detectSoldItemType({
      title: "Batterie MacBook Pro 15 A1707 020-00977",
    });
    expect(t.id).toBe("battery");
  });

  it("détecte écran", () => {
    expect(
      detectSoldItemType({ title: "Écran MacBook Pro A1707" }).id,
    ).toBe("screen");
  });

  it("détecte trackpad", () => {
    expect(
      detectSoldItemType({ title: "Trackpad MacBook Pro A1707" }).id,
    ).toBe("trackpad");
  });

  it("détecte carte mère", () => {
    expect(
      detectSoldItemType({ title: "Carte mère MacBook Pro A1707" }).id,
    ).toBe("logic_board");
  });

  it("détecte chargeur USB-C", () => {
    expect(
      detectSoldItemType({ title: "Chargeur MacBook Pro USB-C" }).id,
    ).toBe("charger");
  });
});

describe("contradiction batterie vs repose-poignets", () => {
  const path = [
    "Informatique et réseaux",
    "Composants et pièces",
    "Repose-poignets/pavés tactiles",
  ];

  it("rejette 175676-like path for battery", () => {
    const r = pathHasContradiction(
      "battery",
      path,
      "Repose-poignets/pavés tactiles",
    );
    expect(r.contradicted).toBe(true);
  });

  it("scoreCategorySemantics rejects with low score", () => {
    const scored = scoreCategorySemantics({
      soldType: detectSoldItemType({
        title: "Batterie MacBook Pro 15 A1707 020-00977",
      }),
      categoryName: "Repose-poignets/pavés tactiles",
      categoryPath: path,
      taxonomyRank: 0,
      taxonomyScore: 0.99,
    });
    expect(scored.rejected).toBe(true);
    expect(scored.score).toBeLessThan(0.1);
  });

  it("accepte une catégorie batterie", () => {
    const scored = scoreCategorySemantics({
      soldType: detectSoldItemType({
        title: "Batterie MacBook Pro A1707",
      }),
      categoryName: "Batteries",
      categoryPath: [
        "Informatique et réseaux",
        "Composants et pièces",
        "Batteries",
      ],
      brand: "Apple",
      model: "A1707",
      title: "Batterie MacBook Pro A1707",
      taxonomyRank: 0,
      taxonomyScore: 0.7,
    });
    expect(scored.rejected).toBe(false);
    expect(scored.typeMatch).toBe(true);
    expect(scored.score).toBeGreaterThanOrEqual(0.7);
  });
});

describe("cross-type contradictions", () => {
  it("écran ≠ batterie", () => {
    expect(
      pathHasContradiction("screen", ["Batteries"], "Batteries").contradicted,
    ).toBe(true);
  });

  it("batterie ≠ trackpad", () => {
    expect(
      pathHasContradiction("battery", ["Trackpads"], "Trackpads").contradicted,
    ).toBe(true);
  });

  it("clavier ≠ carte mère", () => {
    expect(
      pathHasContradiction("keyboard", ["Cartes mères"], "Cartes mères")
        .contradicted,
    ).toBe(true);
  });
});

describe("queries & confidence bands", () => {
  it("génère des requêtes batterie MacBook", () => {
    const q = buildSoldTypeSearchQueries({
      soldType: detectSoldItemType({
        title: "Batterie MacBook Pro A1707 020-00977",
      }),
      title: "Batterie MacBook Pro A1707 020-00977",
      brand: "Apple",
      model: "A1707",
    });
    expect(q.some((x) => /batterie/i.test(x))).toBe(true);
    expect(q.some((x) => /battery/i.test(x))).toBe(true);
    expect(q.some((x) => /A1707/i.test(x))).toBe(true);
  });

  it("ne met pas high sans typeMatch", () => {
    expect(
      confidenceBand(0.9, {
        typeMatch: false,
        rejectedAll: false,
        closeAlternatives: false,
      }),
    ).not.toBe("high");
  });

  it("pathMatchesSoldType for battery", () => {
    expect(
      pathMatchesSoldType(
        "battery",
        ["Informatique", "Batteries pour ordinateurs portables"],
        "Batteries pour ordinateurs portables",
      ),
    ).toBe(true);
  });
});
