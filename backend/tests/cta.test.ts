import { describe, expect, it } from "vitest";
import { displayUrl, normaliseUrl, resolveCta } from "../src/utils/cta";

const analysis = { name: "Linear", sourceUrl: "https://linear.app" };

describe("normaliseUrl", () => {
  it("accepts the shapes people paste", () => {
    expect(normaliseUrl("example.com")).toBe("https://example.com");
    expect(normaliseUrl("  www.example.com/  ")).toBe("https://www.example.com");
    expect(normaliseUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(normaliseUrl("http://example.com")).toBe("http://example.com");
    expect(normaliseUrl("https://apps.apple.com/app/id123")).toBe(
      "https://apps.apple.com/app/id123",
    );
  });

  it("refuses anything that is not a web address", () => {
    expect(normaliseUrl("")).toBeNull();
    expect(normaliseUrl("   ")).toBeNull();
    expect(normaliseUrl(undefined)).toBeNull();
    expect(normaliseUrl("mailto:hi@example.com")).toBeNull();
    // A QR code pointing at a javascript: URL is the worst case here.
    expect(normaliseUrl("javascript:alert(1)")).toBeNull();
    expect(normaliseUrl("notaurl")).toBeNull();
  });

  it("reads a port as a port, not as a scheme", () => {
    expect(normaliseUrl("localhost:3000")).toBe("https://localhost:3000");
    expect(normaliseUrl("example.com:8080/app")).toBe(
      "https://example.com:8080/app",
    );
  });
});

describe("displayUrl", () => {
  it("drops the scheme and the trailing slash", () => {
    expect(displayUrl("https://linear.app/")).toBe("linear.app");
    expect(displayUrl("http://a.dev/x")).toBe("a.dev/x");
  });
});

describe("resolveCta", () => {
  const phone = "mobile" as const;
  const laptop = "desktop" as const;

  it("sends a phone to the store and a laptop to the site", () => {
    const metadata = {
      productUrl: "https://linear.app",
      appStoreUrl: "https://apps.apple.com/app/id1",
    };
    expect(resolveCta(phone, metadata, analysis)?.target).toBe(
      "https://apps.apple.com/app/id1",
    );
    expect(resolveCta(laptop, metadata, analysis)?.target).toBe(
      "https://linear.app",
    );
  });

  it("names the store it is actually sending people to", () => {
    expect(
      resolveCta(phone, { appStoreUrl: "https://apps.apple.com/app/id1" }, analysis)
        ?.headline,
    ).toBe("Available on the App Store");
    expect(
      resolveCta(
        phone,
        { googlePlayUrl: "https://play.google.com/store/apps/details?id=x" },
        analysis,
      )?.headline,
    ).toBe("Get it on Google Play");
    expect(resolveCta(laptop, { productUrl: "https://linear.app" }, analysis)
      ?.headline).toBe("Visit Linear");
  });

  it("falls back the other way rather than showing nothing", () => {
    // Phone, no store link: the site is better than a blank outro.
    expect(resolveCta(phone, { productUrl: "https://linear.app" }, analysis)
      ?.target).toBe("https://linear.app");
    // Laptop, store link only.
    expect(
      resolveCta(laptop, { appStoreUrl: "https://apps.apple.com/app/id1" }, {
        name: "Linear",
      })?.target,
    ).toBe("https://apps.apple.com/app/id1");
  });

  it("falls back to the page we captured when the user gave us nothing", () => {
    expect(resolveCta(laptop, undefined, analysis)?.url).toBe("linear.app");
    expect(resolveCta(laptop, {}, analysis)?.url).toBe("linear.app");
  });

  it("ignores links it cannot use instead of printing them", () => {
    const cta = resolveCta(
      laptop,
      { productUrl: "javascript:alert(1)" },
      analysis,
    );
    expect(cta?.target).toBe("https://linear.app");
  });

  it("returns null when there is genuinely no destination", () => {
    expect(resolveCta(laptop, {}, { name: "Linear" })).toBeNull();
    expect(resolveCta(phone, { productUrl: "  " }, { name: "" })).toBeNull();
  });

  it("prefers an explicit app name over the analysed product name", () => {
    expect(
      resolveCta(laptop, { productUrl: "https://x.dev", appName: "Xen" }, analysis)
        ?.headline,
    ).toBe("Visit Xen");
  });
});
