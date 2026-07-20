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