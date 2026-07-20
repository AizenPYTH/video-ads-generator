import { describe, expect, it } from "vitest";
import { AppErrorCode } from "@/lib/errors/app-error";
import { isAllowedUrl, validateUrl } from "@/lib/validation/url";

describe("SSRF URL validation", () => {
  it("allows public HTTPS URLs", () => {
    const result = validateUrl("https://www.ebay.fr/itm/123456");

    expect(result.protocol).toBe("https:");
    expect(result.hostname).toBe("www.ebay.fr");
    expect(isAllowedUrl("https://example.com/product")).toBe(true);
  });

  it("blocks localhost", () => {
    expect(() => validateUrl("http://localhost/admin")).toThrow();
    expect(isAllowedUrl("http://localhost:3000")).toBe(false);

    try {
      validateUrl("http://localhost/admin");
    } catch (error) {
      expect((error as { code: string }).code).toBe(AppErrorCode.SSRF_BLOCKED);
    }
  });

  it("blocks 127.0.0.1 loopback", () => {
    expect(isAllowedUrl("http://127.0.0.1/internal")).toBe(false);
  });

  it("blocks private IPv4 ranges", () => {
    expect(isAllowedUrl("http://10.0.0.1/secret")).toBe(false);
    expect(isAllowedUrl("http://192.168.1.1/router")).toBe(false);
    expect(isAllowedUrl("http://172.16.0.1/metadata")).toBe(false);
    expect(isAllowedUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
  });

  it("blocks .localhost and .local hostnames", () => {
    expect(isAllowedUrl("http://app.localhost/dashboard")).toBe(false);
    expect(isAllowedUrl("http://printer.local/config")).toBe(false);
  });

  it("blocks IPv6 loopback", () => {
    expect(isAllowedUrl("http://[::1]/")).toBe(false);
  });

  it("blocks URLs with embedded credentials", () => {
    expect(isAllowedUrl("https://user:pass@example.com")).toBe(false);
  });

  it("blocks non-HTTP protocols", () => {
    expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedUrl("ftp://example.com")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isAllowedUrl("not-a-url")).toBe(false);
  });
});
