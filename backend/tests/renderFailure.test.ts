import { describe, expect, it } from "vitest";
import { describeRenderFailure } from "../src/jobs/renderFailure";

describe("describeRenderFailure", () => {
  it("explains a delayRender timeout as a slow asset", () => {
    const message = describeRenderFailure(
      new Error("A delayRender() \"Loading images\" was called but not cleared after 30000ms."),
    );
    expect(message).toMatch(/took too long to load/);
  });

  it("explains a lost browser as memory", () => {
    expect(describeRenderFailure(new Error("Target closed"))).toMatch(/memory/);
  });

  it("explains a missing 3D context", () => {
    expect(describeRenderFailure(new Error("Error creating WebGL context."))).toMatch(/3D context/);
  });

  it("explains disk exhaustion", () => {
    expect(describeRenderFailure(new Error("ENOSPC: no space left on device"))).toMatch(/disk space/);
  });

  it("falls back to a generic sentence for anything else", () => {
    expect(describeRenderFailure("weird")).toMatch(/Try again/);
    expect(describeRenderFailure(new Error("weird"))).not.toMatch(/weird/);
  });
});
