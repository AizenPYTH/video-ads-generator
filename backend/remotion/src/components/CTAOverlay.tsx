import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor } from "../animations";
import type { CallToAction } from "../../../src/types";
import type { Theme } from "../theme";

/**
 * The last beat of the ad: where to go, spelled out.
 *
 * Everything here is sized off `typeScale` rather than fixed pixels, because
 * the same overlay has to read on a 1080x1920 phone crop and a 1920x1080
 * landscape one.
 */
export const CTAOverlay: React.FC<{
  cta: CallToAction;
  theme: Theme;
  typeScale: number;
  /** Frame the overlay starts fading in. */
  from: number;
}> = ({ cta, theme, typeScale, from }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const local = frame - from;
  if (local < 0) return null;

  const entry = easingFor("easeOutCubic")(
    Math.min(1, local / Math.max(1, Math.round(fps * 0.5))),
  );
  const scrim = interpolate(entry, [0, 1], [0, 0.82]);

  // The very end fades to black so the loop does not cut on a bright frame.
  const blackout = interpolate(
    frame,
    [durationInFrames - Math.round(fps * 0.35), durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const rise = (delaySeconds: number): React.CSSProperties => {
    const progress = easingFor("easeOutCubic")(
      Math.min(
        1,
        Math.max(0, (local - delaySeconds * fps) / Math.max(1, fps * 0.45)),
      ),
    );
    return {
      opacity: progress,
      transform: `translateY(${(1 - progress) * typeScale * 0.5}px)`,
    };
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${scrim})` }} />

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: typeScale * 0.38,
          padding: typeScale,
          fontFamily: theme.fontFamily,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...rise(0.05),
            fontSize: typeScale * 0.86,
            fontWeight: theme.titleWeight,
            letterSpacing: theme.letterSpacing,
            color: theme.overlayText,
            textShadow: theme.glow ? `0 0 ${typeScale}px ${theme.glowA}` : "none",
            maxWidth: "92%",
          }}
        >
          {cta.headline}
        </div>

        {cta.qrCode ? (
          <div
            style={{
              ...rise(0.18),
              padding: typeScale * 0.24,
              borderRadius: typeScale * 0.3,
              background: theme.chipBackground,
              border: `1px solid ${theme.chipBorder}`,
              lineHeight: 0,
            }}
          >
            <Img
              src={cta.qrCode}
              style={{ width: typeScale * 3.4, height: typeScale * 3.4 }}
            />
          </div>
        ) : null}

        <div
          style={{
            ...rise(0.28),
            fontSize: typeScale * 0.34,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            letterSpacing: "0.01em",
            color: theme.palette.accent,
            wordBreak: "break-all",
            maxWidth: "88%",
          }}
        >
          {cta.url}
        </div>

        {cta.qrCode ? (
          <div
            style={{
              ...rise(0.36),
              fontSize: typeScale * 0.24,
              color: "rgba(255,255,255,0.62)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {cta.hint}
          </div>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: `rgba(0, 0, 0, ${blackout})` }} />
    </AbsoluteFill>
  );
};
