import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/services/api";
import { useProjectStore } from "@/store/useProjectStore";
import { fileToDataUri, MAX_FILE_BYTES, MAX_FILES } from "@/utils/validation";
import { useJobStatus } from "./usePolling";
import type {
  AssetRef,
  DeviceType,
  ProductAnalysis,
  Storyboard,
  VideoStyle,
} from "@/types";

export type Phase =
  | "idle"
  | "capturing"
  | "analysing"
  | "writing"
  | "rendering"
  | "done"
  | "error";

/**
 * The whole product in one hook: link in, video out.
 *
 * Everything the old five-step wizard asked the user to decide is decided
 * here instead - the concept, the look, the device - and only surfaced
 * afterwards, as a change you can make to a video you can already see.
 */
export function useStudio() {
  const store = useProjectStore;
  const analysis = useProjectStore((s) => s.analysis);
  const storyboards = useProjectStore((s) => s.storyboards);
  const storyboardId = useProjectStore((s) => s.storyboardId);
  const style = useProjectStore((s) => s.style);
  const device = useProjectStore((s) => s.device);
  const jobId = useProjectStore((s) => s.jobId);
  const sourceLabel = useProjectStore((s) => s.sourceLabel);

  const [phase, setPhase] = useState<Phase>(jobId ? "rendering" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetRef[]>(analysis?.assets ?? []);
  const [estimate, setEstimate] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { status, error: pollError } = useJobStatus(
    phase === "rendering" || phase === "done" ? jobId : null,
  );

  const settled = status?.status === "completed" ? "done" : null;
  const failed = status?.status === "failed";
  const effectivePhase: Phase = failed
    ? "error"
    : settled && phase === "rendering"
      ? "done"
      : phase;

  const fail = useCallback((message: string) => {
    setError(message);
    setPhase("error");
    return false;
  }, []);

  /** Renders with whatever concept / look / device is currently selected. */
  const render = useCallback(
    async (overrides?: {
      storyboard?: Storyboard;
      style?: VideoStyle;
      device?: DeviceType;
      analysis?: ProductAnalysis;
    }): Promise<boolean> => {
      const state = store.getState();
      const chosen =
        overrides?.storyboard ??
        state.storyboards.find((s) => s.id === state.storyboardId) ??
        state.storyboards[0];
      const productAnalysis = overrides?.analysis ?? state.analysis;
      if (!chosen || !productAnalysis) {
        return fail("Nothing to render yet.");
      }

      setPhase("rendering");
      setError(null);
      try {
        const response = await api.generate({
          storyboard: chosen,
          style: overrides?.style ?? state.style,
          device: overrides?.device ?? state.device,
          analysis: productAnalysis,
        });
        state.setJobId(response.jobId);
        setEstimate(response.estimatedTime);
        return true;
      } catch (caught) {
        return fail(
          caught instanceof ApiError
            ? caught.message
            : "Could not start the render.",
        );
      }
    },
    [store, fail],
  );

  /** Capture -> analyse -> write -> render, with no stops in between. */
  const run = useCallback(
    async (input: { url?: string; files?: File[] }): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const state = store.getState();
      state.reset();
      setAssets([]);
      setError(null);
      setEstimate(null);

      // 1. Capture
      setPhase("capturing");
      let upload;
      try {
        if (input.url) {
          state.setSourceLabel(
            input.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
          );
          upload = await api.uploadUrl(input.url, controller.signal);
        } else {
          const files = (input.files ?? []).slice(0, MAX_FILES);
          const tooBig = files.find((file) => file.size > MAX_FILE_BYTES);
          if (tooBig) {
            fail(`${tooBig.name} is over 8 MB. Compress it and try again.`);
            return;
          }
          state.setSourceLabel(
            files.length === 1 ? files[0]!.name : `${files.length} screenshots`,
          );
          const encoded = await Promise.all(files.map(fileToDataUri));
          upload = await api.uploadScreenshots(encoded, controller.signal);
        }
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        fail(
          caught instanceof ApiError
            ? caught.message
            : "We could not open that link. Try uploading screenshots instead.",
        );
        return;
      }
      if (controller.signal.aborted) return;
      setAssets(upload.assets);

      // 2. Analyse
      setPhase("analysing");
      let fresh: ProductAnalysis;
      try {
        fresh = (await api.analyze(upload.uploadId, controller.signal)).analysis;
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        fail(
          caught instanceof ApiError
            ? caught.message
            : "We could not read that product.",
        );
        return;
      }
      if (controller.signal.aborted) return;
      state.setAnalysis(fresh);
      setAssets(fresh.assets);

      // The look follows the product's own tone unless the user has picked one.
      const autoStyle = styleForTone(fresh.tone);
      if (!state.styleTouched) state.setStyle(autoStyle, false);
      const chosenStyle = state.styleTouched ? state.style : autoStyle;
      const chosenDevice = state.device;

      // 3. Write
      setPhase("writing");
      let written: Storyboard[];
      try {
        written = (
          await api.storyboards(
            fresh,
            chosenStyle,
            chosenDevice,
            controller.signal,
          )
        ).storyboards;
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        fail(
          caught instanceof ApiError
            ? caught.message
            : "We could not write an ad for this product.",
        );
        return;
      }
      if (controller.signal.aborted) return;
      state.setStoryboards(written);
      const first = written[0];
      if (!first) {
        fail("No usable concept came back.");
        return;
      }
      state.setStoryboardId(first.id);

      // 4. Render
      await render({
        storyboard: first,
        style: chosenStyle,
        device: chosenDevice,
        analysis: fresh,
      });
    },
    [store, fail, render],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setError(null);
  }, []);

  const startOver = useCallback(() => {
    abortRef.current?.abort();
    store.getState().reset();
    setAssets([]);
    setEstimate(null);
    setError(null);
    setPhase("idle");
  }, [store]);

  /** Swap the concept / look / device on a video that already exists. */
  const changeAndRerender = useCallback(
    async (next: {
      storyboardId?: string;
      style?: VideoStyle;
      device?: DeviceType;
    }): Promise<void> => {
      const state = store.getState();
      if (next.storyboardId) state.setStoryboardId(next.storyboardId);
      if (next.style) state.setStyle(next.style);
      if (next.device) state.setDevice(next.device);
      state.setJobId(null);

      const after = store.getState();
      await render({
        ...(after.storyboards.find((s) => s.id === after.storyboardId)
          ? {
              storyboard: after.storyboards.find(
                (s) => s.id === after.storyboardId,
              ) as Storyboard,
            }
          : {}),
        style: after.style,
        device: after.device,
      });
    },
    [store, render],
  );

  return {
    phase: effectivePhase,
    error: error ?? (failed ? (status?.error ?? "The render failed.") : null) ?? pollError,
    assets,
    analysis,
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
  };
}

function styleForTone(tone: ProductAnalysis["tone"]): VideoStyle {
  switch (tone) {
    case "playful":
    case "bold":
      return "dynamic_startup";
    case "minimal":
      return "minimal_dark";
    case "premium":
    case "professional":
    case "casual":
    default:
      return "apple_premium";
  }
}
