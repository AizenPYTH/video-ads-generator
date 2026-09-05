/**
 * Timing for the three-act device ad, in frames.
 *
 * The brief's reference shape is a 10s ad: 2s of intro, 5s of content, 3s of
 * outro with the call to action arriving 1.5s before the end. Storyboards do
 * not always come back at exactly 10s, so the acts are expressed as a share
 * of the total with the reference values as caps - a 10s ad lands on 2/5/3
 * exactly, a 6s one compresses to 1.2/3/1.8, and a 20s one spends the extra
 * time where it belongs, on the content.
 */

export const INTRO_SECONDS = 2;
export const OUTRO_SECONDS = 3;
export const CTA_SECONDS = 1.5;

/** Seconds each screenshot holds before the next one crossfades in. */
export const SLIDE_SECONDS = { handheld: 1.5, wide: 1.2 } as const;

export interface Phases {
  /** Frame the intro ends and the content begins. */
  introEnd: number;
  /** Frame the content ends and the outro begins. */
  contentEnd: number;
  /** Frame the CTA overlay starts fading in. Infinity when there is none. */
  ctaStart: number;
  /** Frame the whole ad ends - always `durationInFrames`. */
  outroEnd: number;
}

export function phasesFor(
  durationInFrames: number,
  fps: number,
  hasCta: boolean,
): Phases {
  const total = Math.max(1, Math.round(durationInFrames));

  // Never let the acts eat the whole ad: content keeps at least a third.
  const intro = Math.min(Math.round(INTRO_SECONDS * fps), Math.floor(total * 0.2));
  const outro = Math.min(Math.round(OUTRO_SECONDS * fps), Math.floor(total * 0.3));

  const introEnd = Math.max(1, intro);
  const contentEnd = Math.max(introEnd + 1, total - outro);

  const ctaLength = Math.min(
    Math.round(CTA_SECONDS * fps),
    Math.max(1, Math.round((total - contentEnd) * 0.5)),
  );

  return {
    introEnd,
    contentEnd,
    ctaStart: hasCta ? Math.max(contentEnd, total - ctaLength) : Number.POSITIVE_INFINITY,
    outroEnd: total,
  };
}

/** 0..1 through the named act, clamped at both ends. */
export function progressIn(frame: number, from: number, to: number): number {
  if (to <= from) return frame >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (frame - from) / (to - from)));
}

export interface Slide {
  /** Frame this slide starts, absolute. */
  start: number;
  /** Frames it is on screen, before the crossfade into the next one. */
  length: number;
  /** Index into the asset list. */
  index: number;
}

/**
 * Fills the content act with screenshots, cycling the available captures.
 *
 * `slideSeconds` is a target, not a rule: the act is divided into whole
 * slides of equal length, so five seconds at 1.5s a slide is three slides of
 * 1.67s rather than three and a stub. A carousel that flashes a two-frame
 * sliver before the outro looks broken; one that holds a beat longer does
 * not.
 */
export function slidesFor(
  phases: Pick<Phases, "introEnd" | "contentEnd">,
  fps: number,
  slideSeconds: number,
  assetCount: number,
): Slide[] {
  const span = Math.max(1, phases.contentEnd - phases.introEnd);
  const count = Math.max(1, Math.min(assetCount, 8));
  const step = Math.max(1, Math.round(slideSeconds * fps));
  const slots = Math.max(1, Math.round(span / step));

  const slides: Slide[] = [];
  for (let slot = 0; slot < slots; slot += 1) {
    const start = phases.introEnd + Math.round((span * slot) / slots);
    const end =
      slot === slots - 1
        ? phases.contentEnd
        : phases.introEnd + Math.round((span * (slot + 1)) / slots);
    slides.push({ start, length: Math.max(1, end - start), index: slot % count });
  }
  return slides;
}
