import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";
import { isValidPlanId, type PlanId } from "@/lib/billing/plans";
import { getStripeClient } from "./client";
import type Stripe from "stripe";

async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("stripe_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  return Boolean(data);
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });

  if (error && !error.message.includes("duplicate")) {
    throw AppError.internal("Failed to record webhook event", error);
  }
}

async function updateWorkspacePlan(
  workspaceId: string,
  planId: PlanId,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan_id: planId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) {
    throw AppError.internal("Failed to update workspace plan", error);
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const workspaceId = session.metadata?.workspaceId;
  const planId = session.metadata?.planId;

  if (!workspaceId || !planId || !isValidPlanId(planId)) {
    throw AppError.validation("Missing workspace or plan metadata in checkout session");
  }

  await updateWorkspacePlan(
    workspaceId,
    planId,
    session.customer as string | undefined,
    session.subscription as string | undefined,
  );
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId;
  const planId = subscription.metadata?.planId;

  if (!workspaceId) return;

  if (subscription.status === "active" && planId && isValidPlanId(planId)) {
    await updateWorkspacePlan(
      workspaceId,
      planId,
      subscription.customer as string,
      subscription.id,
    );
    return;
  }

  if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
    await updateWorkspacePlan(workspaceId, "FREE");
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = subscription.metadata?.workspaceId;
  if (!workspaceId) return;
  await updateWorkspacePlan(workspaceId, "FREE");
}

export async function handleStripeWebhook(
  payload: string | Buffer,
  signature: string,
): Promise<{ received: true }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw AppError.internal("STRIPE_WEBHOOK_SECRET is not configured");
  }

  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    throw AppError.validation("Invalid Stripe webhook signature", { cause: error });
  }

  if (await isEventProcessed(event.id)) {
    return { received: true };
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  await markEventProcessed(event.id, event.type);
  return { received: true };
}
