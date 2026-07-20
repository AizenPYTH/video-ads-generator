-- SNOWOLF SaaS — schéma initial
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.ad_statut AS ENUM (
  'DRAFT',
  'ANALYZING',
  'NEEDS_REVIEW',
  'READY',
  'VALIDATING',
  'INVENTORY_CREATED',
  'OFFER_CREATED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'ARCHIVED',
  'ENDED',
  'SENDING_TO_EBAY'
);

CREATE TYPE public.import_batch_statut AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'PARTIAL'
);

CREATE TYPE public.import_row_statut AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'SKIPPED'
);

CREATE TYPE public.url_import_statut AS ENUM (
  'PENDING',
  'FETCHING',
  'ANALYZING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE public.analysis_run_statut AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE public.publication_statut AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'SUCCESS',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE public.subscription_statut AS ENUM (
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'PAUSED'
);

CREATE TYPE public.ebay_policy_type AS ENUM (
  'FULFILLMENT',
  'PAYMENT',
  'RETURN'
);

CREATE TYPE public.usage_counter_type AS ENUM (
  'ANALYSES',
  'PUBLICATIONS',
  'IMPORTS',
  'URL_IMPORTS',
  'SERP_REQUESTS'
);

-- ---------------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Profils & paramètres utilisateur
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  prenom TEXT,
  nom TEXT,
  avatar_url TEXT,
  langue TEXT NOT NULL DEFAULT 'fr',
  fuseau_horaire TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  devise TEXT NOT NULL DEFAULT 'EUR',
  marche_ebay TEXT NOT NULL DEFAULT 'EBAY_FR',
  politique_expedition_par_defaut TEXT,
  politique_retour_par_defaut TEXT,
  politique_paiement_par_defaut TEXT,
  lieu_expedition_par_defaut TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_nouvelle_annonce BOOLEAN NOT NULL DEFAULT true,
  email_publication_reussie BOOLEAN NOT NULL DEFAULT true,
  email_publication_echouee BOOLEAN NOT NULL DEFAULT true,
  email_analyse_terminee BOOLEAN NOT NULL DEFAULT true,
  email_quota_atteint BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Annonces
-- ---------------------------------------------------------------------------

CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  titre TEXT,
  description TEXT,
  statut public.ad_statut NOT NULL DEFAULT 'DRAFT',
  resultat_identification JSONB,
  prix_achat NUMERIC(12, 2),
  prix_vente NUMERIC(12, 2),
  quantite INTEGER NOT NULL DEFAULT 1,
  sku TEXT,
  ebay_category_id TEXT,
  ebay_condition_id TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ad_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  est_principale BOOLEAN NOT NULL DEFAULT false,
  largeur INTEGER,
  hauteur INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ad_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  statut_avant public.ad_statut,
  statut_apres public.ad_statut,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Publications
-- ---------------------------------------------------------------------------

CREATE TABLE public.listing_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  ebay_account_id UUID,
  ebay_listing_id TEXT,
  statut public.publication_statut NOT NULL DEFAULT 'PENDING',
  url_annonce TEXT,
  published_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_publication_id UUID NOT NULL REFERENCES public.listing_publications (id) ON DELETE CASCADE,
  statut public.publication_statut NOT NULL DEFAULT 'PENDING',
  erreur TEXT,
  reponse_ebay JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Analyse produit
-- ---------------------------------------------------------------------------

CREATE TABLE public.analyzed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  url_source TEXT,
  resultat_identification JSONB,
  confiance_globale NUMERIC(5, 4),
  necessite_revision BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  analyzed_product_id UUID REFERENCES public.analyzed_products (id) ON DELETE SET NULL,
  modele_ia TEXT,
  statut public.analysis_run_statut NOT NULL DEFAULT 'PENDING',
  duree_ms INTEGER,
  tokens_utilises INTEGER,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analysis_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  analysis_run_id UUID NOT NULL REFERENCES public.analysis_runs (id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  champ TEXT NOT NULL,
  valeur TEXT NOT NULL,
  poids NUMERIC(5, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Imports
-- ---------------------------------------------------------------------------

CREATE TABLE public.product_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom_fichier TEXT NOT NULL,
  statut public.import_batch_statut NOT NULL DEFAULT 'PENDING',
  nombre_lignes INTEGER NOT NULL DEFAULT 0,
  lignes_traitees INTEGER NOT NULL DEFAULT 0,
  lignes_reussies INTEGER NOT NULL DEFAULT 0,
  lignes_echouees INTEGER NOT NULL DEFAULT 0,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.product_import_batches (id) ON DELETE CASCADE,
  numero_ligne INTEGER NOT NULL,
  statut public.import_row_statut NOT NULL DEFAULT 'PENDING',
  donnees_brutes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.url_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  statut public.url_import_statut NOT NULL DEFAULT 'PENDING',
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  erreur TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- eBay
-- ---------------------------------------------------------------------------

CREATE TABLE public.ebay_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_user_id TEXT NOT NULL,
  nom_compte TEXT,
  marche TEXT NOT NULL DEFAULT 'EBAY_FR',
  est_actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ebay_user_id)
);

ALTER TABLE public.listing_publications
  ADD CONSTRAINT listing_publications_ebay_account_id_fkey
  FOREIGN KEY (ebay_account_id) REFERENCES public.ebay_accounts (id) ON DELETE SET NULL;

CREATE TABLE public.ebay_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  type_politique public.ebay_policy_type NOT NULL,
  ebay_policy_id TEXT NOT NULL,
  nom TEXT,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ebay_account_id, type_politique, ebay_policy_id)
);

CREATE TABLE public.ebay_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  ebay_location_id TEXT NOT NULL,
  nom TEXT,
  adresse JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ebay_account_id, ebay_location_id)
);

CREATE TABLE public.ebay_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL UNIQUE REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ebay_publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  listing_publication_id UUID REFERENCES public.listing_publications (id) ON DELETE SET NULL,
  statut public.publication_statut NOT NULL DEFAULT 'PENDING',
  requete JSONB,
  reponse JSONB,
  erreur TEXT,
  ebay_offer_id TEXT,
  ebay_inventory_item_sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Abonnements & facturation
-- ---------------------------------------------------------------------------

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  prix_mensuel_cents INTEGER NOT NULL DEFAULT 0,
  prix_annuel_cents INTEGER NOT NULL DEFAULT 0,
  quotas JSONB NOT NULL DEFAULT '{}'::jsonb,
  fonctionnalites JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_actif BOOLEAN NOT NULL DEFAULT true,
  ordre_affichage INTEGER NOT NULL DEFAULT 0,
  stripe_price_id_mensuel TEXT,
  stripe_price_id_annuel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans (id),
  statut public.subscription_statut NOT NULL DEFAULT 'INCOMPLETE',
  stripe_subscription_id TEXT UNIQUE,
  periode_debut TIMESTAMPTZ,
  periode_fin TIMESTAMPTZ,
  annulation_a_fin_periode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type_compteur public.usage_counter_type NOT NULL,
  periode TEXT NOT NULL,
  valeur INTEGER NOT NULL DEFAULT 0,
  limite INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type_compteur, periode)
);

CREATE TABLE public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type_evenement TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  traite BOOLEAN NOT NULL DEFAULT false,
  traite_a TIMESTAMPTZ,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------------

CREATE TABLE public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_template TEXT NOT NULL DEFAULT 'description',
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.marketing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.marketing_templates (id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  type_image TEXT NOT NULL DEFAULT 'overlay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Cache
-- ---------------------------------------------------------------------------

CREATE TABLE public.serpapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  cle_cache TEXT NOT NULL UNIQUE,
  requete TEXT NOT NULL,
  reponse JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.url_import_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

CREATE INDEX idx_profiles_created_at ON public.profiles (created_at);

CREATE INDEX idx_user_settings_user_id ON public.user_settings (user_id);
CREATE INDEX idx_user_settings_created_at ON public.user_settings (created_at);

CREATE INDEX idx_notification_settings_user_id ON public.notification_settings (user_id);
CREATE INDEX idx_notification_settings_created_at ON public.notification_settings (created_at);

CREATE INDEX idx_ads_user_id ON public.ads (user_id);
CREATE INDEX idx_ads_statut ON public.ads (statut);
CREATE INDEX idx_ads_created_at ON public.ads (created_at);

CREATE INDEX idx_ad_images_user_id ON public.ad_images (user_id);
CREATE INDEX idx_ad_images_ad_id ON public.ad_images (ad_id);
CREATE INDEX idx_ad_images_created_at ON public.ad_images (created_at);

CREATE INDEX idx_ad_history_user_id ON public.ad_history (user_id);
CREATE INDEX idx_ad_history_ad_id ON public.ad_history (ad_id);
CREATE INDEX idx_ad_history_created_at ON public.ad_history (created_at);

CREATE INDEX idx_listing_publications_user_id ON public.listing_publications (user_id);
CREATE INDEX idx_listing_publications_statut ON public.listing_publications (statut);
CREATE INDEX idx_listing_publications_created_at ON public.listing_publications (created_at);

CREATE INDEX idx_publication_attempts_user_id ON public.publication_attempts (user_id);
CREATE INDEX idx_publication_attempts_statut ON public.publication_attempts (statut);
CREATE INDEX idx_publication_attempts_created_at ON public.publication_attempts (created_at);

CREATE INDEX idx_analyzed_products_user_id ON public.analyzed_products (user_id);
CREATE INDEX idx_analyzed_products_created_at ON public.analyzed_products (created_at);

CREATE INDEX idx_analysis_runs_user_id ON public.analysis_runs (user_id);
CREATE INDEX idx_analysis_runs_statut ON public.analysis_runs (statut);
CREATE INDEX idx_analysis_runs_created_at ON public.analysis_runs (created_at);

CREATE INDEX idx_analysis_evidence_user_id ON public.analysis_evidence (user_id);
CREATE INDEX idx_analysis_evidence_created_at ON public.analysis_evidence (created_at);

CREATE INDEX idx_product_import_batches_user_id ON public.product_import_batches (user_id);
CREATE INDEX idx_product_import_batches_statut ON public.product_import_batches (statut);
CREATE INDEX idx_product_import_batches_created_at ON public.product_import_batches (created_at);

CREATE INDEX idx_product_import_rows_user_id ON public.product_import_rows (user_id);
CREATE INDEX idx_product_import_rows_statut ON public.product_import_rows (statut);
CREATE INDEX idx_product_import_rows_created_at ON public.product_import_rows (created_at);

CREATE INDEX idx_url_imports_user_id ON public.url_imports (user_id);
CREATE INDEX idx_url_imports_statut ON public.url_imports (statut);
CREATE INDEX idx_url_imports_created_at ON public.url_imports (created_at);

CREATE INDEX idx_ebay_accounts_user_id ON public.ebay_accounts (user_id);
CREATE INDEX idx_ebay_accounts_created_at ON public.ebay_accounts (created_at);

CREATE INDEX idx_ebay_policies_user_id ON public.ebay_policies (user_id);
CREATE INDEX idx_ebay_policies_created_at ON public.ebay_policies (created_at);

CREATE INDEX idx_ebay_locations_user_id ON public.ebay_locations (user_id);
CREATE INDEX idx_ebay_locations_created_at ON public.ebay_locations (created_at);

CREATE INDEX idx_ebay_tokens_user_id ON public.ebay_tokens (user_id);
CREATE INDEX idx_ebay_tokens_created_at ON public.ebay_tokens (created_at);

CREATE INDEX idx_ebay_publication_attempts_user_id ON public.ebay_publication_attempts (user_id);
CREATE INDEX idx_ebay_publication_attempts_statut ON public.ebay_publication_attempts (statut);
CREATE INDEX idx_ebay_publication_attempts_created_at ON public.ebay_publication_attempts (created_at);

CREATE INDEX idx_subscription_plans_created_at ON public.subscription_plans (created_at);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_statut ON public.subscriptions (statut);
CREATE INDEX idx_subscriptions_created_at ON public.subscriptions (created_at);

CREATE INDEX idx_usage_counters_user_id ON public.usage_counters (user_id);
CREATE INDEX idx_usage_counters_created_at ON public.usage_counters (created_at);

CREATE INDEX idx_stripe_customers_user_id ON public.stripe_customers (user_id);
CREATE INDEX idx_stripe_customers_created_at ON public.stripe_customers (created_at);

CREATE INDEX idx_stripe_events_user_id ON public.stripe_events (user_id);
CREATE INDEX idx_stripe_events_created_at ON public.stripe_events (created_at);

CREATE INDEX idx_marketing_templates_user_id ON public.marketing_templates (user_id);
CREATE INDEX idx_marketing_templates_created_at ON public.marketing_templates (created_at);

CREATE INDEX idx_marketing_images_user_id ON public.marketing_images (user_id);
CREATE INDEX idx_marketing_images_created_at ON public.marketing_images (created_at);

CREATE INDEX idx_serpapi_cache_user_id ON public.serpapi_cache (user_id);
CREATE INDEX idx_serpapi_cache_created_at ON public.serpapi_cache (created_at);

CREATE INDEX idx_url_import_cache_user_id ON public.url_import_cache (user_id);
CREATE INDEX idx_url_import_cache_created_at ON public.url_import_cache (created_at);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ad_images_updated_at
  BEFORE UPDATE ON public.ad_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ad_history_updated_at
  BEFORE UPDATE ON public.ad_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_listing_publications_updated_at
  BEFORE UPDATE ON public.listing_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_publication_attempts_updated_at
  BEFORE UPDATE ON public.publication_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_analyzed_products_updated_at
  BEFORE UPDATE ON public.analyzed_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_analysis_runs_updated_at
  BEFORE UPDATE ON public.analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_analysis_evidence_updated_at
  BEFORE UPDATE ON public.analysis_evidence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_import_batches_updated_at
  BEFORE UPDATE ON public.product_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_product_import_rows_updated_at
  BEFORE UPDATE ON public.product_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_url_imports_updated_at
  BEFORE UPDATE ON public.url_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ebay_accounts_updated_at
  BEFORE UPDATE ON public.ebay_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ebay_policies_updated_at
  BEFORE UPDATE ON public.ebay_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ebay_locations_updated_at
  BEFORE UPDATE ON public.ebay_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ebay_tokens_updated_at
  BEFORE UPDATE ON public.ebay_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ebay_publication_attempts_updated_at
  BEFORE UPDATE ON public.ebay_publication_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_stripe_events_updated_at
  BEFORE UPDATE ON public.stripe_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_marketing_templates_updated_at
  BEFORE UPDATE ON public.marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_marketing_images_updated_at
  BEFORE UPDATE ON public.marketing_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_serpapi_cache_updated_at
  BEFORE UPDATE ON public.serpapi_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_url_import_cache_updated_at
  BEFORE UPDATE ON public.url_import_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger création profil à l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspaces & quotas (backend internal)
-- ---------------------------------------------------------------------------

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workspace_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0,
  publications_used INTEGER NOT NULL DEFAULT 0,
  imports_used INTEGER NOT NULL DEFAULT 0,
  url_imports_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, period_start)
);

CREATE TRIGGER set_workspace_usage_updated_at
  BEFORE UPDATE ON public.workspace_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_workspace_usage_workspace_id ON public.workspace_usage (workspace_id);
CREATE INDEX idx_workspace_usage_period_start ON public.workspace_usage (period_start);

CREATE TABLE public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_usage_reservations_updated_at
  BEFORE UPDATE ON public.usage_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_usage_reservations_workspace_id ON public.usage_reservations (workspace_id);
CREATE INDEX idx_usage_reservations_created_at ON public.usage_reservations (created_at);

-- eBay token storage (encrypted)
CREATE TABLE public.ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

CREATE TRIGGER set_ebay_connections_updated_at
  BEFORE UPDATE ON public.ebay_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ebay_connections_workspace_id ON public.ebay_connections (workspace_id);

-- reference search cache (global)
CREATE TABLE public.reference_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  normalized_reference TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_search_cache_expires_at ON public.reference_search_cache (expires_at);

CREATE TRIGGER set_reference_search_cache_updated_at
  BEFORE UPDATE ON public.reference_search_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stripe webhook idempotency (global)
CREATE TABLE public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebay_publication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serpapi_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_import_cache ENABLE ROW LEVEL SECURITY;

-- profiles (id = auth.uid())
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- Macro pour tables avec user_id
-- user_settings
CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_delete_own ON public.user_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notification_settings
CREATE POLICY notification_settings_select_own ON public.notification_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notification_settings_insert_own ON public.notification_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_settings_update_own ON public.notification_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_settings_delete_own ON public.notification_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ads
CREATE POLICY ads_select_own ON public.ads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ads_insert_own ON public.ads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ads_update_own ON public.ads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ads_delete_own ON public.ads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ad_images
CREATE POLICY ad_images_select_own ON public.ad_images
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ad_images_insert_own ON public.ad_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ad_images_update_own ON public.ad_images
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ad_images_delete_own ON public.ad_images
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ad_history
CREATE POLICY ad_history_select_own ON public.ad_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ad_history_insert_own ON public.ad_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ad_history_update_own ON public.ad_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ad_history_delete_own ON public.ad_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- listing_publications
CREATE POLICY listing_publications_select_own ON public.listing_publications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY listing_publications_insert_own ON public.listing_publications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY listing_publications_update_own ON public.listing_publications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY listing_publications_delete_own ON public.listing_publications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- publication_attempts
CREATE POLICY publication_attempts_select_own ON public.publication_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY publication_attempts_insert_own ON public.publication_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY publication_attempts_update_own ON public.publication_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY publication_attempts_delete_own ON public.publication_attempts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- analyzed_products
CREATE POLICY analyzed_products_select_own ON public.analyzed_products
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY analyzed_products_insert_own ON public.analyzed_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY analyzed_products_update_own ON public.analyzed_products
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY analyzed_products_delete_own ON public.analyzed_products
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- analysis_runs
CREATE POLICY analysis_runs_select_own ON public.analysis_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY analysis_runs_insert_own ON public.analysis_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_runs_update_own ON public.analysis_runs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_runs_delete_own ON public.analysis_runs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- analysis_evidence
CREATE POLICY analysis_evidence_select_own ON public.analysis_evidence
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY analysis_evidence_insert_own ON public.analysis_evidence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_evidence_update_own ON public.analysis_evidence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_evidence_delete_own ON public.analysis_evidence
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- product_import_batches
CREATE POLICY product_import_batches_select_own ON public.product_import_batches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY product_import_batches_insert_own ON public.product_import_batches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_import_batches_update_own ON public.product_import_batches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_import_batches_delete_own ON public.product_import_batches
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- product_import_rows
CREATE POLICY product_import_rows_select_own ON public.product_import_rows
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY product_import_rows_insert_own ON public.product_import_rows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_import_rows_update_own ON public.product_import_rows
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY product_import_rows_delete_own ON public.product_import_rows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- url_imports
CREATE POLICY url_imports_select_own ON public.url_imports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY url_imports_insert_own ON public.url_imports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY url_imports_update_own ON public.url_imports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY url_imports_delete_own ON public.url_imports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ebay_accounts
CREATE POLICY ebay_accounts_select_own ON public.ebay_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ebay_accounts_insert_own ON public.ebay_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_accounts_update_own ON public.ebay_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_accounts_delete_own ON public.ebay_accounts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ebay_policies
CREATE POLICY ebay_policies_select_own ON public.ebay_policies
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ebay_policies_insert_own ON public.ebay_policies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_policies_update_own ON public.ebay_policies
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_policies_delete_own ON public.ebay_policies
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ebay_locations
CREATE POLICY ebay_locations_select_own ON public.ebay_locations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ebay_locations_insert_own ON public.ebay_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_locations_update_own ON public.ebay_locations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_locations_delete_own ON public.ebay_locations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ebay_tokens
CREATE POLICY ebay_tokens_select_own ON public.ebay_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ebay_tokens_insert_own ON public.ebay_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_tokens_update_own ON public.ebay_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_tokens_delete_own ON public.ebay_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- workspaces (backend quotas)
CREATE POLICY workspaces_select_own ON public.workspaces
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY workspaces_insert_own ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY workspaces_update_own ON public.workspaces
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY workspaces_delete_own ON public.workspaces
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- workspace_usage
CREATE POLICY workspace_usage_select_own ON public.workspace_usage
  FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
CREATE POLICY workspace_usage_insert_own ON public.workspace_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY workspace_usage_update_own ON public.workspace_usage
  FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY workspace_usage_delete_own ON public.workspace_usage
  FOR DELETE TO authenticated USING (auth.uid() = workspace_id);

-- usage_reservations
CREATE POLICY usage_reservations_select_own ON public.usage_reservations
  FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
CREATE POLICY usage_reservations_insert_own ON public.usage_reservations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY usage_reservations_update_own ON public.usage_reservations
  FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY usage_reservations_delete_own ON public.usage_reservations
  FOR DELETE TO authenticated USING (auth.uid() = workspace_id);

-- ebay_connections
CREATE POLICY ebay_connections_select_own ON public.ebay_connections
  FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
CREATE POLICY ebay_connections_insert_own ON public.ebay_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY ebay_connections_update_own ON public.ebay_connections
  FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
CREATE POLICY ebay_connections_delete_own ON public.ebay_connections
  FOR DELETE TO authenticated USING (auth.uid() = workspace_id);

-- ebay_publication_attempts
CREATE POLICY ebay_publication_attempts_select_own ON public.ebay_publication_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ebay_publication_attempts_insert_own ON public.ebay_publication_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_publication_attempts_update_own ON public.ebay_publication_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ebay_publication_attempts_delete_own ON public.ebay_publication_attempts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- subscription_plans (lecture seule pour utilisateurs authentifiés)
CREATE POLICY subscription_plans_select_active ON public.subscription_plans
  FOR SELECT TO authenticated USING (est_actif = true);

-- subscriptions
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY subscriptions_insert_own ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY subscriptions_update_own ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY subscriptions_delete_own ON public.subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- usage_counters
CREATE POLICY usage_counters_select_own ON public.usage_counters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY usage_counters_insert_own ON public.usage_counters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY usage_counters_update_own ON public.usage_counters
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY usage_counters_delete_own ON public.usage_counters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- stripe_customers
CREATE POLICY stripe_customers_select_own ON public.stripe_customers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY stripe_customers_insert_own ON public.stripe_customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY stripe_customers_update_own ON public.stripe_customers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY stripe_customers_delete_own ON public.stripe_customers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- stripe_events (accès restreint au propriétaire si user_id renseigné)
CREATE POLICY stripe_events_select_own ON public.stripe_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY stripe_events_insert_own ON public.stripe_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY stripe_events_update_own ON public.stripe_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY stripe_events_delete_own ON public.stripe_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- marketing_templates
CREATE POLICY marketing_templates_select_own ON public.marketing_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY marketing_templates_insert_own ON public.marketing_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY marketing_templates_update_own ON public.marketing_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY marketing_templates_delete_own ON public.marketing_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- marketing_images
CREATE POLICY marketing_images_select_own ON public.marketing_images
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY marketing_images_insert_own ON public.marketing_images
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY marketing_images_update_own ON public.marketing_images
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY marketing_images_delete_own ON public.marketing_images
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- serpapi_cache
CREATE POLICY serpapi_cache_select_own ON public.serpapi_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY serpapi_cache_insert_own ON public.serpapi_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY serpapi_cache_update_own ON public.serpapi_cache
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY serpapi_cache_delete_own ON public.serpapi_cache
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- url_import_cache
CREATE POLICY url_import_cache_select_own ON public.url_import_cache
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY url_import_cache_insert_own ON public.url_import_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY url_import_cache_update_own ON public.url_import_cache
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY url_import_cache_delete_own ON public.url_import_cache
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Données initiales — plans d'abonnement
-- ---------------------------------------------------------------------------

INSERT INTO public.subscription_plans (code, nom, description, prix_mensuel_cents, prix_annuel_cents, quotas, fonctionnalites, ordre_affichage)
VALUES
  (
    'free',
    'Gratuit',
    'Pour découvrir SNOWOLF',
    0,
    0,
    '{"analyses": 10, "publications": 5, "imports": 2, "url_imports": 5, "serp_requests": 20}'::jsonb,
    '{"bulk_import": false, "marketing_templates": false, "priority_support": false}'::jsonb,
    0
  ),
  (
    'starter',
    'Starter',
    'Pour les vendeurs occasionnels',
    1900,
    19000,
    '{"analyses": 100, "publications": 50, "imports": 20, "url_imports": 50, "serp_requests": 200}'::jsonb,
    '{"bulk_import": true, "marketing_templates": true, "priority_support": false}'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    'Pour les vendeurs actifs',
    4900,
    49000,
    '{"analyses": 500, "publications": 250, "imports": 100, "url_imports": 250, "serp_requests": 1000}'::jsonb,
    '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb,
    2
  ),
  (
    'business',
    'Business',
    'Pour les professionnels',
    9900,
    99000,
    '{"analyses": 2000, "publications": 1000, "imports": 500, "url_imports": 1000, "serp_requests": 5000}'::jsonb,
    '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb,
    3
  );
