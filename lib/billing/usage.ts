import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";
import {
  getPlan,
  getQuotaLimit,
  type PlanId,
  type UsageMetric,
} from "./plans";

export type UsageReservationStatus = "pending" | "confirmed" | "restored";

export interface UsageReservation {
  id: string;
  workspace_id: string;
  metric: UsageMetric;
  amount: number;
  status: UsageReservationStatus;
}

interface WorkspaceUsageRow {
  workspace_id: string;
  plan_id: PlanId;
  period_start: string;
  analyses_used: number;
  publications_used: number;
  imports_used: number;
  url_imports_used: number;
}

const METRIC_COLUMN: Record<UsageMetric, keyof WorkspaceUsageRow> = {
  analyses: "analyses_used",
  publications: "publications_used",
  imports: "imports_used",
  url_imports: "url_imports_used",
};

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsageRow> {
  const supabase = createAdminClient();
  const periodStart = currentPeriodStart();

  const { data, error } = await supabase
    .from("workspace_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("period_start", periodStart)
    .maybeSingle();

  if (error) {
    throw AppError.internal("Failed to fetch workspace usage", error);
  }

  if (data) {
    return data as WorkspaceUsageRow;
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("plan_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) {
    throw AppError.notFound("Workspace not found");
  }

  const newRow = {
    workspace_id: workspaceId,
    plan_id: (workspace.plan_id as PlanId) ?? "FREE",
    period_start: periodStart,
    analyses_used: 0,
    publications_used: 0,
    imports_used: 0,
    url_imports_used: 0,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("workspace_usage")
    .insert(newRow)
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw AppError.internal("Failed to initialize workspace usage", insertError);
  }

  return inserted as WorkspaceUsageRow;
}

export async function checkQuota(
  workspaceId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const usage = await getWorkspaceUsage(workspaceId);
  const limit = getQuotaLimit(usage.plan_id, metric);
  const column = METRIC_COLUMN[metric];
  const used = usage[column] as number;

  return {
    allowed: used + amount <= limit,
    used,
    limit,
  };
}

export async function reserveUsage(
  workspaceId: string,
  metric: UsageMetric,
  amount = 1,
): Promise<UsageReservation> {
  const quota = await checkQuota(workspaceId, metric, amount);

  if (!quota.allowed) {
    throw AppError.quotaExceeded(
      `Monthly ${metric.replace("_", " ")} quota exceeded (${quota.used}/${quota.limit})`,
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("usage_reservations")
    .insert({
      workspace_id: workspaceId,
      metric,
      amount,
      status: "pending",
    })
    .select("id, workspace_id, metric, amount, status")
    .single();

  if (error || !data) {
    throw AppError.internal("Failed to reserve usage", error);
  }

  return data as UsageReservation;
}

export async function confirmUsage(reservationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: reservation, error: fetchError } = await supabase
    .from("usage_reservations")
    .select("*")
    .eq("id", reservationId)
    .single();

  if (fetchError || !reservation) {
    throw AppError.notFound("Usage reservation not found");
  }

  if (reservation.status === "confirmed") {
    return;
  }

  if (reservation.status === "restored") {
    throw AppError.validation("Cannot confirm a restored reservation");
  }

  const usage = await getWorkspaceUsage(reservation.workspace_id);
  const column = METRIC_COLUMN[reservation.metric as UsageMetric];
  const currentUsed = usage[column] as number;

  const { error: usageError } = await supabase
    .from("workspace_usage")
    .update({ [column]: currentUsed + reservation.amount })
    .eq("workspace_id", reservation.workspace_id)
    .eq("period_start", usage.period_start);

  if (usageError) {
    throw AppError.internal("Failed to confirm usage", usageError);
  }

  const { error: reservationError } = await supabase
    .from("usage_reservations")
    .update({ status: "confirmed" })
    .eq("id", reservationId);

  if (reservationError) {
    throw AppError.internal("Failed to update reservation status", reservationError);
  }
}

export async function restoreUsage(reservationId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: reservation, error: fetchError } = await supabase
    .from("usage_reservations")
    .select("*")
    .eq("id", reservationId)
    .single();

  if (fetchError || !reservation) {
    throw AppError.notFound("Usage reservation not found");
  }

  if (reservation.status === "restored") {
    return;
  }

  if (reservation.status === "confirmed") {
    const usage = await getWorkspaceUsage(reservation.workspace_id);
    const column = METRIC_COLUMN[reservation.metric as UsageMetric];
    const currentUsed = usage[column] as number;

    const { error: usageError } = await supabase
      .from("workspace_usage")
      .update({
        [column]: Math.max(0, currentUsed - reservation.amount),
      })
      .eq("workspace_id", reservation.workspace_id)
      .eq("period_start", usage.period_start);

    if (usageError) {
      throw AppError.internal("Failed to restore usage", usageError);
    }
  }

  const { error: reservationError } = await supabase
    .from("usage_reservations")
    .update({ status: "restored" })
    .eq("id", reservationId);

  if (reservationError) {
    throw AppError.internal("Failed to update reservation status", reservationError);
  }
}

export function getWorkspacePlanQuotas(planId: PlanId) {
  return getPlan(planId).quotas;
}
