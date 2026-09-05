import { STYLE_SPECS, type StyleSpec } from "../../src/utils/constants";
import type { ColorPalette, VideoStyle } from "../../src/types";

export interface Theme extends StyleSpec {
  palette: ColorPalette;
  backdrop: string;
  glowA: string;
  glowB: string;
  overlayText: string;
  chipBackground: string;
  chipBorder: string;
  deviceShadow: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const value = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(value)) return [90, 100, 255];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Darkens a colour toward black; used to keep backdrops behind the device. */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (channel: number): number =>
    Math.round(Math.max(0, channel * (1 - amount)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

export function buildTheme(style: VideoStyle, palette: ColorPalette): Theme {
  const spec = STYLE_SPECS[style];

  // Marketing sites are usually light; a light backdrop would wash out the
  // device, so the video backdrop is always derived dark from the brand hue.
  const base =
    relativeLuminance(palette.background) > 0.4
      ? darken(palette.primary, 0.82)
      : darken(palette.background, 0.25);

  const backdrop =
    style === "minimal_dark"
      ? `linear-gradient(180deg, ${spec.fallbackBackground[0]} 0%, ${spec.fallbackBackground[1]} 100%)`
      : `linear-gradient(160deg, ${base} 0%, ${darken(palette.primary, 0.72)} 55%, ${base} 100%)`;

  return {
    ...spec,
    palette,
    backdrop,
    glowA: rgba(palette.primary, style === "minimal_dark" ? 0.12 : 0.45),
    glowB: rgba(palette.accent, style === "minimal_dark" ? 0.08 : 0.35),
    overlayText: "#ffffff",
    chipBackground: rgba(palette.accent, 0.16),
    chipBorder: rgba(palette.accent, 0.42),
    deviceShadow:
      style === "minimal_dark"
        ? "0 60px 140px rgba(0,0,0,0.75)"
        : `0 60px 160px ${rgba(palette.primary, 0.35)}, 0 24px 60px rgba(0,0,0,0.6)`,
  };
}
