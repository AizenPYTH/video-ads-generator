import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import {
  generateOAuthState,
  getEbayAuthorizationUrl,
  hashState,
} from "@/services/ebay/oauth";

const OAUTH_STATE_COOKIE = "ebay_oauth_state";

export async function GET() {
  try {
    const { user } = await requireApiUser();
    const state = generateOAuthState(user.id);
    const authUrl = getEbayAuthorizationUrl(state);

    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE, hashState(state), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return jsonErrorResponse(error);
  }
}
