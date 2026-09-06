import { useCallback, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/services/api";
import { useProjectStore } from "@/store/useProjectStore";
import { useJobStatus } from "./usePolling";
import { fileToDataUri, MAX_FILE_BYTES, MAX_FILES } from "@/utils/validation";
import { getTemplate } from "@/video/engine/registry";
import { completeInput } from "@/video/engine/placeholders";
import type { AssetRef, GeneratePayload, ImageAsset, TemplateInput, UploadResponse } from "@/types";

export type SourcePhase = "idle" | "capturing" | "enriching" | "error";

/**
 * Which captures a template wants first. A MacBook template pre-selects
 * the desktop captures, a phone template the mobile ones; the user can
 * still pick anything.
 */
export function preferredScreenIds(assets: AssetRef[], surface: "mobile" | "desktop" | "any", max: number): string[] {
  const matching = surface === "any" ? assets : assets.filter((asset) => asset.surface === surface);
  const pool = matching.length > 0 ? matching : assets;
  return pool.slice(0, max).map((asset) => asset.id);
}

/** What the outro will say, worked out client-side for the live preview. */
function previewCta(surface: "mobile" | "desktop" | "any", links: { productUrl?: string; appStoreUrl?: string; googlePlayUrl?: string }, name: string) {
  const clean = (value?: string) => (value ?? "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const store = clean(links.appStoreUrl) || clean(links.googlePlayUrl);
  const site = clean(links.productUrl);
  const target = surface === "mobile" ? store || site : site || store;
  if (!target) return null;
  const isAppStore = target === clean(links.appStoreUrl) && target !== "";
  const isPlay = target === clean(links.googlePlayUrl) && target !== "";
  return {
    headline: isAppStore ? "Available on the App Store" : isPlay ? "Get it on Google Play" : name ? `Visit ${name}` : "Visit the website",
    url: target,
    hint: isAppStore || isPlay ? "Scan to download" : "Scan to open",
    qrCode: null,
  };
}

export function useEditor(templateId: string) {
  const template = getTemplate(templateId);
  const store = useProjectStore;
  const state = useProjectStore();

  const [sourcePhase, setSourcePhase] = useState<SourcePhase>("idle");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { status, error: pollError } = useJobStatus(state.jobId);

  /** The exact props the renderer will get, minus the QR code. */
  const input: TemplateInput | null = useMemo(() => {
    if (!template) return null;
    const byId = new Map(state.assets.map((asset) => [asset.id, asset]));
    const screens: ImageAsset[] = state.screenIds
      .map((id) => byId.get(id))
      .filter((asset): asset is AssetRef => asset !== undefined)
      .map(({ id, url, width, height }) => ({ id, url, width, height }));
    return completeInput(template, {
      screens,
      logo: state.logo,
      brand: { name: state.brandName || "Your product", primary: state.primary, accent: state.accent },
      copy: { headline: state.headline, subline: state.subline },
      cta: template.slots.cta ? previewCta(template.slots.screens.surface, state.links, state.brandName) : null,
    });
  }, [template, state.assets, state.screenIds, state.logo, state.brandName, state.primary, state.accent, state.headline, state.subline, state.links]);

  const applyUpload = useCallback(
    (upload: UploadResponse, label: string) => {
      if (!template) return;
      const current = store.getState();
      current.setSource({
        label,
        uploadId: upload.uploadId,
        assets: upload.assets,
        screenIds: preferredScreenIds(upload.assets, template.slots.screens.surface, template.slots.screens.max),
      });
      if (upload.logo && !current.logo) current.setLogo(upload.logo);
      if (upload.app) {
        current.setBrand({ brandName: current.brandName || upload.app.name });
        current.setLinks({ appStoreUrl: upload.app.appStoreUrl });
      } else if (upload.sourceUrl) {
        current.setLinks({ productUrl: current.links.productUrl || upload.sourceUrl });
      }
      if (upload.pageTitle && !current.brandName && !upload.app) {
        current.setBrand({ brandName: upload.pageTitle.split(/[|\-–—:]/)[0]?.trim().slice(0, 40) ?? "" });
      }
    },
    [store, template],
  );

  /** Optional: brand name and palette from the page, never blocking. */
  const enrich = useCallback(
    async (uploadId: string, signal: AbortSignal) => {
      setSourcePhase("enriching");
      try {
        const { analysis } = await api.analyze(uploadId, signal);
        if (signal.aborted) return;
        const current = store.getState();
        current.setBrand({
          ...(current.brandName ? {} : { brandName: analysis.name }),
          primary: analysis.colorPalette.primary,
          accent: analysis.colorPalette.accent,
        });
        if (!current.headline && analysis.keyPoints[0]) {
          current.setCopy({ headline: analysis.keyPoints[0].slice(0, 60) });
        }
      } catch {
        // Enrichment is a bonus. The screens are already in.
      } finally {
        if (!signal.aborted) setSourcePhase("idle");
      }
    },
    [store],
  );

  const captureUrl = useCallback(
    async (url: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSourceError(null);
      setSourcePhase("capturing");
      try {
        const upload = await api.uploadUrl(url, controller.signal);
        if (controller.signal.aborted) return;
        applyUpload(upload, upload.app?.name ?? url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
        if (upload.fileType === "url") await enrich(upload.uploadId, controller.signal);
        else setSourcePhase("idle");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setSourceError(caught instanceof ApiError ? caught.message : "We could not open that link.");
        setSourcePhase("error");
      }
    },
    [applyUpload, enrich],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSourceError(null);
      const picked = files.slice(0, MAX_FILES);
      const tooBig = picked.find((file) => file.size > MAX_FILE_BYTES);
      if (tooBig) {
        setSourceError(`${tooBig.name} is over 8 MB. Compress it and try again.`);
        setSourcePhase("error");
        return;
      }
      setSourcePhase("capturing");
      try {
        const encoded = await Promise.all(picked.map(fileToDataUri));
        const upload = await api.uploadScreenshots(encoded, controller.signal);
        if (controller.signal.aborted) return;
        applyUpload(upload, picked.length === 1 ? (picked[0]?.name ?? "1 screenshot") : `${picked.length} screenshots`);
        setSourcePhase("idle");
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setSourceError(caught instanceof ApiError ? caught.message : "Upload failed.");
        setSourcePhase("error");
      }
    },
    [applyUpload],
  );

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      if (file.size > 4 * 1024 * 1024) return "The logo is over 4 MB.";
      try {
        const { logo } = await api.uploadLogo(await fileToDataUri(file));
        store.getState().setLogo(logo);
        return null;
      } catch (caught) {
        return caught instanceof ApiError ? caught.message : "Could not upload the logo.";
      }
    },
    [store],
  );

  const generate = useCallback(async () => {
    if (!template) return;
    const current = store.getState();
    setGenerateError(null);
    setStarting(true);
    const byId = new Map(current.assets.map((asset) => [asset.id, asset]));
    const payload: GeneratePayload = {
      templateId: template.id,
      aspects: current.aspects,
      input: {
        screens: current.screenIds
          .map((id) => byId.get(id))
          .filter((asset): asset is AssetRef => asset !== undefined)
          .map(({ id, url, width, height }) => ({ id, url, width, height })),
        logo: current.logo,
        brand: { name: current.brandName, primary: current.primary, accent: current.accent },
        copy: { headline: current.headline, subline: current.subline },
        links: current.links,
      },
      productName: current.brandName,
    };
    try {
      const response = await api.generate(payload);
      current.setJobId(response.jobId);
      setEstimate(response.estimatedTime);
    } catch (caught) {
      setGenerateError(caught instanceof ApiError ? caught.message : "Could not start the render.");
    } finally {
      setStarting(false);
    }
  }, [store, template]);

  const missing: string[] = [];
  if (template) {
    if (state.screenIds.length < template.slots.screens.min) {
      missing.push(template.slots.screens.min === 1 ? "at least one screenshot" : `at least ${template.slots.screens.min} screenshots`);
    }
    if (template.slots.logo === "required" && !state.logo) missing.push("a logo");
    if (state.aspects.length === 0) missing.push("a format");
  }

  return {
    template,
    input,
    sourcePhase,
    sourceError,
    generateError,
    starting,
    estimate,
    status,
    pollError,
    missing,
    captureUrl,
    uploadFiles,
    uploadLogo,
    generate,
    cancelSource: () => {
      abortRef.current?.abort();
      setSourcePhase("idle");
    },
  };
}
