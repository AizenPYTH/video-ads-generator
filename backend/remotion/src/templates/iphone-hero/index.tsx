import React, { Suspense } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene3D } from "../../engine3d/scene/Scene3D";
import { CameraRig } from "../../engine3d/camera/CameraRig";
import { addCamera3D, camera3DAt } from "../../engine3d/camera/state";
import { LightingRig } from "../../engine3d/lighting/LightingRig";
import { IPhone3D, IPHONE_MM } from "../../engine3d/devices/IPhone3D";
import { useScreenTexture } from "../../engine3d/screen/ScreenSurface";
import { iphoneScreenShape } from "../../engine3d/screen/screenCanvas";
import { useQuality } from "../../engine3d/scene/quality";
import { MM } from "../../engine3d/assets";
import { kf } from "../../engine/motion/keyframes";
import { drift, ease, progress } from "../../engine/motion/easing";
import { layoutFor } from "../../engine/layout";
import { rgba } from "../../engine/palette";
import { EndCard } from "../../engine/content/EndCard";
import { CopyBand, Signature } from "../_shared";
import type { TemplateDefinition, TemplateInput } from "../../engine/types";

const DURATION = 300;

/** Beats, in frames. The brief's 0-2 / 2-4 / 4-6 / 6 / 6-8 / 8-10. */
const T = {
  settle: 60,
  orbitEnd: 120,
  dollyEnd: 180,
  swap: 180,
  driftEnd: 240,
  pullEnd: 288,
  headline: 84,
  copyLeave: 236,
  endCard: 252,
};

const PHONE_H = IPHONE_MM.height * MM;

/** Per-format framing: how far back the camera rests and where the phone sits. */
function framing(aspect: "9:16" | "16:9" | "1:1") {
  // The camera looks a little below the phone so the phone rides high in
  // the frame and the copy band underneath stays clear at the closest dolly.
  switch (aspect) {
    case "16:9":
      return { distance: 3.6, targetX: 0.62, targetY: -0.02, phoneX: 0.62 };
    case "1:1":
      return { distance: 5.6, targetX: 0, targetY: -0.3, phoneX: 0 };
    default:
      return { distance: 5.4, targetX: 0, targetY: -0.42, phoneX: 0 };
  }
}

const Scene: React.FC<{ input: TemplateInput; endDim: number }> = ({ input, endDim }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const L = layoutFor(width, height);
  const F = framing(L.aspect);
  const quality = useQuality();
  const t = frame / fps;

  // ── The phone ────────────────────────────────────────────────────
  // Starts a touch off-axis and leaning; squares up over the first beats;
  // leans the other way as the camera pulls out.
  const yaw = kf(frame, [
    { at: 0, value: 22 },
    { at: T.orbitEnd, value: 4, easing: ease.cinematicInOut },
    { at: T.dollyEnd, value: 0, easing: ease.smooth },
    { at: T.pullEnd, value: -12, easing: ease.cinematicInOut },
  ]);
  const pitch = kf(frame, [
    { at: 0, value: 7 },
    { at: T.orbitEnd + 10, value: 0, easing: ease.smooth },
    { at: T.pullEnd, value: 3, easing: ease.smooth },
  ]);
  const roll = kf(frame, [
    { at: 6, value: -4 },
    { at: T.orbitEnd + 20, value: 0, easing: ease.smooth },
    { at: T.pullEnd + 12, value: 2, easing: ease.smooth },
  ]);
  const lift = kf(frame, [
    { at: 0, value: -0.04 },
    { at: T.settle, value: 0, easing: ease.cinematicOut },
    { at: T.pullEnd, value: 0.03, easing: ease.smooth },
  ]);
  const floatY = drift(t, 5.3, 0.012, 1) * ease.cinematicOut(progress(frame, T.settle, T.settle + 30));

  // ── The camera: starts after the phone, keeps going after it ─────
  const move = camera3DAt(frame, [
    { at: 16, distance: F.distance * 1.06, yaw: 8, pitch: 5, fov: 30, targetX: F.targetX, targetY: F.targetY },
    { at: T.orbitEnd + 16, distance: F.distance, yaw: 0, pitch: 2, easing: ease.cinematicInOut },
    { at: T.dollyEnd + 10, distance: F.distance * 0.86, pitch: 1, easing: ease.cinematicInOut },
    { at: T.driftEnd, distance: F.distance * 0.84, yaw: -2, easing: ease.smooth },
    { at: T.pullEnd + 12, distance: F.distance * 1.02, yaw: -5, pitch: 4, easing: ease.cinematicInOut },
  ]);
  const camera = addCamera3D(move, {
    yaw: drift(t, 9.1, 0.25),
    pitch: drift(t, 6.7, 0.14, 2),
    panY: drift(t, 5.3, 0.004, 1),
  });

  const screen = useScreenTexture(
    iphoneScreenShape(quality.screenTexture),
    { screens: input.screens, from: 0, to: T.endCard + 10, hold: T.swap, transitionFrames: 18, scrollAmount: 0.55, driftZoom: 1.02, noLoop: input.screens.length <= 2 },
    { dim: endDim * 0.75 },
  );

  return (
    <>
      <CameraRig camera={camera} aspect={width / height} />
      <LightingRig floorY={-PHONE_H * 0.64} floor intensity={1} keySide={-1} fog={[F.distance * 1.15, F.distance * 2.1]} />
      <Suspense fallback={null}>
        <IPhone3D screen={screen} brightness={1} position={[F.phoneX, lift + floatY, 0]} rotation={[pitch, yaw, roll]} />
      </Suspense>
    </>
  );
};

/**
 * The hero. A phone on a bright studio set, filmed by a camera that
 * never stops moving and never moves much: settle, a quarter orbit, a
 * slow dolly in, one screen swap, a drift, and a pull-out for the mark
 * and the link. Nothing spins, nothing bounces.
 */
const Component: React.FC<TemplateInput> = (input) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = layoutFor(width, height);
  const endDim = ease.cinematicIn(progress(frame, T.endCard, T.endCard + 20));

  return (
    <AbsoluteFill style={{ backgroundColor: "#ececef" }}>
      <Scene3D background="#ececef">
        <Scene input={input} endDim={endDim} />
      </Scene3D>
      <CopyBand layout={L} copy={input.copy} brand={input.brand} from={T.headline} leave={T.copyLeave} tone="dark" />
      <Signature layout={L} logo={input.logo} from={30} leave={T.endCard} />
      <EndCard from={T.endCard} cta={input.cta} brand={input.brand} logo={input.logo} badges="app" scrim={0.82} />
      {/* The dark scrim of the end card needs the copy to read light on it; the
          headline above is dark for the light set, so it leaves before. */}
      <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse at 50% 40%, transparent 55%, ${rgba("#000000", 0.08)} 100%)` }} />
    </AbsoluteFill>
  );
};

export const template: TemplateDefinition = {
  id: "iphone-hero",
  name: "iPhone — Hero",
  tagline: "A real phone on a studio set. Settle, a quarter orbit, a slow dolly, one swap, a pull-out.",
  category: "phone",
  devices: ["iphone"],
  durationInFrames: DURATION,
  aspects: ["9:16", "1:1", "16:9"],
  slots: { screens: { min: 1, max: 3, surface: "mobile" }, logo: "optional", headline: true, subline: true, cta: true, accent: false, duration: null },
  component: Component,
};
