const fs = require("fs");
const path = require("path");

const outPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260720120000_snowolf_incremental_safe.sql",
);

const enums = {
  ad_statut: [
    "DRAFT",
    "ANALYZING",
    "NEEDS_REVIEW",
    "READY",
    "VALIDATING",
    "INVENTORY_CREATED",
    "OFFER_CREATED",
    "PUBLISHING",
    "PUBLISHED",
    "FAILED",
    "ARCHIVED",
    "ENDED",
    "SENDING_TO_EBAY",
  ],
  import_batch_statut: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "PARTIAL"],
  import_row_statut: ["PENDING", "SUCCESS", "FAILED", "SKIPPED"],
  url_import_statut: ["PENDING", "FETCHING", "ANALYZING", "COMPLETED", "FAILED"],
  analysis_run_statut: ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
  publication_statut: ["PENDING", "IN_PROGRESS", "SUCCESS", "FAILED", "CANCELLED"],
  subscription_statut: [
    "ACTIVE",
    "TRIALING",
    "PAST_DUE",
    "CANCELED",
    "UNPAID",
    "INCOMPLETE",
    "INCOMPLETE_EXPIRED",
    "PAUSED",
  ],
  ebay_policy_type: ["FULFILLMENT", "PAYMENT", "RETURN"],
  usage_counter_type: [
    "ANALYSES",
    "PUBLICATIONS",
    "IMPORTS",
    "URL_IMPORTS",
    "SERP_REQUESTS",
  ],
};

function enumBlock(name, values) {
  const vals = values.map((v) => `'${v}'`).join(", ");
  let s = "";
  s += "DO $$ BEGIN\n";
  s += `  CREATE TYPE public.${name} AS ENUM (${vals});\n`;
  s += "EXCEPTION WHEN duplicate_object THEN NULL;\n";
  s += "END $$;\n\n";
  for (const v of values) {
    s += "DO $$ BEGIN\n";
    s += `  ALTER TYPE public.${name} ADD VALUE IF NOT EXISTS '${v}';\n`;
    s += "EXCEPTION WHEN others THEN NULL;\n";
    s += "END $$;\n";
  }
  s += "\n";
  return s;
}

function addCol(table, col, def) {
  return `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${def};\n`;
}

function ensurePolicy(table, name, sql) {
  return (
    "DO $$ BEGIN\n" +
    "  IF NOT EXISTS (\n" +
    `    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${table}' AND policyname = '${name}'\n` +
    "  ) THEN\n" +
    `    ${sql};\n` +
    "  END IF;\n" +
    "END $$;\n\n"
  );
}

function ensureTrigger(name, table) {
  return (
    "DO $$ BEGIN\n" +
    `  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${name}') THEN\n` +
    `    CREATE TRIGGER ${name}\n` +
    `      BEFORE UPDATE ON public.${table}\n` +
    "      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();\n" +
    "  END IF;\n" +
    "END $$;\n\n"
  );
}

function ensureConstraint(table, name, sql) {
  return (
    "DO $$ BEGIN\n" +
    "  IF NOT EXISTS (\n" +
    `    SELECT 1 FROM pg_constraint WHERE conname = '${name}'\n` +
    "  ) THEN\n" +
    `    ALTER TABLE public.${table} ${sql};\n` +
    "  END IF;\n" +
    "END $$;\n\n"
  );
}

function ownCrud(table, uidExpr) {
  return (
    ensurePolicy(
      table,
      `${table}_select_own`,
      `CREATE POLICY ${table}_select_own ON public.${table} FOR SELECT TO authenticated USING (${uidExpr})`,
    ) +
    ensurePolicy(
      table,
      `${table}_insert_own`,
      `CREATE POLICY ${table}_insert_own ON public.${table} FOR INSERT TO authenticated WITH CHECK (${uidExpr})`,
    ) +
    ensurePolicy(
      table,
      `${table}_update_own`,
      `CREATE POLICY ${table}_update_own ON public.${table} FOR UPDATE TO authenticated USING (${uidExpr}) WITH CHECK (${uidExpr})`,
    ) +
    ensurePolicy(
      table,
      `${table}_delete_own`,
      `CREATE POLICY ${table}_delete_own ON public.${table} FOR DELETE TO authenticated USING (${uidExpr})`,
    )
  );
}

let out = "";
out += "-- SNOWOLF — migration incrémentale sûre\n";
out += "-- Ne supprime aucune table ni donnée.\n";
out += "-- Idempotente : IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / policies conditionnelles.\n";
out += "-- À exécuter dans le SQL Editor du projet SNOWOLF uniquement (pas FACTEO).\n";
out += "-- Ne pas réexécuter 20260101000000_initial_schema.sql.\n\n";

out += 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n';

out += "-- ===========================================================================\n";
out += "-- ENUMS\n";
out += "-- ===========================================================================\n\n";
for (const [k, v] of Object.entries(enums)) out += enumBlock(k, v);

out += "-- ===========================================================================\n";
out += "-- FUNCTIONS\n";
out += "-- ===========================================================================\n\n";

out += `CREATE OR REPLACE FUNCTION public.set_updated_at()
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

`;

out += "-- ===========================================================================\n";
out += "-- TABLES + COLUMNS\n";
out += "-- ===========================================================================\n\n";

out += `CREATE TABLE IF NOT EXISTS public.profiles (
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

`;
[
  ["email", "TEXT"],
  ["prenom", "TEXT"],
  ["nom", "TEXT"],
  ["avatar_url", "TEXT"],
  ["langue", "TEXT NOT NULL DEFAULT 'fr'"],
  ["fuseau_horaire", "TEXT NOT NULL DEFAULT 'Europe/Paris'"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
  ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
].forEach(([c, d]) => {
  out += addCol("profiles", c, d);
});
out += "\n";

out += `CREATE TABLE IF NOT EXISTS public.user_settings (
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

`;
[
  ["id", "UUID DEFAULT gen_random_uuid()"],
  ["user_id", "UUID"],
  ["devise", "TEXT NOT NULL DEFAULT 'EUR'"],
  ["marche_ebay", "TEXT NOT NULL DEFAULT 'EBAY_FR'"],
  ["politique_expedition_par_defaut", "TEXT"],
  ["politique_retour_par_defaut", "TEXT"],
  ["politique_paiement_par_defaut", "TEXT"],
  ["lieu_expedition_par_defaut", "TEXT"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
  ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
].forEach(([c, d]) => {
  out += addCol("user_settings", c, d);
});
out += ensureConstraint(
  "user_settings",
  "user_settings_user_id_key",
  "ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id)",
);
out += ensureConstraint(
  "user_settings",
  "user_settings_user_id_fkey",
  "ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE",
);

out += `CREATE TABLE IF NOT EXISTS public.notification_settings (
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

`;
out += addCol("notification_settings", "user_id", "UUID");
[
  "email_nouvelle_annonce",
  "email_publication_reussie",
  "email_publication_echouee",
  "email_analyse_terminee",
  "email_quota_atteint",
].forEach((c) => {
  out += addCol("notification_settings", c, "BOOLEAN NOT NULL DEFAULT true");
});
out += addCol(
  "notification_settings",
  "created_at",
  "TIMESTAMPTZ NOT NULL DEFAULT now()",
);
out += addCol(
  "notification_settings",
  "updated_at",
  "TIMESTAMPTZ NOT NULL DEFAULT now()",
);
out += ensureConstraint(
  "notification_settings",
  "notification_settings_user_id_key",
  "ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id)",
);

out += `CREATE TABLE IF NOT EXISTS public.ads (
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

`;
[
  ["user_id", "UUID"],
  ["titre", "TEXT"],
  ["description", "TEXT"],
  ["statut", "public.ad_statut DEFAULT 'DRAFT'::public.ad_statut"],
  ["resultat_identification", "JSONB"],
  ["prix_achat", "NUMERIC(12, 2)"],
  ["prix_vente", "NUMERIC(12, 2)"],
  ["quantite", "INTEGER NOT NULL DEFAULT 1"],
  ["sku", "TEXT"],
  ["ebay_category_id", "TEXT"],
  ["ebay_condition_id", "TEXT"],
  ["notes", "TEXT"],
  ["metadata", "JSONB NOT NULL DEFAULT '{}'::jsonb"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
  ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
].forEach(([c, d]) => {
  out += addCol("ads", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.ad_images (
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

`;
[
  ["url", "TEXT NOT NULL DEFAULT ''"],
  ["storage_path", "TEXT"],
  ["ordre", "INTEGER NOT NULL DEFAULT 0"],
  ["est_principale", "BOOLEAN NOT NULL DEFAULT false"],
  ["largeur", "INTEGER"],
  ["hauteur", "INTEGER"],
  ["created_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
  ["updated_at", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
].forEach(([c, d]) => {
  out += addCol("ad_images", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.ad_history (
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

`;
[
  ["statut_avant", "public.ad_statut"],
  ["statut_apres", "public.ad_statut"],
  ["action", "TEXT NOT NULL DEFAULT ''"],
  ["details", "JSONB NOT NULL DEFAULT '{}'::jsonb"],
].forEach(([c, d]) => {
  out += addCol("ad_history", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.listing_publications (
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

`;
[
  ["ebay_account_id", "UUID"],
  ["ebay_listing_id", "TEXT"],
  ["statut", "public.publication_statut NOT NULL DEFAULT 'PENDING'"],
  ["url_annonce", "TEXT"],
  ["published_at", "TIMESTAMPTZ"],
  ["ended_at", "TIMESTAMPTZ"],
].forEach(([c, d]) => {
  out += addCol("listing_publications", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  listing_publication_id UUID NOT NULL REFERENCES public.listing_publications (id) ON DELETE CASCADE,
  statut public.publication_statut NOT NULL DEFAULT 'PENDING',
  erreur TEXT,
  reponse_ebay JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.analyzed_products (
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

`;
[
  ["ad_id", "UUID"],
  ["url_source", "TEXT"],
  ["resultat_identification", "JSONB"],
  ["confiance_globale", "NUMERIC(5, 4)"],
  ["necessite_revision", "BOOLEAN NOT NULL DEFAULT false"],
].forEach(([c, d]) => {
  out += addCol("analyzed_products", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.analysis_runs (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.analysis_evidence (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.product_import_batches (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.product_import_rows (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.url_imports (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.ebay_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  ebay_user_id TEXT NOT NULL DEFAULT '',
  nom_compte TEXT,
  marche TEXT NOT NULL DEFAULT 'EBAY_FR',
  est_actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;
out += ensureConstraint(
  "ebay_accounts",
  "ebay_accounts_user_id_ebay_user_id_key",
  "ADD CONSTRAINT ebay_accounts_user_id_ebay_user_id_key UNIQUE (user_id, ebay_user_id)",
);
out += ensureConstraint(
  "listing_publications",
  "listing_publications_ebay_account_id_fkey",
  "ADD CONSTRAINT listing_publications_ebay_account_id_fkey FOREIGN KEY (ebay_account_id) REFERENCES public.ebay_accounts (id) ON DELETE SET NULL",
);

out += `CREATE TABLE IF NOT EXISTS public.ebay_policies (
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

`;
out += ensureConstraint(
  "ebay_policies",
  "ebay_policies_ebay_account_id_type_politique_ebay_policy_id_key",
  "ADD CONSTRAINT ebay_policies_ebay_account_id_type_politique_ebay_policy_id_key UNIQUE (ebay_account_id, type_politique, ebay_policy_id)",
);

out += `CREATE TABLE IF NOT EXISTS public.ebay_locations (
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

`;
out += ensureConstraint(
  "ebay_locations",
  "ebay_locations_ebay_account_id_ebay_location_id_key",
  "ADD CONSTRAINT ebay_locations_ebay_account_id_ebay_location_id_key UNIQUE (ebay_account_id, ebay_location_id)",
);

out += `CREATE TABLE IF NOT EXISTS public.ebay_tokens (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.ebay_publication_attempts (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.subscription_plans (
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

`;
[
  ["code", "TEXT"],
  ["nom", "TEXT NOT NULL DEFAULT ''"],
  ["description", "TEXT"],
  ["prix_mensuel_cents", "INTEGER NOT NULL DEFAULT 0"],
  ["prix_annuel_cents", "INTEGER NOT NULL DEFAULT 0"],
  ["quotas", "JSONB NOT NULL DEFAULT '{}'::jsonb"],
  ["fonctionnalites", "JSONB NOT NULL DEFAULT '{}'::jsonb"],
  ["est_actif", "BOOLEAN NOT NULL DEFAULT true"],
  ["ordre_affichage", "INTEGER NOT NULL DEFAULT 0"],
  ["stripe_price_id_mensuel", "TEXT"],
  ["stripe_price_id_annuel", "TEXT"],
].forEach(([c, d]) => {
  out += addCol("subscription_plans", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.subscriptions (
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

`;
[
  ["plan_id", "UUID"],
  ["statut", "public.subscription_statut NOT NULL DEFAULT 'INCOMPLETE'"],
  ["stripe_subscription_id", "TEXT"],
  ["periode_debut", "TIMESTAMPTZ"],
  ["periode_fin", "TIMESTAMPTZ"],
  ["annulation_a_fin_periode", "BOOLEAN NOT NULL DEFAULT false"],
].forEach(([c, d]) => {
  out += addCol("subscriptions", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type_compteur public.usage_counter_type NOT NULL DEFAULT 'ANALYSES',
  periode TEXT NOT NULL DEFAULT '',
  valeur INTEGER NOT NULL DEFAULT 0,
  limite INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;
out += ensureConstraint(
  "usage_counters",
  "usage_counters_user_id_type_compteur_periode_key",
  "ADD CONSTRAINT usage_counters_user_id_type_compteur_periode_key UNIQUE (user_id, type_compteur, periode)",
);

out += `CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.stripe_events (
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

`;

out += `CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT '',
  type_template TEXT NOT NULL DEFAULT 'description',
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  est_par_defaut BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.marketing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.marketing_templates (id) ON DELETE SET NULL,
  url TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  type_image TEXT NOT NULL DEFAULT 'overlay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.serpapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  cle_cache TEXT NOT NULL UNIQUE,
  requete TEXT NOT NULL DEFAULT '',
  reponse JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.url_import_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL DEFAULT '',
  contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
  expire_a TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;
out += addCol("workspaces", "plan_id", "TEXT NOT NULL DEFAULT 'FREE'");

out += `CREATE TABLE IF NOT EXISTS public.workspace_usage (
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

`;
[
  ["plan_id", "TEXT NOT NULL DEFAULT 'FREE'"],
  ["period_start", "TIMESTAMPTZ NOT NULL DEFAULT now()"],
  ["analyses_used", "INTEGER NOT NULL DEFAULT 0"],
  ["publications_used", "INTEGER NOT NULL DEFAULT 0"],
  ["imports_used", "INTEGER NOT NULL DEFAULT 0"],
  ["url_imports_used", "INTEGER NOT NULL DEFAULT 0"],
].forEach(([c, d]) => {
  out += addCol("workspace_usage", c, d);
});
out += ensureConstraint(
  "workspace_usage",
  "workspace_usage_workspace_id_period_start_key",
  "ADD CONSTRAINT workspace_usage_workspace_id_period_start_key UNIQUE (workspace_id, period_start)",
);

out += `CREATE TABLE IF NOT EXISTS public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'FREE',
  metric TEXT NOT NULL DEFAULT 'analyses',
  amount INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;
[
  ["plan_id", "TEXT NOT NULL DEFAULT 'FREE'"],
  ["metric", "TEXT NOT NULL DEFAULT 'analyses'"],
  ["amount", "INTEGER NOT NULL DEFAULT 1"],
  ["status", "TEXT NOT NULL DEFAULT 'pending'"],
].forEach(([c, d]) => {
  out += addCol("usage_reservations", c, d);
});

out += `CREATE TABLE IF NOT EXISTS public.ebay_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL DEFAULT '',
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;
out += ensureConstraint(
  "ebay_connections",
  "ebay_connections_workspace_id_key",
  "ADD CONSTRAINT ebay_connections_workspace_id_key UNIQUE (workspace_id)",
);

out += `CREATE TABLE IF NOT EXISTS public.reference_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL DEFAULT '',
  normalized_reference TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += `CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL DEFAULT '',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

`;

out += "-- ===========================================================================\n";
out += "-- Ensure user_id / statut on pre-existing tables\n";
out += "-- ===========================================================================\n\n";

const userIdTables = [
  "notification_settings",
  "ads",
  "ad_images",
  "ad_history",
  "listing_publications",
  "publication_attempts",
  "analyzed_products",
  "analysis_runs",
  "analysis_evidence",
  "product_import_batches",
  "product_import_rows",
  "url_imports",
  "ebay_accounts",
  "ebay_policies",
  "ebay_locations",
  "ebay_tokens",
  "ebay_publication_attempts",
  "subscriptions",
  "usage_counters",
  "stripe_customers",
  "stripe_events",
  "marketing_templates",
  "marketing_images",
  "serpapi_cache",
  "url_import_cache",
];
for (const t of userIdTables) {
  out += addCol(t, "user_id", "UUID");
}

[
  ["analysis_runs", "statut", "public.analysis_run_statut DEFAULT 'PENDING'::public.analysis_run_statut"],
  ["product_import_batches", "statut", "public.import_batch_statut DEFAULT 'PENDING'::public.import_batch_statut"],
  ["product_import_rows", "statut", "public.import_row_statut DEFAULT 'PENDING'::public.import_row_statut"],
  ["url_imports", "statut", "public.url_import_statut DEFAULT 'PENDING'::public.url_import_statut"],
  ["ebay_publication_attempts", "statut", "public.publication_statut DEFAULT 'PENDING'::public.publication_statut"],
].forEach(([t, c, d]) => {
  out += addCol(t, c, d);
});
out += "\n";

out += "-- ===========================================================================\n";
out += "-- INDEXES\n";
out += "-- ===========================================================================\n\n";

function safeIndex(name, table, cols) {
  const colMatch = cols.match(/^\((\w+)\)$/);
  if (!colMatch) {
    return `CREATE INDEX IF NOT EXISTS ${name} ON public.${table} ${cols};\n`;
  }
  const col = colMatch[1];
  return (
    "DO $$ BEGIN\n" +
    `  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name='${col}') THEN\n` +
    `    CREATE INDEX IF NOT EXISTS ${name} ON public.${table} ${cols};\n` +
    "  END IF;\n" +
    "END $$;\n"
  );
}

const indexes = [
  ["idx_profiles_created_at", "profiles", "(created_at)"],
  ["idx_user_settings_user_id", "user_settings", "(user_id)"],
  ["idx_user_settings_created_at", "user_settings", "(created_at)"],
  ["idx_notification_settings_user_id", "notification_settings", "(user_id)"],
  ["idx_notification_settings_created_at", "notification_settings", "(created_at)"],
  ["idx_ads_user_id", "ads", "(user_id)"],
  ["idx_ads_statut", "ads", "(statut)"],
  ["idx_ads_created_at", "ads", "(created_at)"],
  ["idx_ad_images_user_id", "ad_images", "(user_id)"],
  ["idx_ad_images_ad_id", "ad_images", "(ad_id)"],
  ["idx_ad_images_created_at", "ad_images", "(created_at)"],
  ["idx_ad_history_user_id", "ad_history", "(user_id)"],
  ["idx_ad_history_ad_id", "ad_history", "(ad_id)"],
  ["idx_ad_history_created_at", "ad_history", "(created_at)"],
  ["idx_listing_publications_user_id", "listing_publications", "(user_id)"],
  ["idx_listing_publications_statut", "listing_publications", "(statut)"],
  ["idx_listing_publications_created_at", "listing_publications", "(created_at)"],
  ["idx_publication_attempts_user_id", "publication_attempts", "(user_id)"],
  ["idx_publication_attempts_statut", "publication_attempts", "(statut)"],
  ["idx_publication_attempts_created_at", "publication_attempts", "(created_at)"],
  ["idx_analyzed_products_user_id", "analyzed_products", "(user_id)"],
  ["idx_analyzed_products_created_at", "analyzed_products", "(created_at)"],
  ["idx_analysis_runs_user_id", "analysis_runs", "(user_id)"],
  ["idx_analysis_runs_statut", "analysis_runs", "(statut)"],
  ["idx_analysis_runs_created_at", "analysis_runs", "(created_at)"],
  ["idx_analysis_evidence_user_id", "analysis_evidence", "(user_id)"],
  ["idx_analysis_evidence_created_at", "analysis_evidence", "(created_at)"],
  ["idx_product_import_batches_user_id", "product_import_batches", "(user_id)"],
  ["idx_product_import_batches_statut", "product_import_batches", "(statut)"],
  ["idx_product_import_batches_created_at", "product_import_batches", "(created_at)"],
  ["idx_product_import_rows_user_id", "product_import_rows", "(user_id)"],
  ["idx_product_import_rows_statut", "product_import_rows", "(statut)"],
  ["idx_product_import_rows_created_at", "product_import_rows", "(created_at)"],
  ["idx_url_imports_user_id", "url_imports", "(user_id)"],
  ["idx_url_imports_statut", "url_imports", "(statut)"],
  ["idx_url_imports_created_at", "url_imports", "(created_at)"],
  ["idx_ebay_accounts_user_id", "ebay_accounts", "(user_id)"],
  ["idx_ebay_accounts_created_at", "ebay_accounts", "(created_at)"],
  ["idx_ebay_policies_user_id", "ebay_policies", "(user_id)"],
  ["idx_ebay_policies_created_at", "ebay_policies", "(created_at)"],
  ["idx_ebay_locations_user_id", "ebay_locations", "(user_id)"],
  ["idx_ebay_locations_created_at", "ebay_locations", "(created_at)"],
  ["idx_ebay_tokens_user_id", "ebay_tokens", "(user_id)"],
  ["idx_ebay_tokens_created_at", "ebay_tokens", "(created_at)"],
  ["idx_ebay_publication_attempts_user_id", "ebay_publication_attempts", "(user_id)"],
  ["idx_ebay_publication_attempts_statut", "ebay_publication_attempts", "(statut)"],
  ["idx_ebay_publication_attempts_created_at", "ebay_publication_attempts", "(created_at)"],
  ["idx_subscription_plans_created_at", "subscription_plans", "(created_at)"],
  ["idx_subscriptions_user_id", "subscriptions", "(user_id)"],
  ["idx_subscriptions_statut", "subscriptions", "(statut)"],
  ["idx_subscriptions_created_at", "subscriptions", "(created_at)"],
  ["idx_usage_counters_user_id", "usage_counters", "(user_id)"],
  ["idx_usage_counters_created_at", "usage_counters", "(created_at)"],
  ["idx_stripe_customers_user_id", "stripe_customers", "(user_id)"],
  ["idx_stripe_customers_created_at", "stripe_customers", "(created_at)"],
  ["idx_stripe_events_user_id", "stripe_events", "(user_id)"],
  ["idx_stripe_events_created_at", "stripe_events", "(created_at)"],
  ["idx_marketing_templates_user_id", "marketing_templates", "(user_id)"],
  ["idx_marketing_templates_created_at", "marketing_templates", "(created_at)"],
  ["idx_marketing_images_user_id", "marketing_images", "(user_id)"],
  ["idx_marketing_images_created_at", "marketing_images", "(created_at)"],
  ["idx_serpapi_cache_user_id", "serpapi_cache", "(user_id)"],
  ["idx_serpapi_cache_created_at", "serpapi_cache", "(created_at)"],
  ["idx_url_import_cache_user_id", "url_import_cache", "(user_id)"],
  ["idx_url_import_cache_created_at", "url_import_cache", "(created_at)"],
  ["idx_workspace_usage_workspace_id", "workspace_usage", "(workspace_id)"],
  ["idx_workspace_usage_period_start", "workspace_usage", "(period_start)"],
  ["idx_usage_reservations_workspace_id", "usage_reservations", "(workspace_id)"],
  ["idx_usage_reservations_created_at", "usage_reservations", "(created_at)"],
  ["idx_ebay_connections_workspace_id", "ebay_connections", "(workspace_id)"],
  ["idx_reference_search_cache_expires_at", "reference_search_cache", "(expires_at)"],
];
for (const [n, t, cols] of indexes) {
  out += safeIndex(n, t, cols);
}
out += "\n";

out += "-- ===========================================================================\n";
out += "-- TRIGGERS\n";
out += "-- ===========================================================================\n\n";

[
  ["set_profiles_updated_at", "profiles"],
  ["set_user_settings_updated_at", "user_settings"],
  ["set_notification_settings_updated_at", "notification_settings"],
  ["set_ads_updated_at", "ads"],
  ["set_ad_images_updated_at", "ad_images"],
  ["set_ad_history_updated_at", "ad_history"],
  ["set_listing_publications_updated_at", "listing_publications"],
  ["set_publication_attempts_updated_at", "publication_attempts"],
  ["set_analyzed_products_updated_at", "analyzed_products"],
  ["set_analysis_runs_updated_at", "analysis_runs"],
  ["set_analysis_evidence_updated_at", "analysis_evidence"],
  ["set_product_import_batches_updated_at", "product_import_batches"],
  ["set_product_import_rows_updated_at", "product_import_rows"],
  ["set_url_imports_updated_at", "url_imports"],
  ["set_ebay_accounts_updated_at", "ebay_accounts"],
  ["set_ebay_policies_updated_at", "ebay_policies"],
  ["set_ebay_locations_updated_at", "ebay_locations"],
  ["set_ebay_tokens_updated_at", "ebay_tokens"],
  ["set_ebay_publication_attempts_updated_at", "ebay_publication_attempts"],
  ["set_subscription_plans_updated_at", "subscription_plans"],
  ["set_subscriptions_updated_at", "subscriptions"],
  ["set_usage_counters_updated_at", "usage_counters"],
  ["set_stripe_customers_updated_at", "stripe_customers"],
  ["set_stripe_events_updated_at", "stripe_events"],
  ["set_marketing_templates_updated_at", "marketing_templates"],
  ["set_marketing_images_updated_at", "marketing_images"],
  ["set_serpapi_cache_updated_at", "serpapi_cache"],
  ["set_url_import_cache_updated_at", "url_import_cache"],
  ["set_workspaces_updated_at", "workspaces"],
  ["set_workspace_usage_updated_at", "workspace_usage"],
  ["set_usage_reservations_updated_at", "usage_reservations"],
  ["set_ebay_connections_updated_at", "ebay_connections"],
  ["set_reference_search_cache_updated_at", "reference_search_cache"],
].forEach(([n, t]) => {
  out += ensureTrigger(n, t);
});

out += `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

`;

out += "-- ===========================================================================\n";
out += "-- RLS\n";
out += "-- ===========================================================================\n\n";

[
  "profiles",
  "user_settings",
  "notification_settings",
  "ads",
  "ad_images",
  "ad_history",
  "listing_publications",
  "publication_attempts",
  "analyzed_products",
  "analysis_runs",
  "analysis_evidence",
  "product_import_batches",
  "product_import_rows",
  "url_imports",
  "ebay_accounts",
  "ebay_policies",
  "ebay_locations",
  "ebay_tokens",
  "ebay_connections",
  "ebay_publication_attempts",
  "subscription_plans",
  "subscriptions",
  "usage_counters",
  "workspaces",
  "workspace_usage",
  "usage_reservations",
  "stripe_customers",
  "stripe_events",
  "marketing_templates",
  "marketing_images",
  "serpapi_cache",
  "url_import_cache",
].forEach((t) => {
  out += `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;\n`;
});
out += "\n";

out += ownCrud("profiles", "auth.uid() = id");
out += ownCrud("user_settings", "auth.uid() = user_id");
out += ownCrud("notification_settings", "auth.uid() = user_id");
out += ownCrud("ads", "auth.uid() = user_id");
out += ownCrud("ad_images", "auth.uid() = user_id");
out += ownCrud("ad_history", "auth.uid() = user_id");
out += ownCrud("listing_publications", "auth.uid() = user_id");
out += ownCrud("publication_attempts", "auth.uid() = user_id");
out += ownCrud("analyzed_products", "auth.uid() = user_id");
out += ownCrud("analysis_runs", "auth.uid() = user_id");
out += ownCrud("analysis_evidence", "auth.uid() = user_id");
out += ownCrud("product_import_batches", "auth.uid() = user_id");
out += ownCrud("product_import_rows", "auth.uid() = user_id");
out += ownCrud("url_imports", "auth.uid() = user_id");
out += ownCrud("ebay_accounts", "auth.uid() = user_id");
out += ownCrud("ebay_policies", "auth.uid() = user_id");
out += ownCrud("ebay_locations", "auth.uid() = user_id");
out += ownCrud("ebay_tokens", "auth.uid() = user_id");
out += ownCrud("ebay_publication_attempts", "auth.uid() = user_id");
out += ownCrud("subscriptions", "auth.uid() = user_id");
out += ownCrud("usage_counters", "auth.uid() = user_id");
out += ownCrud("stripe_customers", "auth.uid() = user_id");
out += ownCrud("stripe_events", "auth.uid() = user_id");
out += ownCrud("marketing_templates", "auth.uid() = user_id");
out += ownCrud("marketing_images", "auth.uid() = user_id");
out += ownCrud("serpapi_cache", "auth.uid() = user_id");
out += ownCrud("url_import_cache", "auth.uid() = user_id");
out += ownCrud("workspaces", "auth.uid() = id");
out += ownCrud("workspace_usage", "auth.uid() = workspace_id");
out += ownCrud("usage_reservations", "auth.uid() = workspace_id");
out += ownCrud("ebay_connections", "auth.uid() = workspace_id");

out += ensurePolicy(
  "subscription_plans",
  "subscription_plans_select_active",
  "CREATE POLICY subscription_plans_select_active ON public.subscription_plans FOR SELECT TO authenticated USING (est_actif = true)",
);

out += "-- ===========================================================================\n";
out += "-- SEED PLANS (no overwrite)\n";
out += "-- ===========================================================================\n\n";

out += `INSERT INTO public.subscription_plans (code, nom, description, prix_mensuel_cents, prix_annuel_cents, quotas, fonctionnalites, ordre_affichage)
VALUES
  ('free', 'Gratuit', 'Pour découvrir SNOWOLF', 0, 0, '{"analyses": 10, "publications": 5, "imports": 2, "url_imports": 5, "serp_requests": 20}'::jsonb, '{"bulk_import": false, "marketing_templates": false, "priority_support": false}'::jsonb, 0),
  ('starter', 'Starter', 'Pour les vendeurs occasionnels', 1900, 19000, '{"analyses": 100, "publications": 50, "imports": 20, "url_imports": 50, "serp_requests": 200}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": false}'::jsonb, 1),
  ('pro', 'Pro', 'Pour les vendeurs actifs', 4900, 49000, '{"analyses": 500, "publications": 250, "imports": 100, "url_imports": 250, "serp_requests": 1000}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb, 2),
  ('business', 'Business', 'Pour les professionnels', 9900, 99000, '{"analyses": 2000, "publications": 1000, "imports": 500, "url_imports": 1000, "serp_requests": 5000}'::jsonb, '{"bulk_import": true, "marketing_templates": true, "priority_support": true}'::jsonb, 3)
ON CONFLICT (code) DO NOTHING;
`;

fs.writeFileSync(outPath, out, "utf8");
console.log(`Wrote ${outPath} (${out.length} chars)`);
