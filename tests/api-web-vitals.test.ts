import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkDistributedRateLimit: vi.fn(),
  captureMessage: vi.fn(),
  setMeasurement: vi.fn(),
}));

vi.mock("@/lib/rate-limit-distributed", () => ({
  checkDistributedRateLimit: mocks.checkDistributedRateLimit,
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
  setMeasurement: mocks.setMeasurement,
}));

const metric = {
  id: "metric-1",
  name: "LCP",
  value: 1200,
  delta: 10,
  rating: "good",
  navigationType: "navigate",
};

function sameOriginRequest(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost/api/web-vitals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "localhost",
      Origin: "http://localhost",
      "x-forwarded-for": "203.0.113.9",
      ...extraHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function importRoute() {
  vi.resetModules();
  return import("@/app/api/web-vitals/route");
}

describe("POST /api/web-vitals", () => {
  const prevSample = process.env.SENTRY_WEB_VITALS_SAMPLE_RATE;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: true, backend: "memory" });
    process.env.SENTRY_WEB_VITALS_SAMPLE_RATE = "1";
  });

  afterEach(() => {
    if (prevSample === undefined) {
      delete process.env.SENTRY_WEB_VITALS_SAMPLE_RATE;
    } else {
      process.env.SENTRY_WEB_VITALS_SAMPLE_RATE = prevSample;
    }
  });

  it("rejects requests without a same-origin browser Origin header", async () => {
    const { POST } = await importRoute();
    const response = await POST(new Request("http://localhost/api/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Host: "localhost" },
      body: JSON.stringify(metric),
    }));

    expect(response.status).toBe(403);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("rejects cross-origin Origin", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      sameOriginRequest(metric, { Origin: "https://evil.example" })
    );
    expect(response.status).toBe(403);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("returns 429 before sending an event when the distributed quota is exhausted", async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: false, backend: "upstash" });
    const { POST } = await importRoute();
    const response = await POST(sameOriginRequest(metric));

    expect(response.status).toBe(429);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("returns 429 when distributed limiter is unavailable under fail-closed", async () => {
    mocks.checkDistributedRateLimit.mockResolvedValue({ allowed: false, backend: "unavailable" });
    const { POST } = await importRoute();
    const response = await POST(
      sameOriginRequest(metric, { "x-forwarded-for": "203.0.113.10" })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(mocks.captureMessage).not.toHaveBeenCalled();
    expect(mocks.setMeasurement).not.toHaveBeenCalled();
  });

  it("accepts a valid metric and emits Sentry message + measurement", async () => {
    const { POST } = await importRoute();
    const response = await POST(sameOriginRequest(metric));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const json = await response.json();
    expect(json).toEqual({ ok: true });

    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "web-vital: LCP",
      expect.objectContaining({
        level: "info",
        tags: expect.objectContaining({
          metric: "LCP",
          rating: "good",
          navigationType: "navigate",
        }),
        extra: expect.objectContaining({
          id: "metric-1",
          value: 1200,
          delta: 10,
        }),
      })
    );
    expect(mocks.setMeasurement).toHaveBeenCalledWith("LCP", 1200, "millisecond");
  });

  it("uses unit none for CLS measurements", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      sameOriginRequest({
        id: "cls-1",
        name: "CLS",
        value: 0.05,
        delta: 0.01,
        rating: "good",
        navigationType: "navigate",
      })
    );
    expect(response.status).toBe(200);
    expect(mocks.setMeasurement).toHaveBeenCalledWith("CLS", 0.05, "none");
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await importRoute();
    const response = await POST(sameOriginRequest("not-json{"));
    expect(response.status).toBe(400);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("returns 400 for schema-invalid metric", async () => {
    const { POST } = await importRoute();
    const response = await POST(
      sameOriginRequest({
        id: "x",
        name: "NOT_A_METRIC",
        value: 1,
        delta: 1,
        rating: "good",
        navigationType: "navigate",
      })
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("invalid metric");
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });

  it("skips captureMessage when sample rate is 0 but still measures", async () => {
    process.env.SENTRY_WEB_VITALS_SAMPLE_RATE = "0";
    const { POST } = await importRoute();
    const response = await POST(sameOriginRequest(metric));
    expect(response.status).toBe(200);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
    expect(mocks.setMeasurement).toHaveBeenCalledWith("LCP", 1200, "millisecond");
  });

  it("applies 60s window with max 30 attempts for web-vitals bucket", async () => {
    const { POST } = await importRoute();
    await POST(sameOriginRequest(metric));
    expect(mocks.checkDistributedRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^web-vitals:/),
      60_000,
      30
    );
  });

  it("returns 413 for oversized body", async () => {
    const { POST } = await importRoute();
    const huge = "x".repeat(5_000);
    const response = await POST(sameOriginRequest(huge));
    expect(response.status).toBe(413);
    expect(mocks.captureMessage).not.toHaveBeenCalled();
  });
});
