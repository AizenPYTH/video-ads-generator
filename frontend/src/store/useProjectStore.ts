import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AspectRatio, AssetRef, ImageAsset, ProductLinks } from "@/types";

/**
 * One project: a template, and what the user has put in it.
 *
 * Everything the live preview reads lives here, so a change to any field
 * re-renders the Player without a round trip. Session-scoped: captures
 * expire server side, so a week-old restore would only produce 404s.
 */
export interface ProjectState {
  templateId: string | null;
  aspects: AspectRatio[];

  /** Where the screens came from, for the label under the source field. */
  sourceLabel: string | null;
  uploadId: string | null;
  /** Every capture available, in capture order. */
  assets: AssetRef[];
  /** The ids of the ones in the template, in the order the user chose. */
  screenIds: string[];

  logo: ImageAsset | null;
  brandName: string;
  primary: string;
  accent: string;
  headline: string;
  subline: string;
  links: ProductLinks;

  jobId: string | null;

  setTemplate: (templateId: string, aspects: AspectRatio[]) => void;
  setAspects: (aspects: AspectRatio[]) => void;
  setSource: (input: { label: string; uploadId: string; assets: AssetRef[]; screenIds: string[] }) => void;
  setScreenIds: (ids: string[]) => void;
  setLogo: (logo: ImageAsset | null) => void;
  setBrand: (patch: Partial<Pick<ProjectState, "brandName" | "primary" | "accent">>) => void;
  setCopy: (patch: Partial<Pick<ProjectState, "headline" | "subline">>) => void;
  setLinks: (patch: Partial<ProductLinks>) => void;
  setJobId: (jobId: string | null) => void;
  /** Clears the content, keeps the template. */
  clearContent: () => void;
  reset: () => void;
}

const content = {
  sourceLabel: null,
  uploadId: null,
  assets: [] as AssetRef[],
  screenIds: [] as string[],
  logo: null,
  brandName: "",
  primary: "#5b6cff",
  accent: "#22d3ee",
  headline: "",
  subline: "",
  links: {} as ProductLinks,
  jobId: null,
};

const initial = {
  templateId: null,
  aspects: ["9:16"] as AspectRatio[],
  ...content,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initial,
      setTemplate: (templateId, aspects) => set({ templateId, aspects, jobId: null }),
      setAspects: (aspects) => set({ aspects }),
      setSource: ({ label, uploadId, assets, screenIds }) =>
        set({ sourceLabel: label, uploadId, assets, screenIds, jobId: null }),
      setScreenIds: (screenIds) => set({ screenIds, jobId: null }),
      setLogo: (logo) => set({ logo, jobId: null }),
      setBrand: (patch) => set({ ...patch, jobId: null }),
      setCopy: (patch) => set({ ...patch, jobId: null }),
      setLinks: (patch) => set((state) => ({ links: { ...state.links, ...patch }, jobId: null })),
      setJobId: (jobId) => set({ jobId }),
      clearContent: () => set({ ...content }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "reel-project-v2",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
