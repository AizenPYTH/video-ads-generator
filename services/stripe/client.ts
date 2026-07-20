import Stripe from "stripe";
import { AppError } from "@/lib/errors/app-error";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw AppError.internal("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function isStripeMockMode(): boolean {
  return process.env.STRIPE_MOCK_MODE === "true";
}
