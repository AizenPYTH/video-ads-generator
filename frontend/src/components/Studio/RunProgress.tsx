import { Check, Loader2 } from "lucide-react";
import { formatSeconds } from "@/utils/formatting";
import type { Phase } from "@/hooks/useStudio";
import type { AssetRef, StatusResponse } from "@/types";

/** Plain language, in the order it happens. No jargon, no percentages
 *  except during the render, where the wait is long enough to need one. */
const STEPS: Array<{ phase: Phase; label: string }> = [
  { phase: "capturing", label: "Opening your site" },
  { phase: "analysing", label: "Looking at what it does" },
  { phase: "writing", label: "Writing the ad" },
  { phase: "rendering", label: "Filming it" },
];

const ORDER: Phase[] = ["capturing", "analysing", "writing", "rendering"];

export const RunProgress: React.FC<{
  phase: Phase;
  assets: AssetRef[];
  status: StatusResponse | null;
  estimate: number | null;
}> = ({ phase, assets, status, estimate }) => {
  const current = ORDER.indexOf(phase);
  const renderPct = status?.progress ?? 0;
  const remaining =
    estimate !== null && renderPct > 0 && renderPct < 100
      ? Math.max(5, Math.round((estimate * (100 - renderPct)) / 100))
      : null;

  return (
    <div className="space-y-6">
      <ol className="space-y-3" aria-live="polite">
        {STEPS.map((step, index) => {
          const done = current > index;
          const active = current === index;
          return (
            <li
              key={step.phase}
              className={
                "flex items-center gap-3 text-[15px] " +
                (done
                  ? "text-mist-300"
                  : active
                    ? "text-white"
                    : "text-mist-400/40")
              }
            >
              {done ? (
                <Check className="size-4.5 shrink-0 text-emerald-400" />
              ) : active ? (
                <Loader2 className="size-4.5 shrink-0 animate-spin text-brand-400" />
              ) : (
                <span className="size-4.5 shrink-0 rounded-full border border-white/12" />
              )}
              <span className="flex-1">{step.label}</span>
              {active && step.phase === "rendering" ? (
                <span className="font-mono text-sm text-mist-300">
                  {renderPct}%
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {phase === "rendering" ? (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/7">
            <div
              className="h-full rounded-full bg-linear-to-r from-brand-500 to-accent-400 transition-[width] duration-700 ease-out"
              style={{ width: `${renderPct}%` }}
            />
          </div>
          <p className="text-xs text-mist-400">
            {remaining !== null
              ? `About ${formatSeconds(remaining)} left`
              : "Rendering three formats at 1080p."}
          </p>
        </div>
      ) : null}

      {assets.length > 0 ? (
        <div>
          <p className="mb-2 text-xs text-mist-400">
            {assets.length} shots captured
          </p>
          <div className="flex gap-2 overflow-hidden">
            {assets.slice(0, 6).map((asset) => (
              <img
                key={asset.id}
                src={asset.url}
                alt=""
                loading="lazy"
                className="h-20 w-12 shrink-0 rounded-md border border-white/10 object-cover object-top"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
