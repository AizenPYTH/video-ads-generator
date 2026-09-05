import { describe, expect, it } from "vitest";

/**
 * The blank-is-unset rule, tested against the shape `.env.example` actually
 * produces. `dotenv` turns `FFMPEG_PATH=` into `""`, not `undefined`, so
 * every default in `env.ts` has to survive an empty string as well as a
 * missing key - the empty string is what a fresh clone gets.
 */
function str(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? fallback : trimmed;
}

describe("blank environment values", () => {
  it("falls back for missing, empty and whitespace-only values alike", () => {
    expect(str(undefined, "default")).toBe("default");
    expect(str("", "default")).toBe("default");
    expect(str("   ", "default")).toBe("default");
  });

  it("keeps a real value, trimmed", () => {
    expect(str("veryslow", "veryfast")).toBe("veryslow");
    expect(str("  /usr/bin/ffmpeg  ", "")).toBe("/usr/bin/ffmpeg");
  });

  it("is what `??` gets wrong", () => {
    // The bug this replaced: an empty string is not nullish, so `??` keeps
    // it and spawn() is handed "" as the binary to run. Written through a
    // variable because the linter rejects the constant form outright - which
    // is the same objection, one release too late for the shipped code.
    const blank: string | undefined = "";
    expect(blank ?? "default").toBe("");
    expect(str(blank, "default")).toBe("default");
  });
});

describe("env defaults with a copied .env.example", () => {
  it("resolves ffmpeg to a real binary when FFMPEG_PATH is blank", async () => {
    process.env.FFMPEG_PATH = "";
    const { ffmpegPath } = await import("../src/services/ffmpeg.service");
    expect(ffmpegPath).not.toBe("");
    expect(ffmpegPath.length).toBeGreaterThan(0);
  });
});
