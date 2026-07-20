import { createClient } from "@/lib/supabase/server";
import { getStatusesForGroup } from "@/features/ads/status";
import type { AdHistoryRow } from "@/types/database";

export type DashboardStats = {
  totalAds: number;
  drafts: number;
  ready: number;
  published: number;
  errors: number;
  needsReview: number;
  quotas: {
    analyses: { used: number; limit: number | null };
    publications: { used: number; limit: number | null };
    imports: { used: number; limit: number | null };
    urlImports: { used: number; limit: number | null };
  };
  recentActivity: AdHistoryRow[];
};

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    totalResult,
    draftsResult,
    readyResult,
    publishedResult,
    errorsResult,
    needsReviewResult,
    countersResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("statut", getStatusesForGroup("Brouillons")),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("statut", getStatusesForGroup("Prêtes")),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("statut", getStatusesForGroup("Publiées")),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("statut", getStatusesForGroup("Erreurs")),
    supabase
      .from("ads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("statut", "NEEDS_REVIEW"),
    supabase
      .from("usage_counters")
      .select("type_compteur, valeur, limite")
      .eq("user_id", userId)
      .eq("periode", currentPeriod()),
    supabase
      .from("ad_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const counters = countersResult.data ?? [];
  const getCounter = (type: string) => {
    const row = counters.find((c) => c.type_compteur === type);
    return { used: row?.valeur ?? 0, limit: row?.limite ?? null };
  };

  return {
    totalAds: totalResult.count ?? 0,
    drafts: draftsResult.count ?? 0,
    ready: readyResult.count ?? 0,
    published: publishedResult.count ?? 0,
    errors: errorsResult.count ?? 0,
    needsReview: needsReviewResult.count ?? 0,
    quotas: {
      analyses: getCounter("ANALYSES"),
      publications: getCounter("PUBLICATIONS"),
      imports: getCounter("IMPORTS"),
      urlImports: getCounter("URL_IMPORTS"),
    },
    recentActivity: (activityResult.data ?? []) as AdHistoryRow[],
  };
}
