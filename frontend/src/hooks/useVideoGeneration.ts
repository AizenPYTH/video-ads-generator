import { useCallback, useState } from "react";
import { api, ApiError } from "@/services/api";
import { useProjectStore, useSelectedStoryboard } from "@/store/useProjectStore";
import { useJobStatus } from "./usePolling";

/** Owns the render request plus the polling that follows it. */
export function useVideoGeneration() {
  const analysis = useProjectStore((state) => state.analysis);
  const style = useProjectStore((state) => state.style);
  const device = useProjectStore((state) => state.device);
  const jobId = useProjectStore((state) => state.jobId);
  const setJobId = useProjectStore((state) => state.setJobId);
  const storyboard = useSelectedStoryboard();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);

  const { status, error: pollError } = useJobStatus(jobId);

  const start = useCallback(async (): Promise<boolean> => {
    if (!storyboard || !analysis) {
      setError("Pick a concept first.");
      return false;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.generate({
        storyboard,
        style,
        device,
        analysis,
      });
      setJobId(response.jobId);
      setEstimate(response.estimatedTime);
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not start the render.",
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [storyboard, analysis, style, device, setJobId]);

  const restart = useCallback(() => {
    setJobId(null);
    setEstimate(null);
    setError(null);
  }, [setJobId]);

  return {
    start,
    restart,
    submitting,
    estimate,
    status,
    error: error ?? pollError,
    canGenerate: Boolean(storyboard && analysis),
    storyboard,
  };
}
