-- SNOWOLF - fix: alignement complet des colonnes manquantes
-- Cause: tables pre-existantes avec schema different (sans created_at, user_id, etc.)
-- Sur: aucune suppression. Idempotent.
-- Projet: https://olijbnhinkvnqoudmqbv.supabase.co
-- Executer CE fichier une fois, puis relancer l'incremental si besoin.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ad_history
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS statut_avant public.ad_statut;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS statut_apres public.ad_statut;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS action TEXT DEFAULT '';
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ad_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ad_images
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS est_principale BOOLEAN DEFAULT false;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS largeur INTEGER;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS hauteur INTEGER;
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ad_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS statut public.ad_statut DEFAULT 'DRAFT';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS resultat_identification JSONB;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_achat NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS prix_vente NUMERIC(12, 2);
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ebay_category_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ebay_condition_id TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- analysis_evidence
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS analysis_run_id UUID;
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS source TEXT DEFAULT '';
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS champ TEXT DEFAULT '';
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS valeur TEXT DEFAULT '';
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS poids NUMERIC(5, 4) DEFAULT 0;
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analysis_evidence ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- analysis_runs
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS analyzed_product_id UUID;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS modele_ia TEXT;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS statut public.analysis_run_statut DEFAULT 'PENDING';
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS duree_ms INTEGER;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS tokens_utilises INTEGER;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- analyzed_products
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS url_source TEXT;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS resultat_identification JSONB;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS confiance_globale NUMERIC(5, 4);
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS necessite_revision BOOLEAN DEFAULT false;
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.analyzed_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_accounts
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS ebay_user_id TEXT DEFAULT '';
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS nom_compte TEXT;
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS marche TEXT DEFAULT 'EBAY_FR';
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true;
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_connections
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT DEFAULT '';
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_locations
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS ebay_location_id TEXT DEFAULT '';
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS adresse JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS est_par_defaut BOOLEAN DEFAULT false;
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_policies
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS type_politique public.ebay_policy_type DEFAULT 'FULFILLMENT';
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS ebay_policy_id TEXT DEFAULT '';
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS est_par_defaut BOOLEAN DEFAULT false;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_publication_attempts
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS listing_publication_id UUID;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING';
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS requete JSONB;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS reponse JSONB;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS ebay_offer_id TEXT;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS ebay_inventory_item_sku TEXT;
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_publication_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ebay_tokens
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS access_token TEXT DEFAULT '';
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ebay_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- listing_publications
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_account_id UUID;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING';
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS url_annonce TEXT;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.listing_publications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- marketing_images
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS type_image TEXT DEFAULT 'overlay';
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.marketing_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- marketing_templates
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT '';
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS type_template TEXT DEFAULT 'description';
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS contenu JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS est_par_defaut BOOLEAN DEFAULT false;
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.marketing_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- notification_settings
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_nouvelle_annonce BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_reussie BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_publication_echouee BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_analyse_terminee BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS email_quota_atteint BOOLEAN DEFAULT true;
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- product_import_batches
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nom_fichier TEXT DEFAULT '';
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS statut public.import_batch_statut DEFAULT 'PENDING';
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nombre_lignes INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_traitees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_reussies INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_echouees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- product_import_rows
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS numero_ligne INTEGER DEFAULT 0;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS statut public.import_row_statut DEFAULT 'PENDING';
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS donnees_brutes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS prenom TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS langue TEXT DEFAULT 'fr';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fuseau_horaire TEXT DEFAULT 'Europe/Paris';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- publication_attempts
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS listing_publication_id UUID;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS statut public.publication_statut DEFAULT 'PENDING';
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS reponse_ebay JSONB;
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.publication_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- reference_search_cache
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS normalized_reference TEXT;
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS cached_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.reference_search_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- serpapi_cache
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS cle_cache TEXT;
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS requete TEXT DEFAULT '';
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS reponse JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS expire_a TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.serpapi_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- stripe_customers
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.stripe_customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- stripe_events
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS type_evenement TEXT DEFAULT '';
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS traite BOOLEAN DEFAULT false;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS traite_a TIMESTAMPTZ;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- stripe_webhook_events
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT '';
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT now();

-- subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS nom TEXT DEFAULT '';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS prix_mensuel_cents INTEGER DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS prix_annuel_cents INTEGER DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS quotas JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS fonctionnalites JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS est_actif BOOLEAN DEFAULT true;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS ordre_affichage INTEGER DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_mensuel TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id_annuel TEXT;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS statut public.subscription_statut DEFAULT 'INCOMPLETE';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_debut TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS periode_fin TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS annulation_a_fin_periode BOOLEAN DEFAULT false;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- url_import_cache
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS url_hash TEXT;
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS contenu JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS expire_a TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.url_import_cache ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- url_imports
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS statut public.url_import_statut DEFAULT 'PENDING';
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS erreur TEXT;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.url_imports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- usage_counters
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS type_compteur public.usage_counter_type DEFAULT 'ANALYSES';
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS periode TEXT DEFAULT '';
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS valeur INTEGER DEFAULT 0;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS limite INTEGER;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- usage_reservations
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'FREE';
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS metric TEXT DEFAULT 'analyses';
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 1;
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.usage_reservations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- user_settings
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS devise TEXT DEFAULT 'EUR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS marche_ebay TEXT DEFAULT 'EBAY_FR';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_expedition_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_retour_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS politique_paiement_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS lieu_expedition_par_defaut TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- workspace_usage
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'FREE';
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS analyses_used INTEGER DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS publications_used INTEGER DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS imports_used INTEGER DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS url_imports_used INTEGER DEFAULT 0;
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.workspace_usage ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'FREE';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indexes created_at (safe)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_history' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_history_created_at ON public.ad_history (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ad_images' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ad_images_created_at ON public.ad_images (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ads' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ads_created_at ON public.ads (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_evidence' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_evidence_created_at ON public.analysis_evidence (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analysis_runs' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_created_at ON public.analysis_runs (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='analyzed_products' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_analyzed_products_created_at ON public.analyzed_products (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_accounts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_accounts_created_at ON public.ebay_accounts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_locations' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_locations_created_at ON public.ebay_locations (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_policies' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_policies_created_at ON public.ebay_policies (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_publication_attempts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_publication_attempts_created_at ON public.ebay_publication_attempts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ebay_tokens' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_ebay_tokens_created_at ON public.ebay_tokens (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='listing_publications' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_listing_publications_created_at ON public.listing_publications (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_images' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_images_created_at ON public.marketing_images (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='marketing_templates' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_templates_created_at ON public.marketing_templates (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notification_settings' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_notification_settings_created_at ON public.notification_settings (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_batches' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_batches_created_at ON public.product_import_batches (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_import_rows' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_product_import_rows_created_at ON public.product_import_rows (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='publication_attempts' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_publication_attempts_created_at ON public.publication_attempts (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reference_search_cache' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_reference_search_cache_created_at ON public.reference_search_cache (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='serpapi_cache' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_serpapi_cache_created_at ON public.serpapi_cache (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_customers' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_customers_created_at ON public.stripe_customers (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stripe_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_created_at ON public.subscription_plans (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_import_cache' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_url_import_cache_created_at ON public.url_import_cache (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='url_imports' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_url_imports_created_at ON public.url_imports (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_counters' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_counters_created_at ON public.usage_counters (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usage_reservations' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_usage_reservations_created_at ON public.usage_reservations (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_user_settings_created_at ON public.user_settings (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspace_usage' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_workspace_usage_created_at ON public.workspace_usage (created_at);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces (created_at);
  END IF;
END $$;

-- Verification
SELECT c.table_name, COUNT(*) FILTER (WHERE c.column_name = 'created_at') AS has_created_at,
       COUNT(*) FILTER (WHERE c.column_name = 'user_id') AS has_user_id,
       COUNT(*) FILTER (WHERE c.column_name = 'statut') AS has_statut
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = ANY (ARRAY['ad_history','ad_images','ads','analysis_evidence','analysis_runs','analyzed_products','ebay_accounts','ebay_connections','ebay_locations','ebay_policies','ebay_publication_attempts','ebay_tokens','listing_publications','marketing_images','marketing_templates','notification_settings','product_import_batches','product_import_rows','profiles','publication_attempts','reference_search_cache','serpapi_cache','stripe_customers','stripe_events','stripe_webhook_events','subscription_plans','subscriptions','url_import_cache','url_imports','usage_counters','usage_reservations','user_settings','workspace_usage','workspaces'])
GROUP BY c.table_name
ORDER BY c.table_name;
