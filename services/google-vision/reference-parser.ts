export interface ParsedReference {
  value: string;
  normalized: string;
  score: number;
  isFragment: boolean;
  pattern: string;
}

const REFERENCE_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  baseScore: number;
}> = [
  { name: "full_pcb", regex: /\b\d{3}[-.\s]?\d{5}[-.\s]?[A-Z0-9]+\b/gi, baseScore: 100 },
  { name: "pcb_dash", regex: /\b\d{3}[-.\s]?\d{5}\b/gi, baseScore: 90 },
  { name: "fpc", regex: /\bFPC\d{5,}[A-Z0-9-]*\b/gi, baseScore: 85 },
  {
    name: "pcb_prefix",
    regex: /\bPCB[-\s.]?\d{3,}[-\s.]?\d{3,}[A-Z0-9-]*\b/gi,
    baseScore: 80,
  },
  {
    name: "alnum_dash",
    regex: /\b[A-Z]{2,4}[-.\s]?\d{3,}[-.\s]?\d{3,}[A-Z0-9-]*\b/gi,
    baseScore: 75,
  },
  { name: "main_fpc", regex: /\b[A-Z0-9]*FPC[_A-Z0-9.-]+\b/gi, baseScore: 82 },
  { name: "short_pcb_suffix", regex: /\b\d{5}[-.\s]?[A-Z0-9]+\b/gi, baseScore: 70 },
  { name: "model_number", regex: /\b[A-Z]{1,3}\d{3,}[A-Z0-9-]{0,10}\b/gi, baseScore: 60 },
  { name: "pn_label", regex: /\bP\.?\s*N\.?\s*[:#]?\s*[A-Z0-9][A-Z0-9.-\s]{3,}\b/gi, baseScore: 88 },
  { name: "numeric_fragment", regex: /\b\d{4,6}\b/g, baseScore: 30 },
];

function normalizeReference(value: string): string {
  return value
    .toUpperCase()
    .replace(/^P\.?\s*N\.?\s*[:#]?\s*/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Joint les lignes OCR proches pour reconstruire des refs multi-lignes
 * (ex. "820-" puis "01779-A").
 */
export function joinNearbyOcrLines(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return text;

  const merged: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let current = lines[i];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const currentEndsPartial =
        /[-./]$/.test(current) ||
        /\d{2,}$/.test(current) ||
        /^(P\.?N\.?|REF|PN)$/i.test(current);
      const nextStartsPartial =
        /^[-./]/.test(next) ||
        /^\d{3,}/.test(next) ||
        /^[A-Z]$/i.test(next) ||
        /^[A-Z0-9-]{2,12}$/i.test(next);

      if (
        currentEndsPartial ||
        (nextStartsPartial && current.length + next.length <= 28)
      ) {
        const joiner =
          /[-./]$/.test(current) || /^[-./]/.test(next) ? "" : "-";
        current = `${current}${joiner}${next}`.replace(/--+/g, "-");
        j += 1;
        continue;
      }
      break;
    }
    merged.push(current);
    i = j > i + 1 ? j : i + 1;
  }

  // Texte original + lignes jointes (pour ne pas perdre de contexte)
  return `${text}\n${merged.join("\n")}`;
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
  const expanded = joinNearbyOcrLines(text);
  // Aussi une version sans retours ligne pour patterns continus
  const flat = expanded.replace(/\r?\n/g, " ");
  const haystack = `${expanded}\n${flat}`;

  const candidates: Array<{
    value: string;
    pattern: string;
    baseScore: number;
  }> = [];

  for (const { name, regex, baseScore } of REFERENCE_PATTERNS) {
    const matches = haystack.matchAll(regex);
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
