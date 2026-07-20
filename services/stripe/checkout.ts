import { AppError } from "@/lib/errors/app-error";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { getStripeClient } from "./client";

export interface CreateCheckoutSessionInput {
  workspaceId: string;
  planId: PlanId;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ sessionId: string; url: string }> {
  const plan = PLANS[input.planId];

  if (!plan.stripePriceId) {
    throw AppError.validation(`Plan ${input.planId} is not available for purchase`);
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.customerEmail,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: input.successUrl ?? `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl ?? `${appUrl}/billing/cancel`,
    metadata: {
      workspaceId: input.workspaceId,
      planId: input.planId,
    },
    subscription_data: {
      metadata: {
        workspaceId: input.workspaceId,
        planId: input.planId,
      },
    },
  });

  if (!session.url) {
    throw AppError.internal("Stripe did not return a checkout URL");
  }

  return { sessionId: session.id, url: session.url };
}
