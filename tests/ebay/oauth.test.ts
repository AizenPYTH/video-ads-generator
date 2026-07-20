import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import {
  generateOAuthState,
  hashState,
  parseOAuthState,
} from "@/services/ebay/oauth";

describe("eBay OAuth state", () => {
  it("generates state containing workspace ID", () => {
    const workspaceId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const state = generateOAuthState(workspaceId);

    expect(state.length).toBeGreaterThan(0);
    const parsed = parseOAuthState(state);
    expect(parsed.workspaceId).toBe(workspaceId);
  });

  it("produces unique states for successive calls", () => {
    const workspaceId = "workspace-123";
    const state1 = generateOAuthState(workspaceId);
    const state2 = generateOAuthState(workspaceId);

    expect(state1).not.toBe(state2);
  });

  it("rejects invalid state parameter", () => {
    expect(() => parseOAuthState("!!!")).toThrow(AppError);
    expect(() => parseOAuthState("::")).toThrow(AppError);
  });

  it("rejects state without workspace ID", () => {
    const emptyPayload = Buffer.from("::").toString("base64url");
    expect(() => parseOAuthState(emptyPayload)).toThrow(AppError);
  });

  it("hashes state deterministically with SHA-256", () => {
    const state = generateOAuthState("workspace-abc");

    expect(hashState(state)).toBe(hashState(state));
    expect(hashState(state)).toHaveLength(64);
    expect(hashState(state)).not.toBe(hashState("different-state"));
  });

  it("round-trips workspace ID through encode/decode", () => {
    const ids = [
      "user-uuid-1",
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "short-id",
    ];

    for (const id of ids) {
      const state = generateOAuthState(id);
      expect(parseOAuthState(state).workspaceId).toBe(id);
    }
  });
});
