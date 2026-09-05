import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor, motionFor } from "../animations";
import type { AnimationType, Scene, TextPosition } from "../../../src/types";
import type { Theme } from "../theme";

export type LayoutMode = "portrait" | "landscape" | "square";

function alignmentFor(
  position: TextPosition,
  layout: LayoutMode,
): React.CSSProperties {
  if (layout === "landscape") {
    // In landscape the copy owns its own column; vertical position only.
    const justify =
      position.startsWith("top")
        ? "flex-start"
        : position.startsWith("bottom")
          ? "flex-end"
          : "center";
    return { justifyContent: justify, alignItems: "flex-start", textAlign: "left" };
  }

  const vertical = position.startsWith("top")
    ? "flex-start"
    : position === "center"
      ? "center"
      : "flex-end";
  const horizontal = position.endsWith("-left")
    ? "flex-start"
    : position.endsWith("-right")
      ? "flex-end"
      : "center";
  return {
    justifyContent: vertical,
    alignItems: horizontal,
    textAlign: horizontal === "center" ? "center" : horizontal === "flex-end" ? "right" : "left",
  };
}

interface Line {
  content: string;
  position: TextPosition;
  animation: AnimationType;
  delay: number;
  duration: number;
  fontSize: number | null;
  color: string | null;
  emphasis: boolean;
}

function linesOf(scene: Scene): Line[] {
  const lines: Line[] = [];

  if (scene.textOverlay) {
    lines.push({
      content: scene.textOverlay.content,
      position: scene.textOverlay.position,
      animation: scene.textOverlay.animation,
      delay: 0.15,
      duration: 0.7,
      fontSize: scene.textOverlay.fontSize,
      color: scene.textOverlay.color,
      emphasis: true,
    });
  }

  for (const action of scene.actions) {
    if (action.type !== "text") continue;
    // A text action that just repeats the overlay adds nothing.
    if (
      scene.textOverlay &&
      action.content.trim().toLowerCase() ===
        scene.textOverlay.content.trim().toLowerCase()
    ) {
      continue;
    }
    lines.push({
      content: action.content,
      position: action.position,
      animation: action.animation,
      delay: action.delay ?? 0.2,
      duration: Math.min(action.duration, 0.9),
      fontSize: action.fontSize ?? null,
      color: action.color ?? null,
      emphasis: lines.length === 0,
    });
  }

  return lines;
}

export const SceneText: React.FC<{
  scene: Scene;
  theme: Theme;
  layout: LayoutMode;
  sceneFrames: number;
  fadeOutFrames: number;
  /** Base type size in px for this composition. */
  typeScale: number;
}> = ({ scene, theme, layout, sceneFrames, fadeOutFrames, typeScale }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = linesOf(scene);
  if (lines.length === 0) return null;

  const exit = interpolate(
    frame,
    [sceneFrames - fadeOutFrames, sceneFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const grouped = new Map<TextPosition, Line[]>();
  for (const line of lines) {
    grouped.set(line.position, [...(grouped.get(line.position) ?? []), line]);
  }

  return (
    <>
      {[...grouped.entries()].map(([position, group]) => (
        <div
          key={position}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            gap: typeScale * 0.35,
            padding:
              layout === "landscape" ? 0 : `${typeScale * 0.7}px ${typeScale * 0.9}px`,
            pointerEvents: "none",
            opacity: exit,
            ...alignmentFor(position, layout),
          }}
        >
          {group.map((line, index) => {
            const delayFrames = Math.round(line.delay * fps);
            const durationFrames = Math.max(
              1,
              Math.round(line.duration * theme.tempo * fps),
            );
            const local = frame - delayFrames;
            if (local < 0) return null;
            const progress = easingFor("easeOutCubic")(
              Math.min(1, local / durationFrames),
            );
            const motion = motionFor(line.animation, progress, local / fps);

            // Long copy has to shrink or it overflows its band and lands on
            // the device. Claude is told to write 3-7 words; this catches the
            // times it does not.
            const length = line.content.length;
            const fit = length > 44 ? 0.66 : length > 28 ? 0.8 : 1;
            const size = (line.emphasis ? typeScale * 1.05 : typeScale * 0.62) * fit;

            return (
              <div
                key={`${line.content}-${index}`}
                style={{
                  opacity: motion.opacity,
                  transform: motion.transform,
                  maxWidth: layout === "landscape" ? "100%" : "88%",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: theme.fontFamily,
                    fontWeight: line.emphasis ? theme.titleWeight : 500,
                    fontSize: line.fontSize
                      ? (line.fontSize / 56) * size
                      : size,
                    lineHeight: 1.08,
                    letterSpacing: theme.letterSpacing,
                    textTransform: theme.uppercase && line.emphasis ? "uppercase" : "none",
                    color: line.color ?? theme.overlayText,
                    textShadow: theme.glow
                      ? `0 8px 40px rgba(0,0,0,0.65), 0 0 60px ${theme.glowA}`
                      : "0 6px 28px rgba(0,0,0,0.7)",
                    ...({ textWrap: "balance" } as React.CSSProperties),
                  }}
                >
                  {line.content}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};
