import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene, VisualEffect } from "../../../src/types";
import type { Theme } from "../theme";

const Particles: React.FC<{ theme: Theme; seed: string; intensity: number }> = ({
  theme,
  seed,
  intensity,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const count = Math.round(26 * intensity);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, index) => {
        const x = random(`${seed}-x-${index}`);
        const y = random(`${seed}-y-${index}`);
        const speed = 0.15 + random(`${seed}-s-${index}`) * 0.45;
        const size = 3 + random(`${seed}-r-${index}`) * 7;
        const top = ((y - t * speed * 0.06) % 1 + 1) % 1;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: x * width,
              top: top * height,
              width: size,
              height: size,
              borderRadius: "50%",
              background: theme.palette.accent,
              opacity: 0.18 + random(`${seed}-o-${index}`) * 0.35,
              filter: "blur(1px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LightFlare: React.FC<{ theme: Theme; sceneFrames: number }> = ({
  theme,
  sceneFrames,
}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, sceneFrames], [-40, 140], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: `${x}%`,
          width: "26%",
          height: "160%",
          background: `linear-gradient(90deg, transparent, ${theme.glowA}, transparent)`,
          transform: "rotate(18deg)",
          filter: "blur(48px)",
        }}
      />
    </AbsoluteFill>
  );
};

const ChromaShift: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const offset = Math.sin(frame / 6) * 2.5 * intensity;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: 0.28 }}>
      <AbsoluteFill
        style={{
          background: "rgba(255,0,60,0.5)",
          transform: `translateX(${offset}px)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: "rgba(0,180,255,0.5)",
          transform: `translateX(${-offset}px)`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

const Glitch: React.FC<{ seed: string; intensity: number }> = ({ seed, intensity }) => {
  const frame = useCurrentFrame();
  const active = random(`${seed}-${Math.floor(frame / 4)}`) > 0.72;
  if (!active) return null;
  const shift = (random(`${seed}-s-${frame}`) - 0.5) * 30 * intensity;
  const top = random(`${seed}-t-${frame}`) * 100;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: `${top}%`,
          left: shift,
          width: "100%",
          height: "3%",
          background: "rgba(255,255,255,0.14)",
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};

const MotionBlur: React.FC<{ sceneFrames: number }> = ({ sceneFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, sceneFrames * 0.35], [0.5, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backdropFilter: `blur(${opacity * 18}px)`,
        opacity: opacity > 0.01 ? 1 : 0,
      }}
    />
  );
};

export const SceneEffects: React.FC<{
  scene: Scene;
  theme: Theme;
  sceneFrames: number;
}> = ({ scene, theme, sceneFrames }) => {
  const effects = scene.actions.filter(
    (action): action is Extract<Scene["actions"][number], { type: "effect" }> =>
      action.type === "effect",
  );
  if (effects.length === 0) return null;

  return (
    <>
      {effects.map((action, index) => {
        const seed = `scene-${scene.id}-${index}`;
        const intensity = action.intensity ?? 1;
        const effect: VisualEffect = action.effect;
        switch (effect) {
          case "particles":
            return <Particles key={seed} theme={theme} seed={seed} intensity={intensity} />;
          case "lightFlare":
            return <LightFlare key={seed} theme={theme} sceneFrames={sceneFrames} />;
          case "chromaShift":
            return <ChromaShift key={seed} intensity={intensity} />;
          case "glitch":
            return <Glitch key={seed} seed={seed} intensity={intensity} />;
          case "motionBlur":
            return <MotionBlur key={seed} sceneFrames={sceneFrames} />;
          default:
            return null;
        }
      })}
    </>
  );
};
