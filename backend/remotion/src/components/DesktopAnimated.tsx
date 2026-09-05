import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor } from "../animations";
import { progressIn } from "../phases";
import { DEVICE_SPECS } from "../../../src/utils/constants";
import type { AnimatedDeviceProps } from "./stage";

/**
 * A monitor has no lid to open, so its life comes from the camera instead:
 * it swings in, drifts through a few degrees of yaw, and the shot pushes
 * into the screen across the content act.
 */
export const DesktopAnimated: React.FC<AnimatedDeviceProps> = ({
  device,
  theme,
  phases,
  box,
  screen,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spec = DEVICE_SPECS[device];

  const width = box.width * 0.96;
  const bezel = width * spec.bezelRatio;
  const screenWidth = width - bezel * 2;
  const screenHeight = screenWidth / spec.screenAspect;
  const panelHeight = screenHeight + bezel * 2;
  const neckHeight = panelHeight * 0.16;
  const baseHeight = panelHeight * 0.045;

  const naturalHeight = panelHeight + neckHeight + baseHeight;
  const fit = Math.min(1, box.height / naturalHeight);

  const introRaw = progressIn(frame, 0, phases.introEnd);
  const intro = easingFor("easeOutCubic")(introRaw);
  const introYaw = interpolate(intro, [0, 1], [14, 0]);
  const introScale = interpolate(intro, [0, 1], [0.78, 1]);
  const appear = interpolate(introRaw, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  const seconds = (frame - phases.introEnd) / fps;
  const idle = intro;
  const yaw = Math.sin((seconds * Math.PI * 2) / 7) * 5 * idle;
  const pitch = Math.cos((seconds * Math.PI * 2) / 9) * 2 * idle;

  const contentRaw = progressIn(frame, phases.introEnd, phases.contentEnd);
  const screenZoom = interpolate(contentRaw, [0, 1], [1, 1.08]);

  const outro = easingFor("easeInOut")(
    progressIn(frame, phases.contentEnd, phases.outroEnd),
  );
  const outroScale = interpolate(outro, [0, 1], [1, 0.86]);

  const aluminium =
    "linear-gradient(168deg, #d8d9de 0%, #b7b9c0 40%, #9a9ca4 72%, #cfd1d6 100%)";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: Math.max(box.width, box.height) * 1.9,
        perspectiveOrigin: "50% 40%",
      }}
    >
      <div
        style={{
          position: "relative",
          width,
          height: naturalHeight,
          transformStyle: "preserve-3d",
          opacity: appear,
          transform: [
            `scale(${fit * introScale * outroScale})`,
            `rotateY(${introYaw + yaw}deg)`,
            `rotateX(${pitch}deg)`,
          ].join(" "),
        }}
      >
        {/* Panel */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height: panelHeight,
            borderRadius: width * 0.014,
            background:
              "linear-gradient(160deg, #2c2c32 0%, #131317 26%, #0b0b0e 74%, #232329 100%)",
            padding: bezel,
            boxSizing: "border-box",
            boxShadow: theme.deviceShadow,
          }}
        >
          <div
            style={{
              position: "relative",
              width: screenWidth,
              height: screenHeight,
              borderRadius: width * spec.cornerRadiusRatio,
              overflow: "hidden",
              background: "#000",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `scale(${screenZoom})`,
                transformOrigin: "center",
              }}
            >
              {screen({ width: screenWidth, height: screenHeight })}
            </div>

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(${108 + (introYaw + yaw) * 1.4}deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 44%)`,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        {/* Neck */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: panelHeight,
            width: width * 0.11,
            height: neckHeight,
            marginLeft: -width * 0.055,
            background: aluminium,
            borderRadius: `0 0 ${width * 0.01}px ${width * 0.01}px`,
          }}
        />

        {/* Base */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: panelHeight + neckHeight,
            width: width * 0.34,
            height: baseHeight,
            marginLeft: -width * 0.17,
            background: aluminium,
            borderRadius: `${baseHeight * 0.4}px ${baseHeight * 0.4}px ${baseHeight}px ${baseHeight}px`,
            boxShadow: `0 ${baseHeight * 1.6}px ${baseHeight * 5}px rgba(0,0,0,0.55)`,
          }}
        />
      </div>
    </div>
  );
};
