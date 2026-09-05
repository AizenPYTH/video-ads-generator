import React from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { easingFor } from "../animations";
import type { Slide } from "../phases";
import type { AssetRef } from "../../../src/types";

/** Frames of overlap between one screenshot and the next. */
const CROSSFADE = 9;

/**
 * A screenshot travels at most this much of the screen height in one slide.
 * A 12,000px full-page capture scrolled end to end in 1.5s is a blur; a
 * capped travel reads as a hand scrolling the page.
 */
const MAX_TRAVEL = 1.15;

function assetAt(assets: AssetRef[], index: number): AssetRef | null {
  if (assets.length === 0) return null;
  return assets[index % assets.length] ?? assets[0] ?? null;
}

const Screenshot: React.FC<{
  asset: AssetRef;
  slide: Slide;
  screenWidth: number;
  screenHeight: number;
}> = ({ asset, slide, screenWidth, screenHeight }) => {
  const frame = useCurrentFrame();
  const local = frame - slide.start;

  const enter = interpolate(local, [0, CROSSFADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leave = interpolate(
    local,
    [slide.length, slide.length + CROSSFADE],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Width-fit the capture, then scroll whatever hangs below the screen.
  const ratio = asset.width > 0 ? asset.height / asset.width : 1;
  const rendered = screenWidth * ratio;
  const overflow = Math.max(0, rendered - screenHeight);
  const travel = Math.min(overflow, screenHeight * MAX_TRAVEL);

  // Ease the scroll at both ends so each slide settles instead of stopping.
  const scrollProgress = easingFor("easeInOut")(
    Math.min(1, Math.max(0, local / Math.max(1, slide.length))),
  );
  const offset = -travel * scrollProgress;

  // A capture shorter than the screen cannot scroll, so it drifts instead.
  const drift = overflow > 0 ? 1 : 1.02 + scrollProgress * 0.03;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: enter * leave,
        overflow: "hidden",
        backgroundColor: "#0a0a0d",
      }}
    >
      <Img
        src={asset.url}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: screenWidth,
          height: overflow > 0 ? rendered : screenHeight,
          objectFit: overflow > 0 ? "fill" : "cover",
          transform: `translateY(${offset}px) scale(${drift})`,
          transformOrigin: "top center",
        }}
      />
    </div>
  );
};

/**
 * The product screenshots, playing inside a device screen: one crossfades
 * into the next while the page scrolls under the frame.
 *
 * Slides outside the current frame render nothing at all rather than
 * rendering at zero opacity - eight full-page captures decoded at once is
 * what makes a small container run out of memory.
 */
export const ScreenCarousel: React.FC<{
  assets: AssetRef[];
  slides: Slide[];
  screenWidth: number;
  screenHeight: number;
  /** Frames after which the screen goes dark for the outro. */
  fadeAt: number;
}> = ({ assets, slides, screenWidth, screenHeight, fadeAt }) => {
  const frame = useCurrentFrame();

  const dim = interpolate(frame, [fadeAt, fadeAt + 12], [1, 0.18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: dim }}>
      {slides.map((slide) => {
        if (frame < slide.start - 1) return null;
        if (frame > slide.start + slide.length + CROSSFADE) return null;
        const asset = assetAt(assets, slide.index);
        if (!asset) return null;
        return (
          <Screenshot
            key={`${slide.start}-${slide.index}`}
            asset={asset}
            slide={slide}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
          />
        );
      })}
    </div>
  );
};
