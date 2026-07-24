/**
 * Reset SNOWOLF content: ads, imports, analyses, images, publications.
 * Keeps auth users / profiles / subscriptions / ebay tokens.
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function getEnv(name) {
  const env = fs.readFileSync(".env.local", "utf8");
  const m = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const TABLES_ORDER = [
  "ad_images",
  "ad_history",
  "listing_publications",
  "publication_attempts",
  "ebay_publication_attempts",
  "analysis_evidence",
  "analysis_runs",
  "analyzed_products",
  "product_import_rows",
  "product_import_batches",
  "url_imports",
  "url_import_cache",
  "marketing_images",
  "ad_reference_resolutions",
  "reference_search_cache",
  "ads",
];

async function countTable(sb, table) {
  const { count, error } = await sb
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) return { table, error: error.message, count: null };
  return { table, count: count ?? 0, error: null };
}

async function wipeTable(sb, table) {
  // Delete all rows: PostgREST needs a filter — use gte on created_at or neq on impossible id
  const { data, error } = await sb
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("id");
  if (error) return { table, deleted: 0, error: error.message };
  return { table, deleted: data?.length ?? 0, error: null };
}

async function resetUsage(sb) {
  const updates = [
    { table: "workspace_usage", patch: { ads_used_this_period: 0, url_imports_used: 0, analyses_used: 0, publications_used: 0, imports_used: 0 } },
    { table: "subscriptions", patch: { ads_used_this_period: 0 } },
  ];
  for (const u of updates) {
    const { error } = await sb
      .from(u.table)
      .update(u.patch)
      .neq("id", "00000000-0000-0000-0000-000000000000");
    console.log(
      "reset",
      u.table,
      error ? `ERR ${error.message}` : "OK",
    );
  }
}

async function main() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("Missing Supabase URL or service role key");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("=== BEFORE ===");
  for (const t of TABLES_ORDER) {
    const r = await countTable(sb, t);
    console.log(
      r.error ? `${t}: ERR ${r.error}` : `${t}: ${r.count}`,
    );
  }

  console.log("=== WIPE ===");
  for (const t of TABLES_ORDER) {
    const r = await wipeTable(sb, t);
    console.log(
      r.error
        ? `${t}: ERR ${r.error}`
        : `${t}: deleted ${r.deleted}`,
    );
  }

  console.log("=== USAGE RESET ===");
  await resetUsage(sb);

  console.log("=== AFTER ===");
  for (const t of ["ads", "product_import_batches", "product_import_rows", "url_imports", "ad_images"]) {
    const r = await countTable(sb, t);
    console.log(
      r.error ? `${t}: ERR ${r.error}` : `${t}: ${r.count}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
