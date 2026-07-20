import { getOpenAIClient, getOpenAIModel } from "./openai-client";
import type { IdentificationResult } from "./identification";

export interface EbayListingDraft {
  title: string;
  subtitle: string | null;
  description: string;
  conditionDescription: string | null;
  itemSpecifics: Record<string, string>;
  suggestedPrice: number | null;
  currency: string;
  categorySuggestion: string | null;
  shippingNotes: string | null;
}

export interface ListingGenerationInput {
  product: IdentificationResult & {
    price?: number;
    currency?: string;
    images?: string[];
  };
  marketplaceId?: string;
  language?: string;
  tone?: "professional" | "concise" | "detailed";
}

export async function generateEbayListing(
  input: ListingGenerationInput,
): Promise<EbayListingDraft> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const { product, marketplaceId = "EBAY_FR", language = "fr", tone = "professional" } = input;

  const prompt = [
    `Generate an eBay listing for marketplace ${marketplaceId} in language ${language}.`,
    `Tone: ${tone}.`,
    "Return JSON with: title (max 80 chars), subtitle (optional), description (HTML allowed),",
    "conditionDescription (optional), itemSpecifics (object), suggestedPrice (number or null),",
    "currency (ISO 4217), categorySuggestion, shippingNotes (optional).",
    "",
    "Product data:",
    JSON.stringify(product, null, 2),
  ].join("\n");

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert eBay listing copywriter. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty listing generation response");
  }

  const parsed = JSON.parse(content) as Partial<EbayListingDraft>;

  return {
    title: (parsed.title ?? product.title).slice(0, 80),
    subtitle: parsed.subtitle?.trim() || null,
    description: parsed.description?.trim() || product.description,
    conditionDescription: parsed.conditionDescription?.trim() || null,
    itemSpecifics: {
      ...(product.specifications ?? {}),
      ...(parsed.itemSpecifics ?? {}),
      ...(product.brand ? { Brand: product.brand } : {}),
      ...(product.model ? { Model: product.model } : {}),
      ...(product.reference ? { "MPN": product.reference } : {}),
    },
    suggestedPrice:
      typeof parsed.suggestedPrice === "number"
        ? parsed.suggestedPrice
        : product.price ?? null,
    currency: parsed.currency ?? product.currency ?? "EUR",
    categorySuggestion: parsed.categorySuggestion ?? product.category,
    shippingNotes: parsed.shippingNotes?.trim() || null,
  };
}
