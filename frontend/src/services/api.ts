import type {
  AnalysisResponse,
  ApiResponse,
  GenerationResponse,
  ProductAnalysis,
  StatusResponse,
  Storyboard,
  StoryboardsResponse,
  UploadResponse,
  VideoStyle,
  DeviceType,
} from "@/types";

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
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(
      "Could not reach the server. Is the backend running?",
      0,
    );
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

export const api = {
  uploadUrl: (url: string, signal?: AbortSignal) =>
    request<UploadResponse>("/upload", {
      method: "POST",
      body: JSON.stringify({ url }),
      ...(signal ? { signal } : {}),
    }),

  uploadScreenshots: (screenshots: string[], signal?: AbortSignal) =>
    request<UploadResponse>("/upload", {
      method: "POST",
      body: JSON.stringify({ screenshots }),
      ...(signal ? { signal } : {}),
    }),

  analyze: (uploadId: string, signal?: AbortSignal) =>
    request<AnalysisResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify({ uploadId }),
      ...(signal ? { signal } : {}),
    }),

  storyboards: (
    analysis: ProductAnalysis,
    style: VideoStyle,
    device: DeviceType,
    signal?: AbortSignal,
  ) =>
    request<StoryboardsResponse>("/storyboards", {
      method: "POST",
      body: JSON.stringify({ analysis, style, device }),
      ...(signal ? { signal } : {}),
    }),

  generate: (payload: {
    storyboard: Storyboard;
    style: VideoStyle;
    device: DeviceType;
    analysis: ProductAnalysis;
  }) =>
    request<GenerationResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  status: (jobId: string, signal?: AbortSignal) =>
    request<StatusResponse>(`/video/${jobId}/status`, {
      method: "GET",
      ...(signal ? { signal } : {}),
    }),

  downloadUrl: (jobId: string, format: "9x16" | "16x9" | "1x1"): string =>
    `${BASE_URL}/api/video/${jobId}/download/${format}`,
};
