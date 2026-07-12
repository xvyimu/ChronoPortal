import { describe, it, expect } from "vitest";
import {
  EMBED_CLIENT_USER_AGENT,
  buildEmbedRequestHeaders,
  describeEmbedSkipReason,
  resolveEmbedEndpoint,
  resolveLoopbackEmbedEndpoint,
} from "@/lib/embedding-runtime";

describe("resolveEmbedEndpoint", () => {
  const base = { path: "/embed-query" };

  it("returns missing when raw and fallback are empty", () => {
    const result = resolveEmbedEndpoint({ ...base, raw: undefined, env: {} });
    expect(result).toEqual({ endpoint: null, reason: "missing", authRequired: false });
  });

  it("accepts loopback http without API key", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "http://127.0.0.1:8003",
      env: {},
    });
    expect(result).toEqual({
      endpoint: "http://127.0.0.1:8003/embed-query",
      reason: null,
      authRequired: false,
    });
  });

  it("marks authRequired when loopback has API key", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "http://127.0.0.1:8003",
      env: { EMBED_SERVER_API_KEY: "local-key" },
    });
    expect(result.endpoint).toBe("http://127.0.0.1:8003/embed-query");
    expect(result.reason).toBeNull();
    expect(result.authRequired).toBe(true);
  });

  it("rejects serverless loopback by default", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "http://127.0.0.1:8003",
      env: { NETLIFY: "true" },
    });
    expect(result).toEqual({
      endpoint: null,
      reason: "serverless-loopback-disabled",
      authRequired: false,
    });
  });

  it("allows serverless loopback when explicitly enabled", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "http://127.0.0.1:8003",
      env: { NETLIFY: "true", EMBED_SERVER_LOOPBACK_ENABLED: "true" },
    });
    expect(result.endpoint).toBe("http://127.0.0.1:8003/embed-query");
  });

  it("rejects remote HTTP even with API key", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "http://embed.example.com",
      env: { EMBED_SERVER_API_KEY: "k" },
    });
    expect(result).toEqual({
      endpoint: null,
      reason: "remote-insecure",
      authRequired: false,
    });
  });

  it("rejects remote HTTPS without API key", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "https://embed.example.com",
      env: {},
    });
    expect(result).toEqual({
      endpoint: null,
      reason: "remote-missing-api-key",
      authRequired: false,
    });
  });

  it("accepts remote HTTPS with API key", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "https://embed.example.com",
      env: { EMBED_SERVER_API_KEY: "secret" },
    });
    expect(result).toEqual({
      endpoint: "https://embed.example.com/embed-query",
      reason: null,
      authRequired: true,
    });
  });

  it("rejects non-http schemes", () => {
    const result = resolveEmbedEndpoint({
      ...base,
      raw: "ftp://127.0.0.1:8003",
      env: {},
    });
    expect(result.reason).toBe("invalid");
  });

  it("keeps resolveLoopbackEmbedEndpoint as alias", () => {
    const a = resolveEmbedEndpoint({ ...base, raw: "http://localhost:8003", env: {} });
    const b = resolveLoopbackEmbedEndpoint({ ...base, raw: "http://localhost:8003", env: {} });
    expect(b).toEqual(a);
  });
});

describe("buildEmbedRequestHeaders", () => {
  it("sets Content-Type and non-node User-Agent for JSON posts", () => {
    expect(buildEmbedRequestHeaders({ json: true, env: {} })).toEqual({
      "Content-Type": "application/json",
      "User-Agent": EMBED_CLIENT_USER_AGENT,
    });
  });

  it("keeps User-Agent for health GET when json=false", () => {
    expect(buildEmbedRequestHeaders({ json: false, env: {} })).toEqual({
      "User-Agent": EMBED_CLIENT_USER_AGENT,
    });
  });

  it("adds Bearer when API key is configured", () => {
    expect(
      buildEmbedRequestHeaders({
        json: true,
        env: { EMBED_SERVER_API_KEY: " secret " },
      })
    ).toEqual({
      "Content-Type": "application/json",
      "User-Agent": EMBED_CLIENT_USER_AGENT,
      Authorization: "Bearer secret",
    });
  });
});

describe("describeEmbedSkipReason", () => {
  it("describes remote skip reasons", () => {
    expect(describeEmbedSkipReason("remote-insecure")).toContain("HTTPS");
    expect(describeEmbedSkipReason("remote-missing-api-key")).toContain("EMBED_SERVER_API_KEY");
  });
});