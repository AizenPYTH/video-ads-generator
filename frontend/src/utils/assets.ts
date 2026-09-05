import { deviceIsWide } from "@/components/Studio/deviceSpecs";
import type { AssetRef, DeviceType, Scene, Storyboard } from "@/types";

/**
 * Mirrors `assetsForDevice` in the backend renderer: a laptop or monitor
 * frame gets the desktop captures, a phone gets the mobile ones, and they
 * are re-exposed under the canonical ids the storyboard references.
 *
 * Without this the preview shows a tall phone capture letterboxed into a
 * MacBook screen while the actual render shows the desktop crop - the
 * preview would be lying about the output.
 */
export function assetsForDevice(
  assets: AssetRef[],
  device: DeviceType,
): AssetRef[] {
  const wantsDesktop = deviceIsWide(device);
  const isDesktop = (asset: AssetRef) =>
    asset.id.startsWith("screenshot_desktop");

  const preferred = assets.filter((asset) =>
    wantsDesktop ? isDesktop(asset) : !isDesktop(asset),
  );
  if (preferred.length === 0) return assets;

  const aliased = preferred.map((asset, index) => ({
    ...asset,
    id: index === 0 ? "screenshot_main" : `screenshot_${index}`,
  }));

  const seen = new Set(aliased.map((asset) => asset.id));
  for (const asset of preferred) {
    if (!seen.has(asset.id)) {
      aliased.push(asset);
      seen.add(asset.id);
    }
  }
  return aliased;
}

/** The capture a scene actually puts on screen. */
export function sceneAsset(
  scene: Scene,
  assets: AssetRef[],
): AssetRef | undefined {
  for (const action of scene.actions) {
    if ("target" in action && action.target) {
      const hit = assets.find((asset) => asset.id === action.target);
      if (hit) return hit;
    }
  }
  return assets[0];
}

/** First capture a storyboard shows, for a card thumbnail. */
export function coverAsset(
  storyboard: Storyboard,
  assets: AssetRef[],
): AssetRef | undefined {
  for (const scene of storyboard.scenes) {
    const hit = sceneAsset(scene, assets);
    if (hit) return hit;
  }
  return assets[0];
}

/** Cumulative start time of each scene, for a timeline. */
export function sceneStartTimes(storyboard: Storyboard): number[] {
  const starts: number[] = [];
  storyboard.scenes.reduce((elapsed, scene) => {
    starts.push(elapsed);
    return elapsed + scene.duration;
  }, 0);
  return starts;
}
