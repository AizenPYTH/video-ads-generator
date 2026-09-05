import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/Common/Button";
import { Card, CardContent } from "@/components/Common/Card";
import { Loader } from "@/components/Common/Loader";
import { ErrorState } from "@/components/Common/ErrorState";
import { PreviewVideo } from "@/components/Generator/PreviewVideo";
import { useJobStatus } from "@/hooks/usePolling";
import { useProjectStore, useSelectedStoryboard } from "@/store/useProjectStore";
import { api } from "@/services/api";

const FORMATS = [
  { format: "9x16", label: "9:16", platform: "TikTok, Reels, Shorts" },
  { format: "16x9", label: "16:9", platform: "YouTube, landing pages" },
  { format: "1x1", label: "1:1", platform: "Instagram, LinkedIn" },
] as const;

export default function DownloadPage() {
  const navigate = useNavigate();
  const jobId = useProjectStore((state) => state.jobId);
  const reset = useProjectStore((state) => state.reset);
  const setJobId = useProjectStore((state) => state.setJobId);
  const storyboard = useSelectedStoryboard();
  const { status, error } = useJobStatus(jobId);

  useEffect(() => {
    if (!jobId) navigate("/create", { replace: true });
  }, [jobId, navigate]);

  if (!jobId) return null;

  if (error || status?.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <ErrorState
          title="Render failed"
          message={status?.error ?? error ?? "The render did not finish."}
          onRetry={() => navigate("/generate")}
          retryLabel="Back to settings"
        />
      </div>
    );
  }

  if (!status?.outputs) {
    return (
      <Loader
        message="Almost there"
        detail="Finishing the last format before your download is ready."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-center gap-2 text-accent-300">
        <Sparkles className="size-4" />
        <span className="text-sm font-semibold">Your video is ready</span>
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        {storyboard?.title ?? "Your ad"}
      </h1>
      <p className="mt-2 text-mist-400">
        Three formats, same cut. Download whichever you need.
      </p>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <PreviewVideo
            outputs={status.outputs}
            {...(status.poster ? { poster: status.poster } : {})}
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {FORMATS.map((entry) => (
          <Button key={entry.format} variant="secondary" asChild>
            <a
              href={api.downloadUrl(jobId, entry.format)}
              download
              className="flex-col !h-auto gap-0.5 py-3"
            >
              <span className="flex items-center gap-2 font-semibold text-white">
                <Download className="size-4" />
                {entry.label}
              </span>
              <span className="text-[11px] font-normal text-mist-400">
                {entry.platform}
              </span>
            </a>
          </Button>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            // Clear the finished job first, otherwise the generation page
            // sees a completed render and bounces straight back here.
            setJobId(null);
            navigate("/generate");
          }}
        >
          <RotateCcw />
          Try another look
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            navigate("/create");
          }}
        >
          Start a new ad
        </Button>
      </div>
    </div>
  );
}
