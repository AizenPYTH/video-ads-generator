
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
