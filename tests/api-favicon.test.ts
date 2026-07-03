import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

async function getHandler() {
  vi.resetModules();
  return import("@/app/api/favicon/route");
}

describe("favicon API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("rejects missing domain", async () => {
    const { GET } = await getHandler();
    const response = await GET(new NextRequest("http://localhost/api/favicon"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing domain parameter" });
  });

  it("returns the first valid image response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("x".repeat(128), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      })
    );

    const { GET } = await getHandler();
    const response = await GET(
      new NextRequest("http://localhost/api/favicon?domain=example.com")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-favicon-source")).toBe("cccyun");
  });
});
