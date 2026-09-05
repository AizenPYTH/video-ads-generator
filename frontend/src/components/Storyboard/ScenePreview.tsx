import { Badge } from "@/components/Common/Badge";
import { formatDuration, titleCase } from "@/utils/formatting";
import type { AssetRef, Scene } from "@/types";

const POSITION_CLASSES: Record<string, string> = {
  top: "items-start justify-center",
  center: "items-center justify-center",
  bottom: "items-end justify-center",
  "top-left": "items-start justify-start",
  "top-right": "items-start justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-right": "items-end justify-end",
};

/**
 * A still approximation of the scene: the capture it displays plus the copy
 * that lands on it. Not a video preview — that costs a render.
 */
export const ScenePreview: React.FC<{
  scene: Scene;
  assets: AssetRef[];
}> = ({ scene, assets }) => {
  const displayAction = scene.actions.find(
    (action) => action.type === "display" || action.type === "animation",
  );
  const targetId =
    displayAction && "target" in displayAction ? displayAction.target : null;
  const asset =
    assets.find((candidate) => candidate.id === targetId) ?? assets[0] ?? null;

  const overlay = scene.textOverlay;
  const positionClass =
    POSITION_CLASSES[overlay?.position ?? "bottom"] ?? POSITION_CLASSES.bottom;

  return (
    <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,180px)_1fr]">
      <div className="relative aspect-9/16 overflow-hidden rounded-xl border border-white/10 bg-ink-900">
        {asset ? (
          <img
            src={asset.url}
            alt={asset.label}
            className="size-full object-cover object-top"
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-mist-400">
            No capture
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-black/25" />
        {overlay ? (
          <div className={`absolute inset-0 flex p-3 ${positionClass}`}>
            <p
              className="text-center text-[13px] leading-tight font-bold drop-shadow-lg"
              style={{ color: overlay.color }}
            >
              {overlay.content}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">Scene {scene.id}</Badge>
          <span className="text-sm font-semibold text-white">{scene.name}</span>
          <span className="font-mono text-xs text-mist-400">
            {formatDuration(scene.duration)}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-mist-400">
          {scene.description}
        </p>

        <div>
          <h5 className="mb-1.5 text-xs font-semibold tracking-wider text-mist-400 uppercase">
            Actions
          </h5>
          <ul className="space-y-1.5">
            {scene.actions.map((action, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/7 bg-white/3 px-2.5 py-1.5 text-xs"
              >
                <span className="font-semibold text-mist-200">
                  {titleCase(action.type)}
                </span>
                {"target" in action && action.target ? (
                  <span className="font-mono text-mist-400">{action.target}</span>
                ) : null}
                {"content" in action ? (
                  <span className="text-mist-300">“{action.content}”</span>
                ) : null}
                {"effect" in action ? (
                  <span className="text-accent-300">{action.effect}</span>
                ) : null}
                {"animation" in action ? (
                  <span className="text-brand-400">{action.animation}</span>
                ) : null}
                <span className="ml-auto font-mono text-mist-400/70">
                  {formatDuration(action.duration)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
