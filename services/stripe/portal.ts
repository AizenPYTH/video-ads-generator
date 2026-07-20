import { AppError } from "@/lib/errors/app-error";
import { getStripeClient } from "./client";

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl?: string,
): Promise<{ url: string }> {
  if (!stripeCustomerId) {
    throw AppError.validation("Stripe customer ID is required");
  }

  const stripe = getStripeClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl ?? `${appUrl}/billing`,
  });

  return { url: session.url };
}
