-- SNOWOLF - migration incrementale sure
-- Ne supprime aucune table ni donnee.
-- Idempotente : IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / policies conditionnelles.
-- A executer dans le SQL Editor du projet SNOWOLF uniquement (pas FACTEO).
-- Ne pas reexecuter 20260101000000_initial_schema.sql.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================================================
-- ENUMS
-- ===========================================================================

DO $$ BEGIN
  CREATE TYPE public.ad_statut AS ENUM ('DRAFT', 'ANALYZING', 'NEEDS_REVIEW', 'READY', 'VALIDATING', 'INVENTORY_CREATED', 'OFFER_CREATED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED', 'ENDED', 'SENDING_TO_EBAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'DRAFT';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'ANALYZING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'READY';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'VALIDATING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'INVENTORY_CREATED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'OFFER_CREATED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'PUBLISHING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'PUBLISHED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'ENDED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ad_statut ADD VALUE IF NOT EXISTS 'SENDING_TO_EBAY';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_batch_statut AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.import_batch_statut ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_batch_statut ADD VALUE IF NOT EXISTS 'PROCESSING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_batch_statut ADD VALUE IF NOT EXISTS 'COMPLETED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_batch_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_batch_statut ADD VALUE IF NOT EXISTS 'PARTIAL';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_row_statut AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.import_row_statut ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_row_statut ADD VALUE IF NOT EXISTS 'SUCCESS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_row_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.import_row_statut ADD VALUE IF NOT EXISTS 'SKIPPED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.url_import_statut AS ENUM ('PENDING', 'FETCHING', 'ANALYZING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.url_import_statut ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.url_import_statut ADD VALUE IF NOT EXISTS 'FETCHING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.url_import_statut ADD VALUE IF NOT EXISTS 'ANALYZING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.url_import_statut ADD VALUE IF NOT EXISTS 'COMPLETED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.url_import_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.analysis_run_statut AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.analysis_run_statut ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.analysis_run_statut ADD VALUE IF NOT EXISTS 'RUNNING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.analysis_run_statut ADD VALUE IF NOT EXISTS 'COMPLETED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.analysis_run_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publication_statut AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.publication_statut ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.publication_statut ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.publication_statut ADD VALUE IF NOT EXISTS 'SUCCESS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.publication_statut ADD VALUE IF NOT EXISTS 'FAILED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.publication_statut ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_statut AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'ACTIVE';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'TRIALING';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'PAST_DUE';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'CANCELED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'UNPAID';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'INCOMPLETE';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'INCOMPLETE_EXPIRED';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.subscription_statut ADD VALUE IF NOT EXISTS 'PAUSED';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ebay_policy_type AS ENUM ('FULFILLMENT', 'PAYMENT', 'RETURN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.ebay_policy_type ADD VALUE IF NOT EXISTS 'FULFILLMENT';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ebay_policy_type ADD VALUE IF NOT EXISTS 'PAYMENT';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.ebay_policy_type ADD VALUE IF NOT EXISTS 'RETURN';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.usage_counter_type AS ENUM ('ANALYSES', 'PUBLICATIONS', 'IMPORTS', 'URL_IMPORTS', 'SERP_REQUESTS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.usage_counter_type ADD VALUE IF NOT EXISTS 'ANALYSES';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.usage_counter_type ADD VALUE IF NOT EXISTS 'PUBLICATIONS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.usage_counter_type ADD VALUE IF NOT EXISTS 'IMPORTS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.usage_counter_type ADD VALUE IF NOT EXISTS 'URL_IMPORTS';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.usage_counter_type ADD VALUE IF NOT EXISTS 'SERP_REQUESTS';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ===========================================================================
-- FUNCTIONS
-- ===========================================================================

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
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspaces (id, plan_id)
  VALUES (NEW.id, 'FREE')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ===========================================================================
-- TABLES + COLUMNS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
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

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS langue TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fuseau_horaire TEXT NOT NULL DEFAULT 'Europe/Paris';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_settings (
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

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS devise TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS marche_ebay TEXT NOT NULL DEFAULT 'EBAY_FR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_expedition_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_retour_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_paiement_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS lieu_expedition_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_key'
  ) THEN
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notification_settings (
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

ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_nouvelle_annonce BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_reussie BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_echouee BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_analyse_terminee BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_quota_atteint BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_settings_user_id_key'
  ) THEN
    ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ads (
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

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS statut public.ad_statut DEFAULT 'DRAFT'::public.ad_statut;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS resultat_identification JSONB;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_vente NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS quantite INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ebay_category_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ebay_condition_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS public.ad_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  est_principale BOOLEAN NOT NULL DEFAULT false,
  largeur INTEGER,
  hauteur INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS ordre INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS est_principale BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS largeur INTEGER;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS hauteur INTEGER;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS public.ad_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES public.ads (id) ON DELETE CASCADE,
  statut_avant public.ad_statut,
  statut_apres public.ad_statut,
  action TEXT NOT NULL DEFAULT '',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS statut_avant public.ad_statut;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS statut_apres public.ad_statut;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.listing_publications (
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

ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING'::public.publication_statut;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS url_annonce TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS public.publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_publication_id UUID NOT NULL REFERENCES public.listing_publications (id) ON DELETE CASCADE,
  statut public.publication_statut NOT NULL DEFAULT 'PENDING',
  erreur TEXT,
  reponse_ebay JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING'::public.publication_statut;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS reponse_ebay JSONB;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.analyzed_products (
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

ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS url_source TEXT;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS resultat_identification JSONB;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS confiance_globale NUMERIC(5, 4);
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS necessite_revision BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.analysis_runs (
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

CREATE TABLE IF NOT EXISTS public.analysis_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  analysis_run_id UUID NOT NULL REFERENCES public.analysis_runs (id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT '',
  champ TEXT NOT NULL DEFAULT '',
  valeur TEXT NOT NULL DEFAULT '',
  poids NUMERIC(5, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom_fichier TEXT NOT NULL DEFAULT '',
  statut public.import_batch_statut NOT NULL DEFAULT 'PENDING',
  nombre_lignes INTEGER NOT NULL DEFAULT 0,
  lignes_traitees INTEGER NOT NULL DEFAULT 0,
  lignes_reussies INTEGER NOT NULL DEFAULT 0,
  lignes_echouees INTEGER NOT NULL DEFAULT 0,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.product_import_batches (id) ON DELETE CASCADE,
  numero_ligne INTEGER NOT NULL DEFAULT 0,
  statut public.import_row_statut NOT NULL DEFAULT 'PENDING',
  donnees_brutes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.url_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  statut public.url_import_statut NOT NULL DEFAULT 'PENDING',
  ad_id UUID REFERENCES public.ads (id) ON DELETE SET NULL,
  erreur TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ebay_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_user_id TEXT NOT NULL DEFAULT '',
  nom_compte TEXT,
  marche TEXT NOT NULL DEFAULT 'EBAY_FR',
  est_actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebay_accounts_user_id_ebay_user_id_key'
  ) THEN
    ALTER TABLE public.ebay_accounts ADD CONSTRAINT ebay_accounts_user_id_ebay_user_id_key UNIQUE (user_id, ebay_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_publications_ebay_account_id_fkey'
  ) THEN
    ALTER TABLE public.listing_publications ADD CONSTRAINT listing_publications_ebay_account_id_fkey FOREIGN KEY (ebay_account_id) REFERENCES public.ebay_accounts (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ebay_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  type_politique public.ebay_policy_type NOT NULL DEFAULT 'FULFILLMENT',
  ebay_policy_id TEXT NOT NULL DEFAULT '',
  nom TEXT,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebay_policies_ebay_account_id_type_politique_ebay_policy_id_key'
  ) THEN
    ALTER TABLE public.ebay_policies ADD CONSTRAINT ebay_policies_ebay_account_id_type_politique_ebay_policy_id_key UNIQUE (ebay_account_id, type_politique, ebay_policy_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ebay_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  ebay_location_id TEXT NOT NULL DEFAULT '',
  nom TEXT,
  adresse JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebay_locations_ebay_account_id_ebay_location_id_key'
  ) THEN
    ALTER TABLE public.ebay_locations ADD CONSTRAINT ebay_locations_ebay_account_id_ebay_location_id_key UNIQUE (ebay_account_id, ebay_location_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ebay_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_account_id UUID NOT NULL UNIQUE REFERENCES public.ebay_accounts (id) ON DELETE CASCADE,
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ebay_publication_attempts (
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

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL DEFAULT '',
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

ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS nom TEXT NOT NULL DEFAULT '';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS prix_mensuel_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS prix_annuel_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS quotas JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS fonctionnalites JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS est_actif BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS ordre_affichage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_mensuel TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_annuel TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans (id),
  statut public.subscription_statut NOT NULL DEFAULT 'INCOMPLETE',
  stripe_subscription_id TEXT,
  periode_debut TIMESTAMPTZ,
  periode_fin TIMESTAMPTZ,
  annulation_a_fin_periode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS statut public.subscription_statut DEFAULT 'INCOMPLETE'::public.subscription_statut;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_debut TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_fin TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS annulation_a_fin_periode BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type_compteur public.usage_counter_type NOT NULL DEFAULT 'ANALYSES',
  periode TEXT NOT NULL DEFAULT '',
  valeur INTEGER NOT NULL DEFAULT 0,
  limite INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_user_id_type_compteur_periode_key'
  ) THEN
    ALTER TABLE public.usage_counters ADD CONSTRAINT usage_counters_user_id_type_compteur_periode_key UNIQUE (user_id, type_compteur, periode);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  type_evenement TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  traite BOOLEAN NOT NULL DEFAULT false,
  traite_a TIMESTAMPTZ,
  erreur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT '',
  type_template TEXT NOT NULL DEFAULT 'description',
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.marketing_templates (id) ON DELETE SET NULL,
  url TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  type_image TEXT NOT NULL DEFAULT 'overlay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.serpapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  cle_cache TEXT NOT NULL UNIQUE,
  requete TEXT NOT NULL DEFAULT '',
  reponse JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.url_import_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL DEFAULT '',
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'FREE';
CREATE TABLE IF NOT EXISTS public.workspace_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyses_used INTEGER NOT NULL DEFAULT 0,
  publications_used INTEGER NOT NULL DEFAULT 0,
  imports_used INTEGER NOT NULL DEFAULT 0,
  url_imports_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS analyses_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS publications_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS imports_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS url_imports_used INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_usage_workspace_id_period_start_key'
  ) THEN
    ALTER TABLE public.workspace_usage ADD CONSTRAINT workspace_usage_workspace_id_period_start_key UNIQUE (workspace_id, period_start);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  metric TEXT NOT NULL DEFAULT 'analyses',
  amount INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS metric TEXT NOT NULL DEFAULT 'analyses';
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS amount INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
CREATE TABLE IF NOT EXISTS public.ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL DEFAULT '',
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ebay_connections_workspace_id_key'
  ) THEN
    ALTER TABLE public.ebay_connections ADD CONSTRAINT ebay_connections_workspace_id_key UNIQUE (workspace_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reference_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT '',
  normalized_reference TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL DEFAULT '',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



-- Missing user_id ADD COLUMN guards (tables may pre-exist without user_id)
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS user_id UUID;
-- Missing statut ADD COLUMN guards (tables may pre-exist)
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS statut public.analysis_run_statut DEFAULT 'PENDING'::public.analysis_run_statut;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS statut public.import_batch_statut DEFAULT 'PENDING'::public.import_batch_statut;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS statut public.import_row_statut DEFAULT 'PENDING'::public.import_row_statut;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS statut public.url_import_statut DEFAULT 'PENDING'::public.url_import_statut;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING'::public.publication_statut;
-- ===========================================================================
-- INDEXES
-- ===========================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON public.user_settings (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_settings' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_settings_created_at ON public.notification_settings (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_statut ON public.ads (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_user_id ON public.ad_images (user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ad_images_ad_id ON public.ad_images (ad_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_images' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_created_at ON public.ad_images (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_user_id ON public.ad_history (user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ad_history_ad_id ON public.ad_history (ad_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_history' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_created_at ON public.ad_history (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_user_id ON public.listing_publications (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_statut ON public.listing_publications (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_created_at ON public.listing_publications (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_user_id ON public.publication_attempts (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_statut ON public.publication_attempts (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_created_at ON public.publication_attempts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analyzed_products_user_id ON public.analyzed_products (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analyzed_products_created_at ON public.analyzed_products (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_id ON public.analysis_runs (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_statut ON public.analysis_runs (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON public.analysis_runs (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_evidence_user_id ON public.analysis_evidence (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_evidence_created_at ON public.analysis_evidence (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_user_id ON public.product_import_batches (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_statut ON public.product_import_batches (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_created_at ON public.product_import_batches (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_user_id ON public.product_import_rows (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_statut ON public.product_import_rows (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_created_at ON public.product_import_rows (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_user_id ON public.url_imports (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_statut ON public.url_imports (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_created_at ON public.url_imports (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_accounts_user_id ON public.ebay_accounts (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_accounts_created_at ON public.ebay_accounts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_policies_user_id ON public.ebay_policies (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_policies_created_at ON public.ebay_policies (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_locations_user_id ON public.ebay_locations (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_locations_created_at ON public.ebay_locations (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_tokens_user_id ON public.ebay_tokens (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_tokens_created_at ON public.ebay_tokens (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_user_id ON public.ebay_publication_attempts (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_statut ON public.ebay_publication_attempts (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_created_at ON public.ebay_publication_attempts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_created_at ON public.subscription_plans (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_statut ON public.subscriptions (statut);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON public.usage_counters (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_counters' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_counters_created_at ON public.usage_counters (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON public.stripe_customers (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_created_at ON public.stripe_customers (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id ON public.stripe_events (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_templates_user_id ON public.marketing_templates (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_templates_created_at ON public.marketing_templates (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_images_user_id ON public.marketing_images (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_images' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_images_created_at ON public.marketing_images (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_serpapi_cache_user_id ON public.serpapi_cache (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_serpapi_cache_created_at ON public.serpapi_cache (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_url_import_cache_user_id ON public.url_import_cache (user_id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_url_import_cache_created_at ON public.url_import_cache (created_at);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_id ON public.workspace_usage (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_period_start ON public.workspace_usage (period_start);
CREATE INDEX IF NOT EXISTS idx_usage_reservations_workspace_id ON public.usage_reservations (workspace_id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_reservations_created_at ON public.usage_reservations (created_at);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_ebay_connections_workspace_id ON public.ebay_connections (workspace_id);
CREATE INDEX IF NOT EXISTS idx_reference_search_cache_expires_at ON public.reference_search_cache (expires_at);

-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_settings_updated_at') THEN
    CREATE TRIGGER set_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_notification_settings_updated_at') THEN
    CREATE TRIGGER set_notification_settings_updated_at
      BEFORE UPDATE ON public.notification_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ads_updated_at') THEN
    CREATE TRIGGER set_ads_updated_at
      BEFORE UPDATE ON public.ads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ad_images_updated_at') THEN
    CREATE TRIGGER set_ad_images_updated_at
      BEFORE UPDATE ON public.ad_images
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ad_history_updated_at') THEN
    CREATE TRIGGER set_ad_history_updated_at
      BEFORE UPDATE ON public.ad_history
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_listing_publications_updated_at') THEN
    CREATE TRIGGER set_listing_publications_updated_at
      BEFORE UPDATE ON public.listing_publications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_publication_attempts_updated_at') THEN
    CREATE TRIGGER set_publication_attempts_updated_at
      BEFORE UPDATE ON public.publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_analyzed_products_updated_at') THEN
    CREATE TRIGGER set_analyzed_products_updated_at
      BEFORE UPDATE ON public.analyzed_products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_analysis_runs_updated_at') THEN
    CREATE TRIGGER set_analysis_runs_updated_at
      BEFORE UPDATE ON public.analysis_runs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_analysis_evidence_updated_at') THEN
    CREATE TRIGGER set_analysis_evidence_updated_at
      BEFORE UPDATE ON public.analysis_evidence
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_product_import_batches_updated_at') THEN
    CREATE TRIGGER set_product_import_batches_updated_at
      BEFORE UPDATE ON public.product_import_batches
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_product_import_rows_updated_at') THEN
    CREATE TRIGGER set_product_import_rows_updated_at
      BEFORE UPDATE ON public.product_import_rows
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_url_imports_updated_at') THEN
    CREATE TRIGGER set_url_imports_updated_at
      BEFORE UPDATE ON public.url_imports
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_accounts_updated_at') THEN
    CREATE TRIGGER set_ebay_accounts_updated_at
      BEFORE UPDATE ON public.ebay_accounts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_policies_updated_at') THEN
    CREATE TRIGGER set_ebay_policies_updated_at
      BEFORE UPDATE ON public.ebay_policies
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_locations_updated_at') THEN
    CREATE TRIGGER set_ebay_locations_updated_at
      BEFORE UPDATE ON public.ebay_locations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_tokens_updated_at') THEN
    CREATE TRIGGER set_ebay_tokens_updated_at
      BEFORE UPDATE ON public.ebay_tokens
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_publication_attempts_updated_at') THEN
    CREATE TRIGGER set_ebay_publication_attempts_updated_at
      BEFORE UPDATE ON public.ebay_publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscription_plans_updated_at') THEN
    CREATE TRIGGER set_subscription_plans_updated_at
      BEFORE UPDATE ON public.subscription_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at') THEN
    CREATE TRIGGER set_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_usage_counters_updated_at') THEN
    CREATE TRIGGER set_usage_counters_updated_at
      BEFORE UPDATE ON public.usage_counters
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_stripe_customers_updated_at') THEN
    CREATE TRIGGER set_stripe_customers_updated_at
      BEFORE UPDATE ON public.stripe_customers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_stripe_events_updated_at') THEN
    CREATE TRIGGER set_stripe_events_updated_at
      BEFORE UPDATE ON public.stripe_events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_marketing_templates_updated_at') THEN
    CREATE TRIGGER set_marketing_templates_updated_at
      BEFORE UPDATE ON public.marketing_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_marketing_images_updated_at') THEN
    CREATE TRIGGER set_marketing_images_updated_at
      BEFORE UPDATE ON public.marketing_images
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_serpapi_cache_updated_at') THEN
    CREATE TRIGGER set_serpapi_cache_updated_at
      BEFORE UPDATE ON public.serpapi_cache
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_url_import_cache_updated_at') THEN
    CREATE TRIGGER set_url_import_cache_updated_at
      BEFORE UPDATE ON public.url_import_cache
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_workspaces_updated_at') THEN
    CREATE TRIGGER set_workspaces_updated_at
      BEFORE UPDATE ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_workspace_usage_updated_at') THEN
    CREATE TRIGGER set_workspace_usage_updated_at
      BEFORE UPDATE ON public.workspace_usage
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_usage_reservations_updated_at') THEN
    CREATE TRIGGER set_usage_reservations_updated_at
      BEFORE UPDATE ON public.usage_reservations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ebay_connections_updated_at') THEN
    CREATE TRIGGER set_ebay_connections_updated_at
      BEFORE UPDATE ON public.ebay_connections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_reference_search_cache_updated_at') THEN
    CREATE TRIGGER set_reference_search_cache_updated_at
      BEFORE UPDATE ON public.reference_search_cache
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ===========================================================================
-- RLS
-- ===========================================================================

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_delete_own'
  ) THEN
    CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_select_own'
  ) THEN
    CREATE POLICY user_settings_select_own ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_insert_own'
  ) THEN
    CREATE POLICY user_settings_insert_own ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_update_own'
  ) THEN
    CREATE POLICY user_settings_update_own ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_delete_own'
  ) THEN
    CREATE POLICY user_settings_delete_own ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'notification_settings_select_own'
  ) THEN
    CREATE POLICY notification_settings_select_own ON public.notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'notification_settings_insert_own'
  ) THEN
    CREATE POLICY notification_settings_insert_own ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'notification_settings_update_own'
  ) THEN
    CREATE POLICY notification_settings_update_own ON public.notification_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings' AND policyname = 'notification_settings_delete_own'
  ) THEN
    CREATE POLICY notification_settings_delete_own ON public.notification_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads' AND policyname = 'ads_select_own'
  ) THEN
    CREATE POLICY ads_select_own ON public.ads FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads' AND policyname = 'ads_insert_own'
  ) THEN
    CREATE POLICY ads_insert_own ON public.ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads' AND policyname = 'ads_update_own'
  ) THEN
    CREATE POLICY ads_update_own ON public.ads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ads' AND policyname = 'ads_delete_own'
  ) THEN
    CREATE POLICY ads_delete_own ON public.ads FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_images' AND policyname = 'ad_images_select_own'
  ) THEN
    CREATE POLICY ad_images_select_own ON public.ad_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_images' AND policyname = 'ad_images_insert_own'
  ) THEN
    CREATE POLICY ad_images_insert_own ON public.ad_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_images' AND policyname = 'ad_images_update_own'
  ) THEN
    CREATE POLICY ad_images_update_own ON public.ad_images FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_images' AND policyname = 'ad_images_delete_own'
  ) THEN
    CREATE POLICY ad_images_delete_own ON public.ad_images FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_history' AND policyname = 'ad_history_select_own'
  ) THEN
    CREATE POLICY ad_history_select_own ON public.ad_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_history' AND policyname = 'ad_history_insert_own'
  ) THEN
    CREATE POLICY ad_history_insert_own ON public.ad_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_history' AND policyname = 'ad_history_update_own'
  ) THEN
    CREATE POLICY ad_history_update_own ON public.ad_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_history' AND policyname = 'ad_history_delete_own'
  ) THEN
    CREATE POLICY ad_history_delete_own ON public.ad_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_publications' AND policyname = 'listing_publications_select_own'
  ) THEN
    CREATE POLICY listing_publications_select_own ON public.listing_publications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_publications' AND policyname = 'listing_publications_insert_own'
  ) THEN
    CREATE POLICY listing_publications_insert_own ON public.listing_publications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_publications' AND policyname = 'listing_publications_update_own'
  ) THEN
    CREATE POLICY listing_publications_update_own ON public.listing_publications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listing_publications' AND policyname = 'listing_publications_delete_own'
  ) THEN
    CREATE POLICY listing_publications_delete_own ON public.listing_publications FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_attempts' AND policyname = 'publication_attempts_select_own'
  ) THEN
    CREATE POLICY publication_attempts_select_own ON public.publication_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_attempts' AND policyname = 'publication_attempts_insert_own'
  ) THEN
    CREATE POLICY publication_attempts_insert_own ON public.publication_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_attempts' AND policyname = 'publication_attempts_update_own'
  ) THEN
    CREATE POLICY publication_attempts_update_own ON public.publication_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'publication_attempts' AND policyname = 'publication_attempts_delete_own'
  ) THEN
    CREATE POLICY publication_attempts_delete_own ON public.publication_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyzed_products' AND policyname = 'analyzed_products_select_own'
  ) THEN
    CREATE POLICY analyzed_products_select_own ON public.analyzed_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyzed_products' AND policyname = 'analyzed_products_insert_own'
  ) THEN
    CREATE POLICY analyzed_products_insert_own ON public.analyzed_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyzed_products' AND policyname = 'analyzed_products_update_own'
  ) THEN
    CREATE POLICY analyzed_products_update_own ON public.analyzed_products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyzed_products' AND policyname = 'analyzed_products_delete_own'
  ) THEN
    CREATE POLICY analyzed_products_delete_own ON public.analyzed_products FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'analysis_runs_select_own'
  ) THEN
    CREATE POLICY analysis_runs_select_own ON public.analysis_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'analysis_runs_insert_own'
  ) THEN
    CREATE POLICY analysis_runs_insert_own ON public.analysis_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'analysis_runs_update_own'
  ) THEN
    CREATE POLICY analysis_runs_update_own ON public.analysis_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'analysis_runs_delete_own'
  ) THEN
    CREATE POLICY analysis_runs_delete_own ON public.analysis_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_evidence' AND policyname = 'analysis_evidence_select_own'
  ) THEN
    CREATE POLICY analysis_evidence_select_own ON public.analysis_evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_evidence' AND policyname = 'analysis_evidence_insert_own'
  ) THEN
    CREATE POLICY analysis_evidence_insert_own ON public.analysis_evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_evidence' AND policyname = 'analysis_evidence_update_own'
  ) THEN
    CREATE POLICY analysis_evidence_update_own ON public.analysis_evidence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_evidence' AND policyname = 'analysis_evidence_delete_own'
  ) THEN
    CREATE POLICY analysis_evidence_delete_own ON public.analysis_evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_batches' AND policyname = 'product_import_batches_select_own'
  ) THEN
    CREATE POLICY product_import_batches_select_own ON public.product_import_batches FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_batches' AND policyname = 'product_import_batches_insert_own'
  ) THEN
    CREATE POLICY product_import_batches_insert_own ON public.product_import_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_batches' AND policyname = 'product_import_batches_update_own'
  ) THEN
    CREATE POLICY product_import_batches_update_own ON public.product_import_batches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_batches' AND policyname = 'product_import_batches_delete_own'
  ) THEN
    CREATE POLICY product_import_batches_delete_own ON public.product_import_batches FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_rows' AND policyname = 'product_import_rows_select_own'
  ) THEN
    CREATE POLICY product_import_rows_select_own ON public.product_import_rows FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_rows' AND policyname = 'product_import_rows_insert_own'
  ) THEN
    CREATE POLICY product_import_rows_insert_own ON public.product_import_rows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_rows' AND policyname = 'product_import_rows_update_own'
  ) THEN
    CREATE POLICY product_import_rows_update_own ON public.product_import_rows FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_import_rows' AND policyname = 'product_import_rows_delete_own'
  ) THEN
    CREATE POLICY product_import_rows_delete_own ON public.product_import_rows FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_imports' AND policyname = 'url_imports_select_own'
  ) THEN
    CREATE POLICY url_imports_select_own ON public.url_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_imports' AND policyname = 'url_imports_insert_own'
  ) THEN
    CREATE POLICY url_imports_insert_own ON public.url_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_imports' AND policyname = 'url_imports_update_own'
  ) THEN
    CREATE POLICY url_imports_update_own ON public.url_imports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_imports' AND policyname = 'url_imports_delete_own'
  ) THEN
    CREATE POLICY url_imports_delete_own ON public.url_imports FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_accounts' AND policyname = 'ebay_accounts_select_own'
  ) THEN
    CREATE POLICY ebay_accounts_select_own ON public.ebay_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_accounts' AND policyname = 'ebay_accounts_insert_own'
  ) THEN
    CREATE POLICY ebay_accounts_insert_own ON public.ebay_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_accounts' AND policyname = 'ebay_accounts_update_own'
  ) THEN
    CREATE POLICY ebay_accounts_update_own ON public.ebay_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_accounts' AND policyname = 'ebay_accounts_delete_own'
  ) THEN
    CREATE POLICY ebay_accounts_delete_own ON public.ebay_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_policies' AND policyname = 'ebay_policies_select_own'
  ) THEN
    CREATE POLICY ebay_policies_select_own ON public.ebay_policies FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_policies' AND policyname = 'ebay_policies_insert_own'
  ) THEN
    CREATE POLICY ebay_policies_insert_own ON public.ebay_policies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_policies' AND policyname = 'ebay_policies_update_own'
  ) THEN
    CREATE POLICY ebay_policies_update_own ON public.ebay_policies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_policies' AND policyname = 'ebay_policies_delete_own'
  ) THEN
    CREATE POLICY ebay_policies_delete_own ON public.ebay_policies FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_locations' AND policyname = 'ebay_locations_select_own'
  ) THEN
    CREATE POLICY ebay_locations_select_own ON public.ebay_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_locations' AND policyname = 'ebay_locations_insert_own'
  ) THEN
    CREATE POLICY ebay_locations_insert_own ON public.ebay_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_locations' AND policyname = 'ebay_locations_update_own'
  ) THEN
    CREATE POLICY ebay_locations_update_own ON public.ebay_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_locations' AND policyname = 'ebay_locations_delete_own'
  ) THEN
    CREATE POLICY ebay_locations_delete_own ON public.ebay_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_tokens' AND policyname = 'ebay_tokens_select_own'
  ) THEN
    CREATE POLICY ebay_tokens_select_own ON public.ebay_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_tokens' AND policyname = 'ebay_tokens_insert_own'
  ) THEN
    CREATE POLICY ebay_tokens_insert_own ON public.ebay_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_tokens' AND policyname = 'ebay_tokens_update_own'
  ) THEN
    CREATE POLICY ebay_tokens_update_own ON public.ebay_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_tokens' AND policyname = 'ebay_tokens_delete_own'
  ) THEN
    CREATE POLICY ebay_tokens_delete_own ON public.ebay_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_publication_attempts' AND policyname = 'ebay_publication_attempts_select_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_select_own ON public.ebay_publication_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_publication_attempts' AND policyname = 'ebay_publication_attempts_insert_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_insert_own ON public.ebay_publication_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_publication_attempts' AND policyname = 'ebay_publication_attempts_update_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_update_own ON public.ebay_publication_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_publication_attempts' AND policyname = 'ebay_publication_attempts_delete_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_delete_own ON public.ebay_publication_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_select_own'
  ) THEN
    CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_insert_own'
  ) THEN
    CREATE POLICY subscriptions_insert_own ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_update_own'
  ) THEN
    CREATE POLICY subscriptions_update_own ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_delete_own'
  ) THEN
    CREATE POLICY subscriptions_delete_own ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'usage_counters_select_own'
  ) THEN
    CREATE POLICY usage_counters_select_own ON public.usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'usage_counters_insert_own'
  ) THEN
    CREATE POLICY usage_counters_insert_own ON public.usage_counters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'usage_counters_update_own'
  ) THEN
    CREATE POLICY usage_counters_update_own ON public.usage_counters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_counters' AND policyname = 'usage_counters_delete_own'
  ) THEN
    CREATE POLICY usage_counters_delete_own ON public.usage_counters FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_select_own'
  ) THEN
    CREATE POLICY stripe_customers_select_own ON public.stripe_customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_insert_own'
  ) THEN
    CREATE POLICY stripe_customers_insert_own ON public.stripe_customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_update_own'
  ) THEN
    CREATE POLICY stripe_customers_update_own ON public.stripe_customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_delete_own'
  ) THEN
    CREATE POLICY stripe_customers_delete_own ON public.stripe_customers FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_events' AND policyname = 'stripe_events_select_own'
  ) THEN
    CREATE POLICY stripe_events_select_own ON public.stripe_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_events' AND policyname = 'stripe_events_insert_own'
  ) THEN
    CREATE POLICY stripe_events_insert_own ON public.stripe_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_events' AND policyname = 'stripe_events_update_own'
  ) THEN
    CREATE POLICY stripe_events_update_own ON public.stripe_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_events' AND policyname = 'stripe_events_delete_own'
  ) THEN
    CREATE POLICY stripe_events_delete_own ON public.stripe_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_templates' AND policyname = 'marketing_templates_select_own'
  ) THEN
    CREATE POLICY marketing_templates_select_own ON public.marketing_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_templates' AND policyname = 'marketing_templates_insert_own'
  ) THEN
    CREATE POLICY marketing_templates_insert_own ON public.marketing_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_templates' AND policyname = 'marketing_templates_update_own'
  ) THEN
    CREATE POLICY marketing_templates_update_own ON public.marketing_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_templates' AND policyname = 'marketing_templates_delete_own'
  ) THEN
    CREATE POLICY marketing_templates_delete_own ON public.marketing_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_images' AND policyname = 'marketing_images_select_own'
  ) THEN
    CREATE POLICY marketing_images_select_own ON public.marketing_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_images' AND policyname = 'marketing_images_insert_own'
  ) THEN
    CREATE POLICY marketing_images_insert_own ON public.marketing_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_images' AND policyname = 'marketing_images_update_own'
  ) THEN
    CREATE POLICY marketing_images_update_own ON public.marketing_images FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'marketing_images' AND policyname = 'marketing_images_delete_own'
  ) THEN
    CREATE POLICY marketing_images_delete_own ON public.marketing_images FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'serpapi_cache' AND policyname = 'serpapi_cache_select_own'
  ) THEN
    CREATE POLICY serpapi_cache_select_own ON public.serpapi_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'serpapi_cache' AND policyname = 'serpapi_cache_insert_own'
  ) THEN
    CREATE POLICY serpapi_cache_insert_own ON public.serpapi_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'serpapi_cache' AND policyname = 'serpapi_cache_update_own'
  ) THEN
    CREATE POLICY serpapi_cache_update_own ON public.serpapi_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'serpapi_cache' AND policyname = 'serpapi_cache_delete_own'
  ) THEN
    CREATE POLICY serpapi_cache_delete_own ON public.serpapi_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_import_cache' AND policyname = 'url_import_cache_select_own'
  ) THEN
    CREATE POLICY url_import_cache_select_own ON public.url_import_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_import_cache' AND policyname = 'url_import_cache_insert_own'
  ) THEN
    CREATE POLICY url_import_cache_insert_own ON public.url_import_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_import_cache' AND policyname = 'url_import_cache_update_own'
  ) THEN
    CREATE POLICY url_import_cache_update_own ON public.url_import_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'url_import_cache' AND policyname = 'url_import_cache_delete_own'
  ) THEN
    CREATE POLICY url_import_cache_delete_own ON public.url_import_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'workspaces_select_own'
  ) THEN
    CREATE POLICY workspaces_select_own ON public.workspaces FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'workspaces_insert_own'
  ) THEN
    CREATE POLICY workspaces_insert_own ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'workspaces_update_own'
  ) THEN
    CREATE POLICY workspaces_update_own ON public.workspaces FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspaces' AND policyname = 'workspaces_delete_own'
  ) THEN
    CREATE POLICY workspaces_delete_own ON public.workspaces FOR DELETE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_usage' AND policyname = 'workspace_usage_select_own'
  ) THEN
    CREATE POLICY workspace_usage_select_own ON public.workspace_usage FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_usage' AND policyname = 'workspace_usage_insert_own'
  ) THEN
    CREATE POLICY workspace_usage_insert_own ON public.workspace_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_usage' AND policyname = 'workspace_usage_update_own'
  ) THEN
    CREATE POLICY workspace_usage_update_own ON public.workspace_usage FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workspace_usage' AND policyname = 'workspace_usage_delete_own'
  ) THEN
    CREATE POLICY workspace_usage_delete_own ON public.workspace_usage FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_reservations' AND policyname = 'usage_reservations_select_own'
  ) THEN
    CREATE POLICY usage_reservations_select_own ON public.usage_reservations FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_reservations' AND policyname = 'usage_reservations_insert_own'
  ) THEN
    CREATE POLICY usage_reservations_insert_own ON public.usage_reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_reservations' AND policyname = 'usage_reservations_update_own'
  ) THEN
    CREATE POLICY usage_reservations_update_own ON public.usage_reservations FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_reservations' AND policyname = 'usage_reservations_delete_own'
  ) THEN
    CREATE POLICY usage_reservations_delete_own ON public.usage_reservations FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_connections' AND policyname = 'ebay_connections_select_own'
  ) THEN
    CREATE POLICY ebay_connections_select_own ON public.ebay_connections FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_connections' AND policyname = 'ebay_connections_insert_own'
  ) THEN
    CREATE POLICY ebay_connections_insert_own ON public.ebay_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_connections' AND policyname = 'ebay_connections_update_own'
  ) THEN
    CREATE POLICY ebay_connections_update_own ON public.ebay_connections FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ebay_connections' AND policyname = 'ebay_connections_delete_own'
  ) THEN
    CREATE POLICY ebay_connections_delete_own ON public.ebay_connections FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscription_plans' AND policyname = 'subscription_plans_select_active'
  ) THEN
    CREATE POLICY subscription_plans_select_active ON public.subscription_plans FOR SELECT TO authenticated USING (est_actif = true);
  END IF;
END $$;

-- ===========================================================================
-- SEED PLANS (no overwrite)
-- ===========================================================================

INSERT INTO public.subscription_plans (code, nom, description, prix_mensuel_cents, prix_annuel_cents, quotas, fonctionnalites, ordre_affichage)
VALUES
  ('free', 'Gratuit', 'Pour decouvrir SNOWOLF', 0, 0, '{"analyses": 10, "publications": 5, "imports": 2, "url_imports": 5, "serp_requests": 20}'::jsonb, '{"bulk_import": false, "marketing_templates": false, "priority_support": false}'::jsonb, 0),
  ('starter', 'Starter', 'Pour les vendeurs occasionnels', 1900, 19000, '{"analyses": 100, "publications": 50, "imports": 20, "url_imports": 50, "serp_requests": 200}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": false}'::jsonb, 1),
  ('pro', 'Pro', 'Pour les vendeurs actifs', 4900, 49000, '{"analyses": 500, "publications": 250, "imports": 100, "url_imports": 250, "serp_requests": 1000}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb, 2),
  ('business', 'Business', 'Pour les professionnels', 9900, 99000, '{"analyses": 2000, "publications": 1000, "imports": 500, "url_imports": 1000, "serp_requests": 5000}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb, 3)
ON CONFLICT (code) DO NOTHING;
