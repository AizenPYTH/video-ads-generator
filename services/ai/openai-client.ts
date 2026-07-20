import OpenAI from "openai";
import { AppError } from "@/lib/errors/app-error";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw AppError.internal("OPENAI_API_KEY is not configured");
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}

export function isOpenAIMockMode(): boolean {
  return process.env.OPENAI_MOCK_MODE === "true";
}
