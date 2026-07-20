import { z } from "zod";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { createCheckoutSession } from "@/services/stripe/checkout";
import { isValidPlanId } from "@/lib/billing/plans";
import { AppError } from "@/lib/errors/app-error";

const bodySchema = z.object({
  plan: z.enum(["STARTER", "PRO", "BUSINESS"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireApiUser();
    const body = bodySchema.parse(await request.json());

    if (!isValidPlanId(body.plan)) {
      throw AppError.validation("Plan invalide.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await createCheckoutSession({
      workspaceId: user.id,
      planId: body.plan,
      customerEmail: profile?.email ?? user.email,
      successUrl: body.successUrl ?? `${appUrl}/dashboard/abonnement?success=true`,
      cancelUrl: body.cancelUrl ?? `${appUrl}/dashboard/abonnement?cancelled=true`,
    });

    return Response.json({ success: true, url: session.url, sessionId: session.sessionId });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
