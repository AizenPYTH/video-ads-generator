import { describe, expect, it } from "vitest";
import { normalizeStoryboard } from "../src/services/storyboard.service";
import {
  MAX_SCENE_DURATION,
  MAX_TOTAL_DURATION,
  MIN_SCENE_DURATION,
} from "../src/utils/constants";
import type { AssetRef } from "../src/types";
import type { RawAction, RawStoryboard } from "../src/services/schemas";

const assets: AssetRef[] = [
  { id: "screenshot_main", url: "http://x/0.png", width: 100, height: 200, label: "hero" },
  { id: "screenshot_1", url: "http://x/1.png", width: 100, height: 200, label: "one" },
  { id: "screenshot_2", url: "http://x/2.png", width: 100, height: 200, label: "two" },
];

const displayAction = (overrides: Partial<RawAction> = {}): RawAction => ({
  type: "display",
  target: "screenshot_main",
  content: null,
  position: null,
  animation: "zoomIn",
  effect: null,
  easing: "easeOut",
  duration: 2,
  delay: null,
  ...overrides,
});

const draft = (overrides: Partial<RawStoryboard> = {}): RawStoryboard => ({
  title: "Concept",
  concept: "Problem to Solution",
  description: "",
  totalDuration: 12,
  scenes: [
    {
      id: 1,
      name: "Hero",
      duration: 3,
      description: "",
      actions: [displayAction({ duration: 3 })],
      textOverlay: {
        content: "Ship faster",
        position: "bottom",
        fontSize: 60,
        color: "FFFFFF",
        animation: "fadeIn",
      },
    },
    {
      id: 2,
      name: "Close",
      duration: 3,
      description: "",
      actions: [displayAction({ duration: 3, target: "screenshot_1" })],
      textOverlay: null,
    },
  ],
  ...overrides,
});

const normalize = (raw: RawStoryboard) =>
  normalizeStoryboard(raw, {
    style: "apple_premium",
    device: "iphone_15_pro",
    assets,
  });

describe("normalizeStoryboard", () => {
  it("derives totalDuration from the scenes rather than trusting the model", () => {
    // Claude claims 12s while the scenes only add up to 6s.
    const result = normalize(draft({ totalDuration: 12 }));
    expect(result.totalDuration).toBe(6);
    expect(
      result.scenes.reduce((sum, scene) => sum + scene.duration, 0),
    ).toBeCloseTo(result.totalDuration, 5);
  });

  it("rescales proportionally when the scenes overrun the maximum", () => {
    const raw = draft();
    raw.scenes = raw.scenes.map((scene) => ({ ...scene, duration: 30 }));
    const result = normalize(raw);

    expect(result.totalDuration).toBeLessThanOrEqual(MAX_TOTAL_DURATION);
    for (const scene of result.scenes) {
      expect(scene.duration).toBeLessThanOrEqual(MAX_SCENE_DURATION);
      expect(scene.duration).toBeGreaterThanOrEqual(MIN_SCENE_DURATION);
    }
  });

  it("renumbers scene ids into a contiguous sequence", () => {
    const raw = draft();
    raw.scenes = raw.scenes.map((scene) => ({ ...scene, id: 99 }));
    expect(normalize(raw).scenes.map((scene) => scene.id)).toEqual([1, 2]);
  });

  it("maps an invented asset id onto a real capture", () => {
    const raw = draft();
    raw.scenes[0]!.actions = [displayAction({ target: "screenshot_feature2" })];

    const action = normalize(raw).scenes[0]!.actions[0]!;
    expect(action.type).toBe("display");
    expect(assets.map((asset) => asset.id)).toContain(
      (action as { target: string }).target,
    );
  });

  it("gives a text-only scene something to look at", () => {
    const raw = draft();
    raw.scenes[0]!.actions = [
      {
        type: "text",
        target: null,
        content: "Just words",
        position: "center",
        animation: "fadeIn",
        effect: null,
        easing: null,
        duration: 1.5,
        delay: null,
      },
    ];

    const actions = normalize(raw).scenes[0]!.actions;
    expect(actions.some((action) => action.type === "display")).toBe(true);
  });

  it("drops a text action with no content instead of rendering an empty line", () => {
    const raw = draft();
    raw.scenes[1]!.actions = [
      displayAction(),
      {
        type: "text",
        target: null,
        content: "   ",
        position: "bottom",
        animation: "fadeIn",
        effect: null,
        easing: null,
        duration: 1,
        delay: null,
      },
    ];

    expect(
      normalize(raw).scenes[1]!.actions.some((action) => action.type === "text"),
    ).toBe(false);
  });

  it("clamps an action longer than the scene that contains it", () => {
    const raw = draft();
    raw.scenes[0]!.duration = 2;
    raw.scenes[0]!.actions = [displayAction({ duration: 9 })];

    const scene = normalize(raw).scenes[0]!;
    expect(scene.actions[0]!.duration).toBeLessThanOrEqual(scene.duration);
  });

  it("normalises a bare hex overlay colour", () => {
    expect(normalize(draft()).scenes[0]!.textOverlay?.color).toBe("#ffffff");
  });

  it("carries the requested style and device onto the storyboard", () => {
    const result = normalizeStoryboard(draft(), {
      style: "minimal_dark",
      device: "macbook_14",
      assets,
    });
    expect(result.style).toBe("minimal_dark");
    expect(result.device).toBe("macbook_14");
  });
});
