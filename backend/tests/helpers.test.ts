import { describe, expect, it } from "vitest";
import { extractJson, normalizeHex, slugify } from "../src/utils/helpers";
import { resolveInBucket } from "../src/services/storage.service";

describe("extractJson", () => {
  it("unwraps a fenced block", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips prose before and after the payload", () => {
    expect(extractJson('Here you go: {"a":1} hope that helps')).toBe('{"a":1}');
  });

  it("handles a top-level array", () => {
    expect(extractJson("Sure!\n[{\"a\":1}]")).toBe('[{"a":1}]');
  });
});

describe("normalizeHex", () => {
  it("expands shorthand and adds the hash", () => {
    expect(normalizeHex("abc")).toBe("#aabbcc");
    expect(normalizeHex("#1D4ED8")).toBe("#1d4ed8");
  });

  it("rejects anything that is not a hex colour", () => {
    expect(normalizeHex("rebeccapurple")).toBeNull();
    expect(normalizeHex(42)).toBeNull();
  });
});

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Nimbus — Éditeur de Notes!")).toBe(
      "nimbus-editeur-de-notes",
    );
  });
});

describe("resolveInBucket", () => {
  it("refuses to escape the bucket", () => {
    expect(resolveInBucket("videos", "../../etc/passwd")).toBeNull();
    expect(resolveInBucket("videos", "/etc/passwd")).toBeNull();
  });

  it("accepts an ordinary filename", () => {
    expect(resolveInBucket("videos", "job-9x16.mp4")).toContain(
      "videos/job-9x16.mp4",
    );
  });
});
