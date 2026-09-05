import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatting";
import type { Storyboard } from "@/types";

/** Proportional strip of the whole ad; each block is one scene. */
export const Timeline: React.FC<{
  storyboard: Storyboard;
  activeSceneId: number | null;
  onSelect: (sceneId: number) => void;
}> = ({ storyboard, activeSceneId, onSelect }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-xs text-mist-400">
      <span>Timeline</span>
      <span>{formatDuration(storyboard.totalDuration)} total</span>
    </div>

    <div className="flex gap-1.5" role="tablist" aria-label="Scenes">
      {storyboard.scenes.map((scene) => (
        <button
          key={scene.id}
          role="tab"
          aria-selected={activeSceneId === scene.id}
          onClick={() => onSelect(scene.id)}
          style={{ flexGrow: scene.duration }}
          className={cn(
            "group relative h-16 min-w-0 overflow-hidden rounded-lg border px-2.5 py-2 text-left transition-all",
            activeSceneId === scene.id
              ? "border-brand-400/60 bg-brand-500/12"
              : "border-white/8 bg-white/3 hover:border-white/20",
          )}
        >
          <span className="block truncate text-[11px] font-semibold text-white">
            {scene.name}
          </span>
          <span className="mt-0.5 block truncate text-[10px] text-mist-400">
            {scene.textOverlay?.content ?? scene.description}
          </span>
          <span className="absolute right-2 bottom-1.5 font-mono text-[10px] text-mist-400/70">
            {formatDuration(scene.duration)}
          </span>
        </button>
      ))}
    </div>
  </div>
);
