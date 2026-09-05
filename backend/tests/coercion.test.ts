import { describe, expect, it } from "vitest";
import { coerceEnum, coerceNumber, coerceString } from "../src/services/coerce";
import { storyboardsResultSchema } from "../src/services/schemas";
import { parseModelJson } from "../src/utils/json";
import {
  ANIMATION_TYPES,
  TEXT_POSITIONS,
  VISUAL_EFFECTS,
} from "../src/services/schemas";

describe("coerceEnum", () => {
  it("keeps a value that is already legal", () => {
    expect(coerceEnum("zoomIn", ANIMATION_TYPES, "fadeIn")).toBe("zoomIn");
  });

  it("repairs casing and punctuation", () => {
    for (const written of ["slideinleft", "slide-in-left", "SLIDE_IN_LEFT"]) {
      expect(coerceEnum(written, ANIMATION_TYPES, "fadeIn")).toBe("slideInLeft");
    }
  });

  it("maps the synonyms the model actually writes", () => {
    expect(coerceEnum("zoom", ANIMATION_TYPES, "fadeIn")).toBe("zoomIn");
    expect(coerceEnum("middle", TEXT_POSITIONS, "bottom")).toBe("center");
    expect(coerceEnum("sparkles", VISUAL_EFFECTS, "particles")).toBe("particles");
    expect(coerceEnum("lens flare", VISUAL_EFFECTS, "particles")).toBe("lightFlare");
  });

  it("falls back rather than guessing between siblings", () => {
    // `slideIn` could be any of four directions - do not pick one.
    expect(coerceEnum("slideIn", ANIMATION_TYPES, "fadeIn")).toBe("fadeIn");
  });

  it("falls back on nonsense, null and non-strings", () => {
    expect(coerceEnum("banana", ANIMATION_TYPES, "fadeIn")).toBe("fadeIn");
    expect(coerceEnum(null, ANIMATION_TYPES, "fadeIn")).toBe("fadeIn");
    expect(coerceEnum(42, ANIMATION_TYPES, "fadeIn")).toBe("fadeIn");
    expect(coerceEnum("   ", ANIMATION_TYPES, "fadeIn")).toBe("fadeIn");
  });
});

describe("coerceNumber", () => {
  it("clamps into range and survives numeric strings", () => {
    expect(coerceNumber(99, 2, 1, 6)).toBe(6);
    expect(coerceNumber(-5, 2, 1, 6)).toBe(1);
    expect(coerceNumber("3.5", 2, 1, 6)).toBe(3.5);
  });

  it("falls back on NaN, null and undefined", () => {
    expect(coerceNumber("abc", 2, 1, 6)).toBe(2);
    expect(coerceNumber(null, 2, 1, 6)).toBe(2);
    expect(coerceNumber(undefined, 2, 1, 6)).toBe(2);
  });
});

describe("coerceString", () => {
  it("trims and falls back on blank", () => {
    expect(coerceString("  hi  ", "x")).toBe("hi");
    expect(coerceString("   ", "x")).toBe("x");
    expect(coerceString(undefined, "x")).toBe("x");
  });
});

/**
 * The payloads below are the failures reported from production with a real
 * API key: `concept` missing, and `effect` / `position` carrying values that
 * are not in the enum. Each one used to reject the entire batch.
 */
describe("storyboard parsing survives what Claude actually returns", () => {
  const scene = (extra: Record<string, unknown> = {}) => ({
    id: 1,
    name: "Hero",
    duration: 3,
    description: "",
    actions: [
      { type: "display", target: "screenshot_main", animation: "zoomIn", duration: 3 },
    ],
    ...extra,
  });

  const draft = (extra: Record<string, unknown> = {}) => ({
    title: "The Problem, Solved",
    concept: "Problem to Solution",
    description: "",
    totalDuration: 12,
    scenes: [scene(), scene({ id: 2, name: "Close" })],
    ...extra,
  });

  const parse = (storyboards: unknown[]) =>
    storyboardsResultSchema.parse({ storyboards });

  it("fills in a missing concept instead of rejecting", () => {
    const [result] = parse([draft({ concept: undefined })]).storyboards;
    expect(result?.concept).toBe("Feature Showcase");
  });

  it("repairs an out-of-vocabulary effect", () => {
    const bad = draft({
      scenes: [
        scene({
          actions: [{ type: "effect", effect: "explosion", duration: 1 }],
        }),
      ],
    });
    const [result] = parse([bad]).storyboards;
    expect(VISUAL_EFFECTS).toContain(result?.scenes[0]?.actions[0]?.effect);
  });

  it("repairs an out-of-vocabulary position", () => {
    const bad = draft({
      scenes: [
        scene({
          actions: [
            { type: "text", content: "Ship faster", position: "middle-ish", duration: 1 },
          ],
        }),
      ],
    });
    const [result] = parse([bad]).storyboards;
    expect(TEXT_POSITIONS).toContain(result?.scenes[0]?.actions[0]?.position);
  });

  it("takes all three even when one is malformed", () => {
    const result = parse([
      draft(),
      draft({ concept: undefined, totalDuration: "twelve" }),
      draft({ title: undefined }),
    ]);
    expect(result.storyboards).toHaveLength(3);
    for (const storyboard of result.storyboards) {
      expect(storyboard.title.length).toBeGreaterThan(0);
      expect(storyboard.concept.length).toBeGreaterThan(0);
      expect(storyboard.totalDuration).toBeGreaterThan(0);
    }
  });

  it("drops only the storyboard that has no usable scene", () => {
    const result = parse([draft(), draft({ scenes: [] }), draft()]);
    expect(result.storyboards).toHaveLength(2);
  });

  it("keeps a scene that has only text and no actions", () => {
    const textOnly = draft({
      scenes: [
        { name: "Title card", duration: 2, textOverlay: { content: "Ship faster" } },
      ],
    });
    expect(parse([textOnly]).storyboards[0]?.scenes).toHaveLength(1);
  });

  it("survives a completely empty object", () => {
    const result = storyboardsResultSchema.safeParse({ storyboards: [{}] });
    expect(result.success).toBe(true);
    expect(result.success && result.data.storyboards).toHaveLength(0);
  });
});

/**
 * The two recovery layers together: a response cut off at the token ceiling
 * goes through the JSON repair and then the coercing schema, and what
 * survives has to be renderable. This is the path behind the reported
 * "malformed JSON at position 10786".
 */
describe("a truncated response still yields renderable storyboards", () => {
  const scene = (i: number) => ({
    id: i,
    name: `Scene ${i}`,
    duration: 2.5,
    description:
      "A wordy description of what happens on screen, long enough to be representative of real model output.",
    actions: [
      {
        type: "display",
        target: "screenshot_main",
        content: null,
        position: null,
        animation: "zoomIn",
        effect: null,
        easing: "easeOut",
        duration: 2.5,
        delay: null,
      },
      {
        type: "text",
        target: null,
        content: "Save ten hours every single week",
        position: "bottom",
        animation: "fadeIn",
        effect: null,
        easing: null,
        duration: 1.5,
        delay: 0.3,
      },
    ],
    textOverlay: {
      content: "Save ten hours a week",
      position: "bottom",
      fontSize: 60,
      color: "#FFFFFF",
      animation: "slideInBottom",
    },
  });

  const body = JSON.stringify({
    storyboards: [1, 2, 3].map((n) => ({
      title: `Concept ${n}`,
      concept: "Feature Showcase",
      description:
        "Two or three sentences describing the narrative arc of this concept in full.",
      totalDuration: 12,
      scenes: [1, 2, 3, 4, 5, 6].map(scene),
    })),
  });

  it("the sample is the size the failure was reported at", () => {
    expect(body.length).toBeGreaterThan(10786);
  });

  it("recovers whole storyboards from a cut at the reported offset", () => {
    const repaired = parseModelJson(body.slice(0, 10786));
    expect(repaired.truncated).toBe(true);

    const parsed = storyboardsResultSchema.parse(repaired.value);
    expect(parsed.storyboards.length).toBeGreaterThanOrEqual(2);

    // Whatever survived has to be renderable, not merely parseable.
    for (const storyboard of parsed.storyboards) {
      expect(storyboard.title.length).toBeGreaterThan(0);
      expect(storyboard.concept.length).toBeGreaterThan(0);
      expect(storyboard.scenes.length).toBeGreaterThan(0);
      for (const s of storyboard.scenes) {
        expect(s.duration).toBeGreaterThan(0);
      }
    }
  });

  it("never throws on a cut at any offset across the payload", () => {
    for (let cut = 200; cut < body.length; cut += 137) {
      expect(() => {
        try {
          const repaired = parseModelJson(body.slice(0, cut));
          storyboardsResultSchema.parse(repaired.value);
        } catch (error) {
          // Unparseable is an acceptable outcome; the caller falls back to
          // templates. A crash on anything else is not.
          if (!(error instanceof SyntaxError)) throw error;
        }
      }).not.toThrow();
    }
  });
});
