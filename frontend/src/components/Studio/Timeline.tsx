import { DeviceMockup } from "./DeviceMockup";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatting";
import { sceneAsset, sceneStartTimes } from "@/utils/assets";
import type { AssetRef, DeviceType, Scene, Storyboard } from "@/types";

/**
 * Blocks are sized by duration, so the strip reads as the shape of the ad -
 * a long hero and three quick features look different at a glance.
 */
export const Timeline: React.FC<{
  storyboard: Storyboard;
  assets: AssetRef[];
  activeSceneId: number | null;
  onSelect: (sceneId: number) => void;
}> = ({ storyboard, assets, activeSceneId, onSelect }) => {
  const starts = sceneStartTimes(storyboard);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold tracking-wider text-mist-400 uppercase">
          Timeline
        </span>
        <span className="font-mono text-mist-400">
          {formatDuration(storyboard.totalDuration)}
        </span>
      </div>

      <div role="tablist" aria-label="Scenes" className="flex gap-1.5">
        {storyboard.scenes.map((scene, index) => {
          const asset = sceneAsset(scene, assets);
          const active = activeSceneId === scene.id;
          const startsAt = starts[index] ?? 0;

          return (
            <button
              key={scene.id}
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(scene.id)}
              style={{ flexGrow: scene.duration }}
              title={`${scene.name} — starts at ${formatDuration(startsAt)}`}
              className={cn(
                "group relative min-w-0 overflow-hidden rounded-lg border transition-all",
                active
                  ? "border-brand-400/70 ring-1 ring-brand-400/30"
                  : "border-white/8 hover:border-white/25",
              )}
            >
              <div className="relative h-16 w-full overflow-hidden bg-ink-900">
                {asset ? (
                  <img
                    src={asset.url}
                    alt=""
                    loading="lazy"
                    className={cn(
                      "size-full object-cover object-top transition-opacity",
                      active ? "opacity-70" : "opacity-35 group-hover:opacity-55",
                    )}
                  />
                ) : null}
                <span className="absolute inset-x-1 bottom-1 truncate text-left text-[10px] font-semibold text-white drop-shadow">
                  {scene.name}
                </span>
                <span className="absolute top-1 right-1.5 font-mono text-[9px] text-white/70">
                  {formatDuration(scene.duration)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** The still that goes with whichever scene is selected. */
export const ScenePreview: React.FC<{
  scene: Scene;
  assets: AssetRef[];
  device: DeviceType;
  width: number;
}> = ({ scene, assets, device, width }) => {
  const asset = sceneAsset(scene, assets);
  const overlay = scene.textOverlay;

  return (
    <div className="relative flex flex-col items-center">
      <DeviceMockup
        device={device}
        width={width}
        {...(asset ? { src: asset.url } : {})}
        alt={asset?.label ?? ""}
      />
      {overlay ? (
        <p
          className="mt-4 max-w-[22ch] text-center text-lg leading-tight font-bold text-balance"
          style={{ color: overlay.color }}
        >
          {overlay.content}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-mist-400">
        {scene.name} · {formatDuration(scene.duration)}
      </p>
    </div>
  );
};
