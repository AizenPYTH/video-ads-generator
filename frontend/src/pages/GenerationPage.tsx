import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Card, CardContent } from "@/components/Common/Card";
import { ErrorState } from "@/components/Common/ErrorState";
import { Spinner } from "@/components/Common/Loader";
import { StyleSelector } from "@/components/Generator/StyleSelector";
import { DeviceSelector } from "@/components/Generator/DeviceSelector";
import { ProgressBar } from "@/components/Generator/ProgressBar";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useProjectStore } from "@/store/useProjectStore";

export default function GenerationPage() {
  const navigate = useNavigate();
  const style = useProjectStore((state) => state.style);
  const device = useProjectStore((state) => state.device);
  const setStyle = useProjectStore((state) => state.setStyle);
  const setDevice = useProjectStore((state) => state.setDevice);
  const jobId = useProjectStore((state) => state.jobId);

  const { start, restart, submitting, estimate, status, error, canGenerate, storyboard } =
    useVideoGeneration();

  useEffect(() => {
    if (!canGenerate) navigate("/analysis", { replace: true });
  }, [canGenerate, navigate]);

  useEffect(() => {
    if (status?.status === "completed") navigate("/download");
  }, [status?.status, navigate]);

  if (!canGenerate || !storyboard) return null;

  const rendering = Boolean(jobId) && status?.status !== "failed";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {!rendering ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/storyboard")}
          >
            <ArrowLeft />
            Back to storyboard
          </Button>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Choose the look
          </h1>
          <p className="mt-2 text-mist-400">
            Rendering “{storyboard.title}” in three formats at 1080p.
          </p>

          <Card className="mt-8">
            <CardContent className="space-y-8 pt-6">
              <StyleSelector value={style} onChange={setStyle} disabled={submitting} />
              <div className="border-t border-white/6 pt-6">
                <DeviceSelector
                  value={device}
                  onChange={setDevice}
                  disabled={submitting}
                />
              </div>
            </CardContent>
          </Card>

          {error ? (
            <div className="mt-6">
              <ErrorState message={error} />
            </div>
          ) : null}

          <Button
            size="lg"
            className="mt-8 w-full"
            disabled={submitting}
            onClick={() => void start()}
          >
            {submitting ? <Spinner /> : <Clapperboard />}
            {submitting ? "Starting render…" : "Generate video"}
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Rendering your ad
          </h1>
          <p className="mt-2 text-mist-400">
            Keep this tab open — we will take you to the download when it lands.
          </p>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <ProgressBar status={status} estimate={estimate} />
            </CardContent>
          </Card>

          {status?.status === "failed" || error ? (
            <div className="mt-6">
              <ErrorState
                title="Render failed"
                message={status?.error ?? error ?? "The render did not finish."}
                onRetry={restart}
                retryLabel="Change settings and retry"
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
