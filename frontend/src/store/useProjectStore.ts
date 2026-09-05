import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  DeviceType,
  ProductAnalysis,
  Storyboard,
  UploadResponse,
  VideoStyle,
} from "@/types";

interface ProjectState {
  upload: UploadResponse | null;
  analysis: ProductAnalysis | null;
  storyboards: Storyboard[];
  selectedStoryboardId: string | null;
  style: VideoStyle;
  device: DeviceType;
  jobId: string | null;

  setUpload: (upload: UploadResponse | null) => void;
  setAnalysis: (analysis: ProductAnalysis | null) => void;
  setStoryboards: (storyboards: Storyboard[]) => void;
  selectStoryboard: (id: string | null) => void;
  setStyle: (style: VideoStyle) => void;
  setDevice: (device: DeviceType) => void;
  setJobId: (jobId: string | null) => void;
  reset: () => void;
}

const initial = {
  upload: null,
  analysis: null,
  storyboards: [] as Storyboard[],
  selectedStoryboardId: null,
  style: "apple_premium" as VideoStyle,
  device: "iphone_15_pro" as DeviceType,
  jobId: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initial,

      setUpload: (upload) =>
        // A new capture invalidates everything downstream of it.
        set({
          upload,
          analysis: null,
          storyboards: [],
          selectedStoryboardId: null,
          jobId: null,
        }),
      setAnalysis: (analysis) => set({ analysis }),
      setStoryboards: (storyboards) =>
        set({ storyboards, selectedStoryboardId: null }),
      selectStoryboard: (selectedStoryboardId) => set({ selectedStoryboardId }),
      setStyle: (style) => set({ style }),
      setDevice: (device) => set({ device }),
      setJobId: (jobId) => set({ jobId }),
      reset: () => set({ ...initial }),
    }),
    {
      name: "reel-project",
      // Session-scoped: captures expire server-side, so a week-old restore
      // would only produce confusing 404s.
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export function useSelectedStoryboard(): Storyboard | null {
  return useProjectStore(
    (state) =>
      state.storyboards.find(
        (storyboard) => storyboard.id === state.selectedStoryboardId,
      ) ?? null,
  );
}
