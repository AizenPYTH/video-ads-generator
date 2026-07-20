import type { IdentificationResult } from "./identification";

export type AdStatus =
  | "DRAFT"
  | "ANALYZING"
  | "NEEDS_REVIEW"
  | "READY"
  | "VALIDATING"
  | "INVENTORY_CREATED"
  | "OFFER_CREATED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "ARCHIVED"
  | "ENDED"
  | "SENDING_TO_EBAY";

export const AD_STATUS_LABELS: Record<AdStatus, string> = {
  DRAFT: "Brouillon",
  ANALYZING: "Analyse",
  NEEDS_REVIEW: "À vérifier",
  READY: "Prêt à publier",
  VALIDATING: "Validation",
  INVENTORY_CREATED: "Inventaire créé",
  OFFER_CREATED: "Offre créée",
  PUBLISHING: "Publication",
  PUBLISHED: "Publié",
  FAILED: "Erreur",
  ARCHIVED: "Archivé",
  ENDED: "Terminé",
  SENDING_TO_EBAY: "Envoi vers eBay",
};

export type Ad = {
  id: string;
  user_id: string;
  titre: string | null;
  description: string | null;
  statut: AdStatus;
  resultat_identification: IdentificationResult | null;
  prix_achat: string | null;
  prix_vente: string | null;
  quantite: number;
  sku: string | null;
  ebay_category_id: string | null;
  ebay_condition_id: string | null;
  notes: string | null;
};

