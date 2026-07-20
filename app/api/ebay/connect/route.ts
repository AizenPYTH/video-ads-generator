import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import {
  generateOAuthState,
  getEbayAuthorizationUrl,
} from "@/services/ebay/oauth";

export async function GET() {
  try {
    const { user } = await requireApiUser();
    const state = generateOAuthState(user.id);
    const authUrl = getEbayAuthorizationUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
