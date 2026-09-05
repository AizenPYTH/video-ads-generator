import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BrandChip } from "./components/BrandChip";
import { DeviceFrame, fitDevice } from "./components/DeviceFrame";
import { SceneEffects } from "./components/SceneEffects";
import { SceneMedia } from "./components/SceneMedia";
import { SceneText, type LayoutMode } from "./components/SceneText";
import { buildTheme } from "./theme";
import { easingFor, motionFor } from "./animations";
import { DEVICE_SPECS } from "../../src/utils/constants";
import type { VideoCompositionProps } from "../../src/types";

const CROSSFADE_SECONDS = 0.35;

function layoutModeFor(width: number, height: number): LayoutMode {
  const ratio = width / height;
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.9) return "portrait";
  return "square";
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Splits the canvas into a header band (the wordmark), a device band and a
 * copy band. Bands never overlap: a bottom-anchored line that outgrows its
 * band overflows upward, and without the gap it lands on the mockup.
 */
function regionsFor(
  layout: LayoutMode,
  width: number,
  height: number,
  headerHeight: number,
  wideDevice: boolean,
): { device: Box; copy: Box } {
  if (layout === "landscape") {
    return {
      device: {
        left: width * 0.48,
        top: height * 0.07,
        width: width * 0.46,
        height: height * 0.86,
      },
      copy: {
        left: width * 0.07,
        top: height * 0.18,
        width: width * 0.35,
        height: height * 0.7,
      },
    };
  }

  const copyTop = layout === "square" ? height * 0.63 : height * 0.7;
  const deviceTop = headerHeight + height * 0.02;
  // A 16:9 monitor can never fill a vertical frame, so give it nearly the
  // full width to keep the surrounding void in proportion.
  const inset = wideDevice ? 0.03 : 0.12;

  return {
    device: {
      left: width * inset,
      top: deviceTop,
      width: width * (1 - inset * 2),
      height: Math.max(height * 0.2, copyTop - deviceTop - height * 0.02),
    },
    copy: {
      left: 0,
      top: copyTop,
      width,
      height: height - copyTop,
    },
  };
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  storyboard,
  style,
  device,
  palette,
  assets,
  productName,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const theme = buildTheme(style, palette);

  const layout = layoutModeFor(width, height);
  const typeScale =
    layout === "landscape" ? width * 0.046 : width * 0.072;
  const headerHeight = typeScale * 1.75;
  const regions = regionsFor(
    layout,
    width,
    height,
    headerHeight,
    DEVICE_SPECS[device].screenAspect > 1,
  );
  const geometry = fitDevice(device, regions.device.width, regions.device.height);

  const crossfadeFrames = Math.round(CROSSFADE_SECONDS * fps);

  // Frame ranges per scene, derived here so media, copy and effects stay in
  // lockstep even after duration normalisation.
  let cursor = 0;
  const ranges = storyboard.scenes.map((scene) => {
    const start = cursor;
    const length = Math.max(1, Math.round(scene.duration * fps));
    cursor += length;
    return { start, length };
  });

  const fallbackAssetId = assets[0]?.id ?? "screenshot_main";

  // Device entrance: one confident move at the top of the ad.
  const introProgress = easingFor("easeOutCubic")(
    Math.min(1, frame / Math.max(1, Math.round(fps * 0.9))),
  );
  const intro = motionFor("scaleUp", introProgress, frame / fps, 0.6);
  const outro = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.35), durationInFrames],
    [1, 0.985],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <BackgroundLayer theme={theme} />

      {/* Device + screen content */}
      <div
        style={{
          position: "absolute",
          left: regions.device.left,
          top: regions.device.top,
          width: regions.device.width,
          height: regions.device.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            opacity: intro.opacity,
            transform: `${intro.transform} scale(${outro})`,
          }}
        >
          <DeviceFrame device={device} geometry={geometry} theme={theme}>
            {storyboard.scenes.map((scene, index) => {
              const range = ranges[index];
              if (!range) return null;
              return (
                <Sequence
                  key={`media-${scene.id}`}
                  from={range.start}
                  durationInFrames={range.length + crossfadeFrames}
                  layout="none"
                >
                  <SceneMedia
                    scene={scene}
                    assets={assets}
                    fallbackAssetId={fallbackAssetId}
                    tempo={theme.tempo}
                    fadeOutFrames={crossfadeFrames}
                    sceneFrames={range.length + crossfadeFrames}
                  />
                  <SceneEffects
                    scene={scene}
                    theme={theme}
                    sceneFrames={range.length}
                  />
                </Sequence>
              );
            })}
          </DeviceFrame>
        </div>
      </div>

      {/* Copy */}
      <div
        style={{
          position: "absolute",
          left: regions.copy.left,
          top: regions.copy.top,
          width: regions.copy.width,
          height: regions.copy.height,
          overflow: "hidden",
        }}
      >
        {storyboard.scenes.map((scene, index) => {
          const range = ranges[index];
          if (!range) return null;
          return (
            <Sequence
              key={`copy-${scene.id}`}
              from={range.start}
              durationInFrames={range.length + crossfadeFrames}
              layout="none"
            >
              <SceneText
                scene={scene}
                theme={theme}
                layout={layout}
                sceneFrames={range.length + crossfadeFrames}
                fadeOutFrames={crossfadeFrames}
                typeScale={typeScale}
              />
            </Sequence>
          );
        })}
      </div>

      {/* Painted last so the device frame can never cover it. */}
      <BrandChip
        label={productName}
        theme={theme}
        typeScale={typeScale}
        align={layout === "landscape" ? "left" : "center"}
      />
    </AbsoluteFill>
  );
};
