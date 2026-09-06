import { describe, expect, it } from "vitest";
import { CAMERA3D_REST, addCamera3D, camera3DAt, resolveCamera } from "../remotion/src/engine3d/camera/state";
import { iphoneScreenShape, laptopScreenShape } from "../remotion/src/engine3d/screen/screenCanvas";
import { ease } from "../remotion/src/engine/motion/easing";

describe("Camera3D", () => {
  it("rests on the +z axis looking at the origin", () => {
    const { position, target } = resolveCamera(CAMERA3D_REST);
    expect(position[0]).toBeCloseTo(0);
    expect(position[1]).toBeCloseTo(0);
    expect(position[2]).toBeCloseTo(CAMERA3D_REST.distance);
    expect(target).toEqual([0, 0, 0]);
  });

  it("orbits: positive yaw moves the camera to +x, positive pitch raises it", () => {
    const side = resolveCamera({ ...CAMERA3D_REST, yaw: 90 });
    expect(side.position[0]).toBeCloseTo(CAMERA3D_REST.distance);
    expect(side.position[2]).toBeCloseTo(0);
    const above = resolveCamera({ ...CAMERA3D_REST, pitch: 90 });
    expect(above.position[1]).toBeCloseTo(CAMERA3D_REST.distance);
  });

  it("keeps the distance to the target constant through any orbit", () => {
    for (const yaw of [-170, -45, 0, 30, 120]) {
      for (const pitch of [-20, 0, 15, 60]) {
        const { position, target } = resolveCamera({ ...CAMERA3D_REST, yaw, pitch, targetX: 0.3, targetY: -0.2 });
        const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
        expect(d).toBeCloseTo(CAMERA3D_REST.distance);
      }
    }
  });

  it("trucks the target and the camera together", () => {
    const a = resolveCamera(CAMERA3D_REST);
    const b = resolveCamera({ ...CAMERA3D_REST, panX: 0.5, panY: -0.25 });
    expect(b.position[0] - a.position[0]).toBeCloseTo(0.5);
    expect(b.target[0] - a.target[0]).toBeCloseTo(0.5);
    expect(b.position[1] - a.position[1]).toBeCloseTo(-0.25);
  });

  it("keyframes every property independently and holds the rest", () => {
    const keys = [
      { at: 0, distance: 4, yaw: 10, fov: 30 },
      { at: 60, distance: 3, easing: ease.linear },
      { at: 120, yaw: 0, easing: ease.linear },
    ];
    const mid = camera3DAt(30, keys);
    expect(mid.distance).toBeCloseTo(3.5);
    expect(mid.yaw).toBeCloseTo(10 - (10 * 30) / 120);
    expect(mid.fov).toBe(30);
    expect(camera3DAt(500, keys).distance).toBe(3);
  });

  it("adds hand-held drift without touching what is not given", () => {
    const base = camera3DAt(0, [{ at: 0, distance: 5, fov: 40 }]);
    const drifted = addCamera3D(base, { yaw: 0.3, panY: 0.01 });
    expect(drifted.distance).toBe(5);
    expect(drifted.fov).toBe(40);
    expect(drifted.yaw).toBeCloseTo(0.3);
    expect(drifted.panY).toBeCloseTo(0.01);
  });
});

describe("screen shapes", () => {
  it("matches the iPhone glass ratio and keeps the island centred at the top", () => {
    const shape = iphoneScreenShape(1536);
    expect(shape.height).toBe(1536);
    expect(shape.width / shape.height).toBeCloseTo(67.59 / 143.77, 2);
    expect(shape.island).not.toBeNull();
    expect(shape.island!.width).toBeLessThan(shape.width / 2);
    expect(shape.inset).toBeGreaterThan(0);
    expect(shape.radius).toBeGreaterThan(shape.inset);
  });

  it("gives a laptop the panel's aspect with no island", () => {
    const shape = laptopScreenShape(1536, 3024 / 1964);
    expect(shape.width).toBe(1536);
    expect(shape.width / shape.height).toBeCloseTo(3024 / 1964, 2);
    expect(shape.island).toBeNull();
  });
});
