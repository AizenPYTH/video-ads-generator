import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildChallengeResponse,
  getDeletionEndpointUrl,
  getDeletionVerificationToken,
  hashSensitive,
  verifyEbayNotificationSignature,
} from "@/services/ebay/account-deletion";
import { processAccountDeletion } from "@/services/ebay/account-deletion-purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeletionPayload = {
  metadata?: {
    topic?: string;
    schemaVersion?: string;
  };
  notification?: {
    notificationId?: string;
    eventDate?: string;
    publishDate?: string;
    publishAttemptCount?: number;
    data?: {
      username?: string;
      userId?: string;
      eiasToken?: string;
    };
  };
};

function json(data: unknown, status: number) {
  return NextResponse.json(data, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * GET — eBay challenge validation
 * https://developer.ebay.com/marketplace-account-deletion
 */
export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode?.trim()) {
    return json({ error: "challenge_code required" }, 400);
  }

  try {
    // Touch config early so missing env fails clearly
    getDeletionVerificationToken();
    getDeletionEndpointUrl();

    const challengeResponse = buildChallengeResponse(challengeCode.trim());
    console.info("[ebay-deletion] challenge ok", {
      endpointConfigured: true,
      hashPrefix: challengeResponse.slice(0, 8),
    });
    return json({ challengeResponse }, 200);
  } catch (err) {
    console.error("[ebay-deletion] challenge configuration error", {
      message: err instanceof Error ? err.message : "config_error",
    });
    return json({ error: "Server configuration error" }, 500);
  }
}

/**
 * POST — MARKETPLACE_ACCOUNT_DELETION notification
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("x-ebay-signature") ??
    request.headers.get("X-EBAY-SIGNATURE");

  const verified = await verifyEbayNotificationSignature(
    rawBody,
    signatureHeader,
  );
  if (!verified) {
    console.warn("[ebay-deletion] invalid signature — rejecting");
    return new NextResponse(null, { status: 412 });
  }

  let payload: DeletionPayload;
  try {
    payload = JSON.parse(rawBody) as DeletionPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const topic = payload.metadata?.topic;
  if (topic !== "MARKETPLACE_ACCOUNT_DELETION") {
    console.warn("[ebay-deletion] unexpected topic", { topic: topic ?? null });
    return json({ error: "Unsupported topic" }, 400);
  }

  const notificationId = payload.notification?.notificationId?.trim();
  if (!notificationId) {
    return json({ error: "notificationId required" }, 400);
  }

  const data = payload.notification?.data ?? {};
  const publishAttemptCount = payload.notification?.publishAttemptCount ?? null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[ebay-deletion] admin client unavailable", {
      message: err instanceof Error ? err.message : "admin_error",
    });
    return json({ error: "Server error" }, 500);
  }

  // Idempotency: already processed?
  const { data: existing } = await admin
    .from("ebay_account_deletion_notifications")
    .select("id, status, processing_summary")
    .eq("notification_id", notificationId)
    .maybeSingle();

  if (
    existing &&
    (existing.status === "processed" ||
      existing.status === "not_found" ||
      existing.status === "skipped")
  ) {
    await admin
      .from("ebay_account_deletion_notifications")
      .update({
        publish_attempt_count: publishAttemptCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    console.info("[ebay-deletion] idempotent skip", {
      notificationId,
      status: existing.status,
    });
    return new NextResponse(null, { status: 204 });
  }

  const eiasHash = hashSensitive(data.eiasToken);

  const { data: logRow, error: insertError } = await admin
    .from("ebay_account_deletion_notifications")
    .upsert(
      {
        notification_id: notificationId,
        topic: "MARKETPLACE_ACCOUNT_DELETION",
        ebay_user_id: data.userId ?? null,
        ebay_username: data.username ?? null,
        eias_token_hash: eiasHash,
        received_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        status: "verified",
        publish_attempt_count: publishAttemptCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "notification_id" },
    )
    .select("id")
    .single();

  if (insertError) {
    console.error("[ebay-deletion] failed to persist notification log", {
      notificationId,
      code: insertError.code,
    });
    // Still attempt purge — compliance first
  }

  if (logRow?.id) {
    await admin
      .from("ebay_account_deletion_notifications")
      .update({
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
  }

  const result = await processAccountDeletion({
    userId: data.userId,
    username: data.username,
    eiasToken: data.eiasToken,
  });

  if (logRow?.id) {
    await admin
      .from("ebay_account_deletion_notifications")
      .update({
        status: result.status,
        processed_at: new Date().toISOString(),
        internal_account_id: result.internalAccountId ?? null,
        smart_seller_user_id: result.smartSellerUserId ?? null,
        processing_summary: result.summary,
        error_message: result.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
  }

  console.info("[ebay-deletion] processed", {
    notificationId,
    status: result.status,
  });

  // eBay accepts 200/201/202/204 — acknowledge quickly after processing
  return new NextResponse(null, { status: 204 });
}
