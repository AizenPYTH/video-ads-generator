import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage, Placed } from "../engine/scene/Stage";
import { IPhone, iphoneGeometry } from "../engine/devices/IPhone";
import { addCamera, cameraAt, depthBlur } from "../engine/motion/camera";
import { kf } from "../engine/motion/keyframes";
import { drift, ease } from "../engine/motion/easing";

/**
 * The reference scene. One phone, one camera, one light, a grey screen.
 * No copy, no logo, no card. Ten seconds.
 *
 * Everything moves a little and nothing moves much. The phone turns from
 * a three-quarter pose to nearly frontal and back to a different
 * three-quarter; the camera pushes in slowly, lags the phone by about
 * half a second on the way in and keeps going after the phone has come
 * to rest. Both are on smooth curves that never stop dead.
 *
 * If this does not read as an object in front of a lens with a grey
 * screen, no screenshot will fix it.
 */
export const REFERENCE_DURATION = 300;

const GREY_SCREEN = "linear-gradient(180deg, #96969c 0%, #8a8a90 100%)";

export const IPhoneReference: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const unit = Math.min(width, height);
  const t = frame / fps;

  const phoneWidth = unit * 0.5;
  const g = iphoneGeometry(phoneWidth);

  // ── Device: three-quarter → frontal → the other three-quarter. ──────
  // Starts at frame 0, settles at 150, leaves again by 290. Each axis on
  // its own timing so they never arrive together.
  const yaw = kf(frame, [
    { at: 0, value: 24 },
    { at: 150, value: 0, easing: ease.cinematicInOut },
    { at: 292, value: -15, easing: ease.cinematicInOut },
  ]);
  const pitch = kf(frame, [
    { at: 0, value: 9 },
    { at: 138, value: 0, easing: ease.smooth },
    { at: 300, value: 5, easing: ease.smooth },
  ]);
  const roll = kf(frame, [
    { at: 8, value: -5 },
    { at: 160, value: 0, easing: ease.smooth },
    { at: 300, value: 2.5, easing: ease.smooth },
  ]);
  const offsetX = kf(frame, [
    { at: 0, value: unit * 0.06 },
    { at: 156, value: 0, easing: ease.cinematicInOut },
    { at: 300, value: -unit * 0.04, easing: ease.smooth },
  ]);
  const offsetY = kf(frame, [
    { at: 0, value: unit * 0.015 },
    { at: 170, value: -unit * 0.01, easing: ease.smooth },
    { at: 300, value: unit * 0.005, easing: ease.smooth },
  ]);

  // ── Camera: starts 20 frames after the phone, ends 10 after it. ─────
  // A 42deg lens - normal, a touch wide - pushing in a tenth, the orbit
  // easing off-axis to on and back, focus riding on the phone.
  const move = cameraAt(frame, [
    { at: 20, dolly: 0.94, orbitY: 7, orbitX: 4, fov: 42, focus: 0, aperture: unit * 0.35 },
    { at: 176, dolly: 1.05, orbitY: 0, orbitX: 1.5, easing: ease.cinematicInOut },
    { at: 300, dolly: 1.1, orbitY: -4, orbitX: 3, easing: ease.smooth },
  ]);
  // Operator's hands: well under a degree, on three periods that never line up.
  const camera = addCamera(move, {
    orbitY: drift(t, 9.1, 0.28),
    orbitX: drift(t, 6.7, 0.16, 2),
    y: drift(t, 5.3, unit * 0.0015, 1),
  });

  // Soft studio: light neutral field, key from the upper left, a floor the
  // phone's shadow falls on. The far wall is out of the lens's focus.
  const wallBlur = depthBlur(camera, -unit * 1.2);

  return (
    <AbsoluteFill style={{ backgroundColor: "#e9e9ec" }}>
      {/* Wall */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 28% 18%, #fbfbfc 0%, #ececef 38%, #dcdde2 100%)",
          filter: wallBlur > 0 ? `blur(${wallBlur}px)` : undefined,
        }}
      />
      {/* Key light: a soft wash from the left, above. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(112deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 48%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      <Stage camera={camera} origin={{ x: 0.5, y: 0.5 }}>
        <Placed x={offsetX} y={offsetY} width={0} height={0}>
          {/* Floor shadow: soft, offset away from the key light, on a
              plane below the phone so it skews with the camera. */}
          <Placed x={g.width * 0.18} y={g.height * 0.58} z={-g.width * 0.1} rotateX={90} width={g.width * 2.2} height={g.width * 1.3}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse at 45% 45%, rgba(20,20,28,0.42) 0%, rgba(20,20,28,0.16) 40%, transparent 68%)",
                filter: "blur(28px)",
              }}
            />
          </Placed>
          {/* Contact: the tighter, darker shadow right under the body. */}
          <Placed x={g.width * 0.06} y={g.height * 0.56} z={0} rotateX={90} width={g.width * 1.1} height={g.width * 0.5}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(20,20,28,0.5) 0%, transparent 60%)",
                filter: "blur(10px)",
              }}
            />
          </Placed>

          <IPhone
            width={phoneWidth}
            brightness={1}
            finish="studio"
            sheenAngle={96 + yaw * 1.2}
            transform={`rotateY(${yaw}deg) rotateX(${pitch}deg) rotateZ(${roll}deg)`}
            screen={() => <div style={{ position: "absolute", inset: 0, background: GREY_SCREEN }} />}
          />
        </Placed>
      </Stage>
    </AbsoluteFill>
  );
};
