import Anthropic from "@anthropic-ai/sdk";
import { env, hasAnthropicKey } from "../utils/env";
import { logger } from "../utils/logger";
import { extractJson, generateId, nowIso } from "../utils/helpers";
import {
  analysisJsonSchema,
  analysisResultSchema,
  storyboardsJsonSchema,
  storyboardsResultSchema,
  type AnalysisResult,
  type RawStoryboard,
} from "./schemas";
import type { AssetRef, ProductAnalysis } from "../types";
import type { PageMetadata } from "./playwright.service";
import { buildFallbackAnalysis, buildFallbackStoryboards } from "./fallback";

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: env.anthropicApiKey,
      maxRetries: 3,
      timeout: 180_000,
    });
  }
  return cachedClient;
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Structured outputs give us schema-valid JSON directly, but a refusal or an
 * unsupported-format error should not sink the request - fall back to parsing
 * the text body before giving up.
 */
async function requestJson<T>(params: {
  model: string;
  maxTokens: number;
  system: string;
  content: Anthropic.ContentBlockParam[];
  schema: unknown;
  label: string;
}): Promise<unknown> {
  const base = {
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.system,
    messages: [{ role: "user" as const, content: params.content }],
  };

  try {
    const response = await client().messages.create({
      ...base,
      output_config: {
        format: { type: "json_schema", schema: params.schema },
      },
    } as Anthropic.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") {
      // `stop_details` is only populated on refusals and is not in every SDK
      // release's `Message` type yet.
      const details = (response as { stop_details?: { category?: string } })
        .stop_details;
      throw new Error(
        `Claude declined the ${params.label} request (${details?.category ?? "unspecified"})`,
      );
    }
    return JSON.parse(extractJson(textOf(response))) as T;
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) {
      logger.warn(
        { error: error.message, label: params.label },
        "structured output rejected, retrying as free-form JSON",
      );
      const response = await client().messages.create(base);
      if (response.stop_reason === "refusal") {
        throw new Error(`Claude declined the ${params.label} request`, {
          cause: error,
        });
      }
      return JSON.parse(extractJson(textOf(response))) as T;
    }
    throw error;
  }
}

const ANALYSIS_SYSTEM = `You are an expert product analyst and video producer. You analyse product screenshots and extract the strategic information needed to build a compelling video advertisement.

ANALYSIS GUIDELINES:
- Read the UI elements, branding, typography and colour scheme literally - do not invent features you cannot see.
- Identify the problem the product solves and its core value proposition.
- Pull the real colour palette off the screenshot; these colours drive the video's art direction, so they must be accurate.
- Infer the target audience from the design language and let that set the tone.
- Feature titles are 2-4 words. Key points are punchy benefit statements, not feature names.`;

export interface AnalyzeInput {
  /** Data URI or bare base64 PNG. */
  screenshot: string;
  /** Optional secondary captures for extra context. */
  extraScreenshots?: string[];
  url?: string;
  metadata?: PageMetadata | null;
  assets: AssetRef[];
}

function imageBlock(source: string): Anthropic.ImageBlockParam {
  const match = source.match(/^data:(image\/[a-z+]+);base64,(.*)$/s);
  const mediaType = (match?.[1] ?? "image/png") as
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/webp";
  const data = match?.[2] ?? source.replace(/^data:[^,]+,/, "");
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data },
  };
}

export async function analyzeProduct(
  input: AnalyzeInput,
): Promise<ProductAnalysis> {
  if (!hasAnthropicKey()) {
    logger.warn("ANTHROPIC_API_KEY missing - using heuristic analysis");
    return buildFallbackAnalysis(input);
  }

  const contextLines: string[] = [];
  if (input.url) contextLines.push(`Page URL: ${input.url}`);
  if (input.metadata?.title) contextLines.push(`Title: ${input.metadata.title}`);
  if (input.metadata?.description) {
    contextLines.push(`Meta description: ${input.metadata.description}`);
  }
  if (input.metadata?.headings?.length) {
    contextLines.push(
      `Headings: ${input.metadata.headings.slice(0, 12).join(" | ")}`,
    );
  }
  if (input.metadata?.ctas?.length) {
    contextLines.push(
      `Buttons and links: ${input.metadata.ctas.slice(0, 12).join(" | ")}`,
    );
  }

  const content: Anthropic.ContentBlockParam[] = [imageBlock(input.screenshot)];
  for (const extra of (input.extraScreenshots ?? []).slice(0, 3)) {
    content.push(imageBlock(extra));
  }
  content.push({
    type: "text",
    text: [
      "Analyse this product and return the analysis object.",
      contextLines.length
        ? `\nPage context extracted from the DOM:\n${contextLines.join("\n")}`
        : "",
      "\nThe first image is the primary view; any others are further sections of the same product.",
    ].join("\n"),
  });

  let parsed: AnalysisResult;
  try {
    const raw = await requestJson({
      model: env.anthropicModel,
      maxTokens: 4_000,
      system: ANALYSIS_SYSTEM,
      content,
      schema: analysisJsonSchema,
      label: "product analysis",
    });
    parsed = analysisResultSchema.parse(raw);
  } catch (error) {
    logger.error({ error }, "product analysis failed - falling back");
    return buildFallbackAnalysis(input);
  }

  return {
    id: generateId(),
    type: parsed.productType,
    name: parsed.name,
    description: parsed.description,
    features: parsed.features,
    colorPalette: parsed.colorPalette,
    tone: parsed.tone,
    keyPoints: parsed.keyPoints,
    suggestedNarrative: parsed.suggestedNarrative,
    assets: input.assets,
    ...(input.url ? { sourceUrl: input.url } : {}),
    createdAt: nowIso(),
  };
}

const STORYBOARD_SYSTEM = `You are a creative director and screenwriter for short-form video advertising. You write storyboards that a motion designer can execute literally - every beat is a concrete visual instruction, never a mood description.

HARD RULES
- Three storyboards, each telling a genuinely different story. Different opening beat, different emotional arc, different closing line. Rewriting the same ad three times is a failure.
- 4 to 6 scenes each. Scene durations must sum to totalDuration (10-15s).
- On-screen text is 3 to 7 words. Never a sentence. Never punctuation-heavy.
- Every "display" and "animation" action must set "target" to one of the asset ids provided. Never invent an asset id.
- "text" actions set "content" and "position" and leave "target" null. "effect" actions set "effect" and leave "target"/"content" null.
- Set unused fields to null explicitly.
- The final scene of every storyboard ends on a call to action.

CONTROLLED VOCABULARY - use these exact strings, nothing else
- "concept" is REQUIRED on every storyboard and is exactly one of:
  "Problem to Solution" | "Feature Showcase" | "Hero Shot + Benefit"
- "type": display | animation | text | effect
- "animation": zoomIn | zoomOut | slideInLeft | slideInRight | slideInTop |
  slideInBottom | fadeIn | fadeOut | scaleUp | scaleDown | rotateIn |
  rotateOut | pulse | bounce | shake
- "easing": linear | easeIn | easeOut | easeInOut | easeInCubic |
  easeOutCubic | easeInQuad | easeOutQuad
- "effect": particles | glitch | lightFlare | motionBlur | chromaShift
- "position": top | center | bottom | top-left | top-right | bottom-left |
  bottom-right

Any other value for these fields is invalid. Do not invent synonyms, do not
use CamelCase variants, do not leave "concept" out.

STORYBOARD 1 - concept "Problem to Solution": open on the pain, turn on the product, close on relief. Arc: frustration -> relief.
STORYBOARD 2 - concept "Feature Showcase": three or four features in rapid sequence with callouts. Arc: "here is everything you get".
STORYBOARD 3 - concept "Hero Shot + Benefit": open on the most impressive frame, then cascade into outcomes and ROI. Arc: "this is powerful and it is easy".`;

export interface StoryboardInput {
  analysis: ProductAnalysis;
  style: string;
  device: string;
  assets: AssetRef[];
}

export async function generateStoryboardDrafts(
  input: StoryboardInput,
): Promise<RawStoryboard[]> {
  if (!hasAnthropicKey()) {
    logger.warn("ANTHROPIC_API_KEY missing - using template storyboards");
    return buildFallbackStoryboards(input.analysis, input.assets);
  }

  const assetList = input.assets
    .map((asset) => `- ${asset.id}: ${asset.label}`)
    .join("\n");

  const prompt = `PRODUCT
Name: ${input.analysis.name}
Type: ${input.analysis.type}
Description: ${input.analysis.description}
Tone: ${input.analysis.tone}
Colour palette: ${JSON.stringify(input.analysis.colorPalette)}
Key points: ${input.analysis.keyPoints.join(" | ")}
Suggested narrative: ${input.analysis.suggestedNarrative}

FEATURES
${input.analysis.features
  .map((feature) => `- [${feature.importance}] ${feature.title}: ${feature.description}`)
  .join("\n")}

AVAILABLE ASSET IDS (use these exact strings as "target")
${assetList}

VISUAL STYLE: ${input.style}
DEVICE: ${input.device}

Write the three storyboards.`;

  const raw = await requestJson({
    model: env.anthropicModel,
    maxTokens: 12_000,
    system: STORYBOARD_SYSTEM,
    content: [{ type: "text", text: prompt }],
    schema: storyboardsJsonSchema,
    label: "storyboard generation",
  });

  // Claude sometimes answers with a bare array instead of the wrapper.
  const wrapped = Array.isArray(raw) ? { storyboards: raw } : raw;
  const parsed = storyboardsResultSchema.safeParse(wrapped);

  if (!parsed.success) {
    logger.error({ error: parsed.error }, "storyboard validation failed");
    throw new Error("Claude returned storyboards that failed validation", {
      cause: parsed.error,
    });
  }

  // A storyboard is only dropped when it has no usable scene at all. One bad
  // apple must not sink the batch, so report and carry on with the rest.
  const drafts = parsed.data.storyboards;
  const received = (wrapped as { storyboards?: unknown }).storyboards;
  const requested = Array.isArray(received) ? received.length : 0;
  if (drafts.length < requested) {
    logger.warn(
      { kept: drafts.length, received: requested },
      "dropped storyboards with no usable scenes",
    );
  }
  if (drafts.length === 0) {
    logger.error("every storyboard came back unusable - falling back");
    return buildFallbackStoryboards(input.analysis, input.assets);
  }
  return drafts;
}
