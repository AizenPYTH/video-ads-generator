
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