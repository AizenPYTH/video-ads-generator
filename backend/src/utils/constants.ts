import type { DeviceType, VideoStyle } from "../types";

export { FPS } from "../../remotion/src/engine/aspect";

/** Guardrails: Claude occasionally proposes durations outside a usable range. */
export const MIN_TOTAL_DURATION = 6;
export const MAX_TOTAL_DURATION = 20;
export const MIN_SCENE_DURATION = 0.8;
export const MAX_SCENE_DURATION = 6;

/**
 * Physical characteristics of each device mockup. `screenAspect` drives the
 * screenshot crop; `cornerRadius` / `bezel` are expressed as a fraction of the
 * device width so the frame scales cleanly into any composition size.
 */
export interface DeviceSpec {
  label: string;
  kind: "phone" | "tablet" | "laptop" | "monitor";
  screenAspect: number; // width / height
  bezelRatio: number; // bezel thickness / device width
  cornerRadiusRatio: number; // screen corner radius / device width
  hasNotch: boolean;
  hasHomeIndicator: boolean;
}

export const DEVICE_SPECS: Record<DeviceType, DeviceSpec> = {
  iphone_15_pro: {
    label: "iPhone 15 Pro",
    kind: "phone",
    screenAspect: 1179 / 2556,
    bezelRatio: 0.022,
    cornerRadiusRatio: 0.11,
    hasNotch: true,
    hasHomeIndicator: true,
  },
  iphone_15: {
    label: "iPhone 15",
    kind: "phone",
    screenAspect: 1179 / 2556,
    bezelRatio: 0.026,
    cornerRadiusRatio: 0.11,
    hasNotch: true,
    hasHomeIndicator: true,
  },
  iphone_14: {
    label: "iPhone 14",
    kind: "phone",
    screenAspect: 1170 / 2532,
    bezelRatio: 0.028,
    cornerRadiusRatio: 0.1,
    hasNotch: true,
    hasHomeIndicator: true,
  },
  android_phone: {
    label: "Android Phone",
    kind: "phone",
    screenAspect: 1080 / 2400,
    bezelRatio: 0.02,
    cornerRadiusRatio: 0.07,
    hasNotch: false,
    hasHomeIndicator: false,
  },
  ipad_pro: {
    label: 'iPad Pro 11"',
    kind: "tablet",
    screenAspect: 1668 / 2388,
    bezelRatio: 0.035,
    cornerRadiusRatio: 0.045,
    hasNotch: false,
    hasHomeIndicator: true,
  },
  macbook_14: {
    label: 'MacBook Pro 14"',
    kind: "laptop",
    screenAspect: 3024 / 1964,
    bezelRatio: 0.012,
    cornerRadiusRatio: 0.012,
    hasNotch: true,
    hasHomeIndicator: false,
  },
  macbook_16: {
    label: 'MacBook Pro 16"',
    kind: "laptop",
    screenAspect: 3456 / 2234,
    bezelRatio: 0.011,
    cornerRadiusRatio: 0.011,
    hasNotch: true,
    hasHomeIndicator: false,
  },
  desktop_27: {
    label: 'Studio Display 27"',
    kind: "monitor",
    screenAspect: 16 / 9,
    bezelRatio: 0.018,
    cornerRadiusRatio: 0.008,
    hasNotch: false,
    hasHomeIndicator: false,
  },
  desktop_monitor: {
    label: "Desktop Monitor",
    kind: "monitor",
    screenAspect: 16 / 9,
    bezelRatio: 0.02,
    cornerRadiusRatio: 0.006,
    hasNotch: false,
    hasHomeIndicator: false,
  },
};

export interface StyleSpec {
  label: string;
  description: string;
  /** Multiplier applied to every animation duration. */
  tempo: number;
  springDamping: number;
  springStiffness: number;
  fontFamily: string;
  titleWeight: number;
  letterSpacing: string;
  uppercase: boolean;
  glow: boolean;
  grain: boolean;
  vignette: boolean;
  /** Fallback backdrop when the analysis has no usable palette. */
  fallbackBackground: [string, string];
}

export const STYLE_SPECS: Record<VideoStyle, StyleSpec> = {
  apple_premium: {
    label: "Apple Premium",
    description:
      "Slow, confident moves. Deep gradients, soft glows, generous negative space.",
    tempo: 1.15,
    springDamping: 200,
    springStiffness: 90,
    fontFamily:
      '"SF Pro Display", -apple-system, "Helvetica Neue", Inter, system-ui, sans-serif',
    titleWeight: 600,
    letterSpacing: "-0.03em",
    uppercase: false,
    glow: true,
    grain: true,
    vignette: true,
    fallbackBackground: ["#0B0B0F", "#1A1A24"],
  },
  dynamic_startup: {
    label: "Dynamic Startup",
    description:
      "Fast, punchy, bouncy. Saturated gradients and hard-cut typography.",
    tempo: 0.7,
    springDamping: 14,
    springStiffness: 190,
    fontFamily: 'Inter, "Helvetica Neue", system-ui, sans-serif',
    titleWeight: 800,
    letterSpacing: "-0.02em",
    uppercase: false,
    glow: true,
    grain: false,
    vignette: false,
    fallbackBackground: ["#1B1036", "#3B0F6F"],
  },
  minimal_dark: {
    label: "Minimal Dark",
    description:
      "Near-black canvas, linear easing, precise geometry, no ornament.",
    tempo: 1,
    springDamping: 200,
    springStiffness: 120,
    fontFamily: 'Inter, "Helvetica Neue", system-ui, sans-serif',
    titleWeight: 500,
    letterSpacing: "0.01em",
    uppercase: true,
    glow: false,
    grain: false,
    vignette: false,
    fallbackBackground: ["#000000", "#0A0A0A"],
  },
};

export const DEFAULT_STYLE: VideoStyle = "apple_premium";
export const DEFAULT_DEVICE: DeviceType = "iphone_15_pro";
