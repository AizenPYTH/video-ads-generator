import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AspectRatio, VideoOutputs } from "@/types";

interface FormatTab {
  ratio: AspectRatio;
  key: keyof VideoOutputs;
  label: string;
  platform: string;
}

const DEFAULT_TAB: FormatTab = {
  ratio: "9:16",
  key: "ratio_9_16",
  label: "9:16",
  platform: "TikTok · Reels · Shorts",
};

const TABS: FormatTab[] = [
  DEFAULT_TAB,
  { ratio: "16:9", key: "ratio_16_9", label: "16:9", platform: "YouTube · Landing pages" },
  { ratio: "1:1", key: "ratio_1_1", label: "1:1", platform: "Instagram · LinkedIn" },
];

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "9:16": "aspect-9/16 max-h-[68vh]",
  "16:9": "aspect-video",
  "1:1": "aspect-square",
};

export const PreviewVideo: React.FC<{
  outputs: VideoOutputs;
  poster?: string;
}> = ({ outputs, poster }) => {
  const [active, setActive] = useState<AspectRatio>("9:16");
  const current = TABS.find((tab) => tab.ratio === active) ?? DEFAULT_TAB;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Video formats"
        className="inline-flex rounded-xl border border-white/8 bg-white/3 p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.ratio}
            role="tab"
            aria-selected={active === tab.ratio}
            onClick={() => setActive(tab.ratio)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              active === tab.ratio
                ? "bg-brand-500/18 text-white"
                : "text-mist-400 hover:text-mist-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <video
          key={outputs[current.key]}
          src={outputs[current.key]}
          {...(poster ? { poster } : {})}
          controls
          playsInline
          autoPlay
          loop
          muted
          className={cn(
            "w-full rounded-2xl border border-white/10 bg-black shadow-2xl",
            ASPECT_CLASS[current.ratio],
          )}
        />
        <p className="text-xs text-mist-400">{current.platform}</p>
      </div>
    </div>
  );
};
