-- SNOWOLF - fix: colonnes statut manquantes
-- Cause: tables deja presentes sans colonne statut, puis INDEX sur statut.
-- Sur: aucune suppression de donnees.
-- Projet: https://olijbnhinkvnqoudmqbv.supabase.co

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (idempotent)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.ad_statut AS ENUM (
    'DRAFT', 'ANALYZING', 'NEEDS_REVIEW', 'READY', 'VALIDATING',
    'INVENTORY_CREATED', 'OFFER_CREATED', 'PUBLISHING', 'PUBLISHED',
    'FAILED', 'ARCHIVED', 'ENDED', 'SENDING_TO_EBAY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_batch_statut AS ENUM (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.import_row_statut AS ENUM (
    'PENDING', 'SUCCESS', 'FAILED', 'SKIPPED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.url_import_statut AS ENUM (
    'PENDING', 'FETCHING', 'ANALYZING', 'COMPLETED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.analysis_run_statut AS ENUM (
    'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publication_statut AS ENUM (
    'PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_statut AS ENUM (
    'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID',
    'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: add column only if missing (safe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._snowolf_add_column_if_missing(
  p_table text,
  p_column text,
  p_type text,
  p_default text DEFAULT NULL,
  p_not_null boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN %I %s%s',
      p_table,
      p_column,
      p_type,
      CASE WHEN p_default IS NULL THEN '' ELSE ' DEFAULT ' || p_default END
    );

    IF p_not_null THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
        p_table,
        p_column
      );
    END IF;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Add missing statut columns
-- ---------------------------------------------------------------------------

SELECT public._snowolf_add_column_if_missing('ads', 'statut', 'public.ad_statut', '''DRAFT''::public.ad_statut', true);
SELECT public._snowolf_add_column_if_missing('ad_history', 'statut_avant', 'public.ad_statut', NULL, false);
SELECT public._snowolf_add_column_if_missing('ad_history', 'statut_apres', 'public.ad_statut', NULL, false);

SELECT public._snowolf_add_column_if_missing('listing_publications', 'statut', 'public.publication_statut', '''PENDING''::public.publication_statut', true);
SELECT public._snowolf_add_column_if_missing('publication_attempts', 'statut', 'public.publication_statut', '''PENDING''::public.publication_statut', true);
SELECT public._snowolf_add_column_if_missing('ebay_publication_attempts', 'statut', 'public.publication_statut', '''PENDING''::public.publication_statut', true);

SELECT public._snowolf_add_column_if_missing('analysis_runs', 'statut', 'public.analysis_run_statut', '''PENDING''::public.analysis_run_statut', true);
SELECT public._snowolf_add_column_if_missing('product_import_batches', 'statut', 'public.import_batch_statut', '''PENDING''::public.import_batch_statut', true);
SELECT public._snowolf_add_column_if_missing('product_import_rows', 'statut', 'public.import_row_statut', '''PENDING''::public.import_row_statut', true);
SELECT public._snowolf_add_column_if_missing('url_imports', 'statut', 'public.url_import_statut', '''PENDING''::public.url_import_statut', true);

SELECT public._snowolf_add_column_if_missing('subscriptions', 'statut', 'public.subscription_statut', '''INCOMPLETE''::public.subscription_statut', true);

-- ---------------------------------------------------------------------------
-- Indexes on statut (only if column exists)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_statut ON public.ads (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_statut ON public.listing_publications (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_statut ON public.publication_attempts (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_statut ON public.analysis_runs (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_statut ON public.product_import_batches (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_statut ON public.product_import_rows (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_statut ON public.url_imports (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_statut ON public.ebay_publication_attempts (statut);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='statut') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_statut ON public.subscriptions (statut);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Cleanup helper
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public._snowolf_add_column_if_missing(text, text, text, text, boolean);

-- ---------------------------------------------------------------------------
-- Verification (optional result set)
-- ---------------------------------------------------------------------------

SELECT table_name, column_name, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('statut', 'statut_avant', 'statut_apres')
ORDER BY table_name, column_name;
