export type SubscriptionPlanCode = "free" | "starter" | "pro" | "business";

export type SubscriptionQuotas = {
  analyses: number;
  publications: number;
  imports: number;
  url_imports: number;
  serp_requests: number;
};

export type SubscriptionFeatures = {
  bulk_import: boolean;
  marketing_templates: boolean;
  priority_support: boolean;
};

export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED"
  | "PAUSED";

export type SubscriptionPlanRow = {
  id: string;
  code: SubscriptionPlanCode;
  nom: string;
  description: string | null;
  prix_mensuel_cents: number;
  prix_annuel_cents: number;
  quotas: SubscriptionQuotas;
  fonctionnalites: SubscriptionFeatures;
  est_actif: boolean;
  ordre_affichage: number;
  stripe_price_id_mensuel: string | null;
  stripe_price_id_annuel: string | null;
  created_at: string;
  updated_at: string;
};

