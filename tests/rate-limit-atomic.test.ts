import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe("atomic database rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consumes one fixed-window bucket through the atomic RPC", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ allowed: true, current_count: 3 }],
      error: null,
    });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    await expect(
      checkRateLimit("submit_attempts", "203.0.113.10", 60_000, 3, "deny")
    ).resolves.toEqual({ allowed: true, count: 3 });
    expect(mocks.rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_bucket_key: "submit_attempts:203.0.113.10",
      p_window_seconds: 60,
      p_max_attempts: 3,
    });
  });

  it("denies immediately when the atomic RPC is unavailable and policy is deny", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "missing RPC" } });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const result = await checkRateLimit(
      "login_attempts",
      "198.51.100.7",
      60_000,
      1,
      "deny"
    );

    expect(result).toEqual({ allowed: false, count: 0 });
  });

  it("uses the memory bucket when the atomic RPC is unavailable and policy is memory", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "missing RPC" } });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const first = await checkRateLimit("login_attempts", "198.51.100.8", 60_000, 1, "memory");
    const second = await checkRateLimit("login_attempts", "198.51.100.8", 60_000, 1, "memory");

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("allows when the atomic RPC is unavailable and policy is allow", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "missing RPC" } });
    const { checkRateLimit } = await import("@/lib/rate-limit");

    const first = await checkRateLimit("metrics", "198.51.100.9", 60_000, 1, "allow");
    const second = await checkRateLimit("metrics", "198.51.100.9", 60_000, 1, "allow");

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });
});
