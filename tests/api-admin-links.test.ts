import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createLink: vi.fn(),
  getAdminLinksPage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/repositories/admin-links", () => ({
  createLink: mocks.createLink,
  getAdminLinksPage: mocks.getAdminLinksPage,
}));

import { GET } from "@/app/api/admin/links/route";

describe("GET /api/admin/links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "admin", role: "admin" } });
  });

  it("forwards validated pagination and filters and exposes timing metadata", async () => {
    const categoryId = "550e8400-e29b-41d4-a716-446655440000";
    const page = { links: [], total: 21, page: 2, pageSize: 10 };
    mocks.getAdminLinksPage.mockResolvedValue(page);

    const response = await GET(new Request(
      `http://localhost/api/admin/links?page=2&pageSize=10&q=chat&category=${categoryId}&status=pending`
    ));

    expect(mocks.getAdminLinksPage).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      search: "chat",
      categoryId,
      status: "pending",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Server-Timing")).toMatch(/^total;dur=\d+\.\d$/);
    expect(await response.json()).toEqual(page);
  });

  it("rejects invalid pagination before querying the repository", async () => {
    const response = await GET(new Request(
      "http://localhost/api/admin/links?page=0&pageSize=101"
    ));

    expect(response.status).toBe(400);
    expect(mocks.getAdminLinksPage).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "查询参数格式不正确" });
  });
});
