import React from "react";
import { Img } from "remotion";
import { ease, type EasingFn } from "../motion/easing";
import type { ImageAsset } from "../types";

export type LogoReveal = "rise" | "scale" | "mask" | "none";

/**
 * Fits an asset inside a box without ever changing its ratio. Returns the
 * rendered size. Pure, so the editor can size its thumbnails the same way.
 */
export function containFit(
  asset: { width: number; height: number },
  box: { width: number; height: number },
): { width: number; height: number } {
  if (asset.width <= 0 || asset.height <= 0) return { width: box.width, height: box.height };
  const scale = Math.min(box.width / asset.width, box.height / asset.height);
  return { width: asset.width * scale, height: asset.height * scale };
}

/**
 * A logo in a slot. Contain-fitted, centred, optionally revealed.
 *
 * `progress` is 0..1 through the reveal; callers drive it from the timeline
 * so a logo can be timed against a camera move rather than a fixed delay.
 */
export const Logo: React.FC<{
  asset: ImageAsset;
  width: number;
  height: number;
  reveal?: LogoReveal;
  /** 0..1 */
  progress?: number;
  easing?: EasingFn;
  /** Drop shadow / glow behind the mark. */
  glow?: string;
  style?: React.CSSProperties;
}> = ({
  asset,
  width,
  height,
  reveal = "rise",
  progress = 1,
  easing = ease.cinematicOut,
  glow,
  style,
}) => {
  const size = containFit(asset, { width, height });
  const p = easing(Math.min(1, Math.max(0, progress)));

  let transform = "none";
  let opacity = 1;
  let clipPath: string | undefined;
  switch (reveal) {
    case "rise":
      opacity = p;
      transform = `translateY(${(1 - p) * height * 0.25}px)`;
      break;
    case "scale":
      opacity = Math.min(1, p * 1.6);
      transform = `scale(${0.72 + p * 0.28})`;
      break;
    case "mask":
      clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
      break;
    case "none":
    default:
      break;
  }

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <Img
        src={asset.url}
        style={{
          width: size.width,
          height: size.height,
          display: "block",
          opacity,
          transform,
          clipPath,
          filter: glow ? `drop-shadow(0 0 ${Math.max(8, size.height * 0.2)}px ${glow})` : undefined,
        }}
      />
    </div>
  );
};
