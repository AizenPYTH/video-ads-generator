import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { BrandChip } from "./components/BrandChip";
import { CTAOverlay } from "./components/CTAOverlay";
import { DesktopAnimated } from "./components/DesktopAnimated";
import { IPhoneAnimated } from "./components/IPhoneAnimated";
import { MacbookAnimated } from "./components/MacbookAnimated";
import { ScreenCarousel } from "./components/ScreenCarousel";
import { SceneEffects } from "./components/SceneEffects";
import { SceneText, type LayoutMode } from "./components/SceneText";
import { buildTheme } from "./theme";
import { phasesFor, slidesFor, SLIDE_SECONDS } from "./phases";
import { DEVICE_SPECS } from "../../src/utils/constants";
import type { AnimatedDeviceProps } from "./components/stage";
import type { VideoCompositionProps } from "../../src/types";

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

const DEVICE_COMPONENTS = {
  phone: IPhoneAnimated,
  tablet: IPhoneAnimated,
  laptop: MacbookAnimated,
  monitor: DesktopAnimated,
} as const satisfies Record<string, React.FC<AnimatedDeviceProps>>;

const CROSSFADE_SECONDS = 0.3;

/**
 * The ad, in three acts.
 *
 * Intro: the device arrives - a phone swings in, a MacBook lid opens, a
 * monitor settles. Content: the product's own screenshots scroll inside it
 * while the storyboard's copy plays over the top. Outro: the device pulls
 * back, the screen dims and the call to action - headline, link, QR code -
 * takes the frame.
 *
 * Everything downstream of `phasesFor` is derived from those three frame
 * boundaries, so the acts cannot drift apart when a storyboard comes back
 * longer or shorter than the reference ten seconds.
 */
export const DeviceAnimationComposition: React.FC<VideoCompositionProps> = ({
  storyboard,
  style,
  device,
  palette,
  assets,
  productName,
  cta,
}) => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const theme = buildTheme(style, palette);
  const spec = DEVICE_SPECS[device];

  const layout = layoutModeFor(width, height);
  const typeScale = layout === "landscape" ? width * 0.046 : width * 0.072;
  const headerHeight = typeScale * 1.75;
  const regions = regionsFor(
    layout,
    width,
    height,
    headerHeight,
    spec.screenAspect > 1,
  );

  const phases = phasesFor(durationInFrames, fps, cta !== null);

  // A phone or monitor faces the camera the whole way in, so its screen is
  // live from the first frame - an ad that opens on a black slab has thrown
  // away its first half-second. A closed MacBook has nothing to show until
  // the lid is most of the way open.
  const isLaptop = spec.kind === "laptop";
  // The lid is open well before the intro ends, so the laptop's screen
  // wakes at 60% of the way through rather than waiting for the boundary.
  const carouselStart = isLaptop ? Math.round(phases.introEnd * 0.6) : 0;

  const slides = slidesFor(
    { introEnd: carouselStart, contentEnd: phases.contentEnd },
    fps,
    isLaptop || spec.kind === "monitor" ? SLIDE_SECONDS.wide : SLIDE_SECONDS.handheld,
    assets.length,
  );

  const Device = DEVICE_COMPONENTS[spec.kind];
  const crossfadeFrames = Math.round(CROSSFADE_SECONDS * fps);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <BackgroundLayer theme={theme} />

      <div
        style={{
          position: "absolute",
          left: regions.device.left,
          top: regions.device.top,
          width: regions.device.width,
          height: regions.device.height,
        }}
      >
        <Device
          device={device}
          theme={theme}
          phases={phases}
          box={{ width: regions.device.width, height: regions.device.height }}
          screen={(dims) => (
            <ScreenCarousel
              assets={assets}
              slides={slides}
              screenWidth={dims.width}
              screenHeight={dims.height}
              fadeAt={phases.contentEnd}
            />
          )}
        />
      </div>

      {/* Copy: one storyboard scene per screenshot, cycling if there are
          more slides than scenes. It stops at the outro, where the CTA
          takes over - two competing messages is one too many. */}
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
        {slides.map((slide, index) => {
          const scene = storyboard.scenes[index % storyboard.scenes.length];
          if (!scene) return null;
          return (
            <Sequence
              key={`copy-${slide.start}`}
              from={slide.start}
              durationInFrames={slide.length}
              layout="none"
            >
              <SceneText
                scene={scene}
                theme={theme}
                layout={layout}
                sceneFrames={slide.length}
                fadeOutFrames={crossfadeFrames}
                typeScale={typeScale}
              />
            </Sequence>
          );
        })}
      </div>

      {/* Per-scene effects, over the whole frame rather than the screen: the
          device now moves in 3D, and an effect clipped to the screen would
          shear with it. */}
      {slides.map((slide, index) => {
        const scene = storyboard.scenes[index % storyboard.scenes.length];
        if (!scene) return null;
        return (
          <Sequence
            key={`fx-${slide.start}`}
            from={slide.start}
            durationInFrames={slide.length}
            layout="none"
          >
            <SceneEffects scene={scene} theme={theme} sceneFrames={slide.length} />
          </Sequence>
        );
      })}

      {frame < phases.ctaStart ? (
        <BrandChip
          label={productName}
          theme={theme}
          typeScale={typeScale}
          align={layout === "landscape" ? "left" : "center"}
        />
      ) : null}

      {cta ? (
        <CTAOverlay
          cta={cta}
          theme={theme}
          typeScale={typeScale}
          from={phases.ctaStart}
        />
      ) : null}
    </AbsoluteFill>
  );
};
