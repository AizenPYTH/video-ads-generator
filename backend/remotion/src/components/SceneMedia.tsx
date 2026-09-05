import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easingFor, kenBurns, motionFor } from "../animations";
import type { AnimationType, AssetRef, EasingType, Scene } from "../../../src/types";

interface MediaAction {
  target: string;
  animation: AnimationType;
  easing: EasingType;
  duration: number;
  delay: number;
}

function mediaActionsOf(scene: Scene): MediaAction[] {
  const actions = scene.actions
    .filter(
      (action): action is Extract<Scene["actions"][number], { type: "display" | "animation" }> =>
        action.type === "display" || action.type === "animation",
    )
    .map((action) => ({
      target: action.target ?? "",
      animation: action.animation,
      easing: action.easing,
      duration: action.duration,
      delay: action.delay ?? 0,
    }))
    .filter((action) => action.target.length > 0);

  return actions;
}

/**
 * The screenshot stack for one scene. Multiple display actions layer on top of
 * each other so a scene can hand off from one capture to the next.
 */
export const SceneMedia: React.FC<{
  scene: Scene;
  assets: AssetRef[];
  fallbackAssetId: string;
  tempo: number;
  fadeOutFrames: number;
  sceneFrames: number;
}> = ({ scene, assets, fallbackAssetId, tempo, fadeOutFrames, sceneFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const fallback = byId.get(fallbackAssetId) ?? assets[0];

  const actions = mediaActionsOf(scene);
  const stack = actions.length
    ? actions
    : [
        {
          target: fallbackAssetId,
          animation: "fadeIn" as AnimationType,
          easing: "easeOut" as EasingType,
          duration: scene.duration,
          delay: 0,
        },
      ];

  // Trailing crossfade into the next scene.
  const exit = interpolate(
    frame,
    [sceneFrames - fadeOutFrames, sceneFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      {stack.map((action, index) => {
        const asset = byId.get(action.target) ?? fallback;
        if (!asset) return null;

        const delayFrames = Math.round(action.delay * fps);
        const durationFrames = Math.max(
          1,
          Math.round(action.duration * tempo * fps),
        );
        const local = frame - delayFrames;
        if (local < 0) return null;

        const raw = Math.min(1, local / durationFrames);
        const progress = easingFor(action.easing)(raw);
        const motion = motionFor(action.animation, progress, local / fps);
        const drift = kenBurns(Math.min(1, local / Math.max(1, sceneFrames)));

        return (
          <AbsoluteFill
            key={`${action.target}-${index}`}
            style={{ opacity: motion.opacity }}
          >
            <AbsoluteFill style={{ transform: motion.transform }}>
              <AbsoluteFill style={{ transform: drift }}>
                <Img
                  src={asset.url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />
              </AbsoluteFill>
            </AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
