import type { IdentificationResult } from "@/types/identification";
import type { SerpSearchResponse } from "@/services/reference-search/serpapi";
import type { OcrResult } from "@/services/google-vision/ocr";

export type CoherenceInput = {
  result: IdentificationResult;
  ocrText?: string;
  serpResults?: SerpSearchResponse;
  notes?: string;
};

export type CoherenceValidation = {
  result: IdentificationResult;
  contradictions: string[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function textContains(haystack: string, needle: string | null | undefined): boolean {
  if (!needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function checkOcrConsistency(
  result: IdentificationResult,
  ocrText: string,
  contradictions: string[],
): void {
  const ocr = ocrText.toLowerCase();

  if (result.brand && !textContains(ocr, result.brand)) {
    contradictions.push(
      `La marque identifiée (${result.brand}) n'apparaît pas dans le texte OCR.`,
    );
  }

  if (result.partNumber && !textContains(ocr, result.partNumber)) {
    contradictions.push(
      `La référence identifiée (${result.partNumber}) n'apparaît pas dans le texte OCR.`,
    );
  }

  if (result.model && !textContains(ocr, result.model)) {
    contradictions.push(
      `Le modèle identifié (${result.model}) n'apparaît pas dans le texte OCR.`,
    );
  }
}

function checkSerpConsistency(
  result: IdentificationResult,
  serp: SerpSearchResponse,
  contradictions: string[],
): void {
  const combinedText = serp.results
    .map((r) => `${r.title} ${r.snippet}`)
    .join(" ")
    .toLowerCase();

  if (result.partNumber && !textContains(combinedText, result.partNumber)) {
    contradictions.push(
      `La référence ${result.partNumber} n'est pas confirmée par les résultats web.`,
    );
  }

  if (result.brand && !textContains(combinedText, result.brand)) {
    contradictions.push(
      `La marque ${result.brand} n'est pas confirmée par les résultats web.`,
    );
  }
}

function checkNotesConsistency(
  result: IdentificationResult,
  notes: string,
  contradictions: string[],
): void {
  const notesLower = notes.toLowerCase();

  if (result.soldItem.type) {
    const type = normalize(result.soldItem.type);
    if (
      (type.includes("pièce") || type.includes("part")) &&
      notesLower.includes("complet") &&
      !notesLower.includes("pièce")
    ) {
      contradictions.push(
        "Les notes indiquent un appareil complet mais le produit est identifié comme pièce détachée.",
      );
    }
  }

  if (result.category && notes.length > 0) {
    const categoryWords = result.category.toLowerCase().split(/\s+/);
    const hasOverlap = categoryWords.some(
      (word) => word.length > 3 && notesLower.includes(word),
    );
    if (!hasOverlap && result.confidence.global > 0.7) {
      contradictions.push(
        "La catégorie identifiée ne correspond pas aux notes fournies.",
      );
    }
  }
}

function checkInternalConsistency(
  result: IdentificationResult,
  contradictions: string[],
): void {
  if (
    result.soldItem.isCompleteDevice &&
    result.soldItem.isReplacementPart
  ) {
    contradictions.push(
      "Le produit ne peut pas être à la fois un appareil complet et une pièce de rechange.",
    );
  }

  if (result.compatibility.brand && result.brand) {
    if (
      normalize(result.compatibility.brand) !== normalize(result.brand) &&
      !textContains(result.compatibility.brand, result.brand)
    ) {
      contradictions.push(
        `Incohérence entre la marque (${result.brand}) et la compatibilité (${result.compatibility.brand}).`,
      );
    }
  }

  if (result.compatibility.modelNumber && result.model) {
    if (normalize(result.compatibility.modelNumber) !== normalize(result.model)) {
      contradictions.push(
        `Incohérence entre le modèle (${result.model}) et le numéro de compatibilité (${result.compatibility.modelNumber}).`,
      );
    }
  }
}

export function validateCoherence(input: CoherenceInput): CoherenceValidation {
  const contradictions: string[] = [];

  checkInternalConsistency(input.result, contradictions);

  if (input.ocrText) {
    checkOcrConsistency(input.result, input.ocrText, contradictions);
  }

  if (input.serpResults) {
    checkSerpConsistency(input.result, input.serpResults, contradictions);
  }

  if (input.notes?.trim()) {
    checkNotesConsistency(input.result, input.notes, contradictions);
  }

  const updatedResult: IdentificationResult = {
    ...input.result,
    needsReview: input.result.needsReview || contradictions.length > 0,
    warnings: [...new Set([...input.result.warnings, ...contradictions])],
  };

  if (contradictions.length > 0 && updatedResult.confidence.global > 0.6) {
    updatedResult.confidence = {
      ...updatedResult.confidence,
      global: Math.max(0.4, updatedResult.confidence.global - 0.2),
    };
  }

  return { result: updatedResult, contradictions };
}

export type { OcrResult };
