/**
 * Turns Claude's draft storyboards into the strict `Storyboard` the renderer
 * accepts. The model is good at narrative and unreliable at arithmetic, so
 * everything numeric is re-derived here: durations are clamped and rescaled,
 * scene ids renumbered, and every asset reference checked against the assets
 * that actually exist.
 */
import {
  MAX_SCENE_DURATION,
  MAX_TOTAL_DURATION,
  MIN_SCENE_DURATION,
  MIN_TOTAL_DURATION,
} from "../utils/constants";
import { clamp, generateId, normalizeHex } from "../utils/helpers";
import type {
  AssetRef,
  DeviceType,
  Scene,
  SceneAction,
  Storyboard,
  TextOverlay,
  VideoStyle,
} from "../types";
import type { RawAction, RawScene, RawStoryboard } from "./schemas";

const round2 = (value: number): number => Math.round(value * 100) / 100;

function resolveTarget(
  requested: string | null | undefined,
  assets: AssetRef[],
  fallbackIndex: number,
): string {
  if (assets.length === 0) return "screenshot_main";
  if (requested) {
    const exact = assets.find((asset) => asset.id === requested);
    if (exact) return exact.id;
    // Claude sometimes invents "screenshot_feature2" style ids; map the
    // trailing number onto a real capture rather than dropping the shot.
    const digits = requested.match(/(\d+)/)?.[1];
    if (digits) {
      const index = Number(digits);
      const byIndex = assets[index % assets.length];
      if (byIndex) return byIndex.id;
    }
  }
  return (assets[fallbackIndex % assets.length] as AssetRef).id;
}

function normalizeAction(
  raw: RawAction,
  sceneDuration: number,
  assets: AssetRef[],
  index: number,
): SceneAction | null {
  const duration = clamp(round2(raw.duration), 0.2, sceneDuration);
  const delay = raw.delay ? clamp(round2(raw.delay), 0, sceneDuration) : 0;

  switch (raw.type) {
    case "text": {
      const content = raw.content?.trim();
      if (!content) return null;
      return {
        type: "text",
        content,
        position: raw.position ?? "bottom",
        animation: raw.animation ?? "fadeIn",
        duration,
        delay,
      };
    }
    case "effect": {
      if (!raw.effect) return null;
      return {
        type: "effect",
        effect: raw.effect,
        duration,
        delay,
        intensity: 1,
      };
    }
    case "animation":
      return {
        type: "animation",
        target: resolveTarget(raw.target, assets, index),
        from: "center",
        to: "center",
        animation: raw.animation ?? "fadeIn",
        duration,
        easing: raw.easing ?? "easeInOut",
        delay,
      };
    case "display":
    default:
      return {
        type: "display",
        target: resolveTarget(raw.target, assets, index),
        animation: raw.animation ?? "fadeIn",
        duration,
        easing: raw.easing ?? "easeOut",
        delay,
      };
  }
}

function normalizeOverlay(
  raw: RawScene["textOverlay"],
): TextOverlay | null {
  if (!raw?.content?.trim()) return null;
  return {
    content: raw.content.trim().slice(0, 70),
    position: raw.position,
    fontSize: clamp(Math.round(raw.fontSize), 24, 120),
    color: normalizeHex(raw.color) ?? "#ffffff",
    animation: raw.animation,
  };
}

function normalizeScene(
  raw: RawScene,
  index: number,
  assets: AssetRef[],
): Scene {
  const duration = clamp(
    round2(raw.duration),
    MIN_SCENE_DURATION,
    MAX_SCENE_DURATION,
  );

  const actions = raw.actions
    .map((action, actionIndex) =>
      normalizeAction(action, duration, assets, index + actionIndex),
    )
    .filter((action): action is SceneAction => action !== null);

  // Every scene needs something to look at, even if Claude only wrote text.
  if (!actions.some((action) => action.type === "display" || action.type === "animation")) {
    actions.unshift({
      type: "display",
      target: resolveTarget(null, assets, index),
      animation: "fadeIn",
      duration,
      easing: "easeOut",
      delay: 0,
    });
  }

  return {
    id: index + 1,
    name: raw.name.trim().slice(0, 60),
    duration,
    description: raw.description.trim().slice(0, 300),
    actions,
    textOverlay: normalizeOverlay(raw.textOverlay),
  };
}

/** Proportionally rescales scenes so the total lands inside the allowed range. */
function fitTotalDuration(scenes: Scene[]): Scene[] {
  const total = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (total >= MIN_TOTAL_DURATION && total <= MAX_TOTAL_DURATION) return scenes;

  const target = clamp(total, MIN_TOTAL_DURATION, MAX_TOTAL_DURATION);
  const factor = target / total;

  return scenes.map((scene) => {
    const duration = clamp(
      round2(scene.duration * factor),
      MIN_SCENE_DURATION,
      MAX_SCENE_DURATION,
    );
    return {
      ...scene,
      duration,
      actions: scene.actions.map((action) => ({
        ...action,
        duration: clamp(round2(action.duration * factor), 0.2, duration),
        delay: action.delay ? clamp(round2(action.delay * factor), 0, duration) : 0,
      })),
    };
  });
}

export function normalizeStoryboard(
  raw: RawStoryboard,
  options: { style: VideoStyle; device: DeviceType; assets: AssetRef[] },
): Storyboard {
  const scenes = fitTotalDuration(
    raw.scenes.map((scene, index) =>
      normalizeScene(scene, index, options.assets),
    ),
  );

  return {
    id: generateId(),
    title: raw.title.trim().slice(0, 70),
    concept: raw.concept.trim().slice(0, 90),
    description: raw.description.trim().slice(0, 400),
    style: options.style,
    device: options.device,
    totalDuration: round2(
      scenes.reduce((sum, scene) => sum + scene.duration, 0),
    ),
    scenes,
  };
}

/** Re-targets a stored storyboard onto a different style/device pairing. */
export function retargetStoryboard(
  storyboard: Storyboard,
  style: VideoStyle,
  device: DeviceType,
): Storyboard {
  return { ...storyboard, style, device };
}
