import { describe, expect, it } from "vitest";
import { decodeDataUri, imageSize } from "../src/utils/imageSize";

/** 1x1 transparent PNG. */
const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("imageSize", () => {
  it("reads PNG dimensions from the IHDR chunk", () => {
    expect(imageSize(Buffer.from(PNG_1x1, "base64"))).toEqual({
      width: 1,
      height: 1,
    });
  });

  it("returns null for bytes that are not an image", () => {
    expect(imageSize(Buffer.from("not an image at all"))).toBeNull();
  });
});

describe("decodeDataUri", () => {
  it("accepts a data URI and reports its media type", () => {
    const result = decodeDataUri(`data:image/png;base64,${PNG_1x1}`);
    expect(result?.mediaType).toBe("image/png");
    expect(imageSize(result!.buffer)).toEqual({ width: 1, height: 1 });
  });

  it("accepts bare base64 and assumes PNG", () => {
    const result = decodeDataUri(PNG_1x1.repeat(2));
    expect(result?.mediaType).toBe("image/png");
  });

  it("rejects a short or non-base64 string", () => {
    expect(decodeDataUri("nope")).toBeNull();
  });
});
