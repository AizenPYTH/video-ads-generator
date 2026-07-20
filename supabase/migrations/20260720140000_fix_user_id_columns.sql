-- SNOWOLF - fix: colonnes user_id manquantes
-- Cause: tables deja presentes sans user_id, puis INDEX / POLICY sur user_id.
-- Sur: aucune suppression de donnees.
-- Projet: https://olijbnhinkvnqoudmqbv.supabase.co
--
-- Executer CE fichier dans le SQL Editor, puis relancer
-- 20260720120000_snowolf_incremental_safe.sql si besoin.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._snowolf_add_column_if_missing(
  p_table text,
  p_column text,
  p_type text,
  p_default text DEFAULT NULL
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
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Add missing user_id (nullable d'abord — safe si lignes existantes)
-- ---------------------------------------------------------------------------

SELECT public._snowolf_add_column_if_missing('user_settings', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('notification_settings', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ads', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ad_images', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ad_history', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('listing_publications', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('publication_attempts', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('analyzed_products', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('analysis_runs', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('analysis_evidence', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('product_import_batches', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('product_import_rows', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('url_imports', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ebay_accounts', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ebay_policies', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ebay_locations', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ebay_tokens', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('ebay_publication_attempts', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('subscriptions', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('usage_counters', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('stripe_customers', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('stripe_events', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('marketing_templates', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('marketing_images', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('serpapi_cache', 'user_id', 'UUID');
SELECT public._snowolf_add_column_if_missing('url_import_cache', 'user_id', 'UUID');

-- ---------------------------------------------------------------------------
-- Indexes on user_id (only if column exists)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_settings' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_user_id ON public.ads (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_images' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_user_id ON public.ad_images (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_history' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_user_id ON public.ad_history (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_user_id ON public.listing_publications (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_user_id ON public.publication_attempts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analyzed_products_user_id ON public.analyzed_products (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_user_id ON public.analysis_runs (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_evidence_user_id ON public.analysis_evidence (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_user_id ON public.product_import_batches (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_user_id ON public.product_import_rows (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_user_id ON public.url_imports (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_accounts_user_id ON public.ebay_accounts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_policies_user_id ON public.ebay_policies (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_locations_user_id ON public.ebay_locations (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_tokens_user_id ON public.ebay_tokens (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_user_id ON public.ebay_publication_attempts (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_counters' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON public.usage_counters (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON public.stripe_customers (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_events' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id ON public.stripe_events (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_templates_user_id ON public.marketing_templates (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_images' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_images_user_id ON public.marketing_images (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_serpapi_cache_user_id ON public.serpapi_cache (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_url_import_cache_user_id ON public.url_import_cache (user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Cleanup + verification
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public._snowolf_add_column_if_missing(text, text, text, text);

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
ORDER BY table_name;
