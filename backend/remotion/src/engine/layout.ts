import type { AspectRatio } from "./types";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where things go per aspect, in canvas pixels.
 *
 * A template is re-composed per format, not scaled: in portrait the copy
 * sits under the device, in landscape it takes a column beside it, in
 * square it is short and under. Each template reads what it needs from
 * here so the three compositions agree on where the device lives.
 */
export interface Layout {
  aspect: AspectRatio;
  width: number;
  height: number;
  /** Shorter edge - the unit most sizes are expressed in. */
  unit: number;
  /** Where the device band is. */
  device: Box;
  /** Where headline / subline go. */
  copy: Box;
  /** Type size for a headline. */
  headlineSize: number;
  sublineSize: number;
  /** Where a small logo signature goes. */
  signature: Box;
  /** Copy alignment. */
  align: "left" | "center";
}

export function layoutFor(width: number, height: number): Layout {
  const ratio = width / height;
  const unit = Math.min(width, height);
  const aspect: AspectRatio = ratio > 1.15 ? "16:9" : ratio < 0.9 ? "9:16" : "1:1";

  if (aspect === "16:9") {
    return {
      aspect,
      width,
      height,
      unit,
      device: { x: width * 0.42, y: height * 0.06, width: width * 0.54, height: height * 0.88 },
      copy: { x: width * 0.07, y: height * 0.22, width: width * 0.33, height: height * 0.56 },
      headlineSize: unit * 0.075,
      sublineSize: unit * 0.032,
      signature: { x: width * 0.07, y: height * 0.08, width: unit * 0.22, height: unit * 0.08 },
      align: "left",
    };
  }

  if (aspect === "1:1") {
    return {
      aspect,
      width,
      height,
      unit,
      device: { x: width * 0.04, y: height * 0.1, width: width * 0.92, height: height * 0.56 },
      copy: { x: width * 0.06, y: height * 0.7, width: width * 0.88, height: height * 0.24 },
      headlineSize: unit * 0.068,
      sublineSize: unit * 0.03,
      signature: { x: 0, y: height * 0.04, width, height: unit * 0.06 },
      align: "center",
    };
  }

  return {
    aspect,
    width,
    height,
    unit,
    device: { x: width * 0.04, y: height * 0.12, width: width * 0.92, height: height * 0.56 },
    copy: { x: width * 0.06, y: height * 0.72, width: width * 0.88, height: height * 0.2 },
    headlineSize: unit * 0.082,
    sublineSize: unit * 0.034,
    signature: { x: 0, y: height * 0.045, width, height: unit * 0.06 },
    align: "center",
  };
}
