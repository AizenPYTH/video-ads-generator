import type { DeviceType, VideoStyle } from "@/types";

export const STYLE_LABELS: Record<VideoStyle, { name: string; blurb: string }> = {
  apple_premium: {
    name: "Apple Premium",
    blurb: "Slow, confident moves. Deep gradients and a lot of air.",
  },
  dynamic_startup: {
    name: "Dynamic Startup",
    blurb: "Fast cuts, bouncy motion, saturated colour.",
  },
  minimal_dark: {
    name: "Minimal Dark",
    blurb: "Near-black canvas, linear easing, no ornament.",
  },
};

export const DEVICE_LABELS: Record<DeviceType, string> = {
  iphone_15_pro: "iPhone 15 Pro",
  iphone_15: "iPhone 15",
  iphone_14: "iPhone 14",
  android_phone: "Android Phone",
  ipad_pro: 'iPad Pro 11"',
  macbook_14: 'MacBook Pro 14"',
  macbook_16: 'MacBook Pro 16"',
  desktop_27: 'Studio Display 27"',
  desktop_monitor: "Desktop Monitor",
};

export function formatSeconds(value: number): string {
  if (value < 60) return `${Math.round(value)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1).replace(/\.0$/, "")}s`;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
