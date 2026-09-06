import React from "react";
import { useCurrentFrame } from "remotion";
import { ease, progress, type EasingFn } from "../motion/easing";
import { Screen } from "./Screen";
import type { ImageAsset } from "../types";

export type ScreenTransition =
  | "crossfade"
  | "slide-left"
  | "slide-up"
  | "parallax"
  | "zoom"
  | "cut";

export interface ScreenSlot {
  index: number;
  /** Absolute frame this screen becomes current. */
  start: number;
  /** Frames until the next one takes over. */
  length: number;
}

/**
 * Divides [from, to] evenly between the screens. `holdFrames` is a target,
 * not a rule: the window is split into whole slots of equal length so five
 * seconds at 1.5s a screen is three screens of 1.67s rather than three and
 * a stub. Caps the count at `screens.length` so nothing repeats unless
 * `loop` is set.
 */
export function scheduleScreens(
  count: number,
  from: number,
  to: number,
  holdFrames: number,
  loop = true,
): ScreenSlot[] {
  const span = Math.max(1, to - from);
  const available = Math.max(1, count);
  const wanted = Math.max(1, Math.round(span / Math.max(1, holdFrames)));
  const slots = loop ? wanted : Math.min(wanted, available);

  const result: ScreenSlot[] = [];
  for (let slot = 0; slot < slots; slot += 1) {
    const start = from + Math.round((span * slot) / slots);
    const end = slot === slots - 1 ? to : from + Math.round((span * (slot + 1)) / slots);
    result.push({ index: slot % available, start, length: Math.max(1, end - start) });
  }
  return result;
}

export interface ScreenSequenceProps {
  screens: ImageAsset[];
  width: number;
  height: number;
  /** Window the sequence plays in, absolute frames. */
  from: number;
  to: number;
  /** Target frames per screen. */
  hold: number;
  transition?: ScreenTransition;
  /** Frames the transition takes. */
  transitionFrames?: number;
  /** How far each screen scrolls during its hold, 0..1. */
  scrollAmount?: number;
  scrollEasing?: EasingFn;
  /** Slow zoom across each hold, e.g. 1.04. */
  driftZoom?: number;
  /** Do not cycle back to the first screen when there are more slots than screens. */
  noLoop?: boolean;
  /** Applied on top of the whole sequence. */
  dim?: number;
}

/**
 * Which screenshot is on the screen, and how it hands over to the next one.
 *
 * Only the current screen and, mid-transition, the next one are rendered.
 * Every other capture renders nothing rather than rendering invisible -
 * eight decoded full-page captures at once is what runs a small container
 * out of memory.
 */
export const ScreenSequence: React.FC<ScreenSequenceProps> = ({
  screens,
  width,
  height,
  from,
  to,
  hold,
  transition = "crossfade",
  transitionFrames = 10,
  scrollAmount = 1,
  scrollEasing = ease.smooth,
  driftZoom = 1,
  noLoop = false,
  dim = 0,
}) => {
  const frame = useCurrentFrame();
  if (screens.length === 0) return null;

  const slots = scheduleScreens(screens.length, from, to, hold, !noLoop);
  const clamped = Math.min(Math.max(frame, from), to - 1);

  let current = slots[0] as ScreenSlot;
  for (const slot of slots) {
    if (clamped >= slot.start) current = slot;
  }
  const position = slots.indexOf(current);
  const next = slots[position + 1] ?? null;

  const local = clamped - current.start;
  const scroll = scrollEasing(progress(local, 0, current.length)) * scrollAmount;
  const zoom = 1 + (driftZoom - 1) * progress(local, 0, current.length);

  // The transition into `next` starts `transitionFrames` before its start.
  const t =
    next && transition !== "cut"
      ? ease.cinematicInOut(progress(clamped, next.start - transitionFrames, next.start))
      : 0;

  const currentAsset = screens[current.index % screens.length] as ImageAsset;
  const nextAsset = next ? (screens[next.index % screens.length] as ImageAsset) : null;

  const layers: React.ReactNode[] = [];

  const outgoing = outgoingStyle(transition, t);
  layers.push(
    <Screen
      key={`s-${current.start}`}
      asset={currentAsset}
      width={width}
      height={height}
      scroll={scroll}
      zoom={zoom * outgoing.zoom}
      shiftX={outgoing.shiftX}
      shiftY={outgoing.shiftY}
      opacity={outgoing.opacity}
      dim={outgoing.dim}
      blur={outgoing.blur}
    />,
  );

  if (nextAsset && t > 0) {
    const incoming = incomingStyle(transition, t);
    layers.push(
      <Screen
        key={`s-${next?.start}`}
        asset={nextAsset}
        width={width}
        height={height}
        scroll={0}
        zoom={incoming.zoom}
        shiftX={incoming.shiftX}
        shiftY={incoming.shiftY}
        opacity={incoming.opacity}
        dim={incoming.dim}
      />,
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {layers}
      {dim > 0 ? (
        <div style={{ position: "absolute", inset: 0, backgroundColor: `rgba(0,0,0,${dim})` }} />
      ) : null}
    </div>
  );
};

interface LayerStyle {
  opacity: number;
  shiftX: number;
  shiftY: number;
  zoom: number;
  dim: number;
  blur: number;
}

function outgoingStyle(kind: ScreenTransition, t: number): LayerStyle {
  const base: LayerStyle = { opacity: 1, shiftX: 0, shiftY: 0, zoom: 1, dim: 0, blur: 0 };
  switch (kind) {
    case "crossfade":
      return { ...base, opacity: 1 - t };
    case "slide-left":
      return { ...base, shiftX: -t, dim: t * 0.3 };
    case "slide-up":
      return { ...base, shiftY: -t, dim: t * 0.3 };
    case "parallax":
      // The old screen moves at half speed under the new one and darkens.
      return { ...base, shiftX: -t * 0.45, dim: t * 0.55, blur: t * 6 };
    case "zoom":
      return { ...base, opacity: 1 - t, zoom: 1 + t * 0.06 };
    case "cut":
    default:
      return base;
  }
}

function incomingStyle(kind: ScreenTransition, t: number): LayerStyle {
  const base: LayerStyle = { opacity: 1, shiftX: 0, shiftY: 0, zoom: 1, dim: 0, blur: 0 };
  switch (kind) {
    case "crossfade":
      return { ...base, opacity: t };
    case "slide-left":
      return { ...base, shiftX: 1 - t };
    case "slide-up":
      return { ...base, shiftY: 1 - t };
    case "parallax":
      return { ...base, shiftX: 1 - t };
    case "zoom":
      return { ...base, opacity: t, zoom: 1.12 - t * 0.12 };
    case "cut":
    default:
      return base;
  }
}
