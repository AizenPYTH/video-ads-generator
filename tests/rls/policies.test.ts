import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "supabase/migrations/20260101000000_initial_schema.sql",
);

const USER_SCOPED_TABLES = [
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
] as const;

function readMigration(): string {
  return fs.readFileSync(MIGRATION_PATH, "utf8");
}

function extractPolicies(sql: string, table: string): string[] {
  const pattern = new RegExp(
    `CREATE POLICY ([\\w]+) ON public\\.${table}[\\s\\S]*?;`,
    "g",
  );
  return [...sql.matchAll(pattern)].map((match) => match[1]);
}

describe("RLS policy expectations", () => {
  const sql = readMigration();

  it("enables RLS on all user data tables", () => {
    for (const table of USER_SCOPED_TABLES) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain("ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY");
  });

  it("defines CRUD policies scoped to auth.uid() for ads", () => {
    const policies = extractPolicies(sql, "ads");

    expect(policies).toContain("ads_select_own");
    expect(policies).toContain("ads_insert_own");
    expect(policies).toContain("ads_update_own");
    expect(policies).toContain("ads_delete_own");
    expect(sql).toMatch(
      /ads_select_own[\s\S]*auth\.uid\(\) = user_id/,
    );
  });

  it("scopes profiles policies to auth.uid() = id", () => {
    expect(sql).toMatch(
      /profiles_select_own[\s\S]*auth\.uid\(\) = id/,
    );
    expect(sql).toMatch(
      /profiles_update_own[\s\S]*WITH CHECK \(auth\.uid\(\) = id\)/,
    );
  });

  it("restricts subscription_plans to active plans for authenticated users", () => {
    expect(sql).toMatch(
      /subscription_plans_select_active[\s\S]*est_actif = true/,
    );
  });

  it("defines own-row policies for import tables", () => {
    for (const table of ["product_import_batches", "product_import_rows"]) {
      const policies = extractPolicies(sql, table);
      expect(policies.some((p) => p.includes("select_own"))).toBe(true);
      expect(policies.some((p) => p.includes("insert_own"))).toBe(true);
      expect(sql).toMatch(
        new RegExp(`${table}_select_own[\\s\\S]*auth\\.uid\\(\\) = user_id`),
      );
    }
  });

  it("defines own-row policies for eBay token storage", () => {
    const policies = extractPolicies(sql, "ebay_tokens");

    expect(policies).toHaveLength(4);
    expect(sql).toMatch(
      /ebay_tokens_select_own[\s\S]*auth\.uid\(\) = user_id/,
    );
  });

  it("documents stripe_events access tied to user_id", () => {
    expect(sql).toMatch(
      /stripe_events_select_own[\s\S]*auth\.uid\(\) = user_id/,
    );
  });

  it("has no tables with RLS enabled but zero policies (except intentional)", () => {
    const rlsTables = [...sql.matchAll(/ALTER TABLE public\.(\w+) ENABLE ROW LEVEL SECURITY/g)]
      .map((m) => m[1]);

    for (const table of rlsTables) {
      const policies = extractPolicies(sql, table);
      expect(policies.length).toBeGreaterThan(0);
    }
  });
});
