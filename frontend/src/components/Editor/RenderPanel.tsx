import { Download, Loader2, Clapperboard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { api } from "@/services/api";
import { formatSeconds } from "@/utils/formatting";
import { ASPECT_LABELS } from "@/video/engine/aspect";
import type { AspectRatio, StatusResponse } from "@/types";

/**
 * The bottom of the editor: the generate button, then the job as it runs,
 * then the files. One component because they are one thing to the user.
 */
export const RenderPanel: React.FC<{
  jobId: string | null;
  status: StatusResponse | null;
  estimate: number | null;
  starting: boolean;
  missing: string[];
  error: string | null;
  aspects: AspectRatio[];
  onGenerate: () => void;
  onReset: () => void;
}> = ({ jobId, status, estimate, starting, missing, error, aspects, onGenerate, onReset }) => {
  const running = jobId !== null && status?.status !== "completed" && status?.status !== "failed";
  const done = status?.status === "completed" && status.outputs;
  const failed = status?.status === "failed";
  const pct = status?.progress ?? 0;
  const remaining =
    estimate !== null && pct > 0 && pct < 100 ? Math.max(5, Math.round((estimate * (100 - pct)) / 100)) : null;

  if (done && status.outputs) {
    const outputs = status.outputs;
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-white">Your video is ready</p>
        <div className="grid gap-2">
          {(Object.keys(outputs) as AspectRatio[]).map((aspect) => (
            <Button key={aspect} variant="secondary" asChild>
              <a href={api.downloadUrl(jobId as string, aspect)} download className="justify-between">
                <span className="flex items-center gap-2">
                  <Download />
                  <span className="font-mono">{aspect}</span>
                </span>
                <span className="text-xs font-normal text-mist-400">{ASPECT_LABELS[aspect].split(" · ")[1]}</span>
              </a>
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="w-full">
          Change something and render again
        </Button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/4 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="size-4 animate-spin text-brand-400" />
          <p className="flex-1 text-sm text-white">{status?.message ?? "Queued"}</p>
          <span className="font-mono text-sm text-mist-300">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-accent-400 transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-mist-400">
          {remaining !== null ? `About ${formatSeconds(remaining)} left` : "Starting the renderer"} · {aspects.length} format{aspects.length === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {failed ? (
        <p className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {status?.error ?? "The render failed."}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <Button size="lg" className="w-full" disabled={starting || missing.length > 0} onClick={onGenerate}>
        {starting ? <Loader2 className="animate-spin" /> : <Clapperboard />}
        {starting ? "Starting…" : `Generate ${aspects.length > 1 ? `${aspects.length} videos` : "video"}`}
      </Button>
      {missing.length > 0 ? <p className="text-center text-xs text-mist-400">Add {missing.join(" and ")} to render.</p> : null}
    </div>
  );
};
