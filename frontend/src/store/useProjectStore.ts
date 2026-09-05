import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DeviceType,
  ProductAnalysis,
  Storyboard,
  VideoStyle,
} from "@/types";

/**
 * One run: a link goes in, a video comes out. Everything here is derived
 * automatically unless the user opens the options panel and overrides it -
 * `styleTouched` / `deviceTouched` record that so a fresh analysis never
 * silently undoes a deliberate choice.
 */
interface ProjectState {
  sourceLabel: string | null;
  analysis: ProductAnalysis | null;
  storyboards: Storyboard[];
  storyboardId: string | null;
  style: VideoStyle;
  device: DeviceType;
  styleTouched: boolean;
  deviceTouched: boolean;
  jobId: string | null;

  setSourceLabel: (label: string | null) => void;
  setAnalysis: (analysis: ProductAnalysis | null) => void;
  setStoryboards: (storyboards: Storyboard[]) => void;
  setStoryboardId: (id: string | null) => void;
  setStyle: (style: VideoStyle, touched?: boolean) => void;
  setDevice: (device: DeviceType, touched?: boolean) => void;
  setJobId: (jobId: string | null) => void;
  reset: () => void;
}

const initial = {
  sourceLabel: null,
  analysis: null,
  storyboards: [] as Storyboard[],
  storyboardId: null,
  style: "apple_premium" as VideoStyle,
  device: "iphone_15_pro" as DeviceType,
  styleTouched: false,
  deviceTouched: false,
  jobId: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initial,
      setSourceLabel: (sourceLabel) => set({ sourceLabel }),
      setAnalysis: (analysis) => set({ analysis }),
      setStoryboards: (storyboards) => set({ storyboards }),
      setStoryboardId: (storyboardId) => set({ storyboardId }),
      setStyle: (style, touched = true) =>
        set({ style, ...(touched ? { styleTouched: true } : {}) }),
      setDevice: (device, touched = true) =>
        set({ device, ...(touched ? { deviceTouched: true } : {}) }),
      setJobId: (jobId) => set({ jobId }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "reel-project",
      // Session-scoped: captures expire server side, so a week-old restore
      // would only produce confusing 404s.
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export function useSelectedStoryboard(): Storyboard | null {
  return useProjectStore(
    (state) =>
      state.storyboards.find(
        (storyboard) => storyboard.id === state.storyboardId,
      ) ?? null,
  );
}
