import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  async function runMiddleware(pathname: string) {
    const { middleware } = await import("@/middleware");
    const request = new NextRequest(`http://localhost:3000${pathname}`);
    return middleware(request);
  }

  it("allows unauthenticated access to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await runMiddleware("/login");

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated users from dashboard to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await runMiddleware("/dashboard/ads");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fdashboard%2Fads",
    );
  });

  it("redirects authenticated users away from auth routes to dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const response = await runMiddleware("/login");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("allows authenticated users to access dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const response = await runMiddleware("/dashboard");

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("refreshes session via getUser on protected routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    await runMiddleware("/dashboard/settings");

    expect(mockGetUser).toHaveBeenCalledOnce();
  });

  it("passes through when Supabase env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    vi.resetModules();
    const { middleware } = await import("@/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
