import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetRef, ScreenSurface } from "@/types";

/**
 * Every capture available, with the chosen ones numbered in the order they
 * will play. Click toggles; arrows reorder. The template's preferred
 * surface is shown first so the right ones are one click away.
 */
export const ScreenPicker: React.FC<{
  assets: AssetRef[];
  selected: string[];
  max: number;
  surface: ScreenSurface;
  onChange: (ids: string[]) => void;
}> = ({ assets, selected, max, surface, onChange }) => {
  if (assets.length === 0) return null;

  const ordered = [...assets].sort((a, b) => {
    if (surface === "any") return 0;
    const am = a.surface === surface ? 0 : 1;
    const bm = b.surface === surface ? 0 : 1;
    return am - bm;
  });

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  const move = (id: string, delta: number) => {
    const index = selected.indexOf(id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= selected.length) return;
    const copy = [...selected];
    [copy[index], copy[next]] = [copy[next] as string, copy[index] as string];
    onChange(copy);
  };

  return (
    <div>
      <p className="mb-2 text-xs text-mist-400">
        {selected.length} of {max} in the video · click to add, arrows to reorder
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {ordered.map((asset) => {
          const position = selected.indexOf(asset.id);
          const picked = position >= 0;
          const tall = asset.height >= asset.width;
          return (
            <div key={asset.id} className="group relative">
              <button
                type="button"
                onClick={() => toggle(asset.id)}
                aria-pressed={picked}
                title={asset.label}
                className={cn(
                  "block w-full overflow-hidden rounded-lg border bg-black transition-colors",
                  picked ? "border-brand-400/70" : "border-white/8 hover:border-white/25",
                  tall ? "aspect-9/16" : "aspect-video",
                )}
              >
                <img src={asset.url} alt={asset.label} className="h-full w-full object-cover object-top" loading="lazy" />
              </button>
              {picked ? (
                <span className="pointer-events-none absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  {position + 1}
                </span>
              ) : (
                <span className="pointer-events-none absolute top-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Check className="size-3" />
                </span>
              )}
              {picked ? (
                <span className="absolute right-1 bottom-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" onClick={() => move(asset.id, -1)} className="grid size-6 place-items-center rounded bg-black/70 text-white hover:bg-black" aria-label="Earlier">
                    <ArrowUp className="size-3" />
                  </button>
                  <button type="button" onClick={() => move(asset.id, 1)} className="grid size-6 place-items-center rounded bg-black/70 text-white hover:bg-black" aria-label="Later">
                    <ArrowDown className="size-3" />
                  </button>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
