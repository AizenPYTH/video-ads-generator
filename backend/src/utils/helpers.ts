import { randomUUID } from "node:crypto";

export const generateId = (): string => randomUUID();

export const shortId = (): string => randomUUID().split("-")[0] ?? "0";

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const nowIso = (): string => new Date().toISOString();

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** `#abc` / `abc` / `#aabbcc` -> `#aabbcc`. Returns null when unparseable. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Strips markdown fences and leading prose before the first JSON token. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const firstBrace = body.search(/[[{]/);
  if (firstBrace === -1) return body;
  const opening = body[firstBrace];
  const closing = opening === "[" ? "]" : "}";
  const lastClose = body.lastIndexOf(closing);
  if (lastClose <= firstBrace) return body.slice(firstBrace);
  return body.slice(firstBrace, lastClose + 1);
}
