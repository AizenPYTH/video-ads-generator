import { useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import type { StatusResponse } from "@/types";

const BASE_INTERVAL_MS = 1_500;
const MAX_INTERVAL_MS = 6_000;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Polls a render job until it settles. Backs off on failures rather than
 * hammering a backend that may just be busy rendering.
 */
export function useJobStatus(jobId: string | null) {
  // Keyed by job id so switching jobs reads as "no status yet" without an
  // effect that clears state.
  const [entry, setEntry] = useState<{
    jobId: string;
    status: StatusResponse;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    let failures = 0;
    const controller = new AbortController();

    const tick = async (): Promise<void> => {
      try {
        const next = await api.status(jobId, controller.signal);
        if (cancelled) return;
        failures = 0;
        setEntry({ jobId, status: next });
        setError(null);
        if (next.status === "completed" || next.status === "failed") return;
      } catch (caught) {
        if (cancelled || (caught as Error).name === "AbortError") return;
        failures += 1;
        if (failures >= MAX_CONSECUTIVE_ERRORS) {
          setError("Lost contact with the render job.");
          return;
        }
      }

      const delay = Math.min(
        MAX_INTERVAL_MS,
        BASE_INTERVAL_MS * (failures > 0 ? 2 ** failures : 1),
      );
      timer.current = window.setTimeout(() => void tick(), delay);
    };

    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [jobId]);

  return {
    status: entry && entry.jobId === jobId ? entry.status : null,
    error,
  };
}
