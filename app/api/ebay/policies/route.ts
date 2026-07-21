import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import { AppError } from "@/lib/errors/app-error";
import { EbayClient } from "@/services/ebay/client";
import { fetchEbayPolicies } from "@/services/ebay/policies";
import { decrypt } from "@/lib/crypto/encryption";

export async function GET() {
  try {
    const { user, supabase } = await requireApiUser();

    const { data: account } = await supabase
      .from("ebay_accounts")
      .select("access_token_encrypted, token_expires_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!account?.access_token_encrypted) {
      throw AppError.validation("Aucun compte eBay connecté.");
    }

    if (
      account.token_expires_at &&
      new Date(account.token_expires_at) < new Date()
    ) {
      throw AppError.validation(
        "Session eBay expirée. Reconnectez votre compte.",
      );
    }

    const accessToken = decrypt(account.access_token_encrypted);
    const client = new EbayClient({ accessToken });
    const policies = await fetchEbayPolicies(client);

    return Response.json({ success: true, policies });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
