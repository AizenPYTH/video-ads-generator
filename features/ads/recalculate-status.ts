/**
 * Recalcule le statut d'une annonce à partir des champs obligatoires
 * et de la confiance catégorie (seuil ≥ 94 %).
 */
import type { AdStatus } from "@/types/ads";

/** Seuil « certain » : confiance plafonnée à 0,94 → READY si ≥ 0,94. */
export const CATEGORY_READY_CONFIDENCE = 0.94;

export type AdStatusInput = {
  titre?: string | null;
  description?: string | null;
  prix_vente?: string | number | null;
  quantite?: number | null;
  ebay_category_id?: string | null;
  ebay_condition_id?: string | null;
  sku?: string | null;
  categoryStatus?: "resolved" | "needs_review" | "missing" | string | null;
  categoryAmbiguous?: boolean;
  /** Confiance Taxonomy (0–1). READY seulement si ≥ CATEGORY_READY_CONFIDENCE. */
  categoryConfidence?: number | null;
  technicalError?: boolean;
};

export type ChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  field: string;
};

export function buildAdChecklist(input: AdStatusInput): ChecklistItem[] {
  const price = Number(input.prix_vente);
  return [
    {
      id: "titre",
      field: "titre",
      label: "Titre",
      ok: Boolean(input.titre?.trim()),
    },
    {
      id: "prix",
      field: "prix_vente",
      label: "Prix (> 0)",
      ok: Number.isFinite(price) && price > 0,
    },
    {
      id: "quantite",
      field: "quantite",
      label: "Quantité",
      ok: (input.quantite ?? 0) >= 1,
    },
    {
      id: "condition",
      field: "ebay_condition_id",
      label: "État eBay",
      ok: Boolean(input.ebay_condition_id?.trim()),
    },
    {
      id: "categorie",
      field: "ebay_category_id",
      label: "Catégorie eBay",
      ok: Boolean(input.ebay_category_id?.trim()),
    },
    {
      id: "sku",
      field: "sku",
      label: "Référence / SKU",
      ok: Boolean(input.sku?.trim()),
    },
  ];
}

export function isCategoryConfidenceReady(
  confidence: number | null | undefined,
): boolean {
  return typeof confidence === "number" && confidence >= CATEGORY_READY_CONFIDENCE;
}

export function recalculateAdStatus(input: AdStatusInput): AdStatus {
  if (input.technicalError) return "FAILED";

  const checklist = buildAdChecklist(input);
  const incomplete = checklist.some((item) => !item.ok);

  if (incomplete) return "DRAFT";

  if (!input.ebay_category_id?.trim()) {
    if (
      input.categoryAmbiguous ||
      input.categoryStatus === "needs_review" ||
      input.categoryStatus === "missing"
    ) {
      return "NEEDS_REVIEW";
    }
    return "DRAFT";
  }

  // Confiance fournie : READY uniquement si ≥ 94 %
  if (typeof input.categoryConfidence === "number") {
    if (!isCategoryConfidenceReady(input.categoryConfidence)) {
      return "NEEDS_REVIEW";
    }
    return "READY";
  }

  // Sans score : s'appuyer sur le statut de résolution
  if (
    input.categoryAmbiguous ||
    input.categoryStatus === "needs_review" ||
    input.categoryStatus === "missing"
  ) {
    return "NEEDS_REVIEW";
  }

  return "READY";
}

export function statusLabelFr(status: string | null | undefined): string {
  switch (status) {
    case "READY":
      return "Prêt à publier";
    case "NEEDS_REVIEW":
      return "À vérifier";
    case "FAILED":
      return "Erreur";
    case "PUBLISHED":
      return "Publié";
    case "DRAFT":
    case "ANALYZING":
    default:
      return "Brouillon";
  }
}
