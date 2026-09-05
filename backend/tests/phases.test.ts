import { describe, expect, it } from "vitest";
import {
  CTA_SECONDS,
  INTRO_SECONDS,
  OUTRO_SECONDS,
  phasesFor,
  progressIn,
  slidesFor,
} from "../remotion/src/phases";

const FPS = 30;

describe("phasesFor", () => {
  it("lands the reference ten-second ad on 2s / 5s / 3s", () => {
    const phases = phasesFor(10 * FPS, FPS, true);
    expect(phases.introEnd).toBe(INTRO_SECONDS * FPS);
    expect(phases.contentEnd).toBe((INTRO_SECONDS + 5) * FPS);
    expect(phases.outroEnd).toBe(10 * FPS);
    expect(phases.ctaStart).toBe(10 * FPS - CTA_SECONDS * FPS);
  });

  it("spends extra length on the content, not on the acts", () => {
    const phases = phasesFor(20 * FPS, FPS, true);
    expect(phases.introEnd).toBe(INTRO_SECONDS * FPS);
    expect(phases.outroEnd - phases.contentEnd).toBe(OUTRO_SECONDS * FPS);
    expect(phases.contentEnd - phases.introEnd).toBe(15 * FPS);
  });

  it("compresses the acts proportionally when the ad is short", () => {
    const phases = phasesFor(6 * FPS, FPS, true);
    expect(phases.introEnd).toBe(36); // 20% of 180
    expect(phases.contentEnd).toBe(180 - 54); // 30% of 180 left for the outro
  });

  it("keeps the acts ordered and inside the ad at every plausible length", () => {
    for (let seconds = 1; seconds <= 30; seconds += 0.5) {
      const total = Math.round(seconds * FPS);
      const phases = phasesFor(total, FPS, true);
      expect(phases.introEnd).toBeGreaterThan(0);
      expect(phases.contentEnd).toBeGreaterThan(phases.introEnd);
      expect(phases.outroEnd).toBe(total);
      expect(phases.contentEnd).toBeLessThanOrEqual(total);
      expect(phases.ctaStart).toBeGreaterThanOrEqual(phases.contentEnd);
      expect(phases.ctaStart).toBeLessThan(total);
    }
  });

  it("never schedules a CTA when there is no link to show", () => {
    expect(phasesFor(10 * FPS, FPS, false).ctaStart).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});

describe("progressIn", () => {
  it("clamps at both ends", () => {
    expect(progressIn(-5, 0, 10)).toBe(0);
    expect(progressIn(5, 0, 10)).toBe(0.5);
    expect(progressIn(50, 0, 10)).toBe(1);
  });

  it("treats an empty window as already finished", () => {
    expect(progressIn(10, 10, 10)).toBe(1);
    expect(progressIn(9, 10, 10)).toBe(0);
  });
});

describe("slidesFor", () => {
  const phases = { introEnd: 60, contentEnd: 210 };

  it("covers the content act exactly, with no gaps and no overhang", () => {
    const slides = slidesFor(phases, FPS, 1.5, 3);
    expect(slides[0]?.start).toBe(60);
    const last = slides[slides.length - 1];
    expect((last?.start ?? 0) + (last?.length ?? 0)).toBe(210);
    for (let i = 1; i < slides.length; i += 1) {
      expect(slides[i]!.start).toBe(slides[i - 1]!.start + slides[i - 1]!.length);
    }
  });

  it("cycles the captures when the content outlasts them", () => {
    // 150 frames of content at ~1.5s a slide is three slides, not 3.33: the
    // act is divided evenly, so each one runs slightly long rather than the
    // last one being cut short.
    const slides = slidesFor(phases, FPS, 1.5, 2);
    expect(slides.map((slide) => slide.index)).toEqual([0, 1, 0]);
    expect(slides.map((slide) => slide.length)).toEqual([50, 50, 50]);
  });

  it("holds a single capture for the whole act rather than flickering", () => {
    const slides = slidesFor(phases, FPS, 1.5, 1);
    expect(new Set(slides.map((slide) => slide.index))).toEqual(new Set([0]));
  });

  it("still produces one usable slide when there are no captures at all", () => {
    const slides = slidesFor(phases, FPS, 1.5, 0);
    expect(slides.length).toBeGreaterThan(0);
    expect(slides.every((slide) => slide.length >= 1)).toBe(true);
  });

  it("never emits a zero-length slide, however the act divides", () => {
    for (let span = 1; span <= 400; span += 1) {
      for (const seconds of [1.2, 1.5]) {
        const slides = slidesFor({ introEnd: 0, contentEnd: span }, FPS, seconds, 3);
        expect(slides.every((slide) => slide.length >= 1)).toBe(true);
        const last = slides[slides.length - 1];
        expect((last?.start ?? 0) + (last?.length ?? 0)).toBe(span);
      }
    }
  });
});
