import { Easing, interpolate } from "remotion";
import type { AnimationType, EasingType } from "../../src/types";

export function easingFor(easing: EasingType | undefined) {
  switch (easing) {
    case "linear":
      return Easing.linear;
    case "easeIn":
      return Easing.in(Easing.ease);
    case "easeInOut":
      return Easing.inOut(Easing.ease);
    case "easeInCubic":
      return Easing.in(Easing.cubic);
    case "easeOutCubic":
      return Easing.out(Easing.cubic);
    case "easeInQuad":
      return Easing.in(Easing.quad);
    case "easeOutQuad":
      return Easing.out(Easing.quad);
    case "easeOut":
    default:
      return Easing.out(Easing.cubic);
  }
}

export interface MotionStyle {
  opacity: number;
  transform: string;
}

/**
 * Maps a storyboard animation onto a CSS transform.
 *
 * `progress` is the eased 0..1 entry progress; `phase` is uncapped elapsed
 * seconds, which the looping animations (pulse, shake) need in order to keep
 * moving after the entry has settled.
 */
export function motionFor(
  animation: AnimationType,
  progress: number,
  phase: number,
  intensity = 1,
): MotionStyle {
  const lerp = (from: number, to: number): number =>
    from + (to - from) * progress;
  const fade = interpolate(progress, [0, 0.35], [0, 1], {
    extrapolateRight: "clamp",
  });

  switch (animation) {
    case "zoomIn":
      return { opacity: fade, transform: `scale(${lerp(1.18, 1)})` };
    case "zoomOut":
      return { opacity: fade, transform: `scale(${lerp(0.82, 1)})` };
    case "slideInLeft":
      return {
        opacity: fade,
        transform: `translateX(${lerp(-14 * intensity, 0)}%) scale(${lerp(1.04, 1)})`,
      };
    case "slideInRight":
      return {
        opacity: fade,
        transform: `translateX(${lerp(14 * intensity, 0)}%) scale(${lerp(1.04, 1)})`,
      };
    case "slideInTop":
      return {
        opacity: fade,
        transform: `translateY(${lerp(-12 * intensity, 0)}%) scale(${lerp(1.04, 1)})`,
      };
    case "slideInBottom":
      return {
        opacity: fade,
        transform: `translateY(${lerp(12 * intensity, 0)}%) scale(${lerp(1.04, 1)})`,
      };
    case "fadeIn":
      return { opacity: fade, transform: `scale(${lerp(1.03, 1)})` };
    case "fadeOut":
      return { opacity: 1 - progress, transform: "scale(1)" };
    case "scaleUp":
      return { opacity: fade, transform: `scale(${lerp(0.72, 1)})` };
    case "scaleDown":
      return { opacity: fade, transform: `scale(${lerp(1.3, 1)})` };
    case "rotateIn":
      return {
        opacity: fade,
        transform: `rotate(${lerp(-7 * intensity, 0)}deg) scale(${lerp(0.9, 1)})`,
      };
    case "rotateOut":
      return {
        opacity: fade,
        transform: `rotate(${lerp(7 * intensity, 0)}deg) scale(${lerp(1.1, 1)})`,
      };
    case "pulse": {
      const beat = 1 + Math.sin(phase * Math.PI * 1.6) * 0.025 * intensity;
      return { opacity: fade, transform: `scale(${beat})` };
    }
    case "bounce": {
      // Damped overshoot: lands at 1 without needing a spring config.
      const overshoot =
        1 - Math.cos(progress * Math.PI * 1.5) * Math.exp(-progress * 4) * 0.22;
      return { opacity: fade, transform: `scale(${overshoot})` };
    }
    case "shake": {
      const decay = Math.exp(-phase * 1.8);
      const offset = Math.sin(phase * Math.PI * 9) * 1.6 * intensity * decay;
      return { opacity: fade, transform: `translateX(${offset}%)` };
    }
    default:
      return { opacity: fade, transform: "scale(1)" };
  }
}

/** Slow drift applied to every media layer so nothing sits perfectly still. */
export function kenBurns(progress: number, amount = 1): string {
  const scale = 1 + progress * 0.055 * amount;
  const shift = progress * 1.6 * amount;
  return `scale(${scale}) translateY(${-shift}%)`;
}
