import { getOpenAIClient, getOpenAIModel } from "./openai-client";

export interface IdentificationResult {
  title: string;
  brand: string | null;
  model: string | null;
  reference: string | null;
  category: string | null;
  condition: "new" | "used" | "refurbished" | "for_parts" | "unknown";
  confidence: number;
  description: string;
  keywords: string[];
  specifications: Record<string, string>;
  reasoning: string;
}

export interface IdentificationInput {
  ocrText?: string;
  reference?: string;
  hints?: string;
  imageUrl?: string;
}

export function buildIdentificationPrompt(input: IdentificationInput): string {
  const sections: string[] = [
    "You are an expert product identification assistant for eBay sellers.",
    "Analyze the provided information and identify the product as precisely as possible.",
    "Return a JSON object with these fields:",
    "- title: concise product title",
    "- brand: manufacturer or null",
    "- model: model name/number or null",
    "- reference: part/reference number or null",
    "- category: suggested eBay category path",
    "- condition: one of new, used, refurbished, for_parts, unknown",
    "- confidence: number 0-1",
    "- description: 2-3 sentence product description",
    "- keywords: array of search keywords",
    "- specifications: object of key technical specs",
    "- reasoning: brief explanation of identification logic",
  ];

  if (input.reference) {
    sections.push(`Known reference: ${input.reference}`);
  }

  if (input.hints) {
    sections.push(`Seller hints: ${input.hints}`);
  }

  if (input.ocrText) {
    sections.push(`OCR text from product label/image:\n${input.ocrText}`);
  }

  return sections.join("\n\n");
}

export function parseIdentificationResponse(raw: string): IdentificationResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : raw;

  let parsed: Partial<IdentificationResult>;

  try {
    parsed = JSON.parse(jsonText) as Partial<IdentificationResult>;
  } catch {
    throw new Error("Failed to parse identification response as JSON");
  }

  const validConditions = new Set([
    "new",
    "used",
    "refurbished",
    "for_parts",
    "unknown",
  ]);

  return {
    title: parsed.title?.trim() || "Unknown Product",
    brand: parsed.brand?.trim() || null,
    model: parsed.model?.trim() || null,
    reference: parsed.reference?.trim() || null,
    category: parsed.category?.trim() || null,
    condition: validConditions.has(parsed.condition as string)
      ? (parsed.condition as IdentificationResult["condition"])
      : "unknown",
    confidence:
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5,
    description: parsed.description?.trim() || "",
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(String).filter(Boolean)
      : [],
    specifications:
      parsed.specifications && typeof parsed.specifications === "object"
        ? Object.fromEntries(
            Object.entries(parsed.specifications).map(([k, v]) => [k, String(v)]),
          )
        : {},
    reasoning: parsed.reasoning?.trim() || "",
  };
}

export async function identifyProduct(
  input: IdentificationInput,
): Promise<IdentificationResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const prompt = buildIdentificationPrompt(input);

  const messages: Array<{
    role: "user" | "system";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [
  {
    role: "system",
    content:
      "Respond only with valid JSON matching the requested schema. No markdown fences.",
  },
  ];

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt },
  ];

  if (input.imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.imageUrl },
    });
  }

  messages.push({ role: "user", content: userContent });

  const response = await client.chat.completions.create({
    model,
    messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty identification response from OpenAI");
  }

  return parseIdentificationResponse(content);
}
