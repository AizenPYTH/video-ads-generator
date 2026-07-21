import type { Ad } from "@/types/ads";
import type { IdentificationResult } from "@/types/identification";
import { buildAdChecklist } from "./recalculate-status";

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

/**
 * Publier = champs obligatoires OK.
 * Le statut DB (FAILED / SENDING_TO_EBAY / …) ne bloque plus : ce sont des retries.
 */
export function validateAdForPublish(ad: Ad): AdValidationResult {
  const errors: AdValidationError[] = [];
  const warnings: string[] = [];

  if (ad.statut === "PUBLISHED") {
    errors.push({
      field: "statut",
      message: "Cette annonce est déjà publiée sur eBay.",
    });
  }

  const checklist = buildAdChecklist({
    titre: ad.titre,
    description: ad.description,
    prix_vente: ad.prix_vente,
    quantite: ad.quantite,
    ebay_category_id: ad.ebay_category_id,
    ebay_condition_id: ad.ebay_condition_id,
    sku: ad.sku,
  });

  for (const item of checklist) {
    if (!item.ok) {
      errors.push({
        field: item.field,
        message: `${item.label} est obligatoire.`,
      });
    }
  }

  if (!String(ad.description ?? "").trim()) {
    errors.push({
      field: "description",
      message: "La description est obligatoire.",
    });
  }

  const title = ad.titre == null ? "" : String(ad.titre);
  if (title.length > 80) {
    errors.push({
      field: "titre",
      message: "Le titre ne doit pas dépasser 80 caractères.",
    });
  }

  const identification = parseIdentification(ad.resultat_identification);

  if (!identification) {
    warnings.push(
      "Pas d’analyse photo associée (normal pour un import URL/CSV).",
    );
  } else {
    if (identification.needsReview) {
      warnings.push(
        "L'identification suggère une vérification manuelle avant publication.",
      );
    }
    if (
      identification.confidence?.global != null &&
      identification.confidence.global < 0.5
    ) {
      warnings.push("La confiance d'identification est faible.");
    }
    if (
      Array.isArray(identification.warnings) &&
      identification.warnings.length > 0
    ) {
      warnings.push(...identification.warnings);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
