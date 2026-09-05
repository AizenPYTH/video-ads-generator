/**
 * JSON Schemas handed to Claude via `output_config.format`, plus the Zod
 * schemas used to validate what comes back. Every property is listed in
 * `required` with an explicit null branch where it is optional: strict
 * structured-output modes reject partially-required objects.
 */
import { z } from "zod";

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

const rawActionSchema = z.object({
  type: z.enum(["display", "animation", "text", "effect"]),
  target: z.string().nullish(),
  content: z.string().nullish(),
  position: z.enum(TEXT_POSITIONS).nullish(),
  animation: z.enum(ANIMATION_TYPES).nullish(),
  effect: z.enum(VISUAL_EFFECTS).nullish(),
  easing: z.enum(EASING_TYPES).nullish(),
  duration: z.number().positive(),
  delay: z.number().nullish(),
});

const rawSceneSchema = z.object({
  id: z.number().int().nullish(),
  name: z.string().min(1),
  duration: z.number().positive(),
  description: z.string().default(""),
  actions: z.array(rawActionSchema).min(1),
  textOverlay: z
    .object({
      content: z.string(),
      position: z.enum(TEXT_POSITIONS).default("bottom"),
      fontSize: z.number().default(56),
      color: z.string().default("#FFFFFF"),
      animation: z.enum(ANIMATION_TYPES).default("fadeIn"),
    })
    .nullish(),
});

export const rawStoryboardSchema = z.object({
  title: z.string().min(1),
  concept: z.string().min(1),
  description: z.string().default(""),
  totalDuration: z.number().positive(),
  scenes: z.array(rawSceneSchema).min(2),
});

export const storyboardsResultSchema = z.object({
  storyboards: z.array(rawStoryboardSchema).min(1),
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
