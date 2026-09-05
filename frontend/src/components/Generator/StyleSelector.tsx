import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STYLE_LABELS } from "@/utils/formatting";
import type { VideoStyle } from "@/types";

const PREVIEWS: Record<VideoStyle, string> = {
  apple_premium:
    "linear-gradient(150deg, #0b0b10 0%, #241a4d 55%, #0b0b10 100%)",
  dynamic_startup:
    "linear-gradient(150deg, #2a1052 0%, #6d28d9 45%, #db2777 100%)",
  minimal_dark: "linear-gradient(150deg, #000000 0%, #101014 100%)",
};

const STYLES = Object.keys(STYLE_LABELS) as VideoStyle[];

export const StyleSelector: React.FC<{
  value: VideoStyle;
  onChange: (value: VideoStyle) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <fieldset disabled={disabled} className="space-y-3">
    <legend className="text-sm font-semibold text-white">Visual style</legend>
    <div className="grid gap-3 sm:grid-cols-3">
      {STYLES.map((style) => {
        const selected = value === style;
        return (
          <button
            key={style}
            type="button"
            onClick={() => onChange(style)}
            aria-pressed={selected}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-left transition-all disabled:opacity-50",
              selected
                ? "border-brand-400/60 ring-1 ring-brand-400/30"
                : "border-white/8 hover:border-white/20",
            )}
          >
            <span
              className="mb-3 block h-20 rounded-lg"
              style={{ background: PREVIEWS[style] }}
            />
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">
                {STYLE_LABELS[style].name}
              </span>
              {selected ? (
                <Check className="size-4 shrink-0 text-brand-400" />
              ) : null}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-mist-400">
              {STYLE_LABELS[style].blurb}
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);
