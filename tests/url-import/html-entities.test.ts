import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "@/lib/html/decode-entities";

describe("decodeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry &lt;3&gt;")).toBe(
      "Tom & Jerry <3>",
    );
    expect(decodeHtmlEntities("&quot;Hello&quot;")).toBe('"Hello"');
    expect(decodeHtmlEntities("&apos;Hi&apos;")).toBe("'Hi'");
    expect(decodeHtmlEntities("100&nbsp;€")).toBe("100\u00A0€");
  });

  it("decodes decimal numeric entities", () => {
    expect(decodeHtmlEntities("&#8364;")).toBe("€");
    expect(decodeHtmlEntities("A&#66;C")).toBe("ABC");
  });

  it("decodes hexadecimal numeric entities", () => {
    expect(decodeHtmlEntities("&#x20AC;")).toBe("€");
    expect(decodeHtmlEntities("&#x41;&#x42;")).toBe("AB");
  });

  it("leaves unknown named entities unchanged", () => {
    expect(decodeHtmlEntities("&unknown;")).toBe("&unknown;");
  });

  it("returns empty input unchanged", () => {
    expect(decodeHtmlEntities("")).toBe("");
  });

  it("handles mixed entity types", () => {
    expect(decodeHtmlEntities("&amp; &#8364; &#x41;")).toBe("& € A");
  });
});
