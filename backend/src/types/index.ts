/**
 * Domain types shared by the API, the job queue and the Remotion compositions.
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
  /** e.g. "screenshot_main", "screenshot_1", "screenshot_2" */
  id: string;
  /** Absolute URL served by the backend, loadable by headless Chrome. */
  url: string;
  width: number;
  height: number;
  /** Human label used in Claude prompts so it picks meaningful shots. */
  label: string;
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

// ====== LINKS SHOWN AT THE END OF THE AD ======

/**
 * Where the viewer should go next. Every field is optional because the run
 * has to work when the user gives us nothing but a URL - `productUrl` then
 * falls back to the page we captured.
 */
export interface ProductMetadata {
  productUrl?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  appName?: string;
}

/**
 * The resolved call to action the renderer draws: one headline, one link and
 * (when generation succeeded) one QR code. Resolved on the server so the
 * composition never has to know which store a device belongs to.
 */
export interface CallToAction {
  headline: string;
  /** Displayed verbatim, so it is normalised before it gets here. */
  url: string;
  hint: string;
  /** PNG data URI, or null when the code could not be generated. */
  qrCode: string | null;
}

// ====== VIDEO GENERATION ======

export type AspectRatio = "9:16" | "16:9" | "1:1";

export interface GenerationRequest {
  storyboard: Storyboard;
  style: VideoStyle;
  device: DeviceType;
  productAnalysis: ProductAnalysis;
  /** Links the ad closes on. Absent on jobs queued before this existed. */
  metadata?: ProductMetadata;
}

export type JobStatus =
  | "pending"
  | "processing"
  | "rendering"
  | "exporting"
  | "completed"
  | "failed";

export interface VideoOutputs {
  ratio_9_16: string;
  ratio_16_9: string;
  ratio_1_1: string;
}

export interface VideoJob {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  request: GenerationRequest;
  outputs?: VideoOutputs;
  poster?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
}

// ====== API ENVELOPES ======

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  uploadId: string;
  fileType: "url" | "screenshot";
  sourceUrl?: string;
  /** Absolute URL of the primary capture, for the client-side preview. */
  previewUrl: string;
  assets: AssetRef[];
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

// ====== REMOTION INPUT PROPS ======

/**
 * Declared as a type alias, not an interface: Remotion requires composition
 * props to be assignable to `Record<string, unknown>`, and only type aliases
 * get the implicit index signature that makes that true.
 */
export type VideoCompositionProps = {
  storyboard: Storyboard;
  style: VideoStyle;
  device: DeviceType;
  palette: ColorPalette;
  assets: AssetRef[];
  productName: string;
  /** null when we have no link worth showing - the outro then just fades. */
  cta: CallToAction | null;
};
