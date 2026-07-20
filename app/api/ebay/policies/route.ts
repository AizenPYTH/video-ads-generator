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
      .select("id")
      .eq("user_id", user.id)
      .eq("est_actif", true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      throw AppError.validation("Aucun compte eBay connecté.");
    }

    const { data: token } = await supabase
      .from("ebay_tokens")
      .select("access_token, expires_at")
      .eq("ebay_account_id", account.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!token || new Date(token.expires_at) < new Date()) {
      throw AppError.validation("Session eBay expirée. Reconnectez votre compte.");
    }

    const accessToken = decrypt(token.access_token);
    const client = new EbayClient({ accessToken });
    const policies = await fetchEbayPolicies(client);

    return Response.json({ success: true, policies });
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
