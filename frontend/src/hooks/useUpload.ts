import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/services/api";
import { useProjectStore } from "@/store/useProjectStore";
import { fileToDataUri, MAX_FILE_BYTES, MAX_FILES } from "@/utils/validation";
import type { UploadResponse } from "@/types";

export type UploadStage = "idle" | "reading" | "capturing" | "done";

export function useUpload() {
  const setUpload = useProjectStore((state) => state.setUpload);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const finish = useCallback(
    (result: UploadResponse) => {
      setUpload(result);
      setStage("done");
      return result;
    },
    [setUpload],
  );

  const fromUrl = useCallback(
    async (url: string): Promise<UploadResponse | null> => {
      setError(null);
      setStage("capturing");
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        return finish(await api.uploadUrl(url, controller.signal));
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return null;
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Capture failed. Try uploading screenshots instead.",
        );
        setStage("idle");
        return null;
      }
    },
    [finish],
  );

  const fromFiles = useCallback(
    async (files: File[]): Promise<UploadResponse | null> => {
      setError(null);

      const accepted = files.slice(0, MAX_FILES);
      const tooBig = accepted.find((file) => file.size > MAX_FILE_BYTES);
      if (tooBig) {
        setError(`${tooBig.name} is over 8 MB. Compress it and try again.`);
        return null;
      }

      setStage("reading");
      let encoded: string[];
      try {
        encoded = await Promise.all(accepted.map(fileToDataUri));
      } catch (caught) {
        setError((caught as Error).message);
        setStage("idle");
        return null;
      }

      setStage("capturing");
      try {
        return finish(await api.uploadScreenshots(encoded));
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught.message : "Upload failed.",
        );
        setStage("idle");
        return null;
      }
    },
    [finish],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
  }, []);

  return { stage, error, fromUrl, fromFiles, cancel, busy: stage !== "idle" && stage !== "done" };
}
