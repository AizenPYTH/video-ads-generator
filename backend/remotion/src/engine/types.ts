/**
 * The contract between a template, the editor that fills it and the renderer
 * that plays it.
 *
 * Everything in `engine/` and `templates/` must stay importable from a
 * browser: no `process.env`, no `node:*`, no imports outside `remotion/src`.
 * The same code is bundled by Remotion on the server and played by
 * `@remotion/player` in the frontend.
 */
import type React from "react";

export type AspectRatio = "9:16" | "16:9" | "1:1";

export type DeviceKind = "macbook" | "iphone" | "monitor";

export type TemplateCategory = "laptop" | "phone" | "desktop" | "duo" | "logo";

/** Which capture surface a template's screens expect. */
export type ScreenSurface = "mobile" | "desktop" | "any";

/** An image the renderer can load: served by the backend, or a data URI. */
export interface ImageAsset {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface CallToAction {
  headline: string;
  /** Shown verbatim - already stripped of scheme and trailing slash. */
  url: string;
  hint: string;
  /** PNG data URI, or null when none could be generated. */
  qrCode: string | null;
}

export interface Brand {
  name: string;
  /** Hex colours. Templates that declare `slots.accent` tint their world with them. */
  primary: string;
  accent: string;
}

export interface Copy {
  headline: string;
  subline: string;
}

/**
 * What a template accepts. The editor shows exactly these controls and the
 * backend validates against them, so a template never has to defend against
 * content it did not ask for.
 */
export interface SlotSpec {
  screens: { min: number; max: number; surface: ScreenSurface };
  logo: "required" | "optional" | "none";
  headline: boolean;
  subline: boolean;
  cta: boolean;
  accent: boolean;
  /** Seconds, when the template can stretch. `null` means fixed. */
  duration: { min: number; max: number } | null;
}

/**
 * The content injected into a template - these are the Remotion input props,
 * identical in the server render and the browser preview.
 *
 * A type alias rather than an interface: Remotion needs composition props to
 * be assignable to `Record<string, unknown>`, and only aliases get the
 * implicit index signature that makes that true.
 */
export type TemplateInput = {
  /** In the order the user chose. Never empty: the backend fills placeholders. */
  screens: ImageAsset[];
  logo: ImageAsset | null;
  brand: Brand;
  copy: Copy;
  cta: CallToAction | null;
  /** Only honoured when `slots.duration` is set. */
  durationInFrames?: number;
};

export interface TemplateDefinition {
  /** Stable. Doubles as the composition id prefix, so no spaces. */
  id: string;
  name: string;
  /** One line for the gallery card. */
  tagline: string;
  category: TemplateCategory;
  devices: DeviceKind[];
  /** At `FPS`. Deterministic: the template *is* its animation. */
  durationInFrames: number;
  /** The compositions actually authored. The editor offers nothing else. */
  aspects: AspectRatio[];
  slots: SlotSpec;
  component: React.FC<TemplateInput>;
}
