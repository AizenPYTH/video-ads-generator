-- SNOWOLF - migration incrementale sure
-- Projet: olijbnhinkvnqoudmqbv (inspecte le 2026-07-20)
-- Regles:
--   - aucune DROP / TRUNCATE / DELETE
--   - CREATE TABLE uniquement avec IF NOT EXISTS
--   - ADD COLUMN IF NOT EXISTS pour colonnes app manquantes
--   - indexes / triggers / policies conditionnels
--   - ne touche PAS aux tables legacy (users, products, photos, ...)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================================================
-- ENUMS (idempotent)
-- ===========================================================================

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

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = NEW.id) THEN
      INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = NEW.id) THEN
      INSERT INTO public.notification_settings (user_id) VALUES (NEW.id);
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ===========================================================================
-- TABLES MANQUANTES (CREATE IF NOT EXISTS)
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

CREATE TABLE IF NOT EXISTS public.subscription_plans (
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

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_images (
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

CREATE TABLE IF NOT EXISTS public.ad_history (
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
  source TEXT NOT NULL,
  champ TEXT NOT NULL,
  valeur TEXT NOT NULL,
  poids NUMERIC(5, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.url_imports (
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

CREATE TABLE IF NOT EXISTS public.ebay_policies (
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

CREATE TABLE IF NOT EXISTS public.ebay_locations (
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

CREATE TABLE IF NOT EXISTS public.ebay_tokens (
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

CREATE TABLE IF NOT EXISTS public.usage_counters (
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

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
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
  url TEXT NOT NULL,
  storage_path TEXT,
  type_image TEXT NOT NULL DEFAULT 'overlay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.serpapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  cle_cache TEXT NOT NULL UNIQUE,
  requete TEXT NOT NULL,
  reponse JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.url_import_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_usage (
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

CREATE TABLE IF NOT EXISTS public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id)
);

CREATE TABLE IF NOT EXISTS public.reference_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  normalized_reference TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- COLONNES APP MANQUANTES SUR TABLES DEJA PRESENTES
-- (schéma legacy EN conservé ; on ajoute les colonnes FR attendues par l'app)
-- ===========================================================================

-- user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'EUR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS marche_ebay TEXT DEFAULT 'EBAY_FR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_expedition_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_retour_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_paiement_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS lieu_expedition_par_defaut TEXT;

-- notification_settings
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_nouvelle_annonce BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_reussie BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_echouee BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_analyse_terminee BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_quota_atteint BOOLEAN DEFAULT true;

-- ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS resultat_identification JSONB;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_vente NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ebay_condition_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- listing_publications
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS url_annonce TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- product_import_batches
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nom_fichier TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nombre_lignes INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_traitees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_reussies INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_echouees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS erreur TEXT;

-- product_import_rows
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS numero_ligne INTEGER;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS donnees_brutes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS erreur TEXT;

-- ebay_accounts
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS nom_compte TEXT;
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS marche TEXT DEFAULT 'EBAY_FR';
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true;

-- subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_debut TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_fin TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS annulation_a_fin_periode BOOLEAN DEFAULT false;

-- stripe_events
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS type_evenement TEXT;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS traite BOOLEAN DEFAULT false;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS traite_a TIMESTAMPTZ;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ===========================================================================
-- INDEXES (conditionnels)
-- ===========================================================================

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_settings' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ads' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ads' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ads_statut ON public.ads (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ads' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads (created_at);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_images' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_user_id ON public.ad_images (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_images' AND column_name = 'ad_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_ad_id ON public.ad_images (ad_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_history' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_user_id ON public.ad_history (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ad_history' AND column_name = 'ad_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_ad_id ON public.ad_history (ad_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listing_publications' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_user_id ON public.listing_publications (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listing_publications' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_statut ON public.listing_publications (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'publication_attempts' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_user_id ON public.publication_attempts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analyzed_products' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_analyzed_products_user_id ON public.analyzed_products (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analysis_runs' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_id ON public.analysis_runs (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analysis_runs' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_statut ON public.analysis_runs (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analysis_evidence' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_evidence_user_id ON public.analysis_evidence (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_import_batches' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_user_id ON public.product_import_batches (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_import_batches' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_statut ON public.product_import_batches (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_import_rows' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_user_id ON public.product_import_rows (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_import_rows' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_statut ON public.product_import_rows (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'url_imports' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_user_id ON public.url_imports (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_accounts' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_accounts_user_id ON public.ebay_accounts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_policies' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_policies_user_id ON public.ebay_policies (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_locations' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_locations_user_id ON public.ebay_locations (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_tokens' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_tokens_user_id ON public.ebay_tokens (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_publication_attempts' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_user_id ON public.ebay_publication_attempts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_created_at ON public.subscription_plans (created_at);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_statut ON public.subscriptions (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON public.usage_counters (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_customers' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON public.stripe_customers (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stripe_events' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id ON public.stripe_events (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketing_templates' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_templates_user_id ON public.marketing_templates (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketing_images' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_images_user_id ON public.marketing_images (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'serpapi_cache' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_serpapi_cache_user_id ON public.serpapi_cache (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'url_import_cache' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_url_import_cache_user_id ON public.url_import_cache (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_usage' AND column_name = 'workspace_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_id ON public.workspace_usage (workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usage_reservations' AND column_name = 'workspace_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_usage_reservations_workspace_id ON public.usage_reservations (workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ebay_connections' AND column_name = 'workspace_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_connections_workspace_id ON public.ebay_connections (workspace_id);
  END IF;
END $$;

-- ===========================================================================
-- TRIGGERS updated_at
-- ===========================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_settings')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_user_settings_updated_at') THEN
    CREATE TRIGGER set_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification_settings')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_settings' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_notification_settings_updated_at') THEN
    CREATE TRIGGER set_notification_settings_updated_at
      BEFORE UPDATE ON public.notification_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ads')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ads_updated_at') THEN
    CREATE TRIGGER set_ads_updated_at
      BEFORE UPDATE ON public.ads
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ad_images')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_images' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ad_images_updated_at') THEN
    CREATE TRIGGER set_ad_images_updated_at
      BEFORE UPDATE ON public.ad_images
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ad_history')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_history' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ad_history_updated_at') THEN
    CREATE TRIGGER set_ad_history_updated_at
      BEFORE UPDATE ON public.ad_history
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='listing_publications')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_listing_publications_updated_at') THEN
    CREATE TRIGGER set_listing_publications_updated_at
      BEFORE UPDATE ON public.listing_publications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='publication_attempts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_publication_attempts_updated_at') THEN
    CREATE TRIGGER set_publication_attempts_updated_at
      BEFORE UPDATE ON public.publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analyzed_products')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_analyzed_products_updated_at') THEN
    CREATE TRIGGER set_analyzed_products_updated_at
      BEFORE UPDATE ON public.analyzed_products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analysis_runs')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_analysis_runs_updated_at') THEN
    CREATE TRIGGER set_analysis_runs_updated_at
      BEFORE UPDATE ON public.analysis_runs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analysis_evidence')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_analysis_evidence_updated_at') THEN
    CREATE TRIGGER set_analysis_evidence_updated_at
      BEFORE UPDATE ON public.analysis_evidence
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_import_batches')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_product_import_batches_updated_at') THEN
    CREATE TRIGGER set_product_import_batches_updated_at
      BEFORE UPDATE ON public.product_import_batches
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_import_rows')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_product_import_rows_updated_at') THEN
    CREATE TRIGGER set_product_import_rows_updated_at
      BEFORE UPDATE ON public.product_import_rows
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='url_imports')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_url_imports_updated_at') THEN
    CREATE TRIGGER set_url_imports_updated_at
      BEFORE UPDATE ON public.url_imports
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_accounts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_accounts_updated_at') THEN
    CREATE TRIGGER set_ebay_accounts_updated_at
      BEFORE UPDATE ON public.ebay_accounts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_policies')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_policies_updated_at') THEN
    CREATE TRIGGER set_ebay_policies_updated_at
      BEFORE UPDATE ON public.ebay_policies
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_locations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_locations_updated_at') THEN
    CREATE TRIGGER set_ebay_locations_updated_at
      BEFORE UPDATE ON public.ebay_locations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_tokens')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_tokens_updated_at') THEN
    CREATE TRIGGER set_ebay_tokens_updated_at
      BEFORE UPDATE ON public.ebay_tokens
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_publication_attempts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_publication_attempts_updated_at') THEN
    CREATE TRIGGER set_ebay_publication_attempts_updated_at
      BEFORE UPDATE ON public.ebay_publication_attempts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_plans')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_subscription_plans_updated_at') THEN
    CREATE TRIGGER set_subscription_plans_updated_at
      BEFORE UPDATE ON public.subscription_plans
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_subscriptions_updated_at') THEN
    CREATE TRIGGER set_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usage_counters')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_counters' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_usage_counters_updated_at') THEN
    CREATE TRIGGER set_usage_counters_updated_at
      BEFORE UPDATE ON public.usage_counters
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stripe_customers')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_stripe_customers_updated_at') THEN
    CREATE TRIGGER set_stripe_customers_updated_at
      BEFORE UPDATE ON public.stripe_customers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='marketing_templates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_marketing_templates_updated_at') THEN
    CREATE TRIGGER set_marketing_templates_updated_at
      BEFORE UPDATE ON public.marketing_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='marketing_images')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_images' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_marketing_images_updated_at') THEN
    CREATE TRIGGER set_marketing_images_updated_at
      BEFORE UPDATE ON public.marketing_images
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='serpapi_cache')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_serpapi_cache_updated_at') THEN
    CREATE TRIGGER set_serpapi_cache_updated_at
      BEFORE UPDATE ON public.serpapi_cache
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='url_import_cache')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_url_import_cache_updated_at') THEN
    CREATE TRIGGER set_url_import_cache_updated_at
      BEFORE UPDATE ON public.url_import_cache
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspaces')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_workspaces_updated_at') THEN
    CREATE TRIGGER set_workspaces_updated_at
      BEFORE UPDATE ON public.workspaces
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workspace_usage')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_workspace_usage_updated_at') THEN
    CREATE TRIGGER set_workspace_usage_updated_at
      BEFORE UPDATE ON public.workspace_usage
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usage_reservations')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_usage_reservations_updated_at') THEN
    CREATE TRIGGER set_usage_reservations_updated_at
      BEFORE UPDATE ON public.usage_reservations
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ebay_connections')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_connections' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_ebay_connections_updated_at') THEN
    CREATE TRIGGER set_ebay_connections_updated_at
      BEFORE UPDATE ON public.ebay_connections
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ===========================================================================
-- RLS
-- ===========================================================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.publication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analyzed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analysis_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.url_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_publication_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.serpapi_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.url_import_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ebay_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_settings' AND policyname='user_settings_select_own'
  ) THEN
    CREATE POLICY user_settings_select_own ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_settings' AND policyname='user_settings_insert_own'
  ) THEN
    CREATE POLICY user_settings_insert_own ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_settings' AND policyname='user_settings_update_own'
  ) THEN
    CREATE POLICY user_settings_update_own ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_settings' AND policyname='user_settings_delete_own'
  ) THEN
    CREATE POLICY user_settings_delete_own ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_settings' AND policyname='notification_settings_select_own'
  ) THEN
    CREATE POLICY notification_settings_select_own ON public.notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_settings' AND policyname='notification_settings_insert_own'
  ) THEN
    CREATE POLICY notification_settings_insert_own ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_settings' AND policyname='notification_settings_update_own'
  ) THEN
    CREATE POLICY notification_settings_update_own ON public.notification_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_settings' AND policyname='notification_settings_delete_own'
  ) THEN
    CREATE POLICY notification_settings_delete_own ON public.notification_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ads' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ads' AND policyname='ads_select_own'
  ) THEN
    CREATE POLICY ads_select_own ON public.ads FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ads' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ads' AND policyname='ads_insert_own'
  ) THEN
    CREATE POLICY ads_insert_own ON public.ads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ads' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ads' AND policyname='ads_update_own'
  ) THEN
    CREATE POLICY ads_update_own ON public.ads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ads' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ads' AND policyname='ads_delete_own'
  ) THEN
    CREATE POLICY ads_delete_own ON public.ads FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_images' AND policyname='ad_images_select_own'
  ) THEN
    CREATE POLICY ad_images_select_own ON public.ad_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_images' AND policyname='ad_images_insert_own'
  ) THEN
    CREATE POLICY ad_images_insert_own ON public.ad_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_images' AND policyname='ad_images_update_own'
  ) THEN
    CREATE POLICY ad_images_update_own ON public.ad_images FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_images' AND policyname='ad_images_delete_own'
  ) THEN
    CREATE POLICY ad_images_delete_own ON public.ad_images FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_history' AND policyname='ad_history_select_own'
  ) THEN
    CREATE POLICY ad_history_select_own ON public.ad_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_history' AND policyname='ad_history_insert_own'
  ) THEN
    CREATE POLICY ad_history_insert_own ON public.ad_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_history' AND policyname='ad_history_update_own'
  ) THEN
    CREATE POLICY ad_history_update_own ON public.ad_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ad_history' AND policyname='ad_history_delete_own'
  ) THEN
    CREATE POLICY ad_history_delete_own ON public.ad_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='listing_publications' AND policyname='listing_publications_select_own'
  ) THEN
    CREATE POLICY listing_publications_select_own ON public.listing_publications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='listing_publications' AND policyname='listing_publications_insert_own'
  ) THEN
    CREATE POLICY listing_publications_insert_own ON public.listing_publications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='listing_publications' AND policyname='listing_publications_update_own'
  ) THEN
    CREATE POLICY listing_publications_update_own ON public.listing_publications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='listing_publications' AND policyname='listing_publications_delete_own'
  ) THEN
    CREATE POLICY listing_publications_delete_own ON public.listing_publications FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='publication_attempts' AND policyname='publication_attempts_select_own'
  ) THEN
    CREATE POLICY publication_attempts_select_own ON public.publication_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='publication_attempts' AND policyname='publication_attempts_insert_own'
  ) THEN
    CREATE POLICY publication_attempts_insert_own ON public.publication_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='publication_attempts' AND policyname='publication_attempts_update_own'
  ) THEN
    CREATE POLICY publication_attempts_update_own ON public.publication_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='publication_attempts' AND policyname='publication_attempts_delete_own'
  ) THEN
    CREATE POLICY publication_attempts_delete_own ON public.publication_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analyzed_products' AND policyname='analyzed_products_select_own'
  ) THEN
    CREATE POLICY analyzed_products_select_own ON public.analyzed_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analyzed_products' AND policyname='analyzed_products_insert_own'
  ) THEN
    CREATE POLICY analyzed_products_insert_own ON public.analyzed_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analyzed_products' AND policyname='analyzed_products_update_own'
  ) THEN
    CREATE POLICY analyzed_products_update_own ON public.analyzed_products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analyzed_products' AND policyname='analyzed_products_delete_own'
  ) THEN
    CREATE POLICY analyzed_products_delete_own ON public.analyzed_products FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='analysis_runs_select_own'
  ) THEN
    CREATE POLICY analysis_runs_select_own ON public.analysis_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='analysis_runs_insert_own'
  ) THEN
    CREATE POLICY analysis_runs_insert_own ON public.analysis_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='analysis_runs_update_own'
  ) THEN
    CREATE POLICY analysis_runs_update_own ON public.analysis_runs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='analysis_runs_delete_own'
  ) THEN
    CREATE POLICY analysis_runs_delete_own ON public.analysis_runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_evidence' AND policyname='analysis_evidence_select_own'
  ) THEN
    CREATE POLICY analysis_evidence_select_own ON public.analysis_evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_evidence' AND policyname='analysis_evidence_insert_own'
  ) THEN
    CREATE POLICY analysis_evidence_insert_own ON public.analysis_evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_evidence' AND policyname='analysis_evidence_update_own'
  ) THEN
    CREATE POLICY analysis_evidence_update_own ON public.analysis_evidence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='analysis_evidence' AND policyname='analysis_evidence_delete_own'
  ) THEN
    CREATE POLICY analysis_evidence_delete_own ON public.analysis_evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_batches' AND policyname='product_import_batches_select_own'
  ) THEN
    CREATE POLICY product_import_batches_select_own ON public.product_import_batches FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_batches' AND policyname='product_import_batches_insert_own'
  ) THEN
    CREATE POLICY product_import_batches_insert_own ON public.product_import_batches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_batches' AND policyname='product_import_batches_update_own'
  ) THEN
    CREATE POLICY product_import_batches_update_own ON public.product_import_batches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_batches' AND policyname='product_import_batches_delete_own'
  ) THEN
    CREATE POLICY product_import_batches_delete_own ON public.product_import_batches FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_rows' AND policyname='product_import_rows_select_own'
  ) THEN
    CREATE POLICY product_import_rows_select_own ON public.product_import_rows FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_rows' AND policyname='product_import_rows_insert_own'
  ) THEN
    CREATE POLICY product_import_rows_insert_own ON public.product_import_rows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_rows' AND policyname='product_import_rows_update_own'
  ) THEN
    CREATE POLICY product_import_rows_update_own ON public.product_import_rows FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_import_rows' AND policyname='product_import_rows_delete_own'
  ) THEN
    CREATE POLICY product_import_rows_delete_own ON public.product_import_rows FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_imports' AND policyname='url_imports_select_own'
  ) THEN
    CREATE POLICY url_imports_select_own ON public.url_imports FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_imports' AND policyname='url_imports_insert_own'
  ) THEN
    CREATE POLICY url_imports_insert_own ON public.url_imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_imports' AND policyname='url_imports_update_own'
  ) THEN
    CREATE POLICY url_imports_update_own ON public.url_imports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_imports' AND policyname='url_imports_delete_own'
  ) THEN
    CREATE POLICY url_imports_delete_own ON public.url_imports FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_accounts' AND policyname='ebay_accounts_select_own'
  ) THEN
    CREATE POLICY ebay_accounts_select_own ON public.ebay_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_accounts' AND policyname='ebay_accounts_insert_own'
  ) THEN
    CREATE POLICY ebay_accounts_insert_own ON public.ebay_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_accounts' AND policyname='ebay_accounts_update_own'
  ) THEN
    CREATE POLICY ebay_accounts_update_own ON public.ebay_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_accounts' AND policyname='ebay_accounts_delete_own'
  ) THEN
    CREATE POLICY ebay_accounts_delete_own ON public.ebay_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_policies' AND policyname='ebay_policies_select_own'
  ) THEN
    CREATE POLICY ebay_policies_select_own ON public.ebay_policies FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_policies' AND policyname='ebay_policies_insert_own'
  ) THEN
    CREATE POLICY ebay_policies_insert_own ON public.ebay_policies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_policies' AND policyname='ebay_policies_update_own'
  ) THEN
    CREATE POLICY ebay_policies_update_own ON public.ebay_policies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_policies' AND policyname='ebay_policies_delete_own'
  ) THEN
    CREATE POLICY ebay_policies_delete_own ON public.ebay_policies FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_locations' AND policyname='ebay_locations_select_own'
  ) THEN
    CREATE POLICY ebay_locations_select_own ON public.ebay_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_locations' AND policyname='ebay_locations_insert_own'
  ) THEN
    CREATE POLICY ebay_locations_insert_own ON public.ebay_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_locations' AND policyname='ebay_locations_update_own'
  ) THEN
    CREATE POLICY ebay_locations_update_own ON public.ebay_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_locations' AND policyname='ebay_locations_delete_own'
  ) THEN
    CREATE POLICY ebay_locations_delete_own ON public.ebay_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_tokens' AND policyname='ebay_tokens_select_own'
  ) THEN
    CREATE POLICY ebay_tokens_select_own ON public.ebay_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_tokens' AND policyname='ebay_tokens_insert_own'
  ) THEN
    CREATE POLICY ebay_tokens_insert_own ON public.ebay_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_tokens' AND policyname='ebay_tokens_update_own'
  ) THEN
    CREATE POLICY ebay_tokens_update_own ON public.ebay_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_tokens' AND policyname='ebay_tokens_delete_own'
  ) THEN
    CREATE POLICY ebay_tokens_delete_own ON public.ebay_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_publication_attempts' AND policyname='ebay_publication_attempts_select_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_select_own ON public.ebay_publication_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_publication_attempts' AND policyname='ebay_publication_attempts_insert_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_insert_own ON public.ebay_publication_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_publication_attempts' AND policyname='ebay_publication_attempts_update_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_update_own ON public.ebay_publication_attempts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_publication_attempts' AND policyname='ebay_publication_attempts_delete_own'
  ) THEN
    CREATE POLICY ebay_publication_attempts_delete_own ON public.ebay_publication_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_select_own'
  ) THEN
    CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_insert_own'
  ) THEN
    CREATE POLICY subscriptions_insert_own ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_update_own'
  ) THEN
    CREATE POLICY subscriptions_update_own ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_delete_own'
  ) THEN
    CREATE POLICY subscriptions_delete_own ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_counters_select_own'
  ) THEN
    CREATE POLICY usage_counters_select_own ON public.usage_counters FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_counters_insert_own'
  ) THEN
    CREATE POLICY usage_counters_insert_own ON public.usage_counters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_counters_update_own'
  ) THEN
    CREATE POLICY usage_counters_update_own ON public.usage_counters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_counters_delete_own'
  ) THEN
    CREATE POLICY usage_counters_delete_own ON public.usage_counters FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_customers' AND policyname='stripe_customers_select_own'
  ) THEN
    CREATE POLICY stripe_customers_select_own ON public.stripe_customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_customers' AND policyname='stripe_customers_insert_own'
  ) THEN
    CREATE POLICY stripe_customers_insert_own ON public.stripe_customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_customers' AND policyname='stripe_customers_update_own'
  ) THEN
    CREATE POLICY stripe_customers_update_own ON public.stripe_customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_customers' AND policyname='stripe_customers_delete_own'
  ) THEN
    CREATE POLICY stripe_customers_delete_own ON public.stripe_customers FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_events' AND policyname='stripe_events_select_own'
  ) THEN
    CREATE POLICY stripe_events_select_own ON public.stripe_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_events' AND policyname='stripe_events_insert_own'
  ) THEN
    CREATE POLICY stripe_events_insert_own ON public.stripe_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_events' AND policyname='stripe_events_update_own'
  ) THEN
    CREATE POLICY stripe_events_update_own ON public.stripe_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_events' AND policyname='stripe_events_delete_own'
  ) THEN
    CREATE POLICY stripe_events_delete_own ON public.stripe_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_templates' AND policyname='marketing_templates_select_own'
  ) THEN
    CREATE POLICY marketing_templates_select_own ON public.marketing_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_templates' AND policyname='marketing_templates_insert_own'
  ) THEN
    CREATE POLICY marketing_templates_insert_own ON public.marketing_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_templates' AND policyname='marketing_templates_update_own'
  ) THEN
    CREATE POLICY marketing_templates_update_own ON public.marketing_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_templates' AND policyname='marketing_templates_delete_own'
  ) THEN
    CREATE POLICY marketing_templates_delete_own ON public.marketing_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_images' AND policyname='marketing_images_select_own'
  ) THEN
    CREATE POLICY marketing_images_select_own ON public.marketing_images FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_images' AND policyname='marketing_images_insert_own'
  ) THEN
    CREATE POLICY marketing_images_insert_own ON public.marketing_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_images' AND policyname='marketing_images_update_own'
  ) THEN
    CREATE POLICY marketing_images_update_own ON public.marketing_images FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='marketing_images' AND policyname='marketing_images_delete_own'
  ) THEN
    CREATE POLICY marketing_images_delete_own ON public.marketing_images FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='serpapi_cache' AND policyname='serpapi_cache_select_own'
  ) THEN
    CREATE POLICY serpapi_cache_select_own ON public.serpapi_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='serpapi_cache' AND policyname='serpapi_cache_insert_own'
  ) THEN
    CREATE POLICY serpapi_cache_insert_own ON public.serpapi_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='serpapi_cache' AND policyname='serpapi_cache_update_own'
  ) THEN
    CREATE POLICY serpapi_cache_update_own ON public.serpapi_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='serpapi_cache' AND policyname='serpapi_cache_delete_own'
  ) THEN
    CREATE POLICY serpapi_cache_delete_own ON public.serpapi_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_import_cache' AND policyname='url_import_cache_select_own'
  ) THEN
    CREATE POLICY url_import_cache_select_own ON public.url_import_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_import_cache' AND policyname='url_import_cache_insert_own'
  ) THEN
    CREATE POLICY url_import_cache_insert_own ON public.url_import_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_import_cache' AND policyname='url_import_cache_update_own'
  ) THEN
    CREATE POLICY url_import_cache_update_own ON public.url_import_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='url_import_cache' AND policyname='url_import_cache_delete_own'
  ) THEN
    CREATE POLICY url_import_cache_delete_own ON public.url_import_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_delete_own'
  ) THEN
    CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspaces' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_select_own'
  ) THEN
    CREATE POLICY workspaces_select_own ON public.workspaces FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspaces' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_insert_own'
  ) THEN
    CREATE POLICY workspaces_insert_own ON public.workspaces FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspaces' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_update_own'
  ) THEN
    CREATE POLICY workspaces_update_own ON public.workspaces FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspaces' AND column_name='id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspaces' AND policyname='workspaces_delete_own'
  ) THEN
    CREATE POLICY workspaces_delete_own ON public.workspaces FOR DELETE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_usage' AND policyname='workspace_usage_select_own'
  ) THEN
    CREATE POLICY workspace_usage_select_own ON public.workspace_usage FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_usage' AND policyname='workspace_usage_insert_own'
  ) THEN
    CREATE POLICY workspace_usage_insert_own ON public.workspace_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_usage' AND policyname='workspace_usage_update_own'
  ) THEN
    CREATE POLICY workspace_usage_update_own ON public.workspace_usage FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='workspace_usage' AND policyname='workspace_usage_delete_own'
  ) THEN
    CREATE POLICY workspace_usage_delete_own ON public.workspace_usage FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_reservations' AND policyname='usage_reservations_select_own'
  ) THEN
    CREATE POLICY usage_reservations_select_own ON public.usage_reservations FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_reservations' AND policyname='usage_reservations_insert_own'
  ) THEN
    CREATE POLICY usage_reservations_insert_own ON public.usage_reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_reservations' AND policyname='usage_reservations_update_own'
  ) THEN
    CREATE POLICY usage_reservations_update_own ON public.usage_reservations FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='usage_reservations' AND policyname='usage_reservations_delete_own'
  ) THEN
    CREATE POLICY usage_reservations_delete_own ON public.usage_reservations FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_connections' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_connections' AND policyname='ebay_connections_select_own'
  ) THEN
    CREATE POLICY ebay_connections_select_own ON public.ebay_connections FOR SELECT TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_connections' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_connections' AND policyname='ebay_connections_insert_own'
  ) THEN
    CREATE POLICY ebay_connections_insert_own ON public.ebay_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_connections' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_connections' AND policyname='ebay_connections_update_own'
  ) THEN
    CREATE POLICY ebay_connections_update_own ON public.ebay_connections FOR UPDATE TO authenticated USING (auth.uid() = workspace_id) WITH CHECK (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='ebay_connections' AND column_name='workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ebay_connections' AND policyname='ebay_connections_delete_own'
  ) THEN
    CREATE POLICY ebay_connections_delete_own ON public.ebay_connections FOR DELETE TO authenticated USING (auth.uid() = workspace_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscription_plans'
      AND policyname='subscription_plans_select_active'
  ) THEN
    CREATE POLICY subscription_plans_select_active
      ON public.subscription_plans
      FOR SELECT TO authenticated
      USING (est_actif = true);
  END IF;
END $$;

-- ===========================================================================
-- SEED PLANS (no overwrite)
-- ===========================================================================

INSERT INTO public.subscription_plans (
  code, nom, description, prix_mensuel_cents, prix_annuel_cents, quotas, fonctionnalites, ordre_affichage
) VALUES
  ('free', 'Gratuit', 'Pour decouvrir SNOWOLF', 0, 0,
   '{"analyses":10,"publications":5,"imports":2,"url_imports":5,"serp_requests":20}'::jsonb,
   '{"bulk_import":false,"marketing_templates":false,"priority_support":false}'::jsonb, 0),
  ('starter', 'Starter', 'Pour les vendeurs occasionnels', 1900, 19000,
   '{"analyses":100,"publications":50,"imports":20,"url_imports":50,"serp_requests":200}'::jsonb,
   '{"bulk_import":true,"marketing_templates":true,"priority_support":false}'::jsonb, 1),
  ('pro', 'Pro', 'Pour les vendeurs actifs', 4900, 49000,
   '{"analyses":500,"publications":250,"imports":100,"url_imports":250,"serp_requests":1000}'::jsonb,
   '{"bulk_import":true,"marketing_templates":true,"priority_support":true}'::jsonb, 2),
  ('business', 'Business', 'Pour les professionnels', 9900, 99000,
   '{"analyses":2000,"publications":1000,"imports":500,"url_imports":1000,"serp_requests":5000}'::jsonb,
   '{"bulk_import":true,"marketing_templates":true,"priority_support":true}'::jsonb, 3)
ON CONFLICT (code) DO NOTHING;

-- Verification
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY 1;
