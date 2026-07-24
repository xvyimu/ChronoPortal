import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(async () => ({ data: [], error: null }));
const createServiceRoleClient = vi.fn(() => ({ rpc }));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("searchSemantic", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.EMBED_SEMANTIC_RPC;
    delete process.env.EMBED_PROVIDER;
    rpc.mockImplementation(async () => ({ data: [], error: null }));
  });

  afterEach(() => {
    delete process.env.EMBED_SEMANTIC_RPC;
    delete process.env.EMBED_PROVIDER;
    vi.useRealTimers();
  });

  it("uses the default 512-d semantic RPC when no override is configured", async () => {
    const { searchSemantic } = await import("@/lib/search/semantic");

    await searchSemantic([0.1, 0.2, 0.3], 5);

    expect(rpc).toHaveBeenCalledWith("search_links_semantic", {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
    });
  });

  it("uses EMBED_SEMANTIC_RPC for the Cloudflare 1024-d semantic RPC", async () => {
    process.env.EMBED_SEMANTIC_RPC = " search_links_semantic_v2 ";
    const { searchSemantic } = await import("@/lib/search/semantic");

    await searchSemantic([0.1, 0.2, 0.3], 5);

    expect(rpc).toHaveBeenCalledWith("search_links_semantic_v2", {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
    });
  });

  it("derives the 1024-d RPC from EMBED_PROVIDER when no override is configured", async () => {
    process.env.EMBED_PROVIDER = "cloudflare";
    const { searchSemantic } = await import("@/lib/search/semantic");

    await searchSemantic([0.1, 0.2, 0.3], 5);

    expect(rpc).toHaveBeenCalledWith("search_links_semantic_v2", {
      query_embedding: [0.1, 0.2, 0.3],
      match_count: 5,
    });
  });

  it("caps category match_count via resolveSemanticMatchCount (W7 payload shrink)", async () => {
    const {
      resolveSemanticMatchCount,
      SEMANTIC_MATCH_COUNT_MAX,
      searchSemantic,
    } = await import("@/lib/search/semantic");

    expect(resolveSemanticMatchCount(5, "frontend")).toBe(20);
    expect(resolveSemanticMatchCount(30, "frontend")).toBe(80);
    expect(resolveSemanticMatchCount(100, undefined)).toBe(SEMANTIC_MATCH_COUNT_MAX);
    expect(resolveSemanticMatchCount(5)).toBe(5);

    await searchSemantic([0.1, 0.2, 0.3], 5, "frontend");
    expect(rpc).toHaveBeenCalledWith(
      "search_links_semantic",
      expect.objectContaining({ match_count: 20 })
    );

    rpc.mockClear();
    await searchSemantic([0.1, 0.2, 0.3], 50, "frontend");
    expect(rpc).toHaveBeenCalledWith(
      "search_links_semantic",
      expect.objectContaining({ match_count: SEMANTIC_MATCH_COUNT_MAX })
    );
  });

  it("throws SemanticSearchTimeoutError when the RPC exceeds the soft deadline", async () => {
    vi.useFakeTimers();
    rpc.mockImplementationOnce(
      () =>
        new Promise(() => {
          /* never resolves — forces withTimeout */
        })
    );

    const { searchSemantic, SemanticSearchTimeoutError, SEMANTIC_RPC_TIMEOUT_MS } =
      await import("@/lib/search/semantic");

    const pending = searchSemantic([0.1, 0.2, 0.3], 5);
    const expectation = expect(pending).rejects.toBeInstanceOf(SemanticSearchTimeoutError);
    await vi.advanceTimersByTimeAsync(SEMANTIC_RPC_TIMEOUT_MS);
    await expectation;
  });
});
