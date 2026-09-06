/**
 * Domain types mirrored from `backend/src/types/index.ts`.
 *
 * Kept as a checked-in copy rather than a shared package: the two apps deploy
 * separately, and a copy that fails typecheck when the API changes is more
 * useful here than a build-time dependency between them.
 *
 * Original contract note:
 *
 * Timestamps are ISO-8601 strings rather than `Date`: everything here crosses
 * a JSON boundary at least once (HTTP response, Bull job payload, Remotion
 * input props) and `Date` does not survive that round trip.
 */

// ====== PRODUCT ANALYSIS ======

export type ProductType =
  | "saas"
  | "ecommerce"
  | "mobile_app"
  | "productivity"
  | "entertainment"
  | "education"
  | "finance"
  | "health"
  | "other";

export type Importance = "high" | "medium" | "low";

export interface Feature {
  title: string;
  description: string;
  importance: Importance;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export type Tone =
  | "professional"
  | "playful"
  | "minimal"
  | "bold"
  | "premium"
  | "casual";

export interface ProductAnalysis {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  features: Feature[];
  colorPalette: ColorPalette;
  tone: Tone;
  keyPoints: string[];
  suggestedNarrative: string;
  /** Asset ids available to the storyboard (see `AssetRef`). */
  assets: AssetRef[];
  sourceUrl?: string;
  createdAt: string;
}

/** A capture the video can display. `id` is what storyboards reference. */
export interface AssetRef {
  /** e.g. "screenshot_main", "screenshot_1", "screenshot_desktop_2" */
  id: string;
  /** Absolute URL served by the backend, loadable by headless Chrome. */
  url: string;
  width: number;
  height: number;
  /** Human label; also used in Claude prompts so it picks meaningful shots. */
  label: string;
  /** Which viewport it was captured on. Uploads are guessed from the ratio. */
  surface?: "mobile" | "desktop";
}

// ====== STORYBOARD ======

export type AnimationType =
  | "zoomIn"
  | "zoomOut"
  | "slideInLeft"
  | "slideInRight"
  | "slideInTop"
  | "slideInBottom"
  | "fadeIn"
  | "fadeOut"
  | "scaleUp"
  | "scaleDown"
  | "rotateIn"
  | "rotateOut"
  | "pulse"
  | "bounce"
  | "shake";

export type EasingType =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInQuad"
  | "easeOutQuad";

export type VisualEffect =
  | "particles"
  | "glitch"
  | "lightFlare"
  | "motionBlur"
  | "chromaShift";

export type TextPosition =
  | "top"
  | "center"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface DisplayAction {
  type: "display";
  target: string;
  animation: AnimationType;
  duration: number;
  easing: EasingType;
  delay?: number;
}

export interface AnimationAction {
  type: "animation";
  target?: string;
  from: string;
  to: string;
  animation: AnimationType;
  duration: number;
  easing: EasingType;
  delay?: number;
}

export interface TextAction {
  type: "text";
  content: string;
  position: TextPosition;
  animation: AnimationType;
  duration: number;
  delay?: number;
  fontSize?: number;
  color?: string;
}

export interface EffectAction {
  type: "effect";
  effect: VisualEffect;
  duration: number;
  delay?: number;
  intensity?: number;
}

export type SceneAction =
  | DisplayAction
  | AnimationAction
  | TextAction
  | EffectAction;

export interface TextOverlay {
  content: string;
  position: TextPosition;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  animation: AnimationType;
}

export interface Scene {
  id: number;
  name: string;
  duration: number;
  description: string;
  actions: SceneAction[];
  voiceOver?: string;
  textOverlay?: TextOverlay | null;
}

export type VideoStyle = "apple_premium" | "dynamic_startup" | "minimal_dark";

export type DeviceType =
  | "iphone_15_pro"
  | "iphone_15"
  | "iphone_14"
  | "macbook_14"
  | "macbook_16"
  | "desktop_27"
  | "desktop_monitor"
  | "ipad_pro"
  | "android_phone";

export interface Storyboard {
  id: string;
  title: string;
  concept: string;
  description: string;
  style: VideoStyle;
  device: DeviceType;
  totalDuration: number;
  scenes: Scene[];
}

// ====== VIDEO TEMPLATES ======

export type {
  AspectRatio,
  Brand,
  CallToAction,
  Copy,
  DeviceKind,
  ImageAsset,
  ScreenSurface,
  SlotSpec,
  TemplateCategory,
  TemplateDefinition,
  TemplateInput,
} from "@/video/engine/types";
import type { AspectRatio, ImageAsset } from "@/video/engine/types";

/** Links the ad closes on. All optional; the outro falls back to the captured page. */
export interface ProductLinks {
  productUrl?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
}

/** One App Store search hit, from `GET /api/appstore`. */
export interface AppStoreMatch {
  name: string;
  appStoreUrl: string;
  icon: string | null;
  publisher: string;
}

// ====== VIDEO GENERATION ======

/** What `POST /api/generate` takes. */
export interface GeneratePayload {
  templateId: string;
  aspects: AspectRatio[];
  input: {
    screens: ImageAsset[];
    logo: ImageAsset | null;
    brand: { name?: string; primary?: string; accent?: string };
    copy: { headline?: string; subline?: string };
    links: ProductLinks | null;
    durationSeconds?: number;
  };
  productName?: string;
}

export type JobStatus =
  | "pending"
  | "processing"
  | "rendering"
  | "exporting"
  | "completed"
  | "failed";

/** Public URLs keyed by aspect. Only the requested ones are present. */
export type VideoOutputs = Partial<Record<AspectRatio, string>>;

// ====== API ENVELOPES ======

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  uploadId: string;
  fileType: "url" | "screenshot" | "appstore";
  sourceUrl?: string;
  /** Absolute URL of the primary capture, for the client-side preview. */
  previewUrl: string;
  assets: AssetRef[];
  /** Uploaded logo, or the app icon when the source was a store listing. */
  logo?: ImageAsset;
  /** Store listing details when the source was an App Store URL. */
  app?: { name: string; publisher: string; appStoreUrl: string };
  pageTitle?: string;
  timestamp: string;
}

export interface AnalysisResponse {
  analysis: ProductAnalysis;
}

export interface StoryboardsResponse {
  storyboards: Storyboard[];
  selectedAnalysis: ProductAnalysis;
}

export interface GenerationResponse {
  jobId: string;
  status: "queued" | "processing";
  estimatedTime: number;
}

export interface StatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  message: string;
  outputs?: VideoOutputs;
  poster?: string;
  error?: string;
}
