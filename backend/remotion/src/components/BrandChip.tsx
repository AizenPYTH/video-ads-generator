import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

/** Persistent product wordmark; grounds the ad without stealing a scene. */
export const BrandChip: React.FC<{
  label: string;
  theme: Theme;
  typeScale: number;
  align: "center" | "left";
}> = ({ label, theme, typeScale, align }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const appear = interpolate(frame, [fps * 0.2, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leave = interpolate(
    frame,
    [durationInFrames - fps * 0.4, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        top: typeScale * 0.9,
        left: align === "left" ? typeScale * 0.9 : 0,
        right: align === "left" ? undefined : 0,
        display: "flex",
        justifyContent: align === "left" ? "flex-start" : "center",
        opacity: appear * leave,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: typeScale * 0.22,
          padding: `${typeScale * 0.2}px ${typeScale * 0.42}px`,
          borderRadius: 999,
          background: theme.chipBackground,
          border: `1px solid ${theme.chipBorder}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: typeScale * 0.2,
            height: typeScale * 0.2,
            borderRadius: "50%",
            background: theme.palette.accent,
            boxShadow: theme.glow ? `0 0 ${typeScale * 0.5}px ${theme.palette.accent}` : "none",
          }}
        />
        <span
          style={{
            fontFamily: theme.fontFamily,
            fontSize: typeScale * 0.3,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
