import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "../src/middleware/cors";

/**
 * CORS is the difference between a Vercel preview working and every request
 * from it failing, so the allowlist is exercised rather than trusted.
 */
describe("isOriginAllowed", () => {
  it("allows an exactly listed origin", () => {
    expect(
      isOriginAllowed("https://reel.example.com", "https://reel.example.com"),
    ).toBe(true);
  });

  it("rejects an origin that is not listed", () => {
    expect(
      isOriginAllowed("https://reel.example.com", "https://evil.example.com"),
    ).toBe(false);
  });

  it("matches every Vercel preview subdomain from one wildcard entry", () => {
    expect(
      isOriginAllowed("*.vercel.app", "https://reel-git-abc123-team.vercel.app"),
    ).toBe(true);
  });

  it("does not let a wildcard match a lookalike domain", () => {
    // `notvercel.app` ends with the same characters as `vercel.app`; the
    // leading dot in the suffix is what stops it.
    expect(isOriginAllowed("*.vercel.app", "https://notvercel.app")).toBe(false);
  });

  it("supports several entries at once", () => {
    const list = "https://reel.example.com, *.vercel.app";
    expect(isOriginAllowed(list, "https://x-team.vercel.app")).toBe(true);
    expect(isOriginAllowed(list, "https://reel.example.com")).toBe(true);
    expect(isOriginAllowed(list, "https://other.com")).toBe(false);
  });

  it("allows requests that carry no Origin header", () => {
    expect(isOriginAllowed("https://reel.example.com", undefined)).toBe(true);
  });

  it("treats a bare * as allow-all", () => {
    expect(isOriginAllowed("*", "https://anything.example")).toBe(true);
  });

  it("rejects a malformed origin rather than throwing", () => {
    expect(isOriginAllowed("*.vercel.app", "not a url")).toBe(false);
  });
});
