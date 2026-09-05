import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/services/api";
import { useProjectStore } from "@/store/useProjectStore";

export type AnalysisStage = "idle" | "analysing" | "writing" | "done" | "error";

/**
 * Drives the two Claude calls behind the analysis screen: vision analysis
 * first, then the three storyboards. Runs once per upload id.
 */
export function useAnalysis(uploadId: string | null) {
  const analysis = useProjectStore((state) => state.analysis);
  const storyboards = useProjectStore((state) => state.storyboards);
  const setAnalysis = useProjectStore((state) => state.setAnalysis);
  const setStoryboards = useProjectStore((state) => state.setStoryboards);
  const style = useProjectStore((state) => state.style);
  const device = useProjectStore((state) => state.device);

  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const startedFor = useRef<string | null>(null);

  const run = useCallback(
    async (signal?: AbortSignal) => {
      if (!uploadId) return;
      setError(null);

      try {
        setStage("analysing");
        const { analysis: fresh } = await api.analyze(uploadId, signal);
        if (signal?.aborted) return;
        setAnalysis(fresh);

        setStage("writing");
        const result = await api.storyboards(fresh, style, device, signal);
        if (signal?.aborted) return;
        setStoryboards(result.storyboards);
        setStage("done");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Something went wrong while analysing your product.",
        );
        setStage("error");
      }
    },
    [uploadId, style, device, setAnalysis, setStoryboards],
  );

  // A restored session already has both halves; report it as finished by
  // deriving the stage rather than writing state from an effect.
  const effectiveStage: AnalysisStage =
    stage === "idle" && analysis && storyboards.length > 0 ? "done" : stage;

  useEffect(() => {
    if (!uploadId) return;
    // Read the store imperatively: whether it was already populated decides
    // whether to run, but must not be an effect dependency.
    const state = useProjectStore.getState();
    if (state.analysis && state.storyboards.length > 0) {
      startedFor.current = uploadId;
      return;
    }
    if (startedFor.current === uploadId) return;
    startedFor.current = uploadId;

    const controller = new AbortController();
    void run(controller.signal);
    return () => controller.abort();
    // `run` intentionally excluded: it changes with style/device, which must
    // not re-trigger a full re-analysis while the user is picking a concept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  const retry = useCallback(() => {
    startedFor.current = null;
    void run();
  }, [run]);

  return { stage: effectiveStage, error, retry, analysis, storyboards };
}
