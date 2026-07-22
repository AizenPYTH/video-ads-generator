import { createAdminClient } from "@/lib/supabase/admin";

/** Quota élevé pendant la phase de test (tous comptes). */
const TEST_ADS_LIMIT = 10_000;

/**
 * Garantit public.users + abonnement actif.
 * Requis car subscriptions.user_id référence public.users (pas auth.users).
 */
export async function ensureFreeSubscription(userId: string): Promise<void> {
  const admin = createAdminClient();

  // 1) public.users (FK)
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email =
    authUser?.user?.email?.trim() ||
    `${userId}@users.local`;
  const fullName =
    (authUser?.user?.user_metadata?.full_name as string | undefined) ||
    (authUser?.user?.user_metadata?.name as string | undefined) ||
    email.split("@")[0] ||
    null;

  const { error: userUpsertError } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: "user",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (userUpsertError) {
    throw new Error(
      `Impossible de synchroniser l'utilisateur: ${userUpsertError.message}`,
    );
  }

  // 2) subscription
  const { data: existing, error: existingError } = await admin
    .from("subscriptions")
    .select("id, ads_limit, ads_used_this_period, status, statut")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Impossible de lire l'abonnement: ${existingError.message}`,
    );
  }

  const { data: freePlan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("code", "free")
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan: "free",
      status: "active",
      statut: "ACTIVE",
      ads_limit: TEST_ADS_LIMIT,
      ads_used_this_period: 0,
      plan_id: freePlan?.id ?? null,
    });

    if (insertError) {
      const { data: raced } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!raced) {
        throw new Error(
          `Impossible de créer l'abonnement: ${insertError.message}`,
        );
      }
    }
    return;
  }

  const needsBoost =
    (existing.ads_limit ?? 0) < TEST_ADS_LIMIT ||
    (existing.ads_used_this_period ?? 0) >= (existing.ads_limit ?? 0) ||
    existing.status !== "active" ||
    existing.statut !== "ACTIVE";

  if (needsBoost) {
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        ads_limit: TEST_ADS_LIMIT,
        ads_used_this_period: 0,
        status: "active",
        statut: "ACTIVE",
        plan_id: freePlan?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(
        `Impossible de mettre à jour l'abonnement: ${updateError.message}`,
      );
    }
  }
}
