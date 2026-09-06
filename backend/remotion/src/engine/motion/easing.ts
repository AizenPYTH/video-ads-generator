import { Easing } from "remotion";

export type EasingFn = (t: number) => number;

/**
 * The house curves. A template never writes a bezier by hand: naming them
 * keeps ten templates feeling like one studio, and lets a curve be tuned in
 * one place when a move reads wrong.
 */
export const ease = {
  linear: Easing.linear as EasingFn,

  /** Fast start, very long tail - the expo-out of a camera coming to rest. */
  cinematicOut: Easing.bezier(0.16, 1, 0.3, 1) as EasingFn,
  /** Slow start, hard finish - a move that commits. */
  cinematicIn: Easing.bezier(0.7, 0, 0.84, 0) as EasingFn,
  /** Slow at both ends, quick through the middle - a lid, a turn. */
  cinematicInOut: Easing.bezier(0.83, 0, 0.17, 1) as EasingFn,

  /** Symmetric and unhurried - drifts, breathing, parallax. */
  smooth: Easing.bezier(0.45, 0, 0.55, 1) as EasingFn,

  /** Arrives, overshoots a touch, settles. Objects landing. */
  settle: Easing.out(Easing.back(1.15)) as EasingFn,
  /** Pulls back before it goes. Objects leaving with intent. */
  anticipate: Easing.in(Easing.back(1.4)) as EasingFn,

  /** Near-instant with a soft landing - screen swaps, cuts. */
  snap: Easing.bezier(0.2, 0.9, 0.2, 1) as EasingFn,
} as const;

export const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

/** 0..1 through [from, to], clamped. `to <= from` reads as already done. */
export function progress(frame: number, from: number, to: number): number {
  if (to <= from) return frame >= to ? 1 : 0;
  return clamp01((frame - from) / (to - from));
}

/** Eased progress through [from, to]. */
export function tween(
  frame: number,
  from: number,
  to: number,
  easing: EasingFn = ease.cinematicOut,
): number {
  return easing(progress(frame, from, to));
}

/** Linear blend. */
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Delay for the n-th of a group so entrances cascade instead of arriving as
 * a wall. Capped so a long list does not push the last item past the scene.
 */
export function stagger(index: number, step: number, cap = Number.POSITIVE_INFINITY): number {
  return Math.min(cap, index * step);
}

/**
 * A slow oscillation that never lines up with another one: give each axis
 * a different period from this list and the idle never reads as a loop.
 */
export function drift(seconds: number, period: number, amplitude: number, phase = 0): number {
  return Math.sin(((seconds + phase) * Math.PI * 2) / period) * amplitude;
}

/** Idle-motion periods that are pairwise coprime-ish, in seconds. */
export const DRIFT_PERIODS = { slow: 11, medium: 7, fast: 5, breath: 4.3 } as const;
