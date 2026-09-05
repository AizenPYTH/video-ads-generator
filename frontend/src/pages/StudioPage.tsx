import { Card, CardContent } from "@/components/Common/Card";
import { ErrorState } from "@/components/Common/ErrorState";
import { Button } from "@/components/Common/Button";
import { UrlBar } from "@/components/Studio/UrlBar";
import { RunProgress } from "@/components/Studio/RunProgress";
import { ResultPanel } from "@/components/Studio/ResultPanel";
import { ConceptCard } from "@/components/Studio/ConceptCard";
import { CustomizePanel } from "@/components/Studio/CustomizePanel";
import { StepIndicator } from "@/components/Studio/StepIndicator";
import { useStudio } from "@/hooks/useStudio";
import { useProjectStore } from "@/store/useProjectStore";
import { titleCase } from "@/utils/formatting";

const WORKING = ["capturing", "analysing", "writing"] as const;

export default function StudioPage() {
  const studio = useStudio();
  const jobId = useProjectStore((state) => state.jobId);
  const setStyle = useProjectStore((state) => state.setStyle);
  const setDevice = useProjectStore((state) => state.setDevice);
  const metadata = useProjectStore((state) => state.metadata);
  const setMetadata = useProjectStore((state) => state.setMetadata);

  const {
    phase,
    step,
    error,
    assets,
    analysis,
    storyboards,
    storyboardId,
    style,
    device,
    sourceLabel,
    status,
    estimate,
  } = studio;

  const working = (WORKING as readonly string[]).includes(phase);
  const selected =
    storyboards.find((candidate) => candidate.id === storyboardId) ?? null;

  const wide = phase === "customizing" || phase === "choosing";

  return (
    <div
      className={
        "mx-auto w-full px-5 py-12 " + (wide ? "max-w-5xl" : "max-w-2xl")
      }
    >
      {phase !== "idle" ? (
        <div className="mb-10">
          <StepIndicator current={step} />
        </div>
      ) : null}

      {/* ── Step 1 · Capture ─────────────────────────────────────── */}
      {phase === "idle" ? (
        <>
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Turn your website into a
              <span className="bg-linear-to-r from-brand-400 to-accent-300 bg-clip-text text-transparent">
                {" "}
                video ad
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-mist-400">
              Paste your link. Pick a story. Get a finished video in three
              formats.
            </p>
          </header>
          <UrlBar busy={false} onSubmit={(input) => void studio.run(input)} />
          <p className="mt-8 text-center text-xs text-mist-400/70">
            Takes about two minutes. No account needed.
          </p>
        </>
      ) : null}

      {working ? (
        <>
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Reading your product
            </h1>
            {sourceLabel ? (
              <p className="mt-1.5 text-sm text-mist-400">{sourceLabel}</p>
            ) : null}
          </header>
          <Card>
            <CardContent>
              <RunProgress
                phase={phase}
                assets={assets}
                status={status}
                estimate={estimate}
              />
              <div className="mt-6 flex justify-center">
                <Button variant="ghost" size="sm" onClick={studio.cancel}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── Step 2 · Concept ─────────────────────────────────────── */}
      {phase === "choosing" && analysis ? (
        <>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Three ways to tell it
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist-400">
              <span className="font-semibold text-mist-200">
                {analysis.name}
              </span>
              <span aria-hidden>·</span>
              <span>{titleCase(analysis.type)}</span>
              <span aria-hidden>·</span>
              <span>{analysis.features.length} features</span>
              <span aria-hidden>·</span>
              <span>{titleCase(analysis.tone)} tone</span>
            </p>
          </header>

          <div className="grid gap-5 md:grid-cols-3">
            {storyboards.map((storyboard, index) => (
              <ConceptCard
                key={storyboard.id}
                storyboard={storyboard}
                index={index}
                assets={assets}
                device={device}
                selected={storyboardId === storyboard.id}
                onSelect={() => studio.chooseConcept(storyboard.id)}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={studio.startOver}>
              Start over with a different site
            </Button>
          </div>
        </>
      ) : null}

      {/* ── Step 3 · Customise ───────────────────────────────────── */}
      {phase === "customizing" && selected ? (
        <CustomizePanel
          storyboard={selected}
          assets={assets}
          style={style}
          device={device}
          metadata={metadata}
          productName={analysis?.name ?? ""}
          busy={false}
          onStyle={setStyle}
          onDevice={setDevice}
          onMetadata={setMetadata}
          onBack={studio.backToConcepts}
          onGenerate={() => void studio.startRender()}
        />
      ) : null}

      {phase === "rendering" ? (
        <>
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Filming your ad
            </h1>
            <p className="mt-1.5 text-sm text-mist-400">
              {selected?.title ?? sourceLabel}
            </p>
          </header>
          <Card>
            <CardContent>
              <RunProgress
                phase={phase}
                assets={assets}
                status={status}
                estimate={estimate}
              />
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── Step 4 · Download ────────────────────────────────────── */}
      {phase === "done" && jobId && status ? (
        <>
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Here is your ad
            </h1>
            <p className="mt-1.5 text-sm text-mist-400">
              {selected?.title ?? sourceLabel}
            </p>
          </header>
          <ResultPanel
            jobId={jobId}
            status={status}
            storyboards={storyboards}
            storyboardId={storyboardId}
            style={style}
            device={device}
            busy={false}
            onApply={(next) => void studio.changeAndRerender(next)}
          />
          <div className="mt-8 text-center">
            <Button variant="ghost" size="sm" onClick={studio.startOver}>
              Make one for a different site
            </Button>
          </div>
        </>
      ) : null}

      {phase === "error" ? (
        <ErrorState
          message={error ?? "Something went wrong."}
          onRetry={studio.startOver}
          retryLabel="Start again"
        />
      ) : null}
    </div>
  );
}
