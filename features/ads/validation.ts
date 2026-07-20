import type { Ad } from "@/types/ads";
import type { IdentificationResult } from "@/types/identification";
import { isPublishableStatus } from "./status";

export type AdValidationError = {
  field: string;
  message: string;
};

export type AdValidationResult = {
  valid: boolean;
  errors: AdValidationError[];
  warnings: string[];
};

function parseIdentification(result: unknown): IdentificationResult | null {
  if (!result || typeof result !== "object") return null;
  return result as IdentificationResult;
}

export function validateAdForPublish(ad: Ad): AdValidationResult {
  const errors: AdValidationError[] = [];
  const warnings: string[] = [];

  if (!isPublishableStatus(ad.statut)) {
    errors.push({
      field: "statut",
      message:
        "L'annonce doit être « Prêt » pour être publiée. Complétez les champs manquants.",
    });
  }

  if (!ad.titre?.trim()) {
    errors.push({ field: "titre", message: "Le titre est obligatoire." });
  } else if (ad.titre.length > 80) {
    errors.push({
      field: "titre",
      message: "Le titre ne doit pas dépasser 80 caractères.",
    });
  }

  if (!ad.description?.trim()) {
    errors.push({ field: "description", message: "La description est obligatoire." });
  }

  if (!ad.prix_vente || Number(ad.prix_vente) <= 0) {
    errors.push({
      field: "prix_vente",
      message: "Le prix de vente doit être supérieur à 0.",
    });
  }

  if (!ad.ebay_category_id?.trim()) {
    errors.push({
      field: "ebay_category_id",
      message: "La catégorie eBay est obligatoire.",
    });
  }

  if (!ad.ebay_condition_id?.trim()) {
    errors.push({
      field: "ebay_condition_id",
      message: "L'état eBay est obligatoire.",
    });
  }

  if (!ad.sku?.trim()) {
    errors.push({ field: "sku", message: "Le SKU est obligatoire." });
  }

  if (ad.quantite < 1) {
    errors.push({
      field: "quantite",
      message: "La quantité doit être au moins 1.",
    });
  }

  const identification = parseIdentification(ad.resultat_identification);

  if (!identification) {
    warnings.push("Aucun résultat d'identification associé à cette annonce.");
  } else {
    if (identification.needsReview) {
      warnings.push(
        "L'identification nécessite une vérification manuelle avant publication.",
      );
    }
    if (identification.confidence.global < 0.5) {
      warnings.push("La confiance d'identification est faible.");
    }
    if (identification.warnings.length > 0) {
      warnings.push(...identification.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
