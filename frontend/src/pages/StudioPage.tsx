import { Card, CardContent } from "@/components/Common/Card";
import { ErrorState } from "@/components/Common/ErrorState";
import { Button } from "@/components/Common/Button";
import { UrlBar } from "@/components/Studio/UrlBar";
import { RunProgress } from "@/components/Studio/RunProgress";
import { ResultPanel } from "@/components/Studio/ResultPanel";
import { useStudio } from "@/hooks/useStudio";
import { useProjectStore } from "@/store/useProjectStore";

const RUNNING = ["capturing", "analysing", "writing", "rendering"] as const;

export default function StudioPage() {
  const {
    phase,
    error,
    assets,
    storyboards,
    storyboardId,
    style,
    device,
    sourceLabel,
    status,
    estimate,
    run,
    cancel,
    startOver,
    changeAndRerender,
  } = useStudio();
  const jobId = useProjectStore((state) => state.jobId);

  const busy = (RUNNING as readonly string[]).includes(phase);

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-14">
      {phase === "idle" ? (
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Turn your website into a
            <span className="bg-linear-to-r from-brand-400 to-accent-300 bg-clip-text text-transparent">
              {" "}
              video ad
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-mist-400">
            Paste your link. Get a finished video in three formats. That is the
            whole thing.
          </p>
        </header>
      ) : (
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {phase === "done"
              ? "Here is your ad"
              : phase === "error"
                ? "That did not work"
                : "Making your ad"}
          </h1>
          {sourceLabel ? (
            <p className="mt-1.5 text-sm text-mist-400">{sourceLabel}</p>
          ) : null}
        </header>
      )}

      {phase === "idle" ? (
        <>
          <UrlBar busy={false} onSubmit={(input) => void run(input)} />
          <p className="mt-8 text-center text-xs text-mist-400/70">
            Takes about two minutes. No account needed.
          </p>
        </>
      ) : null}

      {busy ? (
        <Card>
          <CardContent className="pt-6">
            <RunProgress
              phase={phase}
              assets={assets}
              status={status}
              estimate={estimate}
            />
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {phase === "done" && jobId && status ? (
        <>
          <ResultPanel
            jobId={jobId}
            status={status}
            storyboards={storyboards}
            storyboardId={storyboardId}
            style={style}
            device={device}
            busy={false}
            onApply={(next) => void changeAndRerender(next)}
          />
          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={startOver}>
              Make one for a different site
            </Button>
          </div>
        </>
      ) : null}

      {phase === "error" ? (
        <div className="space-y-6">
          <ErrorState
            message={error ?? "Something went wrong."}
            onRetry={startOver}
            retryLabel="Start again"
          />
        </div>
      ) : null}
    </div>
  );
}
