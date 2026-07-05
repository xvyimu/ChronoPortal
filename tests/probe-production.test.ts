import { describe, expect, it, vi } from "vitest";

type ProbeModule = typeof import("../scripts/probe-production.mjs");

async function importProbeModule(): Promise<ProbeModule> {
  return import("../scripts/probe-production.mjs");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function textResponse(body: string, contentType: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType,
    },
  });
}

function makeFetch(fixtures: Record<string, Response>) {
  return vi.fn(async (input: URL | RequestInfo) => {
    const url = input.toString();
    const response = fixtures[url];
    if (!response) return textResponse("not found", "text/plain", 404);
    return response.clone();
  }) as unknown as typeof fetch;
}

describe("scripts/probe-production", () => {
  it("builds endpoint URLs from the configured production base URL", async () => {
    const { makeProbeUrl } = await importProbeModule();

    expect(makeProbeUrl("https://example.com", "/api/health")).toBe("https://example.com/api/health");
    expect(makeProbeUrl("https://example.com/", "api/search?q=ai")).toBe("https://example.com/api/search?q=ai");
  });

  it("passes the production smoke endpoints when responses are healthy", async () => {
    const { runProductionProbe, assertProbePassed } = await importProbeModule();
    const baseUrl = "https://nav-site.example";
    const fetchImpl = makeFetch({
      [`${baseUrl}/`]: textResponse("<html></html>", "text/html; charset=utf-8"),
      [`${baseUrl}/api/health`]: jsonResponse({
        status: "healthy",
        version: {
          commit: "65031ff027e610e7734da2b5d8c82e708144cdd7",
        },
        checks: {
          database: { status: "ok" },
          env: { status: "ok" },
          embedding: { status: "skipped" },
        },
      }),
      [`${baseUrl}/api/search?q=ai&limit=5`]: jsonResponse({
        results: [],
        total: 0,
        mode: "fuse",
      }),
      [`${baseUrl}/tool/figma`]: textResponse("<html></html>", "text/html; charset=utf-8"),
      [`${baseUrl}/sitemap.xml`]: textResponse("<urlset></urlset>", "application/xml"),
      [`${baseUrl}/robots.txt`]: textResponse("User-agent: *", "text/plain"),
      [`${baseUrl}/build-info.json`]: jsonResponse({
        commit: "65031ff027e610e7734da2b5d8c82e708144cdd7",
      }),
    });

    const results = await runProductionProbe({
      config: {
        baseUrl,
        timeoutMs: 1000,
        expectEmbeddingSkipped: true,
        expectedCommit: "65031ff0",
      },
      fetchImpl,
    });

    expect(results.every((result) => result.ok)).toBe(true);
    expect(() => assertProbePassed(results)).not.toThrow();
  });

  it("flags an old deployment when latest health semantics are expected", async () => {
    const { runProductionProbe, assertProbePassed } = await importProbeModule();
    const baseUrl = "https://nav-site.example";
    const fetchImpl = makeFetch({
      [`${baseUrl}/api/health`]: jsonResponse({
        status: "healthy",
        checks: {
          database: { status: "ok" },
          env: { status: "ok" },
          embedding: { status: "error" },
        },
      }),
    });

    const results = await runProductionProbe({
      config: {
        baseUrl,
        timeoutMs: 1000,
        expectEmbeddingSkipped: true,
        expectedCommit: "",
      },
      endpoints: [{ name: "health", path: "/api/health", contentType: /application\/json/i, json: "health" }],
      fetchImpl,
    });

    expect(results[0].ok).toBe(false);
    expect(results[0].detail).toContain("expected embedding check skipped");
    expect(() => assertProbePassed(results)).toThrow("Production probe failed");
  });

  it("flags a deployed commit mismatch when a release commit is expected", async () => {
    const { runProductionProbe, assertProbePassed } = await importProbeModule();
    const baseUrl = "https://nav-site.example";
    const fetchImpl = makeFetch({
      [`${baseUrl}/api/health`]: jsonResponse({
        status: "healthy",
        version: {
          commit: "old-commit",
        },
        checks: {
          database: { status: "ok" },
          env: { status: "ok" },
          embedding: { status: "skipped" },
        },
      }),
      [`${baseUrl}/build-info.json`]: jsonResponse({
        commit: "old-commit",
      }),
    });

    const results = await runProductionProbe({
      config: {
        baseUrl,
        timeoutMs: 1000,
        expectEmbeddingSkipped: true,
        expectedCommit: "65031ff027e610e7734da2b5d8c82e708144cdd7",
      },
      endpoints: [{ name: "health", path: "/api/health", contentType: /application\/json/i, json: "health" }],
      fetchImpl,
    });

    expect(results.some((result) => result.name === "build-info" && !result.ok)).toBe(true);
    expect(results.find((result) => result.name === "build-info")?.detail).toContain("expected build commit");
    expect(() => assertProbePassed(results)).toThrow("Production probe failed");
  });

  it("reads CLI and environment configuration without requiring secrets", async () => {
    const { readConfigFromEnv } = await importProbeModule();

    expect(
      readConfigFromEnv(
        {
          PRODUCTION_BASE_URL: "https://env.example",
          PRODUCTION_PROBE_TIMEOUT_MS: "5000",
          PRODUCTION_EXPECT_EMBEDDING_SKIPPED: "true",
          PRODUCTION_EXPECT_COMMIT: "env-sha",
        } as unknown as NodeJS.ProcessEnv,
        ["--base-url", "https://cli.example", "--timeout-ms=7000"]
      )
    ).toEqual({
      baseUrl: "https://cli.example",
      timeoutMs: 7000,
      expectEmbeddingSkipped: true,
      expectedCommit: "env-sha",
    });
  });
});
