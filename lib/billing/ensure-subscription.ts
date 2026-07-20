import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Garantit un abonnement free pour l'utilisateur.
 * Requis par un trigger legacy sur `ads` ("No subscription found for user").
 */
export async function ensureFreeSubscription(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, ads_limit, ads_used_this_period")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: freePlan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("code", "free")
    .maybeSingle();

  if (!existing) {
    await admin.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      status: "active",
      statut: "ACTIVE",
      ads_limit: 50,
      ads_used_this_period: 0,
      plan_id: freePlan?.id ?? null,
    });
    return;
  }

  // Débloque si le quota free legacy (souvent 5) est saturé.
  if (
    typeof existing.ads_used_this_period === "number" &&
    typeof existing.ads_limit === "number" &&
    existing.ads_used_this_period >= existing.ads_limit
  ) {
    await admin
      .from("subscriptions")
      .update({
        ads_limit: Math.max(existing.ads_limit, 50),
        ads_used_this_period: 0,
        status: "active",
        statut: "ACTIVE",
        plan_id: freePlan?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  }
}
