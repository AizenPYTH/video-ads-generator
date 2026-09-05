import { ArrowRight, Clock, Film } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { DeviceMockup } from "./DeviceMockup";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/utils/formatting";
import { assetsForDevice, coverAsset } from "@/utils/assets";
import type { AssetRef, DeviceType, Storyboard } from "@/types";

export const ConceptCard: React.FC<{
  storyboard: Storyboard;
  index: number;
  assets: AssetRef[];
  device: DeviceType;
  selected: boolean;
  onSelect: () => void;
}> = ({ storyboard, index, assets, device, selected, onSelect }) => {
  const cover = coverAsset(storyboard, assetsForDevice(assets, device))?.url;
  const beats = storyboard.scenes
    .map((scene) => scene.textOverlay?.content ?? scene.name)
    .slice(0, 3);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group panel flex h-full flex-col overflow-hidden rounded-2xl text-left transition-all duration-200",
        selected
          ? "border-brand-400/60 ring-1 ring-brand-400/40"
          : "hover:-translate-y-0.5 hover:border-white/20",
      )}
    >
      {/* Thumbnail: the device, wearing this concept's opening shot. */}
      <div className="relative flex h-44 items-start justify-center overflow-hidden bg-linear-to-b from-brand-500/12 to-transparent pt-6">
        <DeviceMockup
          device={device}
          width={92}
          {...(cover ? { src: cover } : {})}
          alt=""
          className="transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/80 uppercase backdrop-blur-sm">
          {index + 1}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-brand-400 uppercase">
            {storyboard.concept}
          </p>
          <h3 className="mt-1 text-lg leading-tight font-bold text-white">
            {storyboard.title}
          </h3>
        </div>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-mist-400">
          {storyboard.description}
        </p>

        <ul className="space-y-1">
          {beats.map((beat, position) => (
            <li
              key={position}
              className="flex items-baseline gap-2 truncate text-xs text-mist-300"
            >
              <span className="text-mist-400/50">{position + 1}.</span>
              {beat}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4 border-t border-white/6 pt-3 text-xs text-mist-400">
          <span className="flex items-center gap-1.5">
            <Film className="size-3.5" />
            {storyboard.scenes.length} scenes
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {formatDuration(storyboard.totalDuration)}
          </span>
        </div>

        <Button
          variant={selected ? "primary" : "secondary"}
          className="w-full"
          asChild
        >
          <span>
            {selected ? "Selected" : "Use this concept"}
            <ArrowRight />
          </span>
        </Button>
      </div>
    </button>
  );
};
