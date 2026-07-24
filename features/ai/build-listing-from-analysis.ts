import type { IdentificationResult } from "@/types/identification";

const EBAY_TITLE_MAX = 80;

/** Titre eBay à partir de l’identification + OCR (jamais inventé hors données). */
export function buildAdTitleFromAnalysis(
  result: IdentificationResult,
  ocrText: string,
): string {
  const candidates = [
    result.soldItem?.name,
    [result.soldItem?.type, result.compatibility?.device || result.model, result.partNumber]
      .filter(Boolean)
      .join(" "),
    [result.brand, result.model, result.partNumber].filter(Boolean).join(" "),
    [result.soldItem?.type, result.brand, result.model].filter(Boolean).join(" "),
  ]
    .map((t) => (t ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 4);

  if (candidates[0]) {
    return candidates[0].slice(0, EBAY_TITLE_MAX);
  }

  // Fallback OCR : premières lignes marketing utiles
  const ocrLines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 4)
    .filter(
      (l) =>
        !/^(support wholesale|yopolean|www\.|http)/i.test(l) &&
        !/^(cpu|i5|i7|256gb|512gb)$/i.test(l),
    );

  const joined = ocrLines.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
  if (joined.length >= 4) return joined.slice(0, EBAY_TITLE_MAX);

  return "Produit à identifier";
}

/**
 * Enrichit le résultat OpenAI à partir de l’OCR marketing visible
 * (ex. « A1706 Motherboard », « With Touch ID », « 2016 2017 »).
 * Ne remplace jamais une valeur déjà présente.
 */
export function enrichIdentificationFromOcr(
  result: IdentificationResult,
  ocrText: string,
): IdentificationResult {
  const text = ocrText.replace(/\s+/g, " ").trim();
  if (!text) return result;

  const upper = text.toUpperCase();
  const next: IdentificationResult = {
    ...result,
    soldItem: { ...result.soldItem },
    compatibility: { ...result.compatibility },
    confidence: { ...result.confidence },
    itemSpecifics: { ...result.itemSpecifics },
    accessories: [...(result.accessories ?? [])],
    defects: [...(result.defects ?? [])],
    evidence: [...(result.evidence ?? [])],
    alternatives: [...(result.alternatives ?? [])],
    warnings: [...(result.warnings ?? [])],
  };

  const modelMatch = upper.match(/\b(A\d{4}[A-Z0-9]*)\b/);
  if (modelMatch?.[1]) {
    next.compatibility.modelNumber ??= modelMatch[1];
    next.model ??= modelMatch[1];
    next.partNumber ??= modelMatch[1];
    next.evidence.push({
      source: "ocr",
      field: "modelNumber",
      value: modelMatch[1],
      weight: 0.9,
    });
  }

  if (/MOTHERBOARD|LOGIC BOARD|CARTE\s*M[EÈ]RE|MAINBOARD/i.test(text)) {
    next.soldItem.type ??= "Carte mère / Logic Board";
    next.soldItem.isReplacementPart = true;
    next.soldItem.isCompleteDevice = false;
    next.category ??= "Pièces détachées informatiques";
    next.itemSpecifics.Type ??= "Carte mère";
  }

  if (/TOUCH\s*ID/i.test(text)) {
    next.itemSpecifics["Touch ID"] ??= "Oui";
    if (!next.soldItem.name && modelMatch?.[1]) {
      next.soldItem.name = `Carte mère ${modelMatch[1]} avec Touch ID`;
    }
  }

  if (/MACBOOK|APPLE/i.test(text) || /\bA1[7-9]\d{2}\b/.test(upper)) {
    next.compatibility.brand ??= "Apple";
    next.brand ??= next.brand; // ne force pas la marque pièce (= souvent OEM)
    next.compatibility.device ??=
      next.compatibility.device ??
      (modelMatch?.[1] ? `MacBook Pro ${modelMatch[1]}` : "MacBook Pro");
  }

  const years = [...upper.matchAll(/\b(20[12]\d)\b/g)].map((m) => m[1]);
  if (years.length > 0) {
    const uniq = [...new Set(years)].join("/");
    next.itemSpecifics.Année ??= uniq;
    next.itemSpecifics.Year ??= uniq;
  }

  if (!next.soldItem.name) {
    const parts = [
      next.soldItem.type,
      next.compatibility.modelNumber || next.model,
      next.itemSpecifics["Touch ID"] === "Oui" ? "avec Touch ID" : null,
    ].filter(Boolean);
    if (parts.length >= 2) {
      next.soldItem.name = parts.join(" ");
    }
  }

  // Si OpenAI a tout laissé vide mais OCR riche → confiance minimale
  const hadNothing =
    !result.soldItem?.name &&
    !result.brand &&
    !result.model &&
    !result.partNumber &&
    !result.compatibility?.modelNumber;
  if (hadNothing && (next.model || next.soldItem.name || next.soldItem.type)) {
    next.confidence.global = Math.max(next.confidence.global, 0.55);
    next.needsReview = true;
    next.warnings.push(
      "Identification reconstruite principalement depuis le texte OCR de l’image.",
    );
  }

  return next;
}

export function buildItemSpecificsFromIdentification(
  result: IdentificationResult,
): Record<string, string> {
  const specs: Record<string, string> = {};
  const push = (k: string, v: string | null | undefined) => {
    if (v?.trim()) specs[k] = v.trim();
  };

  push("Brand", result.brand);
  push("Marque", result.brand);
  push("Model", result.model);
  push("Modèle", result.model);
  push("MPN", result.partNumber);
  push("Type", result.soldItem?.type);
  push("Compatible Brand", result.compatibility?.brand);
  push("Marque compatible", result.compatibility?.brand);
  push("Compatible Device", result.compatibility?.device);
  push("Appareil compatible", result.compatibility?.device);
  push(
    "Compatible Model Number",
    result.compatibility?.modelNumber,
  );
  push("Couleur", result.color);
  push("Color", result.color);

  for (const [k, v] of Object.entries(result.itemSpecifics ?? {})) {
    if (typeof v === "string" && v.trim()) specs[k] ??= v.trim();
    else if (Array.isArray(v) && v[0]) specs[k] ??= String(v[0]);
  }

  return specs;
}
