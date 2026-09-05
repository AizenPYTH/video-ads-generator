import { describe, expect, it } from "vitest";
import { isOriginAllowed } from "../src/middleware/cors";

const VERCEL = "https://reel-git-abc123-team.vercel.app";

/**
 * CORS is the difference between the deployed frontend working and every
 * request from it failing, so the allowlist is exercised rather than
 * trusted - especially the shapes operators actually type.
 */
describe("isOriginAllowed", () => {
  describe("the five ways people write the same thing", () => {
    const origin = "https://my-app.vercel.app";
    for (const entry of [
      "https://my-app.vercel.app",
      "my-app.vercel.app",
      "https://my-app.vercel.app/",
      "*.vercel.app",
      "https://*.vercel.app",
    ]) {
      it(`accepts ${entry}`, () => {
        expect(isOriginAllowed(entry, origin)).toBe(true);
      });
    }
  });

  it("matches every Vercel preview subdomain from one wildcard", () => {
    expect(isOriginAllowed("*.vercel.app", VERCEL)).toBe(true);
    expect(isOriginAllowed("https://*.vercel.app", VERCEL)).toBe(true);
  });

  it("rejects an origin that is not listed", () => {
    expect(
      isOriginAllowed("https://reel.example.com", "https://evil.example.com"),
    ).toBe(false);
  });

  it("does not let a wildcard match a lookalike domain", () => {
    // `notvercel.app` ends with `vercel.app`; the leading dot stops it.
    expect(isOriginAllowed("*.vercel.app", "https://notvercel.app")).toBe(false);
    expect(isOriginAllowed("https://*.vercel.app", "https://notvercel.app")).toBe(
      false,
    );
  });

  it("does not let a subdomain wildcard match the apex", () => {
    expect(isOriginAllowed("*.vercel.app", "https://vercel.app")).toBe(false);
  });

  it("honours a scheme when the entry names one", () => {
    expect(
      isOriginAllowed("https://app.example.com", "http://app.example.com"),
    ).toBe(false);
    // No scheme in the entry means the operator did not care.
    expect(isOriginAllowed("app.example.com", "http://app.example.com")).toBe(
      true,
    );
  });

  it("is case insensitive on the host", () => {
    expect(isOriginAllowed("HTTPS://My-App.Vercel.App", VERCEL.toUpperCase()))
      .toBe(false); // different subdomain, still no match
    expect(isOriginAllowed("*.VERCEL.APP", VERCEL)).toBe(true);
  });

  it("supports several entries, mixed shapes, sloppy spacing", () => {
    const list = " https://reel.example.com ,*.vercel.app,  localhost:5173 ";
    expect(isOriginAllowed(list, VERCEL)).toBe(true);
    expect(isOriginAllowed(list, "https://reel.example.com")).toBe(true);
    expect(isOriginAllowed(list, "http://localhost:5173")).toBe(true);
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

  it("ignores empty entries from a trailing comma", () => {
    expect(isOriginAllowed("*.vercel.app,", VERCEL)).toBe(true);
  });
});

describe("ports", () => {
  // `URL.hostname` drops the port, so a naive comparison breaks the default
  // dev config in .env.example.
  it("matches the default dev value, with and without a scheme", () => {
    expect(isOriginAllowed("http://localhost:5173", "http://localhost:5173")).toBe(
      true,
    );
    expect(isOriginAllowed("localhost:5173", "http://localhost:5173")).toBe(true);
  });

  it("does not match a different port", () => {
    expect(isOriginAllowed("http://localhost:5173", "http://localhost:4173")).toBe(
      false,
    );
  });

  it("an entry without a port still matches any port on that host", () => {
    expect(isOriginAllowed("localhost", "http://localhost:5173")).toBe(true);
  });
});
