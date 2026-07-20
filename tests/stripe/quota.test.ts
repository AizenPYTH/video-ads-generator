import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorCode } from "@/lib/errors/app-error";

const workspaceId = "ws-test-123";
const periodStart = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
).toISOString();

const usageRow = {
  workspace_id: workspaceId,
  plan_id: "FREE",
  period_start: periodStart,
  analyses_used: 5,
  publications_used: 1,
  imports_used: 0,
  url_imports_used: 0,
};

const mockUsageMaybeSingle = vi.fn();
const mockWorkspaceSingle = vi.fn();
const mockUsageUpdate = vi.fn();
const mockReservationInsert = vi.fn();
const mockReservationSelect = vi.fn();
const mockReservationUpdate = vi.fn();

function buildSelectChain(terminal: () => Promise<unknown>) {
  const chain = {
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(terminal),
    single: vi.fn(terminal),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "workspace_usage") {
        return {
          select: vi.fn(() => buildSelectChain(() => mockUsageMaybeSingle())),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({ data: usageRow, error: null }),
              ),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: mockUsageUpdate,
            })),
          })),
        };
      }
      if (table === "workspaces") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockWorkspaceSingle,
            })),
          })),
        };
      }
      if (table === "usage_reservations") {
        return {
          insert: mockReservationInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockReservationSelect,
            })),
          })),
          update: vi.fn(() => ({
            eq: mockReservationUpdate,
          })),
        };
      }
      return {
        select: vi.fn(() => buildSelectChain(async () => ({ data: null, error: null }))),
      };
    }),
  })),
}));

describe("quota usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsageMaybeSingle.mockResolvedValue({ data: usageRow, error: null });
    mockWorkspaceSingle.mockResolvedValue({
      data: { plan_id: "FREE" },
      error: null,
    });
    mockReservationInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "res-1",
            workspace_id: workspaceId,
            metric: "analyses",
            amount: 1,
            status: "pending",
          },
          error: null,
        }),
      })),
    });
    mockReservationSelect.mockResolvedValue({
      data: {
        id: "res-1",
        workspace_id: workspaceId,
        metric: "analyses",
        amount: 1,
        status: "pending",
      },
      error: null,
    });
    mockReservationUpdate.mockResolvedValue({ error: null });
    mockUsageUpdate.mockResolvedValue({ error: null });
  });

  it("checkQuota returns allowed when under limit", async () => {
    const { checkQuota } = await import("@/lib/billing/usage");

    const result = await checkQuota(workspaceId, "analyses", 1);

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(10);
  });

  it("checkQuota returns not allowed when exceeding limit", async () => {
    mockUsageMaybeSingle.mockResolvedValue({
      data: { ...usageRow, analyses_used: 10 },
      error: null,
    });

    const { checkQuota } = await import("@/lib/billing/usage");

    const result = await checkQuota(workspaceId, "analyses", 1);

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(10);
  });

  it("reserveUsage creates pending reservation when quota allows", async () => {
    const { reserveUsage } = await import("@/lib/billing/usage");

    const reservation = await reserveUsage(workspaceId, "analyses", 1);

    expect(reservation.status).toBe("pending");
    expect(reservation.metric).toBe("analyses");
    expect(mockReservationInsert).toHaveBeenCalled();
  });

  it("reserveUsage throws when quota exceeded", async () => {
    mockUsageMaybeSingle.mockResolvedValue({
      data: { ...usageRow, analyses_used: 10 },
      error: null,
    });

    const { reserveUsage } = await import("@/lib/billing/usage");

    await expect(reserveUsage(workspaceId, "analyses", 1)).rejects.toMatchObject(
      { code: AppErrorCode.QUOTA_EXCEEDED },
    );
  });

  it("confirmUsage increments counter and marks reservation confirmed", async () => {
    const { confirmUsage } = await import("@/lib/billing/usage");

    await confirmUsage("res-1");

    expect(mockUsageUpdate).toHaveBeenCalled();
    expect(mockReservationUpdate).toHaveBeenCalled();
  });

  it("confirmUsage is idempotent for already confirmed reservations", async () => {
    mockReservationSelect.mockResolvedValue({
      data: {
        id: "res-1",
        workspace_id: workspaceId,
        metric: "analyses",
        amount: 1,
        status: "confirmed",
      },
      error: null,
    });

    const { confirmUsage } = await import("@/lib/billing/usage");

    await expect(confirmUsage("res-1")).resolves.toBeUndefined();
    expect(mockUsageUpdate).not.toHaveBeenCalled();
  });

  it("restoreUsage is idempotent for already restored reservations", async () => {
    mockReservationSelect.mockResolvedValue({
      data: {
        id: "res-1",
        workspace_id: workspaceId,
        metric: "analyses",
        amount: 1,
        status: "restored",
      },
      error: null,
    });

    const { restoreUsage } = await import("@/lib/billing/usage");

    await expect(restoreUsage("res-1")).resolves.toBeUndefined();
    expect(mockReservationUpdate).not.toHaveBeenCalled();
  });

  it("restoreUsage decrements counter for confirmed reservations", async () => {
    mockReservationSelect.mockResolvedValue({
      data: {
        id: "res-1",
        workspace_id: workspaceId,
        metric: "analyses",
        amount: 1,
        status: "confirmed",
      },
      error: null,
    });

    const { restoreUsage } = await import("@/lib/billing/usage");

    await restoreUsage("res-1");

    expect(mockUsageUpdate).toHaveBeenCalled();
    expect(mockReservationUpdate).toHaveBeenCalled();
  });
});
