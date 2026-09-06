import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Environment } from "../../engine/scene/Environment";
import { Stage, Placed } from "../../engine/scene/Stage";
import { ContactShadow, ScreenSpill, Surface } from "../../engine/scene/Floor";
import { BoxAt } from "../../engine/scene/Overlay";
import { MacBook, LID_CLOSED, LID_OPEN, macbookGeometry } from "../../engine/devices/MacBook";
import { ScreenSequence } from "../../engine/content/ScreenSequence";
import { Headline, Subline } from "../../engine/content/Copy";
import { Logo } from "../../engine/content/Logo";
import { EndCard } from "../../engine/content/EndCard";
import { addCamera, cameraAt } from "../../engine/motion/camera";
import { kf } from "../../engine/motion/keyframes";
import { drift, DRIFT_PERIODS, ease, progress } from "../../engine/motion/easing";
import { layoutFor } from "../../engine/layout";
import { darken, rgba } from "../../engine/palette";
import type { TemplateDefinition, TemplateInput } from "../../engine/types";

const DURATION = 300;

/** Frame marks. Named so the camera, the lid and the copy agree. */
const T = {
  lidStart: 8,
  lidEnd: 82,
  headline: 74,
  pushStart: 104,
  pushEnd: 204,
  pullStart: 232,
  pullEnd: 262,
  copyLeave: 238,
  endCard: 256,
};

/**
 * A closed MacBook on a dark set. The lid opens toward the camera as the
 * camera comes down to meet it, the screen lights the deck, the shot
 * pushes into the screen while the product's pages hand over with a
 * parallax wipe, then pulls back for the sign-off.
 */
const Component: React.FC<TemplateInput> = ({ screens, logo, brand, copy, cta }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = layoutFor(width, height);
  const t = frame / fps;

  const lidAngle = kf(frame, [
    { at: T.lidStart, value: LID_CLOSED },
    { at: T.lidEnd, value: LID_OPEN + 3, easing: ease.cinematicInOut },
    { at: T.lidEnd + 22, value: LID_OPEN, easing: ease.settle },
  ]);

  // The screen wakes as the lid passes the point where it faces the camera.
  const brightness = kf(frame, [
    { at: T.lidStart + 30, value: 0 },
    { at: T.lidEnd - 6, value: 1, easing: ease.cinematicOut },
  ]);

  // The laptop fills its band; its visual centre is a bit above the hinge.
  const wide = L.aspect === "16:9";
  const laptopWidth = Math.min(
    L.device.width * (wide ? 0.74 : 0.76),
    L.device.height * (wide ? 1.05 : 0.92),
  );
  const g = macbookGeometry(laptopWidth);
  const hingeX = L.device.x + L.device.width / 2 - width / 2;
  const hingeY = L.device.y + L.device.height * (wide ? 0.72 : L.aspect === "1:1" ? 0.74 : 0.64) - height / 2;
  // With the copy under the device there is less room to push into.
  const push = wide ? 1.34 : 1.16;

  // Camera: high and off-axis over a shut laptop that sits centre frame,
  // lowering and trucking to its resting position as the lid opens and the
  // copy arrives; then the push into the screen; then the pull-back.
  const move = cameraAt(frame, [
    { at: 0, dolly: 0.86, orbitX: 32, orbitY: -26, x: -hingeX * 0.85, y: -hingeY * 0.5 },
    { at: T.lidEnd + 12, dolly: 1, orbitX: 14, orbitY: -10, x: 0, y: 0, easing: ease.cinematicOut },
    { at: T.pushStart, dolly: 1 },
    { at: T.pushEnd, dolly: push, orbitX: 7, orbitY: -3, easing: ease.cinematicInOut },
    { at: T.pullStart, dolly: push, orbitX: 7, orbitY: -3 },
    { at: T.pullEnd, dolly: 0.98, orbitX: 16, orbitY: -13, easing: ease.cinematicInOut },
  ]);
  // Hand-held: never quite still.
  const camera = addCamera(move, {
    orbitY: drift(t, DRIFT_PERIODS.slow, 0.7),
    orbitX: drift(t, DRIFT_PERIODS.medium, 0.35, 3),
    y: drift(t, DRIFT_PERIODS.fast, L.unit * 0.003, 1),
  });

  const exposure = ease.cinematicOut(progress(frame, 0, 24));
  const endDim = ease.cinematicIn(progress(frame, T.endCard, T.endCard + 20));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Environment
        primary={brand.primary}
        accent={brand.accent}
        exposure={exposure * (1 - endDim * 0.6)}
        keyLight={{ x: 0.35, y: 0.15 }}
        dust
      />

      <Stage camera={camera} origin={{ x: 0.5, y: 0.45 }}>
        <Placed x={hingeX} y={hingeY} width={0} height={0}>
          <Surface y={g.deckThickness + 3} size={L.unit * 14} color={darken(brand.primary, 0.62)} focus={0.48} opacity={exposure} />
          <ContactShadow width={g.width} depth={g.deckDepth} y={g.deckThickness + 2} z={g.deckDepth / 2} strength={0.8} softness={30} />
          <ScreenSpill width={g.width} depth={g.deckDepth} y={g.deckThickness + 2} z={g.deckDepth * 0.9} color={rgba(brand.accent, 0.5)} intensity={brightness * 0.7} />
          <MacBook
            width={laptopWidth}
            lidAngle={lidAngle}
            brightness={brightness}
            accent={brand.accent}
            screen={(dims) => (
              <ScreenSequence
                screens={screens}
                width={dims.width}
                height={dims.height}
                from={T.lidStart + 30}
                to={T.pullEnd}
                hold={Math.round(fps * 1.9)}
                transition="parallax"
                transitionFrames={14}
                scrollAmount={0.85}
                driftZoom={1.03}
                dim={endDim * 0.7}
              />
            )}
          />
        </Placed>
      </Stage>

      {/* Copy */}
      <BoxAt box={L.copy} align={L.align === "left" ? "flex-start" : "center"} justify={L.aspect === "16:9" ? "center" : "flex-start"}>
        {copy.headline ? (
          <Headline text={copy.headline} size={L.headlineSize} from={T.headline} leave={T.copyLeave} align={L.align} glow={rgba(brand.accent, 0.25)} />
        ) : null}
        {copy.subline ? (
          <Subline text={copy.subline} size={L.sublineSize} from={T.headline + 10} leave={T.copyLeave} align={L.align} style={{ marginTop: L.unit * 0.02 }} />
        ) : null}
      </BoxAt>

      {/* Signature */}
      {logo ? (
        <BoxAt box={L.signature} align={L.align === "left" ? "flex-start" : "center"}>
          <Logo asset={logo} width={L.signature.width} height={L.signature.height} reveal="rise" progress={progress(frame, 28, 52) * (1 - ease.cinematicIn(progress(frame, T.endCard - 6, T.endCard + 8)))} />
        </BoxAt>
      ) : null}

      <EndCard from={T.endCard} cta={cta} brand={brand} logo={logo} />
    </AbsoluteFill>
  );
};

export const template: TemplateDefinition = {
  id: "macbook-open",
  name: "MacBook — Cinematic Open",
  tagline: "The lid opens toward the camera, the screen lights the desk, the shot pushes in.",
  category: "laptop",
  devices: ["macbook"],
  durationInFrames: DURATION,
  aspects: ["16:9", "1:1", "9:16"],
  slots: {
    screens: { min: 1, max: 4, surface: "desktop" },
    logo: "optional",
    headline: true,
    subline: true,
    cta: true,
    accent: true,
    duration: null,
  },
  component: Component,
};
