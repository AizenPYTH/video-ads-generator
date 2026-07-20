
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