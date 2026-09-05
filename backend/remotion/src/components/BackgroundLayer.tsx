import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Theme } from "../theme";

/** Gradient plate plus two slowly orbiting glows, so the frame never dies. */
export const BackgroundLayer: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const glowSize = Math.max(width, height) * 0.9;
  const orbit = Math.min(width, height) * 0.18;

  return (
    <AbsoluteFill style={{ background: theme.backdrop }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${theme.glowA} 0%, transparent 62%)`,
          width: glowSize,
          height: glowSize,
          left: width * 0.5 - glowSize / 2 + Math.sin(t * 0.5) * orbit,
          top: height * 0.28 - glowSize / 2 + Math.cos(t * 0.4) * orbit,
          filter: "blur(20px)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, ${theme.glowB} 0%, transparent 60%)`,
          width: glowSize * 0.8,
          height: glowSize * 0.8,
          left: width * 0.5 - glowSize * 0.4 + Math.cos(t * 0.33) * orbit * 1.4,
          top: height * 0.72 - glowSize * 0.4 + Math.sin(t * 0.29) * orbit,
          filter: "blur(24px)",
        }}
      />

      {theme.vignette ? (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
      ) : null}

      {theme.grain ? (
        <AbsoluteFill
          style={{
            opacity: 0.05,
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
