import { describe, expect, it } from "vitest";

async function importGaRoute() {
  return import("@/app/api/ga/route");
}

describe("GET /api/ga", () => {
  it("rejects missing or invalid measurement ids", async () => {
    const { GET } = await importGaRoute();
    const bad = await GET(new Request("http://localhost/api/ga"));
    expect(bad.status).toBe(400);
    expect(bad.headers.get("content-type")).toMatch(/javascript/);

    const inject = await GET(
      new Request("http://localhost/api/ga?id=G-ABC';alert(1)")
    );
    expect(inject.status).toBe(400);
  });

  it("returns external bootstrap for valid G- id without inline HTML", async () => {
    const { GET } = await importGaRoute();
    const res = await GET(new Request("http://localhost/api/ga?id=G-TEST1234"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("gtag('config'");
    expect(body).toContain("G-TEST1234");
    expect(body).toContain("anonymize_ip");
    expect(body).not.toContain("<script");
  });
});
