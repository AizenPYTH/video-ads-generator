import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
          insert: mockInsert,
        };
      }
      if (table === "workspaces") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      return {};
    }),
  })),
}));

vi.mock("@/services/stripe/client", () => ({
  getStripeClient: vi.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}));

describe("Stripe webhook idempotence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockInsert.mockResolvedValue({ error: null });
  });

  it("skips processing for already handled events", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "existing" } });
    mockConstructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: { object: {} },
    });

    const { handleStripeWebhook } = await import("@/services/stripe/webhooks");
    const result = await handleStripeWebhook("{}", "sig_test");

    expect(result).toEqual({ received: true });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("records new events after processing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockConstructEvent.mockReturnValue({
      id: "evt_new",
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { workspaceId: "ws-1" },
          status: "canceled",
        },
      },
    });

    const { handleStripeWebhook } = await import("@/services/stripe/webhooks");
    const result = await handleStripeWebhook("{}", "sig_test");

    expect(result).toEqual({ received: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "evt_new",
        event_type: "customer.subscription.deleted",
      }),
    );
  });

  it("treats duplicate insert as success (idempotent mark)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockInsert.mockResolvedValue({ error: { message: "duplicate key value" } });
    mockConstructEvent.mockReturnValue({
      id: "evt_race",
      type: "unknown.event",
      data: { object: {} },
    });

    const { handleStripeWebhook } = await import("@/services/stripe/webhooks");

    await expect(handleStripeWebhook("{}", "sig_test")).resolves.toEqual({
      received: true,
    });
  });

  it("rejects invalid webhook signatures", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { handleStripeWebhook } = await import("@/services/stripe/webhooks");

    await expect(handleStripeWebhook("{}", "bad_sig")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
