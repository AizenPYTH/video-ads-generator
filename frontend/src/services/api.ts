import type {
  AnalysisResponse,
  ApiResponse,
  AppStoreMatch,
  AspectRatio,
  GeneratePayload,
  GenerationResponse,
  ImageAsset,
  StatusResponse,
  UploadResponse,
} from "@/types";
import type { TemplateSummary } from "@/video/engine/registry";

/** Empty in dev: Vite proxies /api and /media to the backend. */
const BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      // Only on requests that actually carry a body. `Content-Type:
      // application/json` on a bodyless GET makes it a non-simple request,
      // which forces a CORS preflight on every status poll.
      ...(init?.body ? { headers: { "Content-Type": "application/json" } } : {}),
      ...init,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  let body: ApiResponse<T> | null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      body?.message ?? body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return body.data as T;
}

const withSignal = (signal?: AbortSignal) => (signal ? { signal } : {});

export const api = {
  /** The library the backend can render. The gallery uses the local mirror. */
  templates: (signal?: AbortSignal) =>
    request<{ templates: TemplateSummary[] }>("/templates", { method: "GET", ...withSignal(signal) }),

  /** A website or an App Store link - the backend tells them apart. */
  uploadUrl: (url: string, signal?: AbortSignal) =>
    request<UploadResponse>("/upload", {
      method: "POST",
      body: JSON.stringify({ url }),
      ...withSignal(signal),
    }),

  uploadScreenshots: (screenshots: string[], signal?: AbortSignal) =>
    request<UploadResponse>("/upload", {
      method: "POST",
      body: JSON.stringify({ screenshots }),
      ...withSignal(signal),
    }),

  uploadLogo: (logo: string, signal?: AbortSignal) =>
    request<{ logo: ImageAsset }>("/upload/logo", {
      method: "POST",
      body: JSON.stringify({ logo }),
      ...withSignal(signal),
    }),

  /** Optional enrichment: brand name and palette from the captured page. */
  analyze: (uploadId: string, signal?: AbortSignal) =>
    request<AnalysisResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify({ uploadId }),
      ...withSignal(signal),
    }),

  /** App Store lookup, proxied by the API so it is not a CORS problem. */
  appStore: (term: string, signal?: AbortSignal) =>
    request<{ matches: AppStoreMatch[] }>(`/appstore?term=${encodeURIComponent(term)}`, {
      method: "GET",
      ...withSignal(signal),
    }),

  generate: (payload: GeneratePayload) =>
    request<GenerationResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  status: (jobId: string, signal?: AbortSignal) =>
    request<StatusResponse>(`/video/${jobId}/status`, { method: "GET", ...withSignal(signal) }),

  downloadUrl: (jobId: string, aspect: AspectRatio): string =>
    `${BASE_URL}/api/video/${jobId}/download/${aspect.replace(":", "x")}`,
};
