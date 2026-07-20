import type { EbayPolicyType } from "./database";

export type EbayAccount = {
  id: string;
  user_id: string;
  ebay_user_id: string;
  nom_compte: string | null;
  marche: string;
  est_actif: boolean;
  created_at: string;
  updated_at: string;
};

export type EbayPolicy = {
  id: string;
  user_id: string;
  ebay_account_id: string;
  type_politique: EbayPolicyType;
  ebay_policy_id: string;
  nom: string | null;
  est_par_defaut: boolean;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EbayLocation = {
  id: string;
  user_id: string;
  ebay_account_id: string;
  ebay_location_id: string;
  nom: string | null;
  adresse: Record<string, unknown>;
  est_par_defaut: boolean;
  created_at: string;
  updated_at: string;
};

export type EbayToken = {
  id: string;
  user_id: string;
  ebay_account_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
  created_at: string;
  updated_at: string;
};

export type EbayPublicationAttempt = {
  id: string;
  user_id: string;
  ad_id: string;
  ebay_account_id: string;
  listing_publication_id: string | null;
  statut:
    | "PENDING"
    | "IN_PROGRESS"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED";
  requete: Record<string, unknown>;
  reponse: Record<string, unknown>;
  erreur: string | null;
  ebay_offer_id: string | null;
  ebay_inventory_item_sku: string | null;
  created_at: string;
  updated_at: string;
};

