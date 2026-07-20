export interface ParsedReference {
  value: string;
  normalized: string;
  score: number;
  isFragment: boolean;
  pattern: string;
}

const REFERENCE_PATTERNS: Array<{ name: string; regex: RegExp; baseScore: number }> = [
  { name: "full_pcb", regex: /\b\d{3}-\d{5}-[A-Z0-9]+\b/gi, baseScore: 100 },
  { name: "pcb_dash", regex: /\b\d{3}-\d{5}\b/gi, baseScore: 90 },
  { name: "fpc", regex: /\bFPC\d{5,}[A-Z0-9-]*\b/gi, baseScore: 85 },
  { name: "pcb_prefix", regex: /\bPCB[-\s]?\d{3,}[-\s]?\d{3,}[A-Z0-9-]*\b/gi, baseScore: 80 },
  { name: "alnum_dash", regex: /\b[A-Z]{2,4}-\d{3,}-\d{3,}[A-Z0-9-]*\b/gi, baseScore: 75 },
  { name: "main_fpc", regex: /\b[A-Z0-9]*FPC[_A-Z0-9.-]+\b/gi, baseScore: 82 },
  { name: "short_pcb_suffix", regex: /\b\d{5}-[A-Z0-9]+\b/gi, baseScore: 70 },
  { name: "model_number", regex: /\b[A-Z]{1,3}\d{3,}[A-Z0-9-]{0,10}\b/gi, baseScore: 60 },
  { name: "numeric_fragment", regex: /\b\d{4,6}\b/g, baseScore: 30 },
];

function normalizeReference(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "").replace(/_/g, "-");
}

function isFragment(reference: string, allReferences: string[]): boolean {
  const normalized = normalizeReference(reference);

  return allReferences.some((other) => {
    if (other === reference) return false;
    const otherNorm = normalizeReference(other);
    if (otherNorm.length <= normalized.length) return false;
    return otherNorm.includes(normalized);
  });
}

function scoreReference(
  value: string,
  patternName: string,
  baseScore: number,
  allCandidates: string[],
): number {
  let score = baseScore;
  const normalized = normalizeReference(value);

  score += Math.min(normalized.length, 20);

  if (/\d{3}-\d{5}/.test(normalized)) {
    score += 15;
  }

  if (/[A-Z]$/.test(normalized)) {
    score += 5;
  }

  if (isFragment(value, allCandidates)) {
    score -= 40;
  }

  if (patternName === "numeric_fragment") {
    score -= 10;
  }

  return score;
}

export function extractReferences(text: string): ParsedReference[] {
  const candidates: Array<{
    value: string;
    pattern: string;
    baseScore: number;
  }> = [];

  for (const { name, regex, baseScore } of REFERENCE_PATTERNS) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const value = match[0].trim();
      if (value.length >= 4) {
        candidates.push({ value, pattern: name, baseScore });
      }
    }
  }

  const uniqueValues = [...new Set(candidates.map((c) => c.value))];

  const parsed = candidates.map(({ value, pattern, baseScore }) => {
    const normalized = normalizeReference(value);
    const fragment = isFragment(value, uniqueValues);

    return {
      value,
      normalized,
      score: scoreReference(value, pattern, baseScore, uniqueValues),
      isFragment: fragment,
      pattern,
    };
  });

  const byNormalized = new Map<string, ParsedReference>();

  for (const ref of parsed) {
    const existing = byNormalized.get(ref.normalized);
    if (!existing || ref.score > existing.score) {
      byNormalized.set(ref.normalized, ref);
    }
  }

  return [...byNormalized.values()].sort((a, b) => b.score - a.score);
}

export function getBestReference(text: string): ParsedReference | null {
  const references = extractReferences(text);
  return references[0] ?? null;
}
