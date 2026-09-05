import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader } from "@/components/Common/Loader";
import { ErrorState } from "@/components/Common/ErrorState";
import { ProductInfo } from "@/components/Analysis/ProductInfo";
import { ConceptCard } from "@/components/Analysis/ConceptCard";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useProjectStore } from "@/store/useProjectStore";

const STAGE_COPY: Record<string, { message: string; detail: string }> = {
  analysing: {
    message: "Reading your product",
    detail: "Claude is looking at the captures — features, palette, tone.",
  },
  writing: {
    message: "Writing three concepts",
    detail: "Three different stories, not three versions of one.",
  },
};

export default function AnalysisPage() {
  const navigate = useNavigate();
  const upload = useProjectStore((state) => state.upload);
  const selectStoryboard = useProjectStore((state) => state.selectStoryboard);
  const selectedId = useProjectStore((state) => state.selectedStoryboardId);

  const { stage, error, retry, analysis, storyboards } = useAnalysis(
    upload?.uploadId ?? null,
  );

  useEffect(() => {
    if (!upload) navigate("/create", { replace: true });
  }, [upload, navigate]);

  if (!upload) return null;

  if (stage === "analysing" || stage === "writing" || stage === "idle") {
    const copy = STAGE_COPY[stage] ?? STAGE_COPY.analysing;
    return <Loader message={copy!.message} detail={copy!.detail} />;
  }

  if (stage === "error" || !analysis) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <ErrorState
          title="Analysis failed"
          message={error ?? "We could not analyse this product."}
          onRetry={retry}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Here is what we found
      </h1>
      <p className="mt-2 text-mist-400">
        Read it over, then pick the story you want to tell.
      </p>

      <div className="mt-8">
        <ProductInfo analysis={analysis} />
      </div>

      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Three concepts
            </h2>
            <p className="mt-1 text-sm text-mist-400">
              Each one is a different narrative structure.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {storyboards.map((storyboard, index) => (
            <ConceptCard
              key={storyboard.id}
              storyboard={storyboard}
              index={index}
              selected={selectedId === storyboard.id}
              onSelect={() => {
                selectStoryboard(storyboard.id);
                navigate("/storyboard");
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
