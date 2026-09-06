import React from "react";
import { Placed } from "../scene/Stage";
import { IPHONE } from "./specs";
import { Glass } from "../content/Screen";

export interface IPhoneGeometry {
  width: number;
  height: number;
  bezel: number;
  screenWidth: number;
  screenHeight: number;
  radius: number;
  thickness: number;
}

export function iphoneGeometry(width: number): IPhoneGeometry {
  const height = width / IPHONE.bodyAspect;
  const bezel = width * IPHONE.bezel;
  const screenWidth = width - bezel * 2;
  return {
    width,
    height,
    bezel,
    screenWidth,
    screenHeight: screenWidth / IPHONE.screenAspect,
    radius: width * IPHONE.cornerRadius,
    thickness: width * IPHONE.thickness,
  };
}

const TITANIUM =
  "linear-gradient(180deg, #4a4a52 0%, #2c2c33 30%, #1c1c21 70%, #3b3b43 100%)";
const TITANIUM_EDGE =
  "linear-gradient(90deg, #6b6b75 0%, #2a2a31 20%, #1a1a1f 50%, #2a2a31 80%, #6b6b75 100%)";

/** How many body slices between the front and back faces. */
const EDGE_SLICES = 7;

/**
 * An iPhone with a real body.
 *
 * Origin is the centre of the front glass; +z toward the camera. The body
 * is a front face, a back face a `thickness` behind it, and a stack of
 * silhouettes in between - so at any yaw the frame shows an edge with
 * depth instead of a paper-thin card, and a 180 degree turn shows a back.
 */
export const IPhone: React.FC<{
  width: number;
  screen: (dims: { width: number; height: number }) => React.ReactNode;
  brightness?: number;
  /** Where the glass sheen falls; usually tied to the yaw. */
  sheenAngle?: number;
  transform?: string;
}> = ({ width, screen, brightness = 1, sheenAngle = 112, transform }) => {
  const g = iphoneGeometry(width);
  const island = {
    width: g.screenWidth * IPHONE.island.width,
    height: g.screenWidth * IPHONE.island.height,
    top: g.screenHeight * IPHONE.island.top,
  };

  return (
    <div
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        transformStyle: "preserve-3d",
        transform: transform ?? "none",
      }}
    >
      {/* Body slices */}
      {Array.from({ length: EDGE_SLICES }).map((_, index) => {
        const z = -(g.thickness * (index + 1)) / (EDGE_SLICES + 1);
        return (
          <Placed key={index} x={0} y={0} z={z} width={g.width} height={g.height}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: g.radius,
                background: TITANIUM_EDGE,
              }}
            />
          </Placed>
        );
      })}

      {/* Back */}
      <Placed x={0} y={0} z={-g.thickness} rotateY={180} width={g.width} height={g.height}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: g.radius,
            background: TITANIUM,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          {/* Camera plateau, mirrored so it sits top-left from the back. */}
          <div
            style={{
              position: "absolute",
              right: g.width * 0.06,
              top: g.width * 0.06,
              width: g.width * 0.36,
              height: g.width * 0.36,
              borderRadius: g.width * 0.09,
              background: "linear-gradient(160deg, #2a2a31, #17171b)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.5)",
            }}
          >
            {[
              [0.22, 0.22],
              [0.22, 0.62],
              [0.62, 0.42],
            ].map(([x, y], index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${(x as number) * 100 - 14}%`,
                  top: `${(y as number) * 100 - 14}%`,
                  width: "28%",
                  height: "28%",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #3a3a44 0%, #0b0b0e 60%, #26262d 100%)",
                  boxShadow: "0 0 0 2px #0a0a0c, inset 0 0 6px rgba(120,140,255,0.25)",
                }}
              />
            ))}
          </div>
        </div>
      </Placed>

      {/* Front */}
      <Placed x={0} y={0} z={0} width={g.width} height={g.height}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: g.radius,
            background: "#0a0a0c",
            boxSizing: "border-box",
            padding: g.bezel,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: g.screenWidth,
              height: g.screenHeight,
              borderRadius: g.radius - g.bezel,
              overflow: "hidden",
              background: "#000",
            }}
          >
            <div style={{ position: "absolute", inset: 0, opacity: brightness }}>
              {screen({ width: g.screenWidth, height: g.screenHeight })}
            </div>
            <Glass angle={sheenAngle} strength={0.13} />
            {/* Dynamic Island */}
            <div
              style={{
                position: "absolute",
                top: island.top,
                left: "50%",
                transform: "translateX(-50%)",
                width: island.width,
                height: island.height,
                borderRadius: 999,
                background: "#000",
              }}
            />
            {/* Home indicator */}
            <div
              style={{
                position: "absolute",
                bottom: g.screenHeight * 0.012,
                left: "50%",
                transform: "translateX(-50%)",
                width: g.screenWidth * 0.34,
                height: Math.max(2, g.screenWidth * 0.011),
                borderRadius: 999,
                background: "rgba(255,255,255,0.8)",
              }}
            />
          </div>
        </div>
      </Placed>
    </div>
  );
};
