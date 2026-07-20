import { describe, expect, it } from "vitest";
import {
  extractReferences,
  getBestReference,
  joinNearbyOcrLines,
} from "@/services/google-vision/reference-parser";

describe("reference-parser", () => {
  it("extracts full PCB reference 820-01779-A with high score", () => {
    const refs = extractReferences("Label 820-01779-A REV 2.1");

    expect(refs.some((r) => r.normalized === "820-01779-A")).toBe(true);
    const full = refs.find((r) => r.normalized === "820-01779-A");
    expect(full?.pattern).toBe("full_pcb");
    expect(full?.isFragment).toBe(false);
  });

  it("extracts fragment 01646-A when full reference is present", () => {
    const text = "820-01646-A / 01646-A logic board";
    const refs = extractReferences(text);

    const fragment = refs.find((r) => r.value === "01646-A");
    const full = refs.find((r) => r.normalized === "820-01646-A");

    expect(full).toBeDefined();
    expect(fragment).toBeDefined();
    expect(fragment?.isFragment).toBe(true);
    expect((full?.score ?? 0) > (fragment?.score ?? 0)).toBe(true);
  });

  it("extracts model number M6100", () => {
    const refs = extractReferences("Audio jack connector M6100");

    expect(refs.some((r) => r.normalized === "M6100")).toBe(true);
    const m6100 = refs.find((r) => r.normalized === "M6100");
    expect(m6100?.pattern).toBe("model_number");
  });

  it("extracts MAINFPC_V3.1 and normalizes underscores to dashes", () => {
    const refs = extractReferences("Display cable MAINFPC_V3.1");

    expect(refs.some((r) => r.normalized === "MAINFPC-V3.1")).toBe(true);
  });

  it("prioritizes full reference over fragment in getBestReference", () => {
    const best = getBestReference("Board 820-01779-A 01779");

    expect(best).not.toBeNull();
    expect(best?.normalized).toBe("820-01779-A");
    expect(best?.isFragment).toBe(false);
  });

  it("deduplicates references by normalized value keeping highest score", () => {
    const refs = extractReferences("820-01779-A and 820-01779-A");

    const matches = refs.filter((r) => r.normalized === "820-01779-A");
    expect(matches).toHaveLength(1);
  });

  it("sorts references by score descending", () => {
    const refs = extractReferences("820-01779-A M6100 01646");

    for (let i = 1; i < refs.length; i++) {
      expect(refs[i - 1].score).toBeGreaterThanOrEqual(refs[i].score);
    }
  });

  it("returns null from getBestReference when no candidates", () => {
    expect(getBestReference("no references here")).toBeNull();
  });

  it("joins multi-line PCB references", () => {
    const joined = joinNearbyOcrLines("820-\n01779-A");
    expect(joined).toMatch(/820-01779-A/);
    const best = getBestReference("820-\n01779-A");
    expect(best?.normalized).toMatch(/820-01779/);
  });

  it("accepts space/dot separators in PCB refs", () => {
    const refs = extractReferences("PN: 820.01779.A");
    expect(
      refs.some(
        (r) => r.normalized.includes("820") && r.normalized.includes("01779"),
      ),
    ).toBe(true);
  });
});
