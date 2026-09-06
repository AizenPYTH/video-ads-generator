import { describe, expect, it } from "vitest";
import { kf, track } from "../remotion/src/engine/motion/keyframes";
import { cameraAt, cameraTransform, dollyToZ, CAMERA_REST } from "../remotion/src/engine/motion/camera";
import { ease, progress, stagger, drift } from "../remotion/src/engine/motion/easing";
import { scheduleScreens } from "../remotion/src/engine/content/ScreenSequence";
import { containFit } from "../remotion/src/engine/content/Logo";
import { aspectKey, compositionId, parseAspect, aspectOf } from "../remotion/src/engine/aspect";
import { layoutFor } from "../remotion/src/engine/layout";

describe("kf", () => {
  const frames = [
    { at: 10, value: 0 },
    { at: 40, value: 100, easing: ease.linear },
    { at: 70, value: 50, easing: ease.linear },
  ];

  it("holds before the first keyframe and after the last", () => {
    expect(kf(0, frames)).toBe(0);
    expect(kf(10, frames)).toBe(0);
    expect(kf(70, frames)).toBe(50);
    expect(kf(1000, frames)).toBe(50);
  });

  it("interpolates each segment on its own curve", () => {
    expect(kf(25, frames)).toBeCloseTo(50);
    expect(kf(55, frames)).toBeCloseTo(75);
  });

  it("lands exactly on every keyframe value", () => {
    expect(kf(40, frames)).toBe(100);
  });

  it("is monotonic within a segment for the house curves", () => {
    for (const curve of [ease.cinematicOut, ease.cinematicIn, ease.cinematicInOut, ease.smooth, ease.snap]) {
      let previous = -Infinity;
      for (let f = 0; f <= 60; f += 1) {
        const value = kf(f, [{ at: 0, value: 0 }, { at: 60, value: 1, easing: curve }]);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });

  it("settle overshoots and comes back; anticipate dips first", () => {
    const settle = (f: number) => kf(f, [{ at: 0, value: 0 }, { at: 60, value: 1, easing: ease.settle }]);
    expect(Math.max(...Array.from({ length: 61 }, (_, f) => settle(f)))).toBeGreaterThan(1);
    expect(settle(60)).toBeCloseTo(1);
    const anticipate = (f: number) => kf(f, [{ at: 0, value: 0 }, { at: 60, value: 1, easing: ease.anticipate }]);
    expect(Math.min(...Array.from({ length: 61 }, (_, f) => anticipate(f)))).toBeLessThan(0);
  });

  it("returns 0 for no keyframes and the value for one", () => {
    expect(kf(5, [])).toBe(0);
    expect(kf(5, [{ at: 0, value: 7 }])).toBe(7);
  });
});

describe("track", () => {
  it("lets a property left out of a keyframe hold its last value", () => {
    const keys = [
      { at: 0, a: 0, b: 10 },
      { at: 30, a: 100, easing: ease.linear },
      { at: 60, b: 20, easing: ease.linear },
    ];
    expect(track(15, keys, "a", 0)).toBeCloseTo(50);
    expect(track(15, keys, "b", 0)).toBeCloseTo(10 + (10 * 15) / 60);
    expect(track(45, keys, "a", 0)).toBe(100);
  });

  it("uses the fallback when a property is never defined", () => {
    expect(track(10, [{ at: 0, a: 1 }], "b", 42)).toBe(42);
  });
});

describe("camera", () => {
  it("rests at identity", () => {
    expect(cameraAt(0, [])).toEqual(CAMERA_REST);
    expect(dollyToZ(1, 1000)).toBe(0);
  });

  it("brings the world closer for dolly > 1 and further for < 1", () => {
    expect(dollyToZ(2, 1000)).toBeGreaterThan(0);
    expect(dollyToZ(0.5, 1000)).toBeLessThan(0);
    // A point at the origin appears exactly `dolly` times larger.
    const p = 1000;
    for (const dolly of [0.5, 1, 1.5, 2]) {
      const z = dollyToZ(dolly, p);
      expect(p / (p - z)).toBeCloseTo(dolly);
    }
  });

  it("negates pitch so a positive orbitX is a camera above the subject", () => {
    const transform = cameraTransform({ ...CAMERA_REST, orbitX: 20 }, 1000);
    expect(transform).toContain("rotateX(-20deg)");
  });
});

describe("easing helpers", () => {
  it("progress clamps and treats an empty window as done", () => {
    expect(progress(-1, 0, 10)).toBe(0);
    expect(progress(5, 0, 10)).toBe(0.5);
    expect(progress(99, 0, 10)).toBe(1);
    expect(progress(10, 10, 10)).toBe(1);
  });
  it("stagger caps", () => {
    expect(stagger(3, 4)).toBe(12);
    expect(stagger(30, 4, 20)).toBe(20);
  });
  it("drift is zero at t=0 with no phase and bounded by amplitude", () => {
    expect(drift(0, 7, 3)).toBeCloseTo(0);
    for (let t = 0; t < 30; t += 0.37) expect(Math.abs(drift(t, 7, 3))).toBeLessThanOrEqual(3);
  });
});

describe("scheduleScreens", () => {
  it("covers the window exactly with no gaps", () => {
    const slots = scheduleScreens(3, 60, 210, 45);
    expect(slots[0]?.start).toBe(60);
    const last = slots[slots.length - 1]!;
    expect(last.start + last.length).toBe(210);
    for (let i = 1; i < slots.length; i += 1) {
      expect(slots[i]!.start).toBe(slots[i - 1]!.start + slots[i - 1]!.length);
    }
  });
  it("does not repeat when loop is off", () => {
    const slots = scheduleScreens(2, 0, 300, 30, false);
    expect(slots.length).toBe(2);
  });
  it("cycles when loop is on", () => {
    const slots = scheduleScreens(2, 0, 300, 30, true);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  });
  it("never emits a zero-length slot", () => {
    for (let span = 1; span < 300; span += 7) {
      const slots = scheduleScreens(4, 0, span, 40);
      expect(slots.every((s) => s.length >= 1)).toBe(true);
    }
  });
});

describe("containFit", () => {
  it("never changes the ratio", () => {
    const size = containFit({ width: 400, height: 100 }, { width: 200, height: 200 });
    expect(size).toEqual({ width: 200, height: 50 });
    const tall = containFit({ width: 100, height: 400 }, { width: 200, height: 200 });
    expect(tall).toEqual({ width: 50, height: 200 });
  });
});

describe("aspect", () => {
  it("round-trips keys and builds legal composition ids", () => {
    expect(aspectKey("9:16")).toBe("9x16");
    expect(parseAspect("9x16")).toBe("9:16");
    expect(parseAspect("nope")).toBeNull();
    // Remotion allows only [a-zA-Z0-9-] in composition ids.
    expect(compositionId("macbook-open", "16:9")).toMatch(/^[a-zA-Z0-9-]+$/);
    expect(aspectOf(1920, 1080)).toBe("16:9");
    expect(aspectOf(1080, 1920)).toBe("9:16");
    expect(aspectOf(1080, 1080)).toBe("1:1");
  });

  it("lays every aspect out inside its own canvas", () => {
    for (const [w, h] of [[1920, 1080], [1080, 1920], [1080, 1080]] as const) {
      const L = layoutFor(w, h);
      for (const box of [L.device, L.copy, L.signature]) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(w + 1e-6);
        expect(box.y + box.height).toBeLessThanOrEqual(h + 1e-6);
      }
      // The copy never sits on the device.
      if (L.aspect !== "16:9") expect(L.copy.y).toBeGreaterThanOrEqual(L.device.y + L.device.height - 1e-6);
    }
  });
});
