import * as Progress from "@radix-ui/react-progress";
import { Check, Loader2 } from "lucide-react";
import { formatSeconds } from "@/utils/formatting";
import type { StatusResponse } from "@/types";

const PHASES = [
  { key: "processing", label: "Preparing composition", upTo: 10 },
  { key: "rendering", label: "Rendering scenes", upTo: 92 },
  { key: "exporting", label: "Exporting formats", upTo: 99 },
  { key: "completed", label: "Ready", upTo: 100 },
] as const;

export const ProgressBar: React.FC<{
  status: StatusResponse | null;
  estimate: number | null;
}> = ({ status, estimate }) => {
  const progress = status?.progress ?? 0;
  const remaining =
    estimate !== null && progress > 0 && progress < 100
      ? Math.max(5, Math.round((estimate * (100 - progress)) / 100))
      : null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-white">
            {status?.message ?? "Queued"}
          </p>
          <p className="font-mono text-sm text-mist-300">{progress}%</p>
        </div>

        <Progress.Root
          value={progress}
          className="h-2 w-full overflow-hidden rounded-full bg-white/7"
        >
          <Progress.Indicator
            className="h-full rounded-full bg-linear-to-r from-brand-500 to-accent-400 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </Progress.Root>

        <p className="text-xs text-mist-400">
          {remaining !== null
            ? `About ${formatSeconds(remaining)} left`
            : "Rendering three formats at 1080p — this takes a couple of minutes."}
        </p>
      </div>

      <ul className="space-y-2">
        {PHASES.map((phase) => {
          const done = progress >= phase.upTo;
          const active = !done && progress > 0;
          return (
            <li
              key={phase.key}
              className={
                "flex items-center gap-2.5 text-sm " +
                (done
                  ? "text-mist-300"
                  : active
                    ? "text-white"
                    : "text-mist-400/45")
              }
            >
              {done ? (
                <Check className="size-4 text-emerald-400" />
              ) : active ? (
                <Loader2 className="size-4 animate-spin text-brand-400" />
              ) : (
                <span className="size-4 rounded-full border border-white/15" />
              )}
              {phase.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
