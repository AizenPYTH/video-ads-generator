import React from "react";
import { DEVICE_SPECS } from "../../../src/utils/constants";
import type { DeviceType } from "../../../src/types";
import type { Theme } from "../theme";

export interface DeviceGeometry {
  frameWidth: number;
  frameHeight: number;
  screenWidth: number;
  screenHeight: number;
  bezel: number;
  radius: number;
}

/** Largest device frame that fits the given box while keeping screen aspect. */
export function fitDevice(
  device: DeviceType,
  maxWidth: number,
  maxHeight: number,
): DeviceGeometry {
  const spec = DEVICE_SPECS[device];
  const isLaptopish = spec.kind === "laptop" || spec.kind === "monitor";

  // Bezel is a fraction of the frame width, so frame aspect differs slightly
  // from screen aspect. Solve for the frame that fits both constraints.
  const solve = (frameWidth: number): DeviceGeometry => {
    const bezel = frameWidth * spec.bezelRatio;
    const screenWidth = frameWidth - bezel * 2;
    const screenHeight = screenWidth / spec.screenAspect;
    const chin = isLaptopish ? bezel * 3.2 : bezel;
    return {
      frameWidth,
      frameHeight: screenHeight + bezel + chin,
      screenWidth,
      screenHeight,
      bezel,
      radius: frameWidth * spec.cornerRadiusRatio,
    };
  };

  const byWidth = solve(maxWidth);
  if (byWidth.frameHeight <= maxHeight) return byWidth;
  const scale = maxHeight / byWidth.frameHeight;
  return solve(maxWidth * scale);
}

export const DeviceFrame: React.FC<{
  device: DeviceType;
  geometry: DeviceGeometry;
  theme: Theme;
  children: React.ReactNode;
}> = ({ device, geometry, theme, children }) => {
  const spec = DEVICE_SPECS[device];
  const isLaptopish = spec.kind === "laptop" || spec.kind === "monitor";
  const outerRadius = geometry.radius + geometry.bezel;

  return (
    <div
      style={{
        position: "relative",
        width: geometry.frameWidth,
        height: geometry.frameHeight,
        borderRadius: outerRadius,
        background:
          "linear-gradient(150deg, #3a3a42 0%, #101014 28%, #0a0a0d 70%, #26262c 100%)",
        boxShadow: theme.deviceShadow,
        padding: geometry.bezel,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
          flexShrink: 0,
        }}
      >
        {children}

        {/* Screen glass: a single diagonal sheen, kept subtle. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 38%)",
            pointerEvents: "none",
          }}
        />

        {spec.hasNotch && !isLaptopish ? (
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

      {isLaptopish ? (
        <div
          style={{
            marginTop: geometry.bezel * 0.8,
            width: geometry.screenWidth * 0.22,
            height: Math.max(4, geometry.bezel * 0.35),
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
          }}
        />
      ) : null}
    </div>
  );
};
