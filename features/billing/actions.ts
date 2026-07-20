"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/services/stripe/checkout";
import { createCustomerPortalSession } from "@/services/stripe/portal";
import { PlanId, isValidPlanId } from "@/lib/billing/plans";

export type BillingActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
};

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié.");
  }

  return user.id;
}

export async function startCheckout(
  planId: string,
): Promise<BillingActionResult<{ url: string }>> {
  try {
    const userId = await requireUserId();

    if (!isValidPlanId(planId) || planId === PlanId.FREE) {
      return { error: "Plan invalide." };
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const session = await createCheckoutSession({
      workspaceId: userId,
      planId,
      customerEmail: profile?.email ?? undefined,
    });

    redirect(session.url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function openBillingPortal(): Promise<BillingActionResult<{ url: string }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: customer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!customer?.stripe_customer_id) {
      return { error: "Aucun abonnement actif trouvé." };
    }

    const session = await createCustomerPortalSession(customer.stripe_customer_id);
    redirect(session.url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getSubscriptionInfo(): Promise<
  BillingActionResult<{
    planName: string;
    statut: string;
    periode_fin: string | null;
  }>
> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("statut, periode_fin, plan_id, subscription_plans(nom)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return {
        success: true,
        data: { planName: "Gratuit", statut: "ACTIVE", periode_fin: null },
      };
    }

    const planJoin = subscription.subscription_plans as
      | { nom?: string }[]
      | { nom?: string }
      | null
      | undefined;

    const planNom =
      Array.isArray(planJoin) ? planJoin[0]?.nom : planJoin?.nom;

    return {
      success: true,
      data: {
        planName: planNom ?? "Inconnu",
        statut: subscription.statut,
        periode_fin: subscription.periode_fin,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
