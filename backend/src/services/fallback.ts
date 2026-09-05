/**
 * Deterministic stand-ins used when ANTHROPIC_API_KEY is absent or a Claude
 * call fails. They keep the full pipeline (and the demo) runnable offline
 * instead of dead-ending the user on a 500.
 */
import { generateId, nowIso } from "../utils/helpers";
import type { AssetRef, ProductAnalysis, ProductType, Tone } from "../types";
import type { RawStoryboard } from "./schemas";
import type { PageMetadata } from "./playwright.service";

const DEFAULT_PALETTE = {
  primary: "#5b6cff",
  secondary: "#8b5cf6",
  accent: "#22d3ee",
  background: "#0b0b12",
  text: "#f8fafc",
};

const TYPE_HINTS: Array<[ProductType, RegExp]> = [
  ["ecommerce", /shop|store|cart|checkout|buy now|panier|boutique/i],
  ["finance", /invoice|payment|bank|budget|payout|facture|comptab/i],
  ["health", /health|fitness|patient|wellness|sant[eé]/i],
  ["education", /course|learn|lesson|student|formation|cours/i],
  ["entertainment", /watch|stream|music|game|play now/i],
  ["productivity", /task|workflow|automat|calendar|note|organis/i],
  ["mobile_app", /app store|google play|download the app|t[eé]l[eé]charger/i],
  ["saas", /dashboard|api|integration|workspace|team|pricing|abonnement/i],
];

function guessType(haystack: string): ProductType {
  for (const [type, pattern] of TYPE_HINTS) {
    if (pattern.test(haystack)) return type;
  }
  return "other";
}

function guessTone(haystack: string): Tone {
  if (/enterprise|compliance|secure|s[eé]curis/i.test(haystack)) return "professional";
  if (/fun|easy|simple|friendly|facile/i.test(haystack)) return "playful";
  if (/premium|luxury|crafted|pro\b/i.test(haystack)) return "premium";
  if (/fast|power|scale|boost/i.test(haystack)) return "bold";
  return "minimal";
}

export function buildFallbackAnalysis(input: {
  url?: string;
  metadata?: PageMetadata | null;
  assets: AssetRef[];
}): ProductAnalysis {
  const metadata = input.metadata;
  const name =
    metadata?.siteName ||
    metadata?.title?.split(/[|\-–—]/)[0]?.trim() ||
    (input.url ? new URL(input.url).hostname.replace(/^www\./, "") : "Your Product");

  const headings = (metadata?.headings ?? []).filter(
    (heading) => heading.length > 6,
  );
  const haystack = [
    metadata?.title,
    metadata?.description,
    ...headings,
    ...(metadata?.ctas ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  const features = (headings.length ? headings : [
    "Everything in one place",
    "Set up in minutes",
    "Built for your team",
    "Results you can measure",
  ])
    .slice(0, 4)
    .map((heading, index) => ({
      title: heading.slice(0, 48),
      description: heading,
      importance: (index === 0 ? "high" : index === 1 ? "high" : "medium") as
        | "high"
        | "medium"
        | "low",
    }));

  const keyPoints = headings.slice(0, 3).map((heading) => heading.slice(0, 60));
  while (keyPoints.length < 3) {
    keyPoints.push(
      ["Save hours every week", "Nothing to configure", "Loved by teams"][
        keyPoints.length
      ] as string,
    );
  }

  return {
    id: generateId(),
    type: guessType(haystack),
    name: name.slice(0, 60),
    description:
      metadata?.description?.slice(0, 300) ||
      `${name} - captured from ${input.url ?? "your screenshots"}.`,
    features,
    colorPalette: DEFAULT_PALETTE,
    tone: guessTone(haystack),
    keyPoints,
    suggestedNarrative: `Show ${name} solving the problem it was built for, then land on the outcome.`,
    assets: input.assets,
    ...(input.url ? { sourceUrl: input.url } : {}),
    createdAt: nowIso(),
  };
}

function pickAsset(assets: AssetRef[], index: number): string {
  if (assets.length === 0) return "screenshot_main";
  return (assets[index % assets.length] as AssetRef).id;
}

export function buildFallbackStoryboards(
  analysis: ProductAnalysis,
  assets: AssetRef[],
): RawStoryboard[] {
  const name = analysis.name;
  const [pointA, pointB, pointC] = [
    analysis.keyPoints[0] ?? "Save hours every week",
    analysis.keyPoints[1] ?? "Set up in minutes",
    analysis.keyPoints[2] ?? "Loved by teams",
  ];
  const features = analysis.features;

  const scene = (
    id: number,
    name_: string,
    duration: number,
    description: string,
    target: string,
    animation: string,
    overlay: string,
  ): RawStoryboard["scenes"][number] => ({
    id,
    name: name_,
    duration,
    description,
    actions: [
      {
        type: "display",
        target,
        content: null,
        position: "bottom",
        animation: animation as never,
        effect: "particles",
        easing: "easeOut",
        duration,
        delay: 0,
      },
    ],
    textOverlay: {
      content: overlay,
      position: "bottom",
      fontSize: 60,
      color: "#FFFFFF",
      animation: "slideInBottom",
    },
  });

  return [
    {
      title: "The Problem, Solved",
      concept: "Problem to Solution",
      description: `Opens on the friction ${name} removes, then reveals the fix and the relief that follows.`,
      totalDuration: 12,
      scenes: [
        scene(1, "The Friction", 2.5, "Cluttered before-state, held slightly too long.", pickAsset(assets, 0), "fadeIn", "Still doing it manually?"),
        scene(2, "The Turn", 2.5, `${name} enters and takes over the frame.`, pickAsset(assets, 0), "zoomIn", `Meet ${name}`),
        scene(3, "The Fix", 3.5, "The product working, calm and fast.", pickAsset(assets, 1), "slideInLeft", pointA),
        scene(4, "The Relief", 2, "Outcome shot, breathing room.", pickAsset(assets, 2), "scaleUp", pointB),
        scene(5, "Call To Action", 1.5, "Logo lockup and CTA.", pickAsset(assets, 0), "fadeIn", `Try ${name} free`),
      ],
    },
    {
      title: "Everything You Get",
      concept: "Feature Showcase",
      description: `Rapid-fire tour of the ${features.length} things ${name} does, one punch per beat.`,
      totalDuration: 12,
      scenes: [
        scene(1, "Cold Open", 1.5, "Hard cut straight into the product.", pickAsset(assets, 0), "zoomIn", name),
        scene(2, "Feature One", 2.5, features[0]?.description ?? "First capability.", pickAsset(assets, 1), "slideInLeft", features[0]?.title ?? pointA),
        scene(3, "Feature Two", 2.5, features[1]?.description ?? "Second capability.", pickAsset(assets, 2), "slideInRight", features[1]?.title ?? pointB),
        scene(4, "Feature Three", 2.5, features[2]?.description ?? "Third capability.", pickAsset(assets, 3), "slideInBottom", features[2]?.title ?? pointC),
        scene(5, "All Together", 3, "Everything on screen at once, then CTA.", pickAsset(assets, 0), "scaleUp", "All of it. One place."),
      ],
    },
    {
      title: "Powerful. Effortless.",
      concept: "Hero Shot + Benefit",
      description: `Leads with the single best frame of ${name}, then cascades into the payoff.`,
      totalDuration: 12,
      scenes: [
        scene(1, "Hero", 3, "The signature shot, slow push in.", pickAsset(assets, 0), "zoomIn", name),
        scene(2, "Proof", 2.5, "A number or result on screen.", pickAsset(assets, 1), "fadeIn", pointA),
        scene(3, "Ease", 2.5, "How little there is to do.", pickAsset(assets, 2), "slideInTop", pointB),
        scene(4, "Scale", 2, "It holds up as you grow.", pickAsset(assets, 3), "scaleUp", pointC),
        scene(5, "Close", 2, "Logo and CTA on a clean plate.", pickAsset(assets, 0), "fadeIn", "Start today"),
      ],
    },
  ];
}
