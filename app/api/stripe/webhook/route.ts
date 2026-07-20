import { handleStripeWebhook } from "@/services/stripe/webhooks";
import { jsonErrorResponse } from "@/lib/errors/handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return Response.json(
        { error: { message: "Signature Stripe manquante." } },
        { status: 400 },
      );
    }

    const result = await handleStripeWebhook(body, signature);
    return Response.json(result);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
