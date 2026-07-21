export type UUID = string;
export type Timestamp = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type AdStatut =
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

export type ImportBatchStatut = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "PARTIAL";
export type ImportRowStatut = "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED";
export type UrlImportStatut = "PENDING" | "FETCHING" | "ANALYZING" | "COMPLETED" | "FAILED";
export type AnalysisRunStatut = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type PublicationStatut = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED" | "CANCELLED";
export type SubscriptionStatut =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "PAUSED";
export type EbayPolicyType = "FULFILLMENT" | "PAYMENT" | "RETURN";
export type UsageCounterType = "ANALYSES" | "PUBLICATIONS" | "IMPORTS" | "URL_IMPORTS" | "SERP_REQUESTS";

export type ProfilesRow = {
  id: UUID;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  avatar_url: string | null;
  langue: string;
  fuseau_horaire: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UserSettingsRow = {
  id: UUID;
  user_id: UUID;
  devise: string;
  marche_ebay: string;
  politique_expedition_par_defaut: string | null;
  politique_retour_par_defaut: string | null;
  politique_paiement_par_defaut: string | null;
  lieu_expedition_par_defaut: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type NotificationSettingsRow = {
  id: UUID;
  user_id: UUID;
  email_nouvelle_annonce: boolean;
  email_publication_reussie: boolean;
  email_publication_echouee: boolean;
  email_analyse_terminee: boolean;
  email_quota_atteint: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AdsRow = {
  id: UUID;
  user_id: UUID;
  titre: string | null;
  description: string | null;
  statut: AdStatut;
  resultat_identification: Json | null;
  prix_achat: string | null;
  prix_vente: string | null;
  quantite: number;
  sku: string | null;
  ebay_category_id: string | null;
  ebay_condition_id: string | null;
  notes: string | null;
  metadata: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AdImagesRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID;
  url: string;
  storage_path: string | null;
  ordre: number;
  est_principale: boolean;
  largeur: number | null;
  hauteur: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AdHistoryRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID;
  statut_avant: AdStatut | null;
  statut_apres: AdStatut | null;
  action: string;
  details: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ListingPublicationsRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID;
  ebay_account_id: UUID | null;
  ebay_listing_id: string | null;
  statut: PublicationStatut;
  url_annonce: string | null;
  published_at: Timestamp | null;
  ended_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PublicationAttemptsRow = {
  id: UUID;
  user_id: UUID;
  listing_publication_id: UUID;
  statut: PublicationStatut;
  erreur: string | null;
  reponse_ebay: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AnalyzedProductsRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID | null;
  url_source: string;
  resultat_identification: Json;
  confiance_globale: string | null;
  necessite_revision: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AnalysisRunsRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID | null;
  analyzed_product_id: UUID | null;
  modele_ia: string | null;
  statut: AnalysisRunStatut;
  duree_ms: number | null;
  tokens_utilises: number | null;
  erreur: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type AnalysisEvidenceRow = {
  id: UUID;
  user_id: UUID;
  analysis_run_id: UUID;
  source: string;
  champ: string;
  valeur: string;
  poids: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProductImportBatchesRow = {
  id: UUID;
  user_id: UUID;
  nom_fichier: string;
  statut: ImportBatchStatut;
  nombre_lignes: number;
  lignes_traitees: number;
  lignes_reussies: number;
  lignes_echouees: number;
  erreur: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProductImportRowsRow = {
  id: UUID;
  user_id: UUID;
  batch_id: UUID;
  numero_ligne: number;
  statut: ImportRowStatut;
  donnees_brutes: Json;
  ad_id: UUID | null;
  erreur: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UrlImportsRow = {
  id: UUID;
  user_id: UUID;
  url: string;
  statut: UrlImportStatut;
  ad_id: UUID | null;
  erreur: string | null;
  metadata: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EbayAccountsRow = {
  id: UUID;
  user_id: UUID;
  ebay_user_id: string;
  marketplace: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: Timestamp;
  scopes: string[];
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  connected_at: Timestamp | null;
};

export type EbayPoliciesRow = {
  id: UUID;
  user_id: UUID;
  ebay_account_id: UUID;
  type_politique: EbayPolicyType;
  ebay_policy_id: string;
  nom: string | null;
  est_par_defaut: boolean;
  details: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EbayLocationsRow = {
  id: UUID;
  user_id: UUID;
  ebay_account_id: UUID;
  ebay_location_id: string;
  nom: string | null;
  adresse: Json;
  est_par_defaut: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EbayTokensRow = {
  id: UUID;
  user_id: UUID;
  ebay_account_id: UUID;
  access_token: string;
  refresh_token: string | null;
  expires_at: Timestamp;
  scope: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EbayPublicationAttemptsRow = {
  id: UUID;
  user_id: UUID;
  ad_id: UUID;
  ebay_account_id: UUID;
  listing_publication_id: UUID | null;
  statut: PublicationStatut;
  requete: Json;
  reponse: Json;
  erreur: string | null;
  ebay_offer_id: string | null;
  ebay_inventory_item_sku: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SubscriptionPlansRow = {
  id: UUID;
  code: string;
  nom: string;
  description: string | null;
  prix_mensuel_cents: number;
  prix_annuel_cents: number;
  quotas: Json;
  fonctionnalites: Json;
  est_actif: boolean;
  ordre_affichage: number;
  stripe_price_id_mensuel: string | null;
  stripe_price_id_annuel: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SubscriptionsRow = {
  id: UUID;
  user_id: UUID;
  plan_id: UUID;
  statut: SubscriptionStatut;
  stripe_subscription_id: string | null;
  periode_debut: Timestamp | null;
  periode_fin: Timestamp | null;
  annulation_a_fin_periode: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UsageCountersRow = {
  id: UUID;
  user_id: UUID;
  type_compteur: UsageCounterType;
  periode: string;
  valeur: number;
  limite: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type StripeCustomersRow = {
  id: UUID;
  user_id: UUID;
  stripe_customer_id: string;
  email: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type StripeEventsRow = {
  id: UUID;
  user_id: UUID | null;
  stripe_event_id: string;
  type_evenement: string;
  payload: Json;
  traite: boolean;
  traite_a: Timestamp | null;
  erreur: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type MarketingTemplatesRow = {
  id: UUID;
  user_id: UUID;
  nom: string;
  type_template: string;
  contenu: Json;
  est_par_defaut: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type MarketingImagesRow = {
  id: UUID;
  user_id: UUID;
  template_id: UUID | null;
  url: string;
  storage_path: string | null;
  type_image: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SerpapiCacheRow = {
  id: UUID;
  user_id: UUID;
  cle_cache: string;
  requete: string;
  reponse: Json;
  expire_a: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type UrlImportCacheRow = {
  id: UUID;
  user_id: UUID;
  url_hash: string;
  url: string;
  contenu: Json;
  expire_a: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type WorkspacesRow = {
  id: UUID;
  plan_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type WorkspaceUsageRow = {
  id?: UUID;
  workspace_id: UUID;
  plan_id: string;
  period_start: Timestamp;
  analyses_used: number;
  publications_used: number;
  imports_used: number;
  url_imports_used: number;
};

export type UsageReservationsRow = {
  id: UUID;
  workspace_id: UUID;
  plan_id: string;
  metric: "analyses" | "publications" | "imports" | "url_imports";
  amount: number;
  status: "pending" | "confirmed" | "restored";
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type EbayConnectionsRow = {
  id: UUID;
  workspace_id: UUID;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: Timestamp;
  updated_at: Timestamp;
};

export type ReferenceSearchCacheRow = {
  id: UUID;
  reference: string;
  normalized_reference: string;
  data: Json;
  cached_at: Timestamp;
  expires_at: Timestamp;
};

export type StripeWebhookEventsRow = {
  id: UUID;
  event_id: string;
  event_type: string;
  processed_at: Timestamp;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfilesRow };
      user_settings: { Row: UserSettingsRow };
      notification_settings: { Row: NotificationSettingsRow };

      ads: { Row: AdsRow };
      ad_images: { Row: AdImagesRow };
      ad_history: { Row: AdHistoryRow };

      listing_publications: { Row: ListingPublicationsRow };
      publication_attempts: { Row: PublicationAttemptsRow };

      analyzed_products: { Row: AnalyzedProductsRow };
      analysis_runs: { Row: AnalysisRunsRow };
      analysis_evidence: { Row: AnalysisEvidenceRow };

      product_import_batches: { Row: ProductImportBatchesRow };
      product_import_rows: { Row: ProductImportRowsRow };
      url_imports: { Row: UrlImportsRow };

      ebay_accounts: { Row: EbayAccountsRow };
      ebay_policies: { Row: EbayPoliciesRow };
      ebay_locations: { Row: EbayLocationsRow };
      ebay_tokens: { Row: EbayTokensRow };
      ebay_publication_attempts: { Row: EbayPublicationAttemptsRow };

      subscription_plans: { Row: SubscriptionPlansRow };
      subscriptions: { Row: SubscriptionsRow };
      usage_counters: { Row: UsageCountersRow };

      stripe_customers: { Row: StripeCustomersRow };
      stripe_events: { Row: StripeEventsRow };

      marketing_templates: { Row: MarketingTemplatesRow };
      marketing_images: { Row: MarketingImagesRow };

      serpapi_cache: { Row: SerpapiCacheRow };
      url_import_cache: { Row: UrlImportCacheRow };

      workspaces: { Row: WorkspacesRow };
      workspace_usage: { Row: WorkspaceUsageRow };
      usage_reservations: { Row: UsageReservationsRow };
      ebay_connections: { Row: EbayConnectionsRow };
      reference_search_cache: { Row: ReferenceSearchCacheRow };
      stripe_webhook_events: { Row: StripeWebhookEventsRow };
    };
  };
};

