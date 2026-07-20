/**
 * Generate safe incremental migration from remote schema analysis.
 * Input: tmp-schema-analysis.json + 20260101000000_initial_schema.sql
 * Output: 20260720160000_snowolf_incremental_from_remote.sql
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const analysis = JSON.parse(
  fs.readFileSync(path.join(root, "tmp-schema-analysis.json"), "utf8"),
);
const initial = fs.readFileSync(
  path.join(root, "supabase/migrations/20260101000000_initial_schema.sql"),
  "utf8",
);

const tableRe = /CREATE TABLE public\.(\w+) \(([\s\S]*?)\n\);/g;
const createBlocks = {};
const expectedCols = {};
let m;
while ((m = tableRe.exec(initial))) {
  const name = m[1];
  const body = m[2];
  createBlocks[name] =
    "CREATE TABLE IF NOT EXISTS public." + name + " (" + body + "\n);";
  const cols = [];
  for (const line of body.split("\n")) {
    const t = line.trim().replace(/,$/, "");
    if (!t || /^(CONSTRAINT|UNIQUE|PRIMARY|CHECK|FOREIGN|--)/i.test(t)) continue;
    const mm = t.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);
    if (!mm) continue;
    let rest = mm[2]
      .replace(/\s+REFERENCES[\s\S]*$/i, "")
      .replace(/\s+PRIMARY KEY/gi, "")
      .replace(/\s+UNIQUE/gi, "")
      .replace(/\s+NOT NULL/gi, "")
      .trim();
    cols.push({ col: mm[1], def: rest });
  }
  expectedCols[name] = cols;
}

const remoteCols = {};
for (const [t, cols] of Object.entries(analysis.byTable)) {
  remoteCols[t] = new Set(cols.map((c) => c.name));
}

const lines = [];
const push = (s = "") => lines.push(s);

push("-- SNOWOLF — migration incrémentale sûre");
push("-- Projet: olijbnhinkvnqoudmqbv (inspecté le 2026-07-20)");
push("-- Règles:");
push("--   - aucune DROP / TRUNCATE / DELETE");
push("--   - CREATE TABLE uniquement avec IF NOT EXISTS");
push("--   - ADD COLUMN IF NOT EXISTS pour colonnes app manquantes");
push("--   - indexes / triggers / policies conditionnels");
push("--   - ne touche PAS aux tables legacy (users, products, photos, …)");
push("");
push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
push("");

const neededEnums = {
  ebay_policy_type: ["FULFILLMENT", "PAYMENT", "RETURN"],
  usage_counter_type: [
    "ANALYSES",
    "PUBLICATIONS",
    "IMPORTS",
    "URL_IMPORTS",
    "SERP_REQUESTS",
  ],
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
};

push("-- ===========================================================================");
push("-- ENUMS (idempotent)");
push("-- ===========================================================================");
push("");
for (const [name, vals] of Object.entries(neededEnums)) {
  push("DO $$ BEGIN");
  push(
    `  CREATE TYPE public.${name} AS ENUM (${vals.map((v) => `'${v}'`).join(", ")});`,
  );
  push("EXCEPTION WHEN duplicate_object THEN NULL;");
  push("END $$;");
  push("");
  for (const v of vals) {
    push("DO $$ BEGIN");
    push(`  ALTER TYPE public.${name} ADD VALUE IF NOT EXISTS '${v}';`);
    push("EXCEPTION WHEN others THEN NULL;");
    push("END $$;");
  }
  push("");
}

push("-- ===========================================================================");
push("-- FUNCTIONS");
push("-- ===========================================================================");
push("");
push(`CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;`);
push("");
push(`CREATE OR REPLACE FUNCTION public.handle_new_user()
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
$$;`);
push("");
push(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;`);
push("");

push("-- ===========================================================================");
push("-- TABLES MANQUANTES (CREATE IF NOT EXISTS)");
push("-- ===========================================================================");
push("");
const missingOrdered = [
  "profiles",
  "subscription_plans",
  "workspaces",
  "ad_images",
  "ad_history",
  "publication_attempts",
  "analyzed_products",
  "analysis_runs",
  "analysis_evidence",
  "url_imports",
  "ebay_policies",
  "ebay_locations",
  "ebay_tokens",
  "ebay_publication_attempts",
  "usage_counters",
  "stripe_customers",
  "marketing_templates",
  "marketing_images",
  "serpapi_cache",
  "url_import_cache",
  "workspace_usage",
  "usage_reservations",
  "ebay_connections",
  "reference_search_cache",
  "stripe_webhook_events",
].filter((t) => analysis.missing.includes(t));
for (const t of analysis.missing) {
  if (!missingOrdered.includes(t)) missingOrdered.push(t);
}
for (const t of missingOrdered) {
  if (!createBlocks[t]) {
    push(`-- WARN: pas de bloc CREATE pour ${t}`);
    continue;
  }
  push(createBlocks[t]);
  push("");
}

push("-- ===========================================================================");
push("-- COLONNES APP MANQUANTES SUR TABLES DÉJÀ PRÉSENTES");
push("-- (schéma legacy EN conservé ; on ajoute les colonnes FR attendues par l'app)");
push("-- ===========================================================================");
push("");
for (const t of analysis.overlap) {
  const expected = expectedCols[t] || [];
  const remote = remoteCols[t] || new Set();
  push(`-- ${t}`);
  for (const { col, def } of expected) {
    if (remote.has(col)) continue;
    push(`ALTER TABLE public.${t} ADD COLUMN IF NOT EXISTS ${col} ${def};`);
  }
  push("");
}

function safeIdx(name, table, col) {
  return `DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${col}'
  ) THEN
    CREATE INDEX IF NOT EXISTS ${name} ON public.${table} (${col});
  END IF;
END $$;`;
}

push("-- ===========================================================================");
push("-- INDEXES (conditionnels)");
push("-- ===========================================================================");
push("");
const idxs = [
  ["idx_profiles_created_at", "profiles", "created_at"],
  ["idx_user_settings_user_id", "user_settings", "user_id"],
  ["idx_notification_settings_user_id", "notification_settings", "user_id"],
  ["idx_ads_user_id", "ads", "user_id"],
  ["idx_ads_statut", "ads", "statut"],
  ["idx_ads_created_at", "ads", "created_at"],
  ["idx_ad_images_user_id", "ad_images", "user_id"],
  ["idx_ad_images_ad_id", "ad_images", "ad_id"],
  ["idx_ad_history_user_id", "ad_history", "user_id"],
  ["idx_ad_history_ad_id", "ad_history", "ad_id"],
  ["idx_listing_publications_user_id", "listing_publications", "user_id"],
  ["idx_listing_publications_statut", "listing_publications", "statut"],
  ["idx_publication_attempts_user_id", "publication_attempts", "user_id"],
  ["idx_analyzed_products_user_id", "analyzed_products", "user_id"],
  ["idx_analysis_runs_user_id", "analysis_runs", "user_id"],
  ["idx_analysis_runs_statut", "analysis_runs", "statut"],
  ["idx_analysis_evidence_user_id", "analysis_evidence", "user_id"],
  ["idx_product_import_batches_user_id", "product_import_batches", "user_id"],
  ["idx_product_import_batches_statut", "product_import_batches", "statut"],
  ["idx_product_import_rows_user_id", "product_import_rows", "user_id"],
  ["idx_product_import_rows_statut", "product_import_rows", "statut"],
  ["idx_url_imports_user_id", "url_imports", "user_id"],
  ["idx_ebay_accounts_user_id", "ebay_accounts", "user_id"],
  ["idx_ebay_policies_user_id", "ebay_policies", "user_id"],
  ["idx_ebay_locations_user_id", "ebay_locations", "user_id"],
  ["idx_ebay_tokens_user_id", "ebay_tokens", "user_id"],
  ["idx_ebay_publication_attempts_user_id", "ebay_publication_attempts", "user_id"],
  ["idx_subscription_plans_created_at", "subscription_plans", "created_at"],
  ["idx_subscriptions_user_id", "subscriptions", "user_id"],
  ["idx_subscriptions_statut", "subscriptions", "statut"],
  ["idx_usage_counters_user_id", "usage_counters", "user_id"],
  ["idx_stripe_customers_user_id", "stripe_customers", "user_id"],
  ["idx_stripe_events_user_id", "stripe_events", "user_id"],
  ["idx_marketing_templates_user_id", "marketing_templates", "user_id"],
  ["idx_marketing_images_user_id", "marketing_images", "user_id"],
  ["idx_serpapi_cache_user_id", "serpapi_cache", "user_id"],
  ["idx_url_import_cache_user_id", "url_import_cache", "user_id"],
  ["idx_workspace_usage_workspace_id", "workspace_usage", "workspace_id"],
  ["idx_usage_reservations_workspace_id", "usage_reservations", "workspace_id"],
  ["idx_ebay_connections_workspace_id", "ebay_connections", "workspace_id"],
];
for (const [n, t, c] of idxs) {
  push(safeIdx(n, t, c));
  push("");
}

push("-- ===========================================================================");
push("-- TRIGGERS updated_at");
push("-- ===========================================================================");
push("");
const triggerTables = [
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
  "ebay_publication_attempts",
  "subscription_plans",
  "subscriptions",
  "usage_counters",
  "stripe_customers",
  "marketing_templates",
  "marketing_images",
  "serpapi_cache",
  "url_import_cache",
  "workspaces",
  "workspace_usage",
  "usage_reservations",
  "ebay_connections",
];
for (const t of triggerTables) {
  const tn = `set_${t}_updated_at`;
  push(`DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${t}')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='${tn}') THEN
    CREATE TRIGGER ${tn}
      BEFORE UPDATE ON public.${t}
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;`);
  push("");
}

push("-- ===========================================================================");
push("-- RLS");
push("-- ===========================================================================");
push("");
const rlsTables = [
  ...triggerTables,
  "stripe_events",
  "subscription_plans",
];
for (const t of [...new Set(rlsTables)]) {
  push(`ALTER TABLE IF EXISTS public.${t} ENABLE ROW LEVEL SECURITY;`);
}
push("");

function ownPolicy(table, uidCol) {
  const ops = [
    ["select", "FOR SELECT", "USING"],
    ["insert", "FOR INSERT", "WITH CHECK"],
    ["update", "FOR UPDATE", "USING"],
    ["delete", "FOR DELETE", "USING"],
  ];
  const chunks = [];
  for (const [op, clause, kind] of ops) {
    const name = `${table}_${op}_own`;
    const expr =
      op === "update"
        ? `USING (auth.uid() = ${uidCol}) WITH CHECK (auth.uid() = ${uidCol})`
        : `${kind} (auth.uid() = ${uidCol})`;
    chunks.push(`DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='${table}' AND column_name='${uidCol}'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='${table}' AND policyname='${name}'
  ) THEN
    CREATE POLICY ${name} ON public.${table} ${clause} TO authenticated ${expr};
  END IF;
END $$;`);
  }
  return chunks.join("\n\n");
}

const userIdTables = [
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
  push(ownPolicy(t, "user_id"));
  push("");
}
push(ownPolicy("profiles", "id"));
push("");
push(ownPolicy("workspaces", "id"));
push("");
push(ownPolicy("workspace_usage", "workspace_id"));
push("");
push(ownPolicy("usage_reservations", "workspace_id"));
push("");
push(ownPolicy("ebay_connections", "workspace_id"));
push("");

push(`DO $$ BEGIN
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
END $$;`);
push("");

push("-- ===========================================================================");
push("-- SEED PLANS (no overwrite)");
push("-- ===========================================================================");
push("");
push(`INSERT INTO public.subscription_plans (
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
ON CONFLICT (code) DO NOTHING;`);
push("");

push("-- Verification");
push(`SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY 1;`);
push("");

const outPath = path.join(
  root,
  "supabase/migrations/20260720160000_snowolf_incremental_from_remote.sql",
);
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Wrote", outPath);
console.log("bytes", fs.statSync(outPath).size);
console.log("missing tables", analysis.missing.length);
console.log("overlap tables", analysis.overlap.length);
