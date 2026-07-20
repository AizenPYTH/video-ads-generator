import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { createCustomerPortalSession } from "@/services/stripe/portal";
import { AppError } from "@/lib/errors/app-error";

const bodySchema = z.object({
  returnUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const { data: customer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!customer?.stripe_customer_id) {
      throw AppError.validation("Aucun abonnement actif trouvé.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await createCustomerPortalSession(
      customer.stripe_customer_id,
      body.returnUrl ?? `${appUrl}/dashboard/abonnement`,
    );

    return Response.json({ success: true, url: session.url });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
