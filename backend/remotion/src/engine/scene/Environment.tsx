import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { backdropFrom, darken, rgba } from "../palette";
import { drift, DRIFT_PERIODS } from "../motion/easing";

export interface EnvironmentProps {
  /** Brand primary - the backdrop is derived dark from it. */
  primary: string;
  /** Brand accent - the rim light. */
  accent: string;
  /** Overall light level, 0..1. Templates dim it for a CTA. */
  exposure?: number;
  /** Where the key light sits, as canvas fractions. */
  keyLight?: { x: number; y: number };
  dust?: boolean;
  vignette?: boolean;
  grain?: boolean;
}

/**
 * The room the device sits in: a dark brand-tinted field, one key light,
 * one rim light on the accent, both drifting so the frame never dies, plus
 * optional dust, vignette and grain.
 *
 * This is screen-space, behind the Stage - lights do not move with the
 * camera, which is how a studio works.
 */
export const Environment: React.FC<EnvironmentProps> = ({
  primary,
  accent,
  exposure = 1,
  keyLight = { x: 0.3, y: 0.2 },
  dust = false,
  vignette = true,
  grain = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const base = backdropFrom(primary);
  const glow = Math.max(width, height);
  const wander = Math.min(width, height) * 0.06;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${base} 0%, ${darken(primary, 0.78)} 48%, #050507 100%)`,
      }}
    >
      {/* Key light */}
      <div
        style={{
          position: "absolute",
          width: glow,
          height: glow,
          left: width * keyLight.x - glow / 2 + drift(t, DRIFT_PERIODS.slow, wander),
          top: height * keyLight.y - glow / 2 + drift(t, DRIFT_PERIODS.medium, wander, 2),
          background: `radial-gradient(circle at center, ${rgba(primary, 0.5 * exposure)} 0%, transparent 60%)`,
          filter: "blur(30px)",
        }}
      />
      {/* Rim light, low and opposite */}
      <div
        style={{
          position: "absolute",
          width: glow * 0.8,
          height: glow * 0.8,
          left: width * (1 - keyLight.x) - glow * 0.4 + drift(t, DRIFT_PERIODS.medium, wander, 5),
          top: height * 0.85 - glow * 0.4 + drift(t, DRIFT_PERIODS.slow, wander, 1),
          background: `radial-gradient(circle at center, ${rgba(accent, 0.32 * exposure)} 0%, transparent 58%)`,
          filter: "blur(40px)",
        }}
      />

      {dust ? <Dust count={36} /> : null}

      {vignette ? (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      ) : null}

      {grain ? (
        <AbsoluteFill
          style={{
            opacity: 0.045,
            mixBlendMode: "overlay",
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.5'/></svg>\")",
            backgroundSize: "220px 220px",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** Slow-rising motes that catch the light. Deterministic per index. */
const Dust: React.FC<{ count: number }> = ({ count }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, index) => {
        const seed = `dust-${index}`;
        const x = random(`${seed}-x`);
        const y0 = random(`${seed}-y`);
        const speed = 0.01 + random(`${seed}-s`) * 0.02;
        const size = 2 + random(`${seed}-r`) * 4;
        const y = (((y0 - t * speed) % 1) + 1) % 1;
        const sway = Math.sin(t * 0.6 + index) * 0.01;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 1.3 + index * 1.7);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: (x + sway) * width,
              top: y * height,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#fff",
              opacity: (0.08 + random(`${seed}-o`) * 0.22) * twinkle,
              filter: `blur(${size > 4 ? 1.5 : 0.5}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
