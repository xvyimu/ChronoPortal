import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const supabaseSelect = vi.fn();
const supabaseAbortSignal = vi.fn();
const loggerWarn = vi.fn();
const resourceLibraryCreateClient = vi.fn();

/**
 * `select()` 返回 PostgrestFilterBuilder —— 既可直接 await，也可先链
 * `.abortSignal(...)` 再 await。生产代码走后者（database 探针有 4s 上限），
 * 故 mock 必须同时满足两种形态：`supabaseSelect.mockResolvedValue(...)`
 * 继续决定最终结果，`abortSignal` 只记录调用并返回自身。
 */
function createSelectBuilder(...args: unknown[]) {
  const pending = supabaseSelect(...args);
  const builder = {
    abortSignal(signal: AbortSignal) {
      supabaseAbortSignal(signal);
      return builder;
    },
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(pending).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn((...args: unknown[]) => createSelectBuilder(...args)),
    })),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: loggerWarn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: resourceLibraryCreateClient,
}));

describe("/api/health", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resourceLibraryCreateClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.EMBED_SERVER_URL;
    delete process.env.EMBED_SERVER_API_KEY;
    delete process.env.EMBED_PROVIDER;
    delete process.env.EMBED_DIM;
    delete process.env.CF_ACCOUNT_ID;
    delete process.env.CF_AI_API_TOKEN;
    delete process.env.RESOURCE_LIBRARY_ANON_KEY;
    delete process.env.RESOURCE_LIBRARY_SUPABASE_ANON_KEY;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED;
    supabaseSelect.mockResolvedValue({ count: 3, error: null });
    supabaseAbortSignal.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EMBED_SERVER_URL;
    delete process.env.EMBED_SERVER_API_KEY;
    delete process.env.EMBED_PROVIDER;
    delete process.env.EMBED_DIM;
    delete process.env.CF_ACCOUNT_ID;
    delete process.env.CF_AI_API_TOKEN;
    delete process.env.RESOURCE_LIBRARY_ANON_KEY;
    delete process.env.RESOURCE_LIBRARY_SUPABASE_ANON_KEY;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED;
    delete process.env.EMBED_SERVER_LOOPBACK_ENABLED;
    delete process.env.NETLIFY;
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.AWS_EXECUTION_ENV;
    delete process.env.NEXT_PUBLIC_BUILD_COMMIT;
    delete process.env.COMMIT_REF;
    delete process.env.BRANCH;
    delete process.env.DEPLOY_ID;
  });

  it("reports deploy version metadata without exposing secrets", async () => {
    process.env.NEXT_PUBLIC_BUILD_COMMIT = "65031ff027e610e7734da2b5d8c82e708144cdd7";
    process.env.BRANCH = "main";
    process.env.DEPLOY_ID = "deploy-123";

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.version).toMatchObject({
      app: "0.1.0",
      commit: "65031ff027e610e7734da2b5d8c82e708144cdd7",
      branch: "main",
      deployId: "deploy-123",
    });
    expect(JSON.stringify(body)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("reports distributed rate limiting as optional when Upstash is not configured", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.distributedRateLimit).toMatchObject({
      status: "skipped",
      detail: "Upstash not configured; in-memory fallback active",
    });
  });

  it("fails health when strict distributed limiting is enabled without Upstash", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DISTRIBUTED_RATE_LIMIT_FAIL_CLOSED = "1";

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.distributedRateLimit.status).toBe("error");
  });

  it("reports embedding health when the local embed service is reachable", async () => {
    process.env.EMBED_SERVER_URL = "http://127.0.0.1:8003";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
      }))
    );

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.embedding.status).toBe("ok");
    expect(body.checks.embedding.detail).toBe("embed service reachable");
  });

  it("probes Cloudflare Workers AI and validates the configured vector dimension", async () => {
    process.env.EMBED_PROVIDER = "cloudflare";
    process.env.EMBED_DIM = "1024";
    process.env.CF_ACCOUNT_ID = "account-id";
    process.env.CF_AI_API_TOKEN = "cf-secret";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ result: { data: [Array.from({ length: 1024 }, () => 0.01)] } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding).toMatchObject({
      status: "ok",
      detail: "cloudflare embedding ready (1024-d)",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/account-id/ai/run/@cf/baai/bge-m3",
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.stringify(body)).not.toContain("cf-secret");
  });

  it("keeps the app healthy but marks embedding as error when the embed service is down", async () => {
    process.env.EMBED_SERVER_URL = "http://127.0.0.1:8003";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
      }))
    );

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.embedding.status).toBe("error");
    expect(body.checks.embedding.detail).toBe("embed service returned 503; semantic search will fall back");
    expect(loggerWarn).not.toHaveBeenCalled();
  });

  it("skips embedding health when EMBED_SERVER_URL is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("skipped");
    expect(body.checks.embedding.detail).toBe("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips embedding health for remote HTTPS without API key", async () => {
    process.env.EMBED_SERVER_URL = "https://embeddings.example.com";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("skipped");
    expect(body.checks.embedding.detail).toBe(
      "remote EMBED_SERVER_URL requires EMBED_SERVER_API_KEY"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips embedding health for remote HTTP even with API key", async () => {
    process.env.EMBED_SERVER_URL = "http://embeddings.example.com";
    process.env.EMBED_SERVER_API_KEY = "secret-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("skipped");
    expect(body.checks.embedding.detail).toBe(
      "non-loopback EMBED_SERVER_URL must use HTTPS"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("probes remote HTTPS embed health with Bearer API key", async () => {
    process.env.EMBED_SERVER_URL = "https://embeddings.example.com";
    process.env.EMBED_SERVER_API_KEY = "secret-key";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://embeddings.example.com/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-key",
        }),
      })
    );
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });

  it("skips loopback embedding health in serverless runtimes by default", async () => {
    process.env.EMBED_SERVER_URL = "http://127.0.0.1:8003";
    process.env.NETLIFY = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("skipped");
    expect(body.checks.embedding.detail).toBe("loopback EMBED_SERVER_URL disabled in serverless runtime");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows explicit loopback embedding health checks in serverless runtimes", async () => {
    process.env.EMBED_SERVER_URL = "http://127.0.0.1:8003";
    process.env.NETLIFY = "true";
    process.env.EMBED_SERVER_LOOPBACK_ENABLED = "true";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8003/health", expect.any(Object));
  });

  it("allows IPv6 loopback embed URLs", async () => {
    process.env.EMBED_SERVER_URL = "http://[::1]:8003";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.checks.embedding.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("http://[::1]:8003/health", expect.any(Object));
  });

  it("reports resource library search health through the public RPC when anon key is configured", async () => {
    const abortSignal = vi.fn(() => ({ error: null }));
    const rpc = vi.fn(() => ({ abortSignal }));
    resourceLibraryCreateClient.mockReturnValue({ rpc });
    process.env.RESOURCE_LIBRARY_ANON_KEY = "resource-anon-key";

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.resourceLibrarySearch.status).toBe("ok");
    expect(body.checks.resourceLibrarySearch.detail).toBe("public resource search RPC reachable");
    expect(resourceLibraryCreateClient).toHaveBeenCalledWith(
      "https://ihnmfsfbfnctgkhxmghk.supabase.co",
      "resource-anon-key",
      expect.any(Object)
    );
    expect(rpc).toHaveBeenCalledWith("resource_search_health");
    expect(abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(JSON.stringify(body)).not.toContain("resource-anon-key");
  });

  it("skips resource library search health when public read is not configured", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.resourceLibrarySearch.status).toBe("skipped");
    expect(body.checks.resourceLibrarySearch.detail).toBe("RESOURCE_LIBRARY_ANON_KEY not configured");
    expect(resourceLibraryCreateClient).not.toHaveBeenCalled();
  });

  it("bounds the database probe with an abort signal", async () => {
    const { GET } = await import("@/app/api/health/route");
    await GET();

    // 无 abortSignal 时实测出现过 7037ms 无界等待；上限必须真的挂上去。
    expect(supabaseAbortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("reports database as skipped (not error) when the probe times out", async () => {
    // supabase-js 把中止的 fetch 作为 error 对象返回（不是 throw），且 code 为空。
    supabaseSelect.mockResolvedValue({
      count: null,
      error: { message: "AbortError: The operation was aborted due to timeout" },
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    // 慢 ≠ 坏：超时只说明测不出来，不该为健康依赖的冷启动叫醒 on-call。
    expect(body.checks.database.status).toBe("skipped");
    expect(body.checks.database.detail).toMatch(/timed out after \d+ms/);
    expect(body.status).toBe("healthy");
    expect(response.status).toBe(200);
    expect(loggerWarn).toHaveBeenCalledWith(
      "Database health probe timed out",
      expect.objectContaining({ source: "api-health" })
    );
  });

  it("still fails the gate when the database returns a real PostgREST fault", async () => {
    // 真故障必带 code（42883 / PGRST202 / 401…），不能被超时豁免吞掉。
    supabaseSelect.mockResolvedValue({
      count: null,
      error: { message: "permission denied for table nav_categories", code: "42501" },
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.database.status).toBe("error");
    expect(body.checks.database.detail).toBe("database query failed");
    expect(body.status).not.toBe("healthy");
    expect(response.status).not.toBe(200);
  });

  it("does not mistake a coded error whose message mentions timeout for a probe timeout", async () => {
    // 边界：message 含 "timeout" 但带 code —— 仍是真故障。
    supabaseSelect.mockResolvedValue({
      count: null,
      error: { message: "statement timeout", code: "57014" },
    });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.database.status).toBe("error");
    expect(body.status).not.toBe("healthy");
  });
});
