import { describe, expect, it } from "vitest";
import { parseModelJson } from "../src/utils/json";

describe("parseModelJson", () => {
  it("leaves valid JSON completely alone", () => {
    const result = parseModelJson('{"a":1,"b":[2,3]}');
    expect(result.value).toEqual({ a: 1, b: [2, 3] });
    expect(result.repair).toBe("none");
    expect(result.truncated).toBe(false);
  });

  it("unwraps a markdown fence", () => {
    const result = parseModelJson('```json\n{"a":1}\n```');
    expect(result.value).toEqual({ a: 1 });
  });

  it("unwraps a fence the model never closed", () => {
    expect(parseModelJson('```json\n{"a":1}').value).toEqual({ a: 1 });
  });

  it("drops prose before and after", () => {
    const result = parseModelJson('Sure! Here you go:\n{"a":1}\nHope that helps.');
    expect(result.value).toEqual({ a: 1 });
  });

  it("removes trailing commas in objects and arrays", () => {
    const result = parseModelJson('{"a":[1,2,],"b":{"c":1,},}');
    expect(result.value).toEqual({ a: [1, 2], b: { c: 1 } });
    expect(result.repair).toBe("trailing-commas");
  });

  it("inserts a comma forgotten between two objects", () => {
    const result = parseModelJson('[{"a":1} {"b":2}]');
    expect(result.value).toEqual([{ a: 1 }, { b: 2 }]);
    expect(result.repair).toBe("missing-commas");
  });

  it("quotes bare and single-quoted keys", () => {
    expect(parseModelJson("{a: 1, 'b': 2}").value).toEqual({ a: 1, b: 2 });
  });

  it("does not mangle a comma or brace inside a string", () => {
    const result = parseModelJson('{"text":"a, b] and {c}","n":1}');
    expect(result.value).toEqual({ text: "a, b] and {c}", n: 1 });
  });

  it("keeps an escaped quote intact", () => {
    const result = parseModelJson('{"text":"she said \\"hi\\", then left",}');
    expect(result.value).toEqual({ text: 'she said "hi", then left' });
  });

  it("throws when there is no JSON at all", () => {
    expect(() => parseModelJson("I cannot help with that.")).toThrow(SyntaxError);
  });
});

/**
 * The reported production failure was a parse error at position 10786 - the
 * signature of a response cut off mid-structure, not of a stray comma. These
 * assert both that we can recover something *and* that the recovery is
 * flagged, because a truncated storyboard that parses silently loses scenes.
 */
describe("truncated output", () => {
  const scene = (i: number) => ({
    id: i,
    name: `Scene ${i}`,
    duration: 2.5,
    description:
      "A wordy description of what happens on screen, as the model writes it, running on long enough to be representative of real output.",
    actions: [
      { type: "display", target: "screenshot_main", content: null, position: null, animation: "zoomIn", effect: null, easing: "easeOut", duration: 2.5, delay: null },
      { type: "text", target: null, content: "Save ten hours every single week", position: "bottom", animation: "fadeIn", effect: null, easing: null, duration: 1.5, delay: 0.3 },
    ],
    textOverlay: { content: "Save ten hours a week", position: "bottom", fontSize: 60, color: "#FFFFFF", animation: "slideInBottom" },
  });
  const full = JSON.stringify({
    storyboards: [1, 2, 3].map((n) => ({
      title: `Concept ${n}`,
      concept: "Feature Showcase",
      description:
        "Two or three sentences describing the narrative arc of this concept in full, the way the model actually writes them.",
      totalDuration: 12,
      scenes: [1, 2, 3, 4, 5, 6].map(scene),
    })),
  });

  it("the sample is the size the failure was reported at", () => {
    expect(full.length).toBeGreaterThan(10786);
  });

  it("recovers the storyboards that did arrive, and says it was truncated", () => {
    const result = parseModelJson(full.slice(0, 10786));
    expect(result.truncated).toBe(true);
    expect(result.repair).toBe("closed");
    const value = result.value as { storyboards: unknown[] };
    expect(Array.isArray(value.storyboards)).toBe(true);
    expect(value.storyboards.length).toBeGreaterThanOrEqual(2);
  });

  it("recovers a cut inside a string", () => {
    const result = parseModelJson('{"a":1,"b":"half a sen');
    expect(result.truncated).toBe(true);
    expect((result.value as { a: number }).a).toBe(1);
  });

  it("recovers a cut right after a comma", () => {
    const result = parseModelJson('{"a":1,"list":[1,2,');
    expect(result.truncated).toBe(true);
    expect((result.value as { a: number }).a).toBe(1);
  });

  it("recovers a cut on a dangling key", () => {
    const result = parseModelJson('{"a":1,"b":');
    expect(result.truncated).toBe(true);
    expect((result.value as { a: number }).a).toBe(1);
  });
});
