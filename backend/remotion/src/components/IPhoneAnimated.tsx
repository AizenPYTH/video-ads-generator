import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor } from "../animations";
import { progressIn } from "../phases";
import { DEVICE_SPECS } from "../../../src/utils/constants";
import { fitDevice } from "./DeviceFrame";
import type { AnimatedDeviceProps } from "./stage";

/** Seconds per full cycle of each idle motion. Deliberately coprime, so the
 *  yaw, tilt and breath never line up and the loop never looks like a loop. */
const YAW_PERIOD = 6;
const TILT_PERIOD = 8;
const BREATH_PERIOD = 5;

/**
 * A phone that enters with a 3D swing, never quite stops moving, and pulls
 * back for the call to action.
 */
export const IPhoneAnimated: React.FC<AnimatedDeviceProps> = ({
  device,
  theme,
  phases,
  box,
  screen,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spec = DEVICE_SPECS[device];

  // Leave room for the shadow the device casts, and for the swing itself:
  // a phone rotated 48deg needs less width, but the entrance translates it.
  const geometry = fitDevice(device, box.width * 0.86, box.height * 0.94);

  const introRaw = progressIn(frame, 0, phases.introEnd);
  const intro = easingFor("easeOutCubic")(introRaw);

  const introYaw = interpolate(intro, [0, 1], [-48, 0]);
  const introRoll = interpolate(intro, [0, 1], [-9, 0]);
  const introScale = interpolate(intro, [0, 1], [0.62, 1]);
  const introShift = interpolate(intro, [0, 1], [-geometry.frameWidth * 0.3, 0]);
  const appear = interpolate(introRaw, [0, 0.16], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Idle motion is gated by the entrance so the two never fight, and because
  // every cycle starts at sin(0) the hand-off at introEnd is seamless.
  const seconds = (frame - phases.introEnd) / fps;
  const idle = intro;
  const yaw = Math.sin((seconds * Math.PI * 2) / YAW_PERIOD) * 7 * idle;
  const tilt = Math.cos((seconds * Math.PI * 2) / TILT_PERIOD) * 4.5 * idle;
  const breath = 1 + Math.sin((seconds * Math.PI * 2) / BREATH_PERIOD) * 0.018 * idle;

  const outro = easingFor("easeInOut")(
    progressIn(frame, phases.contentEnd, phases.outroEnd),
  );
  const outroScale = interpolate(outro, [0, 1], [1, 0.84]);

  const outerRadius = geometry.radius + geometry.bezel;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: Math.max(box.width, box.height) * 1.6,
        perspectiveOrigin: "50% 42%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: geometry.frameWidth,
          height: geometry.frameHeight,
          transformStyle: "preserve-3d",
          opacity: appear,
          transform: [
            `translateX(${introShift}px)`,
            `rotateY(${introYaw + yaw}deg)`,
            `rotateX(${tilt}deg)`,
            `rotateZ(${introRoll}deg)`,
            `scale(${introScale * breath * outroScale})`,
          ].join(" "),
        }}
      >
        {/* Body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: outerRadius,
            background:
              "linear-gradient(150deg, #3a3a42 0%, #101014 28%, #0a0a0d 70%, #26262c 100%)",
            boxShadow: theme.deviceShadow,
            padding: geometry.bezel,
            boxSizing: "border-box",
          }}
        >
          {/* Screen */}
          <div
            style={{
              position: "relative",
              width: geometry.screenWidth,
              height: geometry.screenHeight,
              borderRadius: geometry.radius,
              overflow: "hidden",
              background: "#000",
            }}
          >
            {screen({
              width: geometry.screenWidth,
              height: geometry.screenHeight,
            })}

            {/* Glass sheen, swept by the yaw so the surface reads as glass. */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(${112 + (introYaw + yaw) * 0.8}deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 42%)`,
                pointerEvents: "none",
              }}
            />

            {spec.hasNotch ? (
              <div
                style={{
                  position: "absolute",
                  top: geometry.screenHeight * 0.012,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: geometry.screenWidth * 0.3,
                  height: geometry.screenWidth * 0.085,
                  borderRadius: 999,
                  background: "#000",
                }}
              />
            ) : null}

            {spec.hasHomeIndicator ? (
              <div
                style={{
                  position: "absolute",
                  bottom: geometry.screenHeight * 0.008,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: geometry.screenWidth * 0.34,
                  height: Math.max(3, geometry.screenWidth * 0.012),
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.75)",
                }}
              />
            ) : null}
          </div>
        </div>

        {/* Rim light on the leading edge, tied to the yaw. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: outerRadius,
            border: `1px solid rgba(255,255,255,${0.1 + Math.abs(yaw) * 0.012})`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};
