/**
 * Coercion for the enum-shaped fields Claude fills in.
 *
 * The model is reliable about narrative and unreliable about vocabulary: it
 * writes `zoom` for `zoomIn`, `middle` for `center`, `sparkle` for
 * `particles`. Rejecting those threw away three good storyboards over a
 * spelling, so nothing here rejects — every value is pulled to the nearest
 * legal one, and the fallback is used only when there is nothing to work
 * with.
 */

/** Lowercase, strip everything that is not a letter or digit. */
function fold(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Synonyms the model actually produces. Keys are folded, so `slide-in-left`,
 * `slide_in_left` and `SlideInLeft` all arrive here as `slideinleft`.
 */
const ALIASES: Record<string, string> = {
  // animations
  zoom: "zoomIn",
  zoomin: "zoomIn",
  punchin: "zoomIn",
  pushin: "zoomIn",
  zoomout: "zoomOut",
  pullback: "zoomOut",
  slideleft: "slideInLeft",
  slidefromleft: "slideInLeft",
  slideright: "slideInRight",
  slidefromright: "slideInRight",
  slidetop: "slideInTop",
  slidedown: "slideInTop",
  slidefromtop: "slideInTop",
  slidebottom: "slideInBottom",
  slideup: "slideInBottom",
  slidefrombottom: "slideInBottom",
  fade: "fadeIn",
  fadein: "fadeIn",
  dissolve: "fadeIn",
  fadeout: "fadeOut",
  scale: "scaleUp",
  scaleup: "scaleUp",
  grow: "scaleUp",
  scaledown: "scaleDown",
  shrink: "scaleDown",
  rotate: "rotateIn",
  spin: "rotateIn",
  pop: "bounce",
  bouncein: "bounce",
  wiggle: "shake",
  // easings
  ease: "easeInOut",
  easeinout: "easeInOut",
  smooth: "easeInOut",
  linear: "linear",
  easeoutcubic: "easeOutCubic",
  cubic: "easeOutCubic",
  quad: "easeOutQuad",
  spring: "easeOutCubic",
  // effects
  particle: "particles",
  sparkle: "particles",
  sparkles: "particles",
  confetti: "particles",
  dust: "particles",
  flare: "lightFlare",
  lensflare: "lightFlare",
  lightleak: "lightFlare",
  shine: "lightFlare",
  glow: "lightFlare",
  blur: "motionBlur",
  motion: "motionBlur",
  chromatic: "chromaShift",
  chromaticaberration: "chromaShift",
  rgbsplit: "chromaShift",
  glitchy: "glitch",
  // positions
  middle: "center",
  centre: "center",
  centered: "center",
  topleft: "top-left",
  topright: "top-right",
  bottomleft: "bottom-left",
  bottomright: "bottom-right",
  upper: "top",
  lower: "bottom",
  // action types
  show: "display",
  image: "display",
  screenshot: "display",
  caption: "text",
  title: "text",
  overlay: "text",
  transition: "animation",
  move: "animation",
  vfx: "effect",
};

/**
 * Returns the closest legal member of `allowed`, or `fallback` when the
 * value is missing or unrecognisable. Never throws.
 */
export function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  // 1. Exact.
  const exact = allowed.find((option) => option === trimmed);
  if (exact) return exact;

  const folded = fold(trimmed);
  if (!folded) return fallback;

  // 2. Same word, different punctuation or casing.
  const loose = allowed.find((option) => fold(option) === folded);
  if (loose) return loose;

  // 3. A known synonym.
  const aliased = ALIASES[folded];
  if (aliased) {
    const mapped = allowed.find((option) => option === aliased);
    if (mapped) return mapped;
  }

  // 4. Unambiguous prefix, so `slideIn` alone does not silently pick one of
  //    four directions but `particl` still reaches `particles`.
  const prefixed = allowed.filter(
    (option) => fold(option).startsWith(folded) || folded.startsWith(fold(option)),
  );
  if (prefixed.length === 1) return prefixed[0] as T;

  return fallback;
}

/** Trimmed non-empty string, or the fallback. */
export function coerceString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Finite number clamped into range, or the fallback. */
export function coerceNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
