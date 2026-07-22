import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApiUser } from "@/lib/api/auth";
import { jsonErrorResponse } from "@/lib/errors/handler";
import {
  generateOAuthState,
  getEbayAuthorizationUrl,
  hashState,
} from "@/services/ebay/oauth";
import { resolveEbayApiHost, resolveEbayAuthHost } from "@/services/ebay/client";

const OAUTH_STATE_COOKIE = "ebay_oauth_state";

export async function GET() {
  try {
    const { user } = await requireApiUser();
    const clientId = (process.env.EBAY_CLIENT_ID || "").trim();
    const authHost = resolveEbayAuthHost();
    const apiHost = resolveEbayApiHost();

    console.info("[ebay-oauth] connect redirect", {
      authHost,
      apiHost,
      clientPrefix: clientId.slice(0, 20),
      clientLooksSandbox: /SBX/i.test(clientId),
      clientLooksProduction: /PRD/i.test(clientId),
      userIdPrefix: user.id.slice(0, 8),
    });

    if (!clientId || !process.env.EBAY_CLIENT_SECRET || !process.env.EBAY_RUNAME) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/ebay?error=" +
            encodeURIComponent(
              "Credentials eBay manquantes sur le serveur (CLIENT_ID / SECRET / RUNAME).",
            ),
          process.env.NEXT_PUBLIC_APP_URL || "https://snowolf-lime.vercel.app",
        ),
      );
    }

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
