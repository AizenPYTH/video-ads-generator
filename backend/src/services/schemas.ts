/**
 * JSON Schemas handed to Claude via `output_config.format`, plus the Zod
 * schemas used to validate what comes back. Every property is listed in
 * `required` with an explicit null branch where it is optional: strict
 * structured-output modes reject partially-required objects.
 */
import { z } from "zod";
import { coerceEnum, coerceNumber, coerceString } from "./coerce";
import {
  MAX_SCENE_DURATION,
  MAX_TOTAL_DURATION,
  MIN_SCENE_DURATION,
  MIN_TOTAL_DURATION,
} from "../utils/constants";

const HEX = /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

export const ANIMATION_TYPES = [
  "zoomIn",
  "zoomOut",
  "slideInLeft",
  "slideInRight",
  "slideInTop",
  "slideInBottom",
  "fadeIn",
  "fadeOut",
  "scaleUp",
  "scaleDown",
  "rotateIn",
  "rotateOut",
  "pulse",
  "bounce",
  "shake",
] as const;

export const EASING_TYPES = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "easeInCubic",
  "easeOutCubic",
  "easeInQuad",
  "easeOutQuad",
] as const;

export const VISUAL_EFFECTS = [
  "particles",
  "glitch",
  "lightFlare",
  "motionBlur",
  "chromaShift",
] as const;

export const TEXT_POSITIONS = [
  "top",
  "center",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

export const PRODUCT_TYPES = [
  "saas",
  "ecommerce",
  "mobile_app",
  "productivity",
  "entertainment",
  "education",
  "finance",
  "health",
  "other",
] as const;

export const TONES = [
  "professional",
  "playful",
  "minimal",
  "bold",
  "premium",
  "casual",
] as const;

// ---------- Product analysis ----------

export const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "productType",
    "name",
    "description",
    "features",
    "colorPalette",
    "tone",
    "keyPoints",
    "suggestedNarrative",
  ],
  properties: {
    productType: { type: "string", enum: [...PRODUCT_TYPES] },
    name: { type: "string", description: "Product or brand name" },
    description: {
      type: "string",
      description: "One sentence describing what the product does",
    },
    features: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "importance"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          importance: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    colorPalette: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "secondary", "accent", "background", "text"],
      properties: {
        primary: { type: "string", description: "Hex colour, e.g. #1D4ED8" },
        secondary: { type: "string" },
        accent: { type: "string" },
        background: { type: "string" },
        text: { type: "string" },
      },
    },
    tone: { type: "string", enum: [...TONES] },
    keyPoints: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: { type: "string" },
    },
    suggestedNarrative: { type: "string" },
  },
} as const;

const hexString = z
  .string()
  .regex(HEX)
  .transform((value) => (value.startsWith("#") ? value : `#${value}`));

export const analysisResultSchema = z.object({
  productType: z.enum(PRODUCT_TYPES),
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  features: z
    .array(
      z.object({
        title: z.string().min(1).max(80),
        description: z.string().min(1).max(280),
        importance: z.enum(["high", "medium", "low"]),
      }),
    )
    .min(1),
  colorPalette: z.object({
    primary: hexString,
    secondary: hexString,
    accent: hexString,
    background: hexString,
    text: hexString,
  }),
  tone: z.enum(TONES),
  keyPoints: z.array(z.string().min(1).max(160)).min(1),
  suggestedNarrative: z.string().min(1).max(400),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

// ---------- Storyboards ----------

const actionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "type",
    "target",
    "content",
    "position",
    "animation",
    "effect",
    "easing",
    "duration",
    "delay",
  ],
  properties: {
    type: { type: "string", enum: ["display", "animation", "text", "effect"] },
    target: {
      type: ["string", "null"],
      description:
        "Asset id for display/animation actions. Null for text and effect actions.",
    },
    content: {
      type: ["string", "null"],
      description: "Text to show. Only for type=text, otherwise null.",
    },
    position: {
      type: ["string", "null"],
      enum: [...TEXT_POSITIONS, null],
    },
    animation: { type: ["string", "null"], enum: [...ANIMATION_TYPES, null] },
    effect: { type: ["string", "null"], enum: [...VISUAL_EFFECTS, null] },
    easing: { type: ["string", "null"], enum: [...EASING_TYPES, null] },
    duration: { type: "number", minimum: 0.2, maximum: 6 },
    delay: { type: ["number", "null"], minimum: 0, maximum: 5 },
  },
} as const;

const sceneJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "duration", "description", "actions", "textOverlay"],
  properties: {
    id: { type: "integer", minimum: 1 },
    name: { type: "string" },
    duration: { type: "number", minimum: 0.8, maximum: 6 },
    description: { type: "string" },
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: actionJsonSchema,
    },
    textOverlay: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["content", "position", "fontSize", "color", "animation"],
      properties: {
        content: { type: "string", maxLength: 60 },
        position: { type: "string", enum: [...TEXT_POSITIONS] },
        fontSize: { type: "integer", minimum: 24, maximum: 120 },
        color: { type: "string" },
        animation: { type: "string", enum: [...ANIMATION_TYPES] },
      },
    },
  },
} as const;

export const storyboardsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["storyboards"],
  properties: {
    storyboards: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "concept",
          "description",
          "totalDuration",
          "scenes",
        ],
        properties: {
          title: { type: "string", maxLength: 60 },
          concept: { type: "string", maxLength: 80 },
          description: { type: "string", maxLength: 400 },
          totalDuration: { type: "number", minimum: 8, maximum: 18 },
          scenes: {
            type: "array",
            minItems: 4,
            maxItems: 6,
            items: sceneJsonSchema,
          },
        },
      },
    },
  },
} as const;

export const ACTION_TYPES = [
  "display",
  "animation",
  "text",
  "effect",
] as const;

/**
 * The draft schemas are deliberately permissive. Claude is dependable about
 * narrative and undependable about vocabulary - it writes `zoom` for
 * `zoomIn`, `middle` for `center`, leaves `concept` out entirely - and a
 * hard `z.enum` threw away three usable storyboards over one misspelling.
 *
 * Nothing below rejects. Every field is pulled to the nearest legal value,
 * so parsing always yields something renderable; `storyboard.service` then
 * owns the arithmetic (durations, ids, asset targets).
 */
const rawActionSchema = z.unknown().transform((value) => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const type = coerceEnum(raw.type, ACTION_TYPES, "display");
  return {
    type,
    target: coerceString(raw.target, "") || null,
    content: coerceString(raw.content, "") || null,
    position: coerceEnum(raw.position, TEXT_POSITIONS, "bottom"),
    animation: coerceEnum(raw.animation, ANIMATION_TYPES, "fadeIn"),
    effect: coerceEnum(raw.effect, VISUAL_EFFECTS, "particles"),
    easing: coerceEnum(raw.easing, EASING_TYPES, "easeOut"),
    duration: coerceNumber(raw.duration, 2, 0.2, MAX_SCENE_DURATION),
    delay: coerceNumber(raw.delay, 0, 0, 5),
  };
});

const rawTextOverlaySchema = z.unknown().transform((value) => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const content = coerceString(raw.content, "");
  if (!content) return null;
  return {
    content,
    position: coerceEnum(raw.position, TEXT_POSITIONS, "bottom"),
    fontSize: coerceNumber(raw.fontSize, 56, 24, 120),
    color: coerceString(raw.color, "#FFFFFF"),
    animation: coerceEnum(raw.animation, ANIMATION_TYPES, "fadeIn"),
  };
});

const rawSceneSchema = z.unknown().transform((value, ctx) => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const actions = Array.isArray(raw.actions)
    ? raw.actions.map((action) => rawActionSchema.parse(action))
    : [];

  const name = coerceString(raw.name, "Scene");
  const overlay = rawTextOverlaySchema.parse(raw.textOverlay);

  // A scene with neither a shot nor a line is not a scene.
  if (actions.length === 0 && !overlay) {
    ctx.addIssue({ code: "custom", message: "scene has no actions and no text" });
    return z.NEVER;
  }

  return {
    id: Math.round(coerceNumber(raw.id, 0, 0, 999)) || null,
    name,
    duration: coerceNumber(
      raw.duration,
      2,
      MIN_SCENE_DURATION,
      MAX_SCENE_DURATION,
    ),
    description: coerceString(raw.description, ""),
    actions,
    textOverlay: overlay,
  };
});

/** One of the three narrative shapes the prompt asks for. */
export const CONCEPTS = [
  "Problem to Solution",
  "Feature Showcase",
  "Hero Shot + Benefit",
] as const;

export const rawStoryboardSchema = z.unknown().transform((value, ctx) => {
  const raw = (value ?? {}) as Record<string, unknown>;

  const scenes = (Array.isArray(raw.scenes) ? raw.scenes : [])
    .map((scene) => rawSceneSchema.safeParse(scene))
    .filter((result) => result.success)
    .map((result) => result.data);

  // Without scenes there is nothing to render; this is the one real failure.
  if (scenes.length === 0) {
    ctx.addIssue({ code: "custom", message: "storyboard has no usable scenes" });
    return z.NEVER;
  }

  return {
    title: coerceString(raw.title, "Untitled concept").slice(0, 70),
    // Reported missing in production, which sank the whole batch.
    concept: coerceString(raw.concept, "Feature Showcase").slice(0, 90),
    description: coerceString(raw.description, ""),
    totalDuration: coerceNumber(
      raw.totalDuration,
      12,
      MIN_TOTAL_DURATION,
      MAX_TOTAL_DURATION,
    ),
    scenes,
  };
});

/**
 * Salvages the batch. `z.array(...)` fails the whole array when one element
 * fails, which is exactly the behaviour that turned a single bad storyboard
 * into a dead request - so elements are parsed one by one and the
 * unsalvageable ones are dropped.
 */
export const storyboardsResultSchema = z.object({
  storyboards: z.unknown().transform((value) =>
    (Array.isArray(value) ? value : [])
      .map((item) => rawStoryboardSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data),
  ),
});

export type RawStoryboard = z.infer<typeof rawStoryboardSchema>;
export type RawScene = z.infer<typeof rawSceneSchema>;
export type RawAction = z.infer<typeof rawActionSchema>;

// ---------- Request payload validation ----------

export const VIDEO_STYLES = [
  "apple_premium",
  "dynamic_startup",
  "minimal_dark",
] as const;

export const DEVICE_TYPES = [
  "iphone_15_pro",
  "iphone_15",
  "iphone_14",
  "macbook_14",
  "macbook_16",
  "desktop_27",
  "desktop_monitor",
  "ipad_pro",
  "android_phone",
] as const;

export const assetRefSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  label: z.string().default(""),
});

export const productAnalysisSchema = z.object({
  id: z.string().min(1),
  type: z.enum(PRODUCT_TYPES),
  name: z.string().min(1),
  description: z.string().default(""),
  features: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      importance: z.enum(["high", "medium", "low"]),
    }),
  ),
  colorPalette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    text: z.string(),
  }),
  tone: z.enum(TONES),
  keyPoints: z.array(z.string()),
  suggestedNarrative: z.string().default(""),
  assets: z.array(assetRefSchema).default([]),
  sourceUrl: z.string().optional(),
  createdAt: z.string(),
});

const sceneActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("display"),
    target: z.string(),
    animation: z.enum(ANIMATION_TYPES),
    duration: z.number().positive(),
    easing: z.enum(EASING_TYPES),
    delay: z.number().optional(),
  }),
  z.object({
    type: z.literal("animation"),
    target: z.string().optional(),
    from: z.string().default("center"),
    to: z.string().default("center"),
    animation: z.enum(ANIMATION_TYPES),
    duration: z.number().positive(),
    easing: z.enum(EASING_TYPES),
    delay: z.number().optional(),
  }),
  z.object({
    type: z.literal("text"),
    content: z.string(),
    position: z.enum(TEXT_POSITIONS),
    animation: z.enum(ANIMATION_TYPES),
    duration: z.number().positive(),
    delay: z.number().optional(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal("effect"),
    effect: z.enum(VISUAL_EFFECTS),
    duration: z.number().positive(),
    delay: z.number().optional(),
    intensity: z.number().optional(),
  }),
]);

export const storyboardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  concept: z.string().default(""),
  description: z.string().default(""),
  style: z.enum(VIDEO_STYLES),
  device: z.enum(DEVICE_TYPES),
  totalDuration: z.number().positive(),
  scenes: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
        duration: z.number().positive(),
        description: z.string().default(""),
        actions: z.array(sceneActionSchema).min(1),
        voiceOver: z.string().optional(),
        textOverlay: z
          .object({
            content: z.string(),
            position: z.enum(TEXT_POSITIONS),
            fontSize: z.number(),
            color: z.string(),
            backgroundColor: z.string().optional(),
            animation: z.enum(ANIMATION_TYPES),
          })
          .nullable()
          .optional(),
      }),
    )
    .min(1),
});
